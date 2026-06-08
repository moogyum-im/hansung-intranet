import { Workbook } from 'exceljs';

function getCellText(cell) {
  const v = cell.value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    if (v instanceof Date) return v.toISOString().split('T')[0];
    if ('result' in v) return v.result != null ? String(v.result) : '';
    if ('richText' in v) return v.richText.map(r => r.text || '').join('');
    return '';
  }
  return String(v);
}

const BILLING_PROMPT = `당신은 한국 건설회사 조경공사 기성 청구 내역서를 파싱하는 전문가입니다.
기성 청구서는 계약 내역의 각 항목에 대해 기성수량 또는 기성률을 기재한 문서입니다.

실제 공종 항목들을 추출하여 JSON으로 반환하세요.

**카테고리 매핑 규칙:**
- 상록교목 → "evergreen_tree"
- 낙엽교목 → "deciduous_tree"
- 상록관목 → "evergreen_shrub"
- 낙엽관목 → "deciduous_shrub"
- 지피·초화·잔디 → "ground_flower"
- 식재부대공사(조경토/배수판/지주목/방근시트/시비/바크/경관석/장비신호수 등) → "supplementary"
- 유지관리공사 → "maintenance"

**숫자 인식 규칙 (가장 중요):**
- 모든 금액은 반드시 원(₩) 단위 정수로 반환 (예: 4억9천3백만원 → 493000000)
- 천 단위 구분자(,)가 있는 숫자는 그대로 읽을 것 (예: 49,300,000 → 49300000)
- 자릿수를 반드시 정확히 세어 확인할 것 — 억/천만/백만 자릿수 혼동 주의
- billing_amount = unit_price × billing_quantity 로 검증할 것
- contract_amount = unit_price × contract_quantity 로 검증할 것
- 문서에 보이는 숫자를 절대 추측하거나 변형하지 말 것

**추출 규칙:**
1. 소계/합계/계 집계 행 제외
2. 보험료·수수료·부가세 계산 행 제외
3. 빈 행, 제목/헤더 행 제외
4. 기성수량이 없으면 billing_quantity=0, billing_rate=0 으로 설정
5. 기성률(%)이 있으면 billing_rate에 기입 (0~100)
6. 기성금액 = 단가 × 기성수량, 없으면 계약금액 × 기성률/100 으로 추정
7. 청구일(기성일)이 파일에 있으면 billing_date에 기입

**반드시 JSON만 반환, 다른 설명 없이:**
{
  "meta": {
    "billing_date": "YYYY-MM-DD" 또는 null,
    "title": "공사 명칭"
  },
  "items": [
    {
      "category": "evergreen_tree",
      "item_name": "소나무",
      "spec": "H6.0×R70",
      "unit": "주",
      "contract_quantity": 10,
      "billing_quantity": 5,
      "billing_rate": 50,
      "unit_price": 3000000,
      "contract_amount": 30000000,
      "billing_amount": 15000000,
      "notes": ""
    }
  ]
}`;

function detectFileType(fileName, mimeType) {
  const ext = (fileName || '').split('.').pop().toLowerCase();
  if (['xlsx', 'xls'].includes(ext) || mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return 'excel';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) || mimeType?.startsWith('image/')) return 'image';
  if (ext === 'pdf' || mimeType === 'application/pdf') return 'pdf';
  return 'text';
}

function getImageMediaType(fileName, mimeType) {
  if (mimeType?.startsWith('image/')) return mimeType;
  const ext = (fileName || '').split('.').pop().toLowerCase();
  const map = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
  return map[ext] || 'image/jpeg';
}

export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: 'ANTHROPIC_API_KEY 환경변수 없음' }, { status: 500 });

  let file;
  try {
    const formData = await request.formData();
    file = formData.get('file');
  } catch {
    return Response.json({ error: '파일 수신 오류' }, { status: 400 });
  }

  if (!file) return Response.json({ error: '파일이 없습니다.' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileType = detectFileType(file.name, file.type);

  let messages;
  const extraHeaders = {};

  if (fileType === 'excel') {
    const workbook = new Workbook();
    try {
      await workbook.xlsx.load(buffer);
    } catch {
      return Response.json({ error: '엑셀 파일을 읽을 수 없습니다. PDF나 이미지로 업로드해보세요.' }, { status: 400 });
    }

    let mainSheet = workbook.worksheets[0];
    for (const sheet of workbook.worksheets) {
      if (sheet.rowCount > (mainSheet?.rowCount || 0)) mainSheet = sheet;
    }
    if (!mainSheet) return Response.json({ error: '엑셀 시트를 읽을 수 없습니다.' }, { status: 400 });

    const lines = [];
    mainSheet.eachRow((row, rowNum) => {
      if (rowNum > 300) return;
      const cells = [];
      for (let c = 1; c <= 30; c++) cells.push(getCellText(row.getCell(c)));
      while (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
      if (cells.some(c => c !== '')) lines.push(cells.join('\t'));
    });

    messages = [{
      role: 'user',
      content: `${BILLING_PROMPT}\n\n엑셀 파일 내용 (탭으로 열 구분):\n\`\`\`\n${lines.join('\n')}\n\`\`\``,
    }];

  } else if (fileType === 'image') {
    const mediaType = getImageMediaType(file.name, file.type);
    messages = [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: buffer.toString('base64') } },
        { type: 'text', text: BILLING_PROMPT },
      ],
    }];

  } else if (fileType === 'pdf') {
    extraHeaders['anthropic-beta'] = 'pdfs-2024-09-25';
    messages = [{
      role: 'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buffer.toString('base64') } },
        { type: 'text', text: BILLING_PROMPT },
      ],
    }];

  } else {
    messages = [{
      role: 'user',
      content: `${BILLING_PROMPT}\n\n파일 내용:\n\`\`\`\n${buffer.toString('utf-8').slice(0, 10000)}\n\`\`\``,
    }];
  }

  let aiRes;
  try {
    aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        ...extraHeaders,
      },
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: 16000,
        messages,
      }),
    });
  } catch (e) {
    return Response.json({ error: `Anthropic API 연결 오류: ${e.message}` }, { status: 500 });
  }

  if (!aiRes.ok) {
    const errText = await aiRes.text();
    return Response.json({ error: `AI 오류 (${aiRes.status}): ${errText.slice(0, 300)}` }, { status: 500 });
  }

  const aiData = await aiRes.json();
  const text = aiData.content?.[0]?.text || '';

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return Response.json({ error: 'AI가 JSON 형식으로 응답하지 않았습니다.', raw: text.slice(0, 500) }, { status: 500 });
  }

  try {
    return Response.json(JSON.parse(jsonMatch[0]));
  } catch {
    return Response.json({ error: 'JSON 파싱 실패', raw: jsonMatch[0].slice(0, 500) }, { status: 500 });
  }
}
