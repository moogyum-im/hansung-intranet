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
  const workbook = new Workbook();
  await workbook.xlsx.load(buffer);

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

  const excelText = lines.join('\n');

  const prompt = `당신은 한국 건설회사 조경공사 실행 내역서 엑셀 파일을 파싱하는 전문가입니다.
실행 내역서는 시공사 내부 원가 관리용으로 계약 내역서와 같은 형식이지만 실행 단가/금액이 들어 있습니다.

다음은 엑셀 파일을 텍스트로 변환한 내용입니다 (탭으로 열 구분):
\`\`\`
${excelText}
\`\`\`

실제 공종 항목들을 추출하여 JSON으로 반환하세요.

**카테고리 매핑 규칙:**
- 상록교목 → "evergreen_tree"
- 낙엽교목 → "deciduous_tree"
- 상록관목 → "evergreen_shrub"
- 낙엽관목 → "deciduous_shrub"
- 지피·초화·잔디 → "ground_flower"
- 식재부대공사(조경토/배수판/지주목/방근시트/시비/바크/경관석/장비신호수 등) → "supplementary"
- 유지관리공사 → "maintenance"

**추출 규칙:**
1. 소계/합계/계 집계 행 제외
2. 보험료·수수료·부가세 계산 행 제외
3. 빈 행, 제목/헤더 행 제외
4. 설계변경 파일이면(변경전/변경후 컬럼) 변경후(after) 값 사용
5. 재료비/노무비/경비가 구분되어 있으면 분리 추출, 없으면 total_amount에만 기입
6. 수량 0 항목도 포함

**반드시 JSON만 반환, 다른 설명 없이:**
{
  "meta": {
    "title": "공사 명칭",
    "version_label": "원본" 또는 "설계변경 1차" 등,
    "version_date": "YYYY-MM-DD" 또는 null,
    "is_change_order": false
  },
  "items": [
    {
      "category": "evergreen_tree",
      "item_name": "소나무",
      "spec": "H6.0×R70",
      "unit": "주",
      "quantity": 5,
      "material_unit_price": 3200000,
      "labor_unit_price": 45000,
      "overhead_unit_price": 0,
      "material_amount": 16000000,
      "labor_amount": 225000,
      "overhead_amount": 0,
      "total_amount": 16225000,
      "notes": ""
    }
  ]
}`;

  let aiRes;
  try {
    aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: 16000,
        messages: [{ role: 'user', content: prompt }],
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
