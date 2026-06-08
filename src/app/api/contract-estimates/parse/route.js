import { Workbook } from 'exceljs';

// exceljs 셀 값을 문자열로 안전하게 추출
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
  if (!apiKey || apiKey === '여기에_API_키_입력') {
    return Response.json({ error: 'ANTHROPIC_API_KEY가 .env.local에 설정되지 않았습니다.' }, { status: 500 });
  }

  let file;
  try {
    const formData = await request.formData();
    file = formData.get('file');
  } catch {
    return Response.json({ error: '파일 수신 오류' }, { status: 400 });
  }

  if (!file) return Response.json({ error: '파일이 없습니다.' }, { status: 400 });

  // Excel 파싱
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = new Workbook();
  await workbook.xlsx.load(buffer);

  // 데이터가 가장 많은 시트 선택
  let mainSheet = workbook.worksheets[0];
  for (const sheet of workbook.worksheets) {
    if (sheet.rowCount > (mainSheet?.rowCount || 0)) mainSheet = sheet;
  }

  if (!mainSheet) return Response.json({ error: '엑셀 시트를 읽을 수 없습니다.' }, { status: 400 });

  // 텍스트 변환 (최대 300행 × 30열)
  const lines = [];
  mainSheet.eachRow((row, rowNum) => {
    if (rowNum > 300) return;
    const cells = [];
    for (let c = 1; c <= 30; c++) {
      cells.push(getCellText(row.getCell(c)));
    }
    // 뒤쪽 빈 셀 제거
    while (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
    if (cells.some(c => c !== '')) lines.push(cells.join('\t'));
  });

  const excelText = lines.join('\n');

  const prompt = `당신은 한국 건설회사 조경공사 공사비 내역 엑셀 파일을 파싱하는 전문가입니다.

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
4. 변경내역 파일이면(변경전/변경후 컬럼 구조) 변경후(after) 값 사용
5. 재료비/노무비/경비가 구분되어 있으면 분리 추출, 없으면 total_amount에만 기입
6. 수량이 0이거나 총금액이 0인 항목도 포함

**반드시 JSON만 반환, 다른 설명 없이:**
{
  "meta": {
    "title": "공사 명칭",
    "version_label": "원계약" 또는 "1차 변경" 등,
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
    return Response.json({ error: `AI 오류 (${aiRes.status}): ${errText}` }, { status: 500 });
  }

  const aiData = await aiRes.json();
  const text = aiData.content?.[0]?.text || '';

  // JSON 추출
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return Response.json({ error: 'AI가 JSON 형식으로 응답하지 않았습니다.', raw: text.slice(0, 500) }, { status: 500 });
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return Response.json(parsed);
  } catch {
    return Response.json({ error: 'JSON 파싱 실패', raw: jsonMatch[0].slice(0, 500) }, { status: 500 });
  }
}
