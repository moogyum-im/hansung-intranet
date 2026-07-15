// PROJECT_2만 추가 (기존 PROJECT_1 유지)
// 실행: node scripts/seed-bid-project2.mjs

import { createClient } from '@supabase/supabase-js';
import { PROJECT_2 } from '../src/lib/bid-seed-data.js';

const supabase = createClient(
  'https://dzouudutnlgaolzlsfzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6b3V1ZHV0bmxnYW9semxzZnpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTcxNTI4MiwiZXhwIjoyMDY1MjkxMjgyfQ.wuhIdzxHJ4wyPEFSS98ZzsoRAPjUxkloQdLgQCVpKdE'
);

async function main() {
  // 기존 PROJECT_2가 있으면 삭제
  const { data: existing } = await supabase
    .from('bid_projects')
    .select('id, title')
    .eq('title', '조경·시설물·포장공사 입찰 비교');
  if (existing?.length) {
    await supabase.from('bid_projects').delete().in('id', existing.map(p => p.id));
  }

  // 프로젝트 생성
  const { data: proj, error: projErr } = await supabase
    .from('bid_projects')
    .insert({ title: '조경·시설물·포장공사 입찰 비교', description: '', bid_date: PROJECT_2.bid_date })
    .select().single();
  if (projErr) { console.error('❌ 프로젝트 생성 실패:', projErr.message); return; }
  console.log('✅ 프로젝트 생성:', proj.id);

  await supabase.from('bid_companies').insert(
    PROJECT_2.companies.map(c => ({ ...c, project_id: proj.id }))
  );

  let ok = 0;
  for (let i = 0; i < PROJECT_2.items.length; i++) {
    const [name, spec, unit, aAmt, bAmt, cAmt] = PROJECT_2.items[i];

    const { data: item, error: itemErr } = await supabase
      .from('bid_items')
      .insert({ project_id: proj.id, item_name: name, spec: spec || '', unit: unit || '식', quantity: 0, display_order: i + 1 })
      .select().single();

    if (itemErr) { console.error(`❌ [${name}]:`, itemErr.message); continue; }

    const { error: costErr } = await supabase.from('bid_costs').insert([
      { item_id: item.id, company_key: 'A', unit_price: 0, amount: aAmt || 0 },
      { item_id: item.id, company_key: 'B', unit_price: 0, amount: bAmt || 0 },
      { item_id: item.id, company_key: 'C', unit_price: 0, amount: cAmt || 0 },
    ]);

    if (costErr) { console.error(`❌ 비용 [${name}]:`, costErr.message); continue; }
    ok++;
  }

  console.log(`\n🎉 완료: ${ok}/${PROJECT_2.items.length}개 항목`);
  console.log(`   D사: ${PROJECT_2.items.reduce((s,r)=>s+r[3],0).toLocaleString()}원`);
  console.log(`   H사: ${PROJECT_2.items.reduce((s,r)=>s+r[4],0).toLocaleString()}원`);
  console.log(`   J사: ${PROJECT_2.items.reduce((s,r)=>s+r[5],0).toLocaleString()}원`);
}

main().catch(console.error);
