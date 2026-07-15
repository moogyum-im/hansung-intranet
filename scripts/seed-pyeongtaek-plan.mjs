/**
 * 평택 브레인시티 공동1BL 중흥S-클래스 조경식재 공정표 일괄 등록 스크립트
 * 출처: 평택 2026년 식재 예정공정 (5).pdf
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dzouudutnlgaolzlsfzb.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6b3V1ZHV0bmxnYW9semxzZnpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTcxNTI4MiwiZXhwIjoyMDY1MjkxMjgyfQ.wuhIdzxHJ4wyPEFSS98ZzsoRAPjUxkloQdLgQCVpKdE';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// 조경식재공사 현장 ID (확정)
const SITE_ID = '5164f8a9-3ead-4d56-a81e-c62e08323747';

const PLAN = {
  title: '평택브레인시티공동1BL중흥S클래스 아파트신축공사 중 조경식재공사 2026년 식재 공정표',
  start_date: '2026-02-01',
  end_date: '2026-10-31',
  status: '진행',
  execution_price: 0,
};

// category: evergreen_tree | deciduous_tree | evergreen_shrub | deciduous_shrub | ground_flower
const ITEMS = [
  // ── 1. 상록교목 ──────────────────────────────────────────────────────────
  { category: 'evergreen_tree', species_name: '반송',              spec: 'H1.5xW2.0',           unit: '주', quantity: 50,
    periods: [{ s: '2026-04-10', e: '2026-04-30' }, { s: '2026-08-10', e: '2026-08-31' }] },

  { category: 'evergreen_tree', species_name: '서양측백',           spec: 'H2.5xW0.8',           unit: '주', quantity: 172,
    periods: [{ s: '2026-08-20', e: '2026-09-10' }] },

  { category: 'evergreen_tree', species_name: '소나무(둥근형)',      spec: 'H6.0',                unit: '주', quantity: 8,
    periods: [{ s: '2026-04-20', e: '2026-05-10' }] },

  { category: 'evergreen_tree', species_name: '소나무(노송)-독립수', spec: 'R70',                 unit: '주', quantity: 0,
    periods: [] },

  { category: 'evergreen_tree', species_name: '소나무(노송)',        spec: 'R60',                 unit: '주', quantity: 3,
    periods: [{ s: '2026-03-10', e: '2026-03-20', note: '잔여 소나무 식재는 현장사무실·함바·화장실 철거: 3월' }] },

  { category: 'evergreen_tree', species_name: '소나무(조형)',        spec: 'H9.0xW5.0xR50',      unit: '주', quantity: 20,
    periods: [{ s: '2026-03-10', e: '2026-03-31' }] },

  { category: 'evergreen_tree', species_name: '소나무(조형)',        spec: 'H8.0xW4.0xR40',      unit: '주', quantity: 0,
    periods: [] },

  { category: 'evergreen_tree', species_name: '소나무(조형)',        spec: 'H6.0xW3.5xR30',      unit: '주', quantity: 0,
    periods: [] },

  { category: 'evergreen_tree', species_name: '소나무(조형)-재배송', spec: 'H4.0xW1.8xR20',      unit: '주', quantity: 90,
    periods: [{ s: '2026-03-10', e: '2026-04-20' }] },

  { category: 'evergreen_tree', species_name: '스트로브잣나무',      spec: 'H2.5xW1.2',           unit: '주', quantity: 252,
    periods: [{ s: '2026-05-20', e: '2026-06-20' }, { s: '2026-08-10', e: '2026-09-10' }] },

  { category: 'evergreen_tree', species_name: '전나무',             spec: 'H2.5xW1.2',           unit: '주', quantity: 764,
    periods: [{ s: '2026-05-31', e: '2026-06-30' }, { s: '2026-08-31', e: '2026-09-30' }] },

  { category: 'evergreen_tree', species_name: '주목',               spec: 'H2.5xW1.5',           unit: '주', quantity: 84,
    periods: [{ s: '2026-04-10', e: '2026-05-31' }, { s: '2026-08-31', e: '2026-09-20' }] },

  // ── 2. 낙엽교목 ──────────────────────────────────────────────────────────
  { category: 'deciduous_tree', species_name: '감나무',             spec: 'H4.0xR15',            unit: '주', quantity: 35,
    periods: [{ s: '2026-03-10', e: '2026-04-10' }] },

  { category: 'deciduous_tree', species_name: '계수나무',           spec: 'H4.5xR15',            unit: '주', quantity: 93,
    periods: [{ s: '2026-03-20', e: '2026-04-30' }] },

  { category: 'deciduous_tree', species_name: '꽃사과',             spec: 'H3.0xR8',             unit: '주', quantity: 336,
    periods: [{ s: '2026-06-20', e: '2026-07-31' }] },

  { category: 'deciduous_tree', species_name: '느릅나무',           spec: 'H3.0xR8',             unit: '주', quantity: 153,
    periods: [{ s: '2026-05-20', e: '2026-06-30' }] },

  { category: 'deciduous_tree', species_name: '느티나무',           spec: 'H7.0xR50',            unit: '주', quantity: 3,
    periods: [{ s: '2026-02-10', e: '2026-03-10' }] },

  { category: 'deciduous_tree', species_name: '느티나무',           spec: 'H6.0xR40',            unit: '주', quantity: 5,
    periods: [{ s: '2026-02-20', e: '2026-03-10' }] },

  { category: 'deciduous_tree', species_name: '느티나무',           spec: 'H5.0xR30',            unit: '주', quantity: 20,
    periods: [{ s: '2026-03-10', e: '2026-04-10' }] },

  { category: 'deciduous_tree', species_name: '느티나무',           spec: 'H4.5xR20',            unit: '주', quantity: 227,
    periods: [{ s: '2026-03-10', e: '2026-05-10' }] },

  { category: 'deciduous_tree', species_name: '대왕참나무',         spec: 'H10.0xR50',           unit: '주', quantity: 0,
    periods: [] },

  { category: 'deciduous_tree', species_name: '대왕참나무',         spec: 'H4.5xR20',            unit: '주', quantity: 53,
    periods: [{ s: '2026-03-10', e: '2026-04-30' }] },

  { category: 'deciduous_tree', species_name: '대추나무',           spec: 'H3.0xR8',             unit: '주', quantity: 66,
    periods: [{ s: '2026-05-20', e: '2026-06-30' }] },

  { category: 'deciduous_tree', species_name: '매화나무',           spec: 'H3.0xR10',            unit: '주', quantity: 132,
    periods: [{ s: '2026-07-20', e: '2026-08-20' }] },

  { category: 'deciduous_tree', species_name: '모감주나무',         spec: 'H3.0xR8',             unit: '주', quantity: 133,
    periods: [{ s: '2026-05-10', e: '2026-06-20' }] },

  { category: 'deciduous_tree', species_name: '배롱나무',           spec: 'R30',                 unit: '주', quantity: 3,
    periods: [{ s: '2026-05-20', e: '2026-06-10' }] },

  { category: 'deciduous_tree', species_name: '배롱나무',           spec: 'H3.0xR10',            unit: '주', quantity: 127,
    periods: [{ s: '2026-04-20', e: '2026-05-31' }, { s: '2026-05-20', e: '2026-06-20', note: '2차 반입' }] },

  { category: 'deciduous_tree', species_name: '백목련',             spec: 'H3.0xR10',            unit: '주', quantity: 270,
    periods: [{ s: '2026-03-20', e: '2026-04-30' }] },

  { category: 'deciduous_tree', species_name: '복자기',             spec: 'H3.0xR8',             unit: '주', quantity: 144,
    periods: [{ s: '2026-05-20', e: '2026-07-10' }] },

  { category: 'deciduous_tree', species_name: '산딸나무',           spec: 'H3.5xR10',            unit: '주', quantity: 164,
    periods: [{ s: '2026-03-10', e: '2026-04-30' }] },

  { category: 'deciduous_tree', species_name: '산사나무',           spec: 'H3.0xR8',             unit: '주', quantity: 171,
    periods: [{ s: '2026-05-10', e: '2026-06-20' }] },

  { category: 'deciduous_tree', species_name: '산수유',             spec: 'R30',                 unit: '주', quantity: 5,
    periods: [{ s: '2026-03-20', e: '2026-04-30' }] },

  { category: 'deciduous_tree', species_name: '산수유',             spec: 'H2.5xR8',             unit: '주', quantity: 227,
    periods: [{ s: '2026-05-10', e: '2026-06-20' }, { s: '2026-06-10', e: '2026-07-20', note: '2차 반입' }] },

  { category: 'deciduous_tree', species_name: '살구나무',           spec: 'H3.0xR8',             unit: '주', quantity: 270,
    periods: [{ s: '2026-04-10', e: '2026-05-20' }, { s: '2026-05-20', e: '2026-06-10', note: '2차 반입' }] },

  { category: 'deciduous_tree', species_name: '왕벚나무',           spec: 'H4.0xB12',            unit: '주', quantity: 123,
    periods: [{ s: '2026-03-10', e: '2026-04-20' }] },

  { category: 'deciduous_tree', species_name: '이팝나무',           spec: 'H4.0xR15',            unit: '주', quantity: 130,
    periods: [{ s: '2026-03-10', e: '2026-04-20' }] },

  { category: 'deciduous_tree', species_name: '자엽자두',           spec: 'H3.0xR10',            unit: '주', quantity: 109,
    periods: [{ s: '2026-04-20', e: '2026-05-31' }] },

  { category: 'deciduous_tree', species_name: '중국단풍',           spec: 'H4.5xR20',            unit: '주', quantity: 159,
    periods: [{ s: '2026-03-10', e: '2026-05-20' }] },

  { category: 'deciduous_tree', species_name: '청단풍',             spec: 'H5.0xR30',            unit: '주', quantity: 12,
    periods: [{ s: '2026-02-20', e: '2026-03-20' }] },

  { category: 'deciduous_tree', species_name: '청단풍',             spec: 'H3.5xR12',            unit: '주', quantity: 32,
    periods: [{ s: '2026-03-10', e: '2026-04-10' }] },

  { category: 'deciduous_tree', species_name: '청단풍',             spec: 'H2.5xR8',             unit: '주', quantity: 221,
    periods: [{ s: '2026-04-20', e: '2026-06-10' }, { s: '2026-06-10', e: '2026-07-10', note: '2차 반입' }] },

  { category: 'deciduous_tree', species_name: '튜립나무',           spec: 'H4.5xR12',            unit: '주', quantity: 95,
    periods: [{ s: '2026-04-10', e: '2026-05-20' }] },

  { category: 'deciduous_tree', species_name: '팽나무',             spec: 'R80',                 unit: '주', quantity: 2,
    periods: [{ s: '2026-02-10', e: '2026-03-20' }] },

  { category: 'deciduous_tree', species_name: '팽나무',             spec: 'H10.0xR50',           unit: '주', quantity: 9,
    periods: [{ s: '2026-02-10', e: '2026-03-20' }] },

  { category: 'deciduous_tree', species_name: '팽나무',             spec: 'H7.0xR40',            unit: '주', quantity: 12,
    periods: [{ s: '2026-03-10', e: '2026-04-10' }] },

  { category: 'deciduous_tree', species_name: '팽나무',             spec: 'H6.0xR30',            unit: '주', quantity: 15,
    periods: [{ s: '2026-03-10', e: '2026-04-10' }] },

  { category: 'deciduous_tree', species_name: '회화나무',           spec: 'H4.5xR15',            unit: '주', quantity: 40,
    periods: [{ s: '2026-03-20', e: '2026-05-10' }] },

  // ── 3. 상록관목 ──────────────────────────────────────────────────────────
  { category: 'evergreen_shrub', species_name: '남천',              spec: 'H1.0x3가지',          unit: '주', quantity: 11300,
    periods: [{ s: '2026-08-10', e: '2026-10-31' }] },

  { category: 'evergreen_shrub', species_name: '눈주목',            spec: 'H0.3xW0.3',           unit: '주', quantity: 8000,
    periods: [{ s: '2026-04-10', e: '2026-05-31' }, { s: '2026-08-10', e: '2026-10-31', note: '2차 반입' }] },

  { category: 'evergreen_shrub', species_name: '사철나무',          spec: 'H1.0xW0.3',           unit: '주', quantity: 15600,
    periods: [{ s: '2026-09-10', e: '2026-10-31' }] },

  { category: 'evergreen_shrub', species_name: '영산홍',            spec: 'H0.3xW0.3',           unit: '주', quantity: 32000,
    periods: [{ s: '2026-04-10', e: '2026-05-31' }, { s: '2026-08-10', e: '2026-10-31', note: '2차 반입' }] },

  { category: 'evergreen_shrub', species_name: '회양목',            spec: 'H0.3xW0.3',           unit: '주', quantity: 67300,
    periods: [{ s: '2026-03-20', e: '2026-05-31' }, { s: '2026-08-10', e: '2026-10-31', note: '2차 반입' }] },

  // ── 4. 낙엽관목 ──────────────────────────────────────────────────────────
  { category: 'deciduous_shrub', species_name: '개쉬땅나무',        spec: 'H0.8',                unit: '주', quantity: 3000,
    periods: [{ s: '2026-08-10', e: '2026-10-31' }] },

  { category: 'deciduous_shrub', species_name: '공조팝나무',        spec: 'H0.8xW0.4',           unit: '주', quantity: 3000,
    periods: [{ s: '2026-08-10', e: '2026-10-31' }] },

  { category: 'deciduous_shrub', species_name: '꽃댕강나무',        spec: 'H0.8xW0.4',           unit: '주', quantity: 4000,
    periods: [{ s: '2026-08-10', e: '2026-10-31' }] },

  { category: 'deciduous_shrub', species_name: '나무수국',          spec: 'H1.0xW0.6',           unit: '주', quantity: 2000,
    periods: [{ s: '2026-08-10', e: '2026-10-31' }] },

  { category: 'deciduous_shrub', species_name: '낙상홍',            spec: 'H1.0xW0.4',           unit: '주', quantity: 2000,
    periods: [{ s: '2026-08-10', e: '2026-09-30' }] },

  { category: 'deciduous_shrub', species_name: '노랑말채나무',      spec: 'H1.0xW0.4',           unit: '주', quantity: 3000,
    periods: [{ s: '2026-08-10', e: '2026-09-30' }] },

  { category: 'deciduous_shrub', species_name: '백철쭉',            spec: 'H0.3xW0.3',           unit: '주', quantity: 28000,
    periods: [{ s: '2026-04-10', e: '2026-05-31' }, { s: '2026-08-10', e: '2026-10-31', note: '2차 반입' }] },

  { category: 'deciduous_shrub', species_name: '병꽃나무',          spec: 'H1.0xW0.4',           unit: '주', quantity: 5000,
    periods: [{ s: '2026-08-10', e: '2026-10-31' }] },

  { category: 'deciduous_shrub', species_name: '산수국',            spec: 'H0.3xW0.4',           unit: '주', quantity: 8000,
    periods: [{ s: '2026-08-10', e: '2026-10-31' }] },

  { category: 'deciduous_shrub', species_name: '산철쭉',            spec: 'H0.3xW0.3',           unit: '주', quantity: 33000,
    periods: [{ s: '2026-04-20', e: '2026-05-31' }, { s: '2026-08-10', e: '2026-10-31', note: '2차 반입' }] },

  { category: 'deciduous_shrub', species_name: '자산홍',            spec: 'H0.3xW0.3',           unit: '주', quantity: 31000,
    periods: [{ s: '2026-04-10', e: '2026-05-31' }, { s: '2026-08-10', e: '2026-10-31', note: '2차 반입' }] },

  { category: 'deciduous_shrub', species_name: '조팝나무',          spec: 'H0.8xW0.4',           unit: '주', quantity: 8500,
    periods: [
      { s: '2026-04-20', e: '2026-05-31', note: '소나무 포함 대형낙엽수 하부 관목식재' },
      { s: '2026-08-10', e: '2026-10-31', note: '2차 반입' }
    ] },

  { category: 'deciduous_shrub', species_name: '좀작살나무',        spec: 'H1.2xW0.4',           unit: '주', quantity: 3500,
    periods: [{ s: '2026-08-10', e: '2026-10-31' }] },

  { category: 'deciduous_shrub', species_name: '화살나무',          spec: 'H0.8xW0.4',           unit: '주', quantity: 4000,
    periods: [{ s: '2026-08-10', e: '2026-10-31' }] },

  { category: 'deciduous_shrub', species_name: '황매화',            spec: 'H1.0xW0.4',           unit: '주', quantity: 3000,
    periods: [{ s: '2026-08-10', e: '2026-09-30' }] },

  { category: 'deciduous_shrub', species_name: '흰말채나무',        spec: 'H1.0xW0.4',           unit: '주', quantity: 7000,
    periods: [{ s: '2026-08-10', e: '2026-10-31' }] },

  // ── 5. 지피 및 초화류 ─────────────────────────────────────────────────────
  { category: 'ground_flower', species_name: '구절초',              spec: '8cm',                 unit: '본', quantity: 3000,
    periods: [{ s: '2026-09-10', e: '2026-10-31' }] },

  { category: 'ground_flower', species_name: '돌단풍',              spec: '8cm',                 unit: '본', quantity: 3000,
    periods: [{ s: '2026-09-10', e: '2026-10-31' }] },

  { category: 'ground_flower', species_name: '맥문동',              spec: '8cm',                 unit: '본', quantity: 64000,
    periods: [{ s: '2026-09-10', e: '2026-10-31' }] },

  { category: 'ground_flower', species_name: '비비추',              spec: '8cm',                 unit: '본', quantity: 3000,
    periods: [{ s: '2026-09-10', e: '2026-10-31' }] },

  { category: 'ground_flower', species_name: '벌개미취',            spec: '8cm',                 unit: '본', quantity: 3000,
    periods: [{ s: '2026-09-10', e: '2026-10-31' }] },

  { category: 'ground_flower', species_name: '수호초',              spec: '8cm',                 unit: '본', quantity: 3000,
    periods: [{ s: '2026-09-10', e: '2026-10-31' }] },

  { category: 'ground_flower', species_name: '세덤류',              spec: '5종,8cm,옥상',         unit: '본', quantity: 54200,
    periods: [{ s: '2026-09-10', e: '2026-10-31' }] },

  { category: 'ground_flower', species_name: '초화특화',            spec: '-',                   unit: 'm²', quantity: 300,
    periods: [{ s: '2026-09-10', e: '2026-10-31' }] },

  { category: 'ground_flower', species_name: '잔디',                spec: '0.3*0.3*0.03',        unit: 'm²', quantity: 21130,
    periods: [
      { s: '2026-03-20', e: '2026-04-30', note: '단지경계부 자연석' },
      { s: '2026-08-10', e: '2026-10-31', note: '2차 반입' }
    ] },
];

async function run() {
  console.log('▶ 현장: 평택브레인시티공동1BL중흥S클래스 아파트신축공사 중 조경식재공사');

  const siteId = SITE_ID;

  // 2. 공정표 생성 (중복 방지)
  console.log('\n▶ 공정표 생성 중...');
  const { data: existingPlan } = await supabase
    .from('execution_plans')
    .select('id, title')
    .eq('site_id', siteId)
    .eq('start_date', PLAN.start_date)
    .maybeSingle();

  let planId;
  if (existingPlan) {
    planId = existingPlan.id;
    console.log(`  ⚠️  기존 공정표 존재: "${existingPlan.title}" (${planId}) — 항목만 추가합니다.`);
  } else {
    const { data: newPlan, error: pErr } = await supabase
      .from('execution_plans')
      .insert({ ...PLAN, site_id: siteId })
      .select()
      .single();
    if (pErr) { console.error('공정표 생성 실패:', pErr.message); process.exit(1); }
    planId = newPlan.id;
    console.log(`  ✅ 공정표 생성 완료 (${planId})`);
  }

  // 3. 항목 + 기간 일괄 입력
  console.log(`\n▶ 항목 ${ITEMS.length}건 입력 시작...\n`);
  let ok = 0, fail = 0;

  for (let i = 0; i < ITEMS.length; i++) {
    const item = ITEMS[i];
    const label = `${item.species_name} ${item.spec}`;

    const { data: inserted, error: iErr } = await supabase
      .from('execution_items')
      .insert({
        plan_id:      planId,
        category:     item.category,
        species_name: item.species_name,
        spec:         item.spec,
        unit:         item.unit,
        quantity:     item.quantity,
        sort_order:   i,
      })
      .select()
      .single();

    if (iErr) {
      console.error(`  ✗ [${label}] 항목 오류: ${iErr.message}`);
      fail++;
      continue;
    }

    for (const p of item.periods) {
      const { error: pErr } = await supabase
        .from('execution_item_periods')
        .insert({ item_id: inserted.id, start_date: p.s, end_date: p.e, note: p.note || '' });
      if (pErr) console.warn(`    ⚠️  기간 추가 실패 (${p.s}~${p.e}): ${pErr.message}`);
    }

    console.log(`  ✅ [${String(i+1).padStart(2)}] ${label} — ${item.quantity.toLocaleString()}${item.unit}, 기간 ${item.periods.length}건`);
    ok++;
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`완료: 성공 ${ok}건, 실패 ${fail}건`);
  console.log(`공정표 URL: /database/execution-plans/site/${siteId}?planId=${planId}`);
}

run().catch(err => { console.error('예외 발생:', err); process.exit(1); });
