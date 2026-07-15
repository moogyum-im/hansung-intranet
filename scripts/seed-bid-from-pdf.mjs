// PDF에서 입찰 데이터 추출 후 DB 시딩
// 실행: node scripts/seed-bid-from-pdf.mjs

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  'https://dzouudutnlgaolzlsfzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6b3V1ZHV0bmxnYW9semxzZnpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTcxNTI4MiwiZXhwIjoyMDY1MjkxMjgyfQ.wuhIdzxHJ4wyPEFSS98ZzsoRAPjUxkloQdLgQCVpKdE'
);

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const PDF_PATH = '/Users/im-aleum/Downloads/대외비 0529.pdf';

const prompt = `이 PDF는 한국 건설·조경 공사 입찰 비교표입니다.
D사, H사(우리 회사), J사 3개 회사의 입찰수량·단가·금액이 나열되어 있습니다.

열 순서: 순서 | 명칭 | 규격 | 단위 | 입찰수량 | D사단가 | D사금액 | H사단가 | H사금액 | (차이/비율 열은 무시) | J사단가 | J사금액

각 항목을 JSON 배열로 추출해 주세요.
- 숫자의 쉼표 제거, 정수만 사용
- 소계·합계·계·현장명·공구명 등 행 제외
- 반드시 JSON 배열만 반환, 다른 텍스트 없음

[
  {
    "order": 순번정수,
    "name": "명칭",
    "spec": "규격",
    "unit": "단위",
    "quantity": 입찰수량정수,
    "A_unit_price": D사단가정수,
    "A_amount": D사금액정수,
    "B_unit_price": H사단가정수,
    "B_amount": H사금액정수,
    "C_unit_price": J사단가정수,
    "C_amount": J사금액정수
  }
]

없거나 읽기 어려운 값은 0으로 처리. 모든 항목 빠짐없이 추출.`;

async function parsePdf() {
  console.log('📄 PDF 읽는 중...');
  const pdfBuffer = fs.readFileSync(PDF_PATH);
  const pdfBase64 = pdfBuffer.toString('base64');

  console.log('🤖 Claude AI로 데이터 추출 중... (1-2분 소요)');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'pdfs-2024-09-25',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 16000,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
          { type: 'text', text: prompt },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API 오류: ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || '';

  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('JSON 추출 실패\n' + text.slice(0, 500));

  return JSON.parse(match[0]);
}

async function seedProject(parsed) {
  console.log(`\n📦 DB 시딩 시작 (${parsed.length}개 항목)`);

  // 기존 데이터 삭제
  const { data: existing } = await supabase.from('bid_projects').select('id, title');
  if (existing?.length) {
    console.log('  기존 프로젝트 삭제 중...');
    await supabase.from('bid_projects').delete().in('id', existing.map(p => p.id));
  }

  // 프로젝트 생성
  const { data: proj, error: projErr } = await supabase
    .from('bid_projects')
    .insert({ title: '조경공사 입찰 비교', description: '', bid_date: '2025-05-29' })
    .select().single();
  if (projErr) throw new Error('프로젝트 생성 실패: ' + projErr.message);
  console.log('  ✅ 프로젝트 생성:', proj.id);

  // 회사 생성
  await supabase.from('bid_companies').insert([
    { project_id: proj.id, company_key: 'A', company_name: 'D사', is_ours: false },
    { project_id: proj.id, company_key: 'B', company_name: 'H사', is_ours: true },
    { project_id: proj.id, company_key: 'C', company_name: 'J사', is_ours: false },
  ]);
  console.log('  ✅ 회사 3개 생성');

  // 항목 + 단가 삽입
  let ok = 0;
  for (let i = 0; i < parsed.length; i++) {
    const row = parsed[i];
    const { data: item, error: itemErr } = await supabase
      .from('bid_items')
      .insert({
        project_id: proj.id,
        item_name: String(row.name || `항목${i + 1}`),
        spec: String(row.spec || ''),
        unit: String(row.unit || '식'),
        quantity: Number(row.quantity) || 0,
        display_order: Number(row.order || i + 1),
      })
      .select().single();

    if (itemErr) { console.error(`  ❌ [${row.name}]:`, itemErr.message); continue; }

    const { error: costErr } = await supabase.from('bid_costs').insert([
      { item_id: item.id, company_key: 'A', unit_price: Number(row.A_unit_price) || 0, amount: Number(row.A_amount) || 0 },
      { item_id: item.id, company_key: 'B', unit_price: Number(row.B_unit_price) || 0, amount: Number(row.B_amount) || 0 },
      { item_id: item.id, company_key: 'C', unit_price: Number(row.C_unit_price) || 0, amount: Number(row.C_amount) || 0 },
    ]);

    if (costErr) { console.error(`  ❌ 비용 [${row.name}]:`, costErr.message); continue; }
    ok++;
  }

  console.log(`  ✅ ${ok}/${parsed.length}개 완료`);
}

async function main() {
  try {
    const parsed = await parsePdf();
    console.log(`\n✅ AI 추출 완료: ${parsed.length}개 항목`);
    await seedProject(parsed);
    console.log('\n🎉 완료!');
  } catch (e) {
    console.error('\n❌ 오류:', e.message);
  }
}

main();
