// 입찰 기록 시드 데이터 업로드
// 실행: node scripts/seed-bid-records.mjs

import { createClient } from '@supabase/supabase-js';
import { PROJECT_1, PROJECT_2 } from '../src/lib/bid-seed-data.js';

const supabase = createClient(
  'https://dzouudutnlgaolzlsfzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6b3V1ZHV0bmxnYW9semxzZnpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTcxNTI4MiwiZXhwIjoyMDY1MjkxMjgyfQ.wuhIdzxHJ4wyPEFSS98ZzsoRAPjUxkloQdLgQCVpKdE'
);

function stripSiteName(title) {
  // 현장명(아파트/단지명) 제거 — "공사명" 부분만 남김
  return title
    .replace(/^.*?현장\s*/g, '')  // "XXX현장 " 앞부분 제거
    .replace(/^.*?파크\s*/g, '')  // "XXX파크 " 앞부분 제거
    .trim();
}

async function seedProject(project) {
  const safeTitle = stripSiteName(project.title);
  console.log(`\n📦 업로드 시작: ${safeTitle} (항목 ${project.items.length}개)`);

  // 1. 프로젝트 생성
  const { data: proj, error: projErr } = await supabase
    .from('bid_projects')
    .insert({ title: safeTitle, description: '', bid_date: project.bid_date })
    .select()
    .single();

  if (projErr) { console.error('  ❌ 프로젝트 생성 오류:', projErr.message); return; }
  console.log(`  ✅ 프로젝트 생성: ${proj.id}`);

  // 2. 회사 생성
  const { error: compErr } = await supabase
    .from('bid_companies')
    .insert(project.companies.map(c => ({ ...c, project_id: proj.id })));
  if (compErr) { console.error('  ❌ 회사 생성 오류:', compErr.message); return; }
  console.log(`  ✅ 회사 ${project.companies.length}개 생성`);

  // 3. 아이템 + 비용 배치 업로드
  let successCount = 0;
  for (let i = 0; i < project.items.length; i++) {
    const row = project.items[i];
    // [명칭, 규격, 단위, A금액, B금액, C금액]
    const [name, spec, unit, a, b, c] = row;

    const { data: item, error: itemErr } = await supabase
      .from('bid_items')
      .insert({ project_id: proj.id, item_name: name, spec: spec || '', unit: unit || '식', display_order: i })
      .select()
      .single();

    if (itemErr) { console.error(`  ❌ 항목 오류 [${name}]:`, itemErr.message); continue; }

    const { error: costErr } = await supabase.from('bid_costs').insert([
      { item_id: item.id, company_key: 'A', amount: a || 0 },
      { item_id: item.id, company_key: 'B', amount: b || 0 },
      { item_id: item.id, company_key: 'C', amount: c || 0 },
    ]);

    if (costErr) { console.error(`  ❌ 비용 오류 [${name}]:`, costErr.message); continue; }
    successCount++;
  }

  console.log(`  ✅ 항목 ${successCount}/${project.items.length}개 완료`);
}

async function main() {
  console.log('🚀 입찰 기록 시드 데이터 업로드 시작');

  // 기존 데이터 전체 삭제
  const { data: existing } = await supabase.from('bid_projects').select('id, title');
  if (existing && existing.length > 0) {
    console.log('\n⚠️  기존 프로젝트 삭제:');
    existing.forEach(p => console.log(`   - ${p.title}`));
    await supabase.from('bid_projects').delete().in('id', existing.map(p => p.id));
  }

  // 두 프로젝트 합쳐서 하나로
  const merged = {
    title: '조경공사 입찰 비교',
    description: '',
    bid_date: PROJECT_1.bid_date,
    companies: PROJECT_1.companies,
    items: [...PROJECT_1.items, ...PROJECT_2.items],
  };

  await seedProject(merged);

  console.log('\n🎉 완료!');
}

main().catch(console.error);
