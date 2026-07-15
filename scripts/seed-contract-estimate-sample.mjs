// 평택 조경식재공사 계약 내역 샘플 데이터 시드
// 실행: node scripts/seed-contract-estimate-sample.mjs

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dzouudutnlgaolzlsfzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6b3V1ZHV0bmxnYW9semxzZnpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTcxNTI4MiwiZXhwIjoyMDY1MjkxMjgyfQ.wuhIdzxHJ4wyPEFSS98ZzsoRAPjUxkloQdLgQCVpKdE'
);

const SITE_ID = '5164f8a9-3ead-4d56-a81e-c62e08323747'; // 평택 조경식재공사

// ─── 엑셀에서 읽은 실제 데이터 (변경후 기준) ───
const ITEMS = [
  // 1. 상록교목
  { category: 'evergreen_tree', item_name: '반송', spec: 'H1.5×W2.0', unit: '주', quantity: 50, material_unit_price: 120000, labor_unit_price: 8500, overhead_unit_price: 0, material_amount: 6000000, labor_amount: 425000, overhead_amount: 0, total_amount: 6425000 },
  { category: 'evergreen_tree', item_name: '서양측백', spec: 'H2.5×W0.8', unit: '주', quantity: 172, material_unit_price: 35000, labor_unit_price: 5200, overhead_unit_price: 0, material_amount: 6020000, labor_amount: 894400, overhead_amount: 0, total_amount: 6914400 },
  { category: 'evergreen_tree', item_name: '소나무(둥근형)', spec: 'H6.0', unit: '주', quantity: 10, material_unit_price: 2800000, labor_unit_price: 85000, overhead_unit_price: 0, material_amount: 28000000, labor_amount: 850000, overhead_amount: 0, total_amount: 28850000 },
  { category: 'evergreen_tree', item_name: '소나무(노송)', spec: 'R70', unit: '주', quantity: 3, material_unit_price: 12000000, labor_unit_price: 320000, overhead_unit_price: 0, material_amount: 36000000, labor_amount: 960000, overhead_amount: 0, total_amount: 36960000 },
  { category: 'evergreen_tree', item_name: '소나무(노송)', spec: 'R60', unit: '주', quantity: 5, material_unit_price: 8500000, labor_unit_price: 280000, overhead_unit_price: 0, material_amount: 42500000, labor_amount: 1400000, overhead_amount: 0, total_amount: 43900000 },
  { category: 'evergreen_tree', item_name: '소나무(조형)', spec: 'R30', unit: '주', quantity: 15, material_unit_price: 1800000, labor_unit_price: 65000, overhead_unit_price: 0, material_amount: 27000000, labor_amount: 975000, overhead_amount: 0, total_amount: 27975000 },
  { category: 'evergreen_tree', item_name: '스트로브잣나무', spec: 'H2.5×W1.2', unit: '주', quantity: 252, material_unit_price: 42000, labor_unit_price: 5800, overhead_unit_price: 0, material_amount: 10584000, labor_amount: 1461600, overhead_amount: 0, total_amount: 12045600 },
  { category: 'evergreen_tree', item_name: '전나무', spec: 'H2.5×W1.2', unit: '주', quantity: 764, material_unit_price: 38000, labor_unit_price: 5200, overhead_unit_price: 0, material_amount: 29032000, labor_amount: 3972800, overhead_amount: 0, total_amount: 33004800 },
  { category: 'evergreen_tree', item_name: '주목', spec: 'H2.5×W1.0', unit: '주', quantity: 120, material_unit_price: 55000, labor_unit_price: 6500, overhead_unit_price: 0, material_amount: 6600000, labor_amount: 780000, overhead_amount: 0, total_amount: 7380000 },
  { category: 'evergreen_tree', item_name: '레드로빈', spec: 'H2.0×W0.8', unit: '주', quantity: 85, material_unit_price: 28000, labor_unit_price: 4800, overhead_unit_price: 0, material_amount: 2380000, labor_amount: 408000, overhead_amount: 0, total_amount: 2788000 },
  { category: 'evergreen_tree', item_name: '에메랄드그린', spec: 'H1.5×W0.4', unit: '주', quantity: 430, material_unit_price: 18000, labor_unit_price: 3500, overhead_unit_price: 0, material_amount: 7740000, labor_amount: 1505000, overhead_amount: 0, total_amount: 9245000 },

  // 2. 낙엽교목
  { category: 'deciduous_tree', item_name: '감나무', spec: 'H4.0×R15', unit: '주', quantity: 35, material_unit_price: 85000, labor_unit_price: 9500, overhead_unit_price: 0, material_amount: 2975000, labor_amount: 332500, overhead_amount: 0, total_amount: 3307500 },
  { category: 'deciduous_tree', item_name: '꽃사과', spec: 'H3.0×R8', unit: '주', quantity: 150, material_unit_price: 42000, labor_unit_price: 6200, overhead_unit_price: 0, material_amount: 6300000, labor_amount: 930000, overhead_amount: 0, total_amount: 7230000 },
  { category: 'deciduous_tree', item_name: '느티나무', spec: 'H7.0×R50', unit: '주', quantity: 8, material_unit_price: 3500000, labor_unit_price: 120000, overhead_unit_price: 0, material_amount: 28000000, labor_amount: 960000, overhead_amount: 0, total_amount: 28960000 },
  { category: 'deciduous_tree', item_name: '느티나무', spec: 'H6.0×R40', unit: '주', quantity: 12, material_unit_price: 2200000, labor_unit_price: 95000, overhead_unit_price: 0, material_amount: 26400000, labor_amount: 1140000, overhead_amount: 0, total_amount: 27540000 },
  { category: 'deciduous_tree', item_name: '느티나무', spec: 'H5.0×R30', unit: '주', quantity: 25, material_unit_price: 1200000, labor_unit_price: 75000, overhead_unit_price: 0, material_amount: 30000000, labor_amount: 1875000, overhead_amount: 0, total_amount: 31875000 },
  { category: 'deciduous_tree', item_name: '대왕참나무', spec: 'H10.0×R50', unit: '주', quantity: 5, material_unit_price: 4500000, labor_unit_price: 145000, overhead_unit_price: 0, material_amount: 22500000, labor_amount: 725000, overhead_amount: 0, total_amount: 23225000 },
  { category: 'deciduous_tree', item_name: '매화나무', spec: 'H3.0×R10', unit: '주', quantity: 45, material_unit_price: 65000, labor_unit_price: 8000, overhead_unit_price: 0, material_amount: 2925000, labor_amount: 360000, overhead_amount: 0, total_amount: 3285000 },
  { category: 'deciduous_tree', item_name: '배롱나무', spec: 'R30', unit: '주', quantity: 20, material_unit_price: 550000, labor_unit_price: 42000, overhead_unit_price: 0, material_amount: 11000000, labor_amount: 840000, overhead_amount: 0, total_amount: 11840000 },
  { category: 'deciduous_tree', item_name: '백목련', spec: 'H4.0×R12', unit: '주', quantity: 30, material_unit_price: 95000, labor_unit_price: 10500, overhead_unit_price: 0, material_amount: 2850000, labor_amount: 315000, overhead_amount: 0, total_amount: 3165000 },
  { category: 'deciduous_tree', item_name: '산딸나무', spec: 'H3.5×R10', unit: '주', quantity: 40, material_unit_price: 72000, labor_unit_price: 8500, overhead_unit_price: 0, material_amount: 2880000, labor_amount: 340000, overhead_amount: 0, total_amount: 3220000 },
  { category: 'deciduous_tree', item_name: '산수유', spec: 'H3.0×R8', unit: '주', quantity: 55, material_unit_price: 48000, labor_unit_price: 6800, overhead_unit_price: 0, material_amount: 2640000, labor_amount: 374000, overhead_amount: 0, total_amount: 3014000 },
  { category: 'deciduous_tree', item_name: '왕벚나무', spec: 'H5.0×B12', unit: '주', quantity: 60, material_unit_price: 280000, labor_unit_price: 32000, overhead_unit_price: 0, material_amount: 16800000, labor_amount: 1920000, overhead_amount: 0, total_amount: 18720000 },
  { category: 'deciduous_tree', item_name: '이팝나무', spec: 'H4.5×R15', unit: '주', quantity: 48, material_unit_price: 150000, labor_unit_price: 18000, overhead_unit_price: 0, material_amount: 7200000, labor_amount: 864000, overhead_amount: 0, total_amount: 8064000 },
  { category: 'deciduous_tree', item_name: '자엽자두', spec: 'H3.0×R8', unit: '주', quantity: 35, material_unit_price: 55000, labor_unit_price: 7200, overhead_unit_price: 0, material_amount: 1925000, labor_amount: 252000, overhead_amount: 0, total_amount: 2177000 },
  { category: 'deciduous_tree', item_name: '팽나무', spec: 'H6.0×R40', unit: '주', quantity: 6, material_unit_price: 2800000, labor_unit_price: 105000, overhead_unit_price: 0, material_amount: 16800000, labor_amount: 630000, overhead_amount: 0, total_amount: 17430000 },
  { category: 'deciduous_tree', item_name: '층층나무', spec: 'H4.0×R12', unit: '주', quantity: 22, material_unit_price: 88000, labor_unit_price: 9800, overhead_unit_price: 0, material_amount: 1936000, labor_amount: 215600, overhead_amount: 0, total_amount: 2151600 },
  { category: 'deciduous_tree', item_name: '회화나무', spec: 'H5.0×B12', unit: '주', quantity: 18, material_unit_price: 320000, labor_unit_price: 38000, overhead_unit_price: 0, material_amount: 5760000, labor_amount: 684000, overhead_amount: 0, total_amount: 6444000 },

  // 3. 상록관목
  { category: 'evergreen_shrub', item_name: '남천', spec: 'H0.6×W0.3', unit: '주', quantity: 11300, material_unit_price: 3200, labor_unit_price: 850, overhead_unit_price: 0, material_amount: 36160000, labor_amount: 9605000, overhead_amount: 0, total_amount: 45765000 },
  { category: 'evergreen_shrub', item_name: '눈주목', spec: 'H0.3×W0.3', unit: '주', quantity: 8000, material_unit_price: 2800, labor_unit_price: 720, overhead_unit_price: 0, material_amount: 22400000, labor_amount: 5760000, overhead_amount: 0, total_amount: 28160000 },
  { category: 'evergreen_shrub', item_name: '사철나무', spec: 'H1.0×W0.3', unit: '주', quantity: 15600, material_unit_price: 2200, labor_unit_price: 680, overhead_unit_price: 0, material_amount: 34320000, labor_amount: 10608000, overhead_amount: 0, total_amount: 44928000 },
  { category: 'evergreen_shrub', item_name: '영산홍', spec: 'H0.3×W0.3', unit: '주', quantity: 32000, material_unit_price: 1800, labor_unit_price: 580, overhead_unit_price: 0, material_amount: 57600000, labor_amount: 18560000, overhead_amount: 0, total_amount: 76160000 },
  { category: 'evergreen_shrub', item_name: '회양목', spec: 'H0.3×W0.3', unit: '주', quantity: 67300, material_unit_price: 1500, labor_unit_price: 520, overhead_unit_price: 0, material_amount: 100950000, labor_amount: 34996000, overhead_amount: 0, total_amount: 135946000 },

  // 4. 낙엽관목
  { category: 'deciduous_shrub', item_name: '개쉬땅나무', spec: 'H1.0×W0.4', unit: '주', quantity: 3500, material_unit_price: 3500, labor_unit_price: 920, overhead_unit_price: 0, material_amount: 12250000, labor_amount: 3220000, overhead_amount: 0, total_amount: 15470000 },
  { category: 'deciduous_shrub', item_name: '공조팝나무', spec: 'H0.6×W0.3', unit: '주', quantity: 5200, material_unit_price: 2200, labor_unit_price: 680, overhead_unit_price: 0, material_amount: 11440000, labor_amount: 3536000, overhead_amount: 0, total_amount: 14976000 },
  { category: 'deciduous_shrub', item_name: '나무수국', spec: 'H0.8×W0.4', unit: '주', quantity: 2800, material_unit_price: 4500, labor_unit_price: 980, overhead_unit_price: 0, material_amount: 12600000, labor_amount: 2744000, overhead_amount: 0, total_amount: 15344000 },
  { category: 'deciduous_shrub', item_name: '낙상홍', spec: 'H0.8×W0.4', unit: '주', quantity: 4100, material_unit_price: 3800, labor_unit_price: 850, overhead_unit_price: 0, material_amount: 15580000, labor_amount: 3485000, overhead_amount: 0, total_amount: 19065000 },
  { category: 'deciduous_shrub', item_name: '백철쭉', spec: 'H0.4×W0.4', unit: '주', quantity: 8500, material_unit_price: 2800, labor_unit_price: 720, overhead_unit_price: 0, material_amount: 23800000, labor_amount: 6120000, overhead_amount: 0, total_amount: 29920000 },
  { category: 'deciduous_shrub', item_name: '산수국', spec: 'H0.4×W0.4', unit: '주', quantity: 3200, material_unit_price: 3200, labor_unit_price: 820, overhead_unit_price: 0, material_amount: 10240000, labor_amount: 2624000, overhead_amount: 0, total_amount: 12864000 },
  { category: 'deciduous_shrub', item_name: '산철쭉', spec: 'H0.4×W0.4', unit: '주', quantity: 12000, material_unit_price: 2500, labor_unit_price: 680, overhead_unit_price: 0, material_amount: 30000000, labor_amount: 8160000, overhead_amount: 0, total_amount: 38160000 },
  { category: 'deciduous_shrub', item_name: '화살나무', spec: 'H0.6×W0.4', unit: '주', quantity: 6800, material_unit_price: 2800, labor_unit_price: 720, overhead_unit_price: 0, material_amount: 19040000, labor_amount: 4896000, overhead_amount: 0, total_amount: 23936000 },
  { category: 'deciduous_shrub', item_name: '황매화', spec: 'H0.6×W0.3', unit: '주', quantity: 4500, material_unit_price: 2200, labor_unit_price: 620, overhead_unit_price: 0, material_amount: 9900000, labor_amount: 2790000, overhead_amount: 0, total_amount: 12690000 },

  // 5. 지피 및 초화류
  { category: 'ground_flower', item_name: '맥문동', spec: '8cm포', unit: '본', quantity: 45000, material_unit_price: 380, labor_unit_price: 120, overhead_unit_price: 0, material_amount: 17100000, labor_amount: 5400000, overhead_amount: 0, total_amount: 22500000 },
  { category: 'ground_flower', item_name: '비비추', spec: '8cm포', unit: '본', quantity: 28000, material_unit_price: 420, labor_unit_price: 130, overhead_unit_price: 0, material_amount: 11760000, labor_amount: 3640000, overhead_amount: 0, total_amount: 15400000 },
  { category: 'ground_flower', item_name: '수호초', spec: '8cm포', unit: '본', quantity: 18000, material_unit_price: 350, labor_unit_price: 115, overhead_unit_price: 0, material_amount: 6300000, labor_amount: 2070000, overhead_amount: 0, total_amount: 8370000 },
  { category: 'ground_flower', item_name: '초화특화', spec: '계절초화', unit: 'm2', quantity: 300, material_unit_price: 550000, labor_unit_price: 25000, overhead_unit_price: 0, material_amount: 165000000, labor_amount: 7500000, overhead_amount: 0, total_amount: 172500000 },
  { category: 'ground_flower', item_name: '잔디', spec: '0.3×0.3×0.03', unit: 'm2', quantity: 21130, material_unit_price: 2870, labor_unit_price: 3500, overhead_unit_price: 0, material_amount: 60642100, labor_amount: 73955000, overhead_amount: 0, total_amount: 134597100 },

  // 6. 식재부대공사
  { category: 'supplementary', item_name: '조경토 고르기', spec: 'BH0.15+인력', unit: 'm2', quantity: 38333, material_unit_price: 0, labor_unit_price: 1850, overhead_unit_price: 320, material_amount: 0, labor_amount: 70916050, overhead_amount: 12266560, total_amount: 83182610 },
  { category: 'supplementary', item_name: '조경토 반입(마사토)', spec: '', unit: 'm3', quantity: 11300, material_unit_price: 42000, labor_unit_price: 3200, overhead_unit_price: 8500, material_amount: 474600000, labor_amount: 36160000, overhead_amount: 96050000, total_amount: 606810000 },
  { category: 'supplementary', item_name: '혼합토(옥상)', spec: '인공토양', unit: 'm3', quantity: 271, material_unit_price: 85000, labor_unit_price: 12000, overhead_unit_price: 0, material_amount: 23035000, labor_amount: 3252000, overhead_amount: 0, total_amount: 26287000 },
  { category: 'supplementary', item_name: '방근시트(옥상)', spec: '', unit: 'm2', quantity: 1355, material_unit_price: 18500, labor_unit_price: 2800, overhead_unit_price: 0, material_amount: 25067500, labor_amount: 3794000, overhead_amount: 0, total_amount: 28861500 },
  { category: 'supplementary', item_name: '배수판(옥상)', spec: 'T30', unit: 'm2', quantity: 1355, material_unit_price: 12000, labor_unit_price: 1800, overhead_unit_price: 0, material_amount: 16260000, labor_amount: 2439000, overhead_amount: 0, total_amount: 18699000 },
  { category: 'supplementary', item_name: '부직포(옥상)', spec: '', unit: 'm2', quantity: 1698, material_unit_price: 2500, labor_unit_price: 800, overhead_unit_price: 0, material_amount: 4245000, labor_amount: 1358400, overhead_amount: 0, total_amount: 5603400 },
  { category: 'supplementary', item_name: '화산석 멀칭(옥상)', spec: 'T30', unit: 'm2', quantity: 1355, material_unit_price: 22000, labor_unit_price: 3500, overhead_unit_price: 0, material_amount: 29810000, labor_amount: 4742500, overhead_amount: 0, total_amount: 34552500 },
  { category: 'supplementary', item_name: '루프엣지', spec: 'T230', unit: 'm', quantity: 340, material_unit_price: 35000, labor_unit_price: 5500, overhead_unit_price: 0, material_amount: 11900000, labor_amount: 1870000, overhead_amount: 0, total_amount: 13770000 },
  { category: 'supplementary', item_name: '경관석 놓기', spec: '2~5ton', unit: 'ton', quantity: 300, material_unit_price: 180000, labor_unit_price: 28000, overhead_unit_price: 45000, material_amount: 54000000, labor_amount: 8400000, overhead_amount: 13500000, total_amount: 75900000 },
  { category: 'supplementary', item_name: '지주목(삼발이대형)', spec: '', unit: '주', quantity: 88, material_unit_price: 42000, labor_unit_price: 8500, overhead_unit_price: 0, material_amount: 3696000, labor_amount: 748000, overhead_amount: 0, total_amount: 4444000 },
  { category: 'supplementary', item_name: '지주목(삼발이소형)', spec: '', unit: '주', quantity: 452, material_unit_price: 22000, labor_unit_price: 5200, overhead_unit_price: 0, material_amount: 9944000, labor_amount: 2350400, overhead_amount: 0, total_amount: 12294400 },
  { category: 'supplementary', item_name: '지주목(연계형)', spec: '', unit: '주', quantity: 1240, material_unit_price: 8500, labor_unit_price: 2800, overhead_unit_price: 0, material_amount: 10540000, labor_amount: 3472000, overhead_amount: 0, total_amount: 14012000 },
  { category: 'supplementary', item_name: '로프지주(와이어형)', spec: '', unit: '주', quantity: 185, material_unit_price: 32000, labor_unit_price: 6500, overhead_unit_price: 0, material_amount: 5920000, labor_amount: 1202500, overhead_amount: 0, total_amount: 7122500 },
  { category: 'supplementary', item_name: '시비(유기질비료)', spec: '20kg', unit: '포', quantity: 1500, material_unit_price: 3150, labor_unit_price: 0, overhead_unit_price: 0, material_amount: 4725000, labor_amount: 0, overhead_amount: 0, total_amount: 4725000 },
  { category: 'supplementary', item_name: '바크', spec: '30L', unit: '포', quantity: 5000, material_unit_price: 2250, labor_unit_price: 480, overhead_unit_price: 0, material_amount: 11250000, labor_amount: 2400000, overhead_amount: 0, total_amount: 13650000 },
  { category: 'supplementary', item_name: '수목명패(부착형)', spec: '', unit: 'EA', quantity: 150, material_unit_price: 8500, labor_unit_price: 1200, overhead_unit_price: 0, material_amount: 1275000, labor_amount: 180000, overhead_amount: 0, total_amount: 1455000 },
  { category: 'supplementary', item_name: '장비신호수', spec: '', unit: '식', quantity: 1, material_unit_price: 0, labor_unit_price: 50000000, overhead_unit_price: 0, material_amount: 0, labor_amount: 50000000, overhead_amount: 0, total_amount: 50000000 },

  // 7. 유지관리공사
  { category: 'maintenance', item_name: '관수', spec: '연1회×3년', unit: '회', quantity: 3, material_unit_price: 0, labor_unit_price: 1400000, overhead_unit_price: 5600000, material_amount: 0, labor_amount: 4200000, overhead_amount: 16800000, total_amount: 21000000 },
  { category: 'maintenance', item_name: '병해충 방제', spec: '연2회×3년', unit: '회', quantity: 6, material_unit_price: 280000, labor_unit_price: 850000, overhead_unit_price: 0, material_amount: 1680000, labor_amount: 5100000, overhead_amount: 0, total_amount: 6780000 },
  { category: 'maintenance', item_name: '월동준비작업', spec: '연1회×3년', unit: '회', quantity: 3, material_unit_price: 120000, labor_unit_price: 1200000, overhead_unit_price: 0, material_amount: 360000, labor_amount: 3600000, overhead_amount: 0, total_amount: 3960000 },
  { category: 'maintenance', item_name: '제초작업', spec: '연2회×2년+연1회', unit: '회', quantity: 4, material_unit_price: 0, labor_unit_price: 2800000, overhead_unit_price: 0, material_amount: 0, labor_amount: 11200000, overhead_amount: 0, total_amount: 11200000 },
  { category: 'maintenance', item_name: '잔디깎기', spec: '연2회×2년+연1회', unit: '회', quantity: 4, material_unit_price: 0, labor_unit_price: 1850000, overhead_unit_price: 850000, material_amount: 0, labor_amount: 7400000, overhead_amount: 3400000, total_amount: 10800000 },
  { category: 'maintenance', item_name: '지주목 재결속', spec: '연1회×3년', unit: '회', quantity: 3, material_unit_price: 0, labor_unit_price: 950000, overhead_unit_price: 0, material_amount: 0, labor_amount: 2850000, overhead_amount: 0, total_amount: 2850000 },
];

async function seed() {
  console.log('샘플 데이터 삽입 시작...');

  // 기존 데이터 삭제
  const { data: existing } = await supabase
    .from('contract_estimates')
    .select('id')
    .eq('site_id', SITE_ID);

  if (existing?.length > 0) {
    console.log(`기존 버전 ${existing.length}개 삭제 중...`);
    await supabase.from('contract_estimates').delete().eq('site_id', SITE_ID);
  }

  // ─── v1: 원계약 삽입 ───
  const { data: v1, error: v1Err } = await supabase
    .from('contract_estimates')
    .insert({
      site_id: SITE_ID,
      version: 1,
      version_label: '원계약',
      version_date: '2025-09-01',
      is_current: false,
    })
    .select()
    .single();

  if (v1Err) { console.error('v1 오류:', v1Err.message); process.exit(1); }
  console.log('v1 원계약 생성:', v1.id);

  // 원계약 항목 삽입 (수량 살짝 다르게)
  const v1Items = ITEMS.map((item, idx) => ({
    estimate_id: v1.id,
    sort_order: idx,
    ...item,
    // 원계약은 수량이 약간 다름 (변경 차이를 보여주기 위해)
    quantity: item.category === 'deciduous_tree' && item.item_name === '꽃사과'
      ? 336  // 원계약은 336주 (변경 후 150주로 줄어든 항목)
      : item.quantity,
    total_amount: item.category === 'deciduous_tree' && item.item_name === '꽃사과'
      ? Math.round(item.total_amount * (336 / 150))
      : item.total_amount,
  }));

  const { error: v1ItemErr } = await supabase.from('contract_estimate_items').insert(v1Items);
  if (v1ItemErr) { console.error('v1 항목 오류:', v1ItemErr.message); process.exit(1); }
  console.log(`v1 항목 ${v1Items.length}개 삽입 완료`);

  // ─── v2: 설계변경 1차 삽입 ───
  const { data: v2, error: v2Err } = await supabase
    .from('contract_estimates')
    .insert({
      site_id: SITE_ID,
      version: 2,
      version_label: '설계변경 1차',
      version_date: '2026-03-12',
      is_current: true,
    })
    .select()
    .single();

  if (v2Err) { console.error('v2 오류:', v2Err.message); process.exit(1); }
  console.log('v2 설계변경 1차 생성:', v2.id);

  const v2Items = ITEMS.map((item, idx) => ({
    estimate_id: v2.id,
    sort_order: idx,
    ...item,
  }));

  const { error: v2ItemErr } = await supabase.from('contract_estimate_items').insert(v2Items);
  if (v2ItemErr) { console.error('v2 항목 오류:', v2ItemErr.message); process.exit(1); }
  console.log(`v2 항목 ${v2Items.length}개 삽입 완료`);

  console.log('\n완료! /database/contract-estimates 에서 확인하세요.');
}

seed().catch(console.error);
