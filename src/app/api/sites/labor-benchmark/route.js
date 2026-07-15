import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 관목 담당 직종 (부산에코 실적 기준)
const SHRUB_WORKER_TYPES = new Set(['관목식재공']);
// 교목 담당 직종
const TREE_WORKER_TYPES = new Set(['식재공', '조경공', '보통인부', '보통인부(식재)', '식재반장']);

function parseSpec(spec) {
  const s = (spec || '').toUpperCase().replace(/\s/g, '');
  const get = (key) => { const m = s.match(new RegExp(key + '([\\d.]+)')); return m ? parseFloat(m[1]) : null; };
  return { H: get('H'), R: get('R'), B: get('B'), W: get('W') };
}

function safeInt(v) {
  const n = parseInt(String(v ?? '0').replace(/,/g, '').replace(/^-$/, '0'));
  return isNaN(n) || n < 0 ? 0 : n;
}

function matchStandard(standards, item, spec) {
  const parsed = parseSpec(spec);

  const SHRUB_KEYWORDS = ['철쭉', '산철쭉', '진달래', '회양목', '쥐똥', '수수꽃다리', '조팝', '개나리', '무궁화', '화살나무', '병꽃', '황매화', '꽝꽝', '남천', '사철나무', '눈향'];
  const GROUND_KEYWORDS = ['잔디', '맥문동', '수크령', '억새', '구절초', '원추리', '붓꽃', '비비추', '수선화', '지피', '초화'];

  const itemLower = (item || '').toLowerCase();
  const isGround = GROUND_KEYWORDS.some(k => itemLower.includes(k));
  const isShrub = SHRUB_KEYWORDS.some(k => itemLower.includes(k)) || (!isGround && parsed.H && parsed.H <= 1.2);
  const cat = isGround ? null : (isShrub ? '관목' : '교목');
  if (!cat) return null;

  let specType, specVal;
  if (cat === '교목') {
    if (parsed.B)      { specType = 'B'; specVal = parsed.B; }
    else if (parsed.R) { specType = 'R'; specVal = parsed.R; }
    else if (parsed.H) { specType = 'H'; specVal = parsed.H; }
  } else {
    specType = 'H'; specVal = parsed.H || 0.3;
  }
  if (!specVal) return null;

  const method = cat === '교목' ? '기계' : '인력';
  return standards.find(s =>
    s.category === cat &&
    s.spec_type === specType &&
    specVal > s.spec_min &&
    specVal <= s.spec_max &&
    s.work_method === method
  ) || null;
}

// 부산에코 실적에서 교목/관목별 생산성(주/인·일) 계산
function calcBenchmarkProductivity(reports, standards) {
  const shrubDays = [], treeDays = [];

  for (const rep of reports || []) {
    let notes = rep.notes;
    if (typeof notes === 'string') { try { notes = JSON.parse(notes); } catch { continue; } }
    if (!notes) continue;

    const labor = notes.labor_costs || [];
    const ledger = notes.manual_ledger || [];

    const shrubWorkers = labor.reduce((s, r) => s + (SHRUB_WORKER_TYPES.has(r.type) ? safeInt(r.count) : 0), 0);
    const treeWorkers  = labor.reduce((s, r) => s + (TREE_WORKER_TYPES.has(r.type)  ? safeInt(r.count) : 0), 0);

    let shrubPlanted = 0, treePlanted = 0;
    for (const row of ledger) {
      if (row.isPastRecord) continue;
      const planted = safeInt(row.planted);
      if (!planted) continue;
      const matched = matchStandard(standards, row.item, row.spec);
      if (!matched) continue;
      if (matched.category === '관목') shrubPlanted += planted;
      else if (matched.category === '교목') treePlanted += planted;
    }

    if (shrubWorkers > 0 && shrubPlanted > 0) shrubDays.push(shrubPlanted / shrubWorkers);
    if (treeWorkers  > 0 && treePlanted  > 0) treeDays.push(treePlanted  / treeWorkers);
  }

  return {
    shrub: shrubDays.length ? shrubDays.reduce((s, v) => s + v, 0) / shrubDays.length : null,
    tree:  treeDays.length  ? treeDays.reduce((s, v)  => s + v, 0) / treeDays.length  : null,
    shrubDayCount: shrubDays.length,
    treeDayCount:  treeDays.length,
  };
}

// GET /api/sites/labor-benchmark
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const refSiteId = searchParams.get('refSiteId');

  const [{ data: standards }, { data: refSiteRows }] = await Promise.all([
    supabase.from('planting_standards').select('*'),
    refSiteId
      ? supabase.from('construction_sites').select('id, name').eq('id', refSiteId).limit(1)
      : supabase.from('construction_sites').select('id, name').ilike('name', '%에코델타%').limit(1),
  ]);

  const refSite = refSiteRows?.[0] || null;
  let benchmark = null;

  if (refSite) {
    const { data: reports } = await supabase
      .from('daily_site_reports')
      .select('report_date, notes')
      .eq('site_id', refSite.id)
      .order('report_date', { ascending: true });

    const prod = calcBenchmarkProductivity(reports, standards || []);
    if (prod.shrub || prod.tree) {
      benchmark = {
        siteName: refSite.name,
        shrubProductivity: prod.shrub ? Math.round(prod.shrub * 10) / 10 : null,
        treeProductivity:  prod.tree  ? Math.round(prod.tree  * 10) / 10 : null,
        shrubDayCount: prod.shrubDayCount,
        treeDayCount:  prod.treeDayCount,
      };
    }
  }

  return Response.json({ standards: standards || [], benchmark });
}

// POST /api/sites/labor-benchmark
// body: { items: [{ item, spec, incoming }] }
export async function POST(request) {
  const { items = [] } = await request.json().catch(() => ({ items: [] }));

  const [{ data: standards }, { data: refSiteRows }] = await Promise.all([
    supabase.from('planting_standards').select('*'),
    supabase.from('construction_sites').select('id').ilike('name', '%에코델타%').limit(1),
  ]);

  // 부산에코 실적 생산성 (교목/관목 분리)
  let shrubProductivity = null, treeProductivity = null;
  const refSiteId = refSiteRows?.[0]?.id;
  if (refSiteId) {
    const { data: reports } = await supabase
      .from('daily_site_reports')
      .select('notes')
      .eq('site_id', refSiteId);

    const prod = calcBenchmarkProductivity(reports, standards || []);
    shrubProductivity = prod.shrub;
    treeProductivity  = prod.tree;
  }

  const recommendations = [];
  let totalSkilled = 0, totalUnskilled = 0, totalExcavator = 0, totalCrane = 0;

  for (const item of items) {
    const incoming = safeInt(item.incoming);
    if (!incoming) continue;

    const std = matchStandard(standards || [], item.item, item.spec);
    if (!std || !std.trees_per_day) {
      recommendations.push({ item: item.item, spec: item.spec, incoming, matched: false });
      continue;
    }

    const skilled   = std.skilled_workers || 0;
    const unskilled = std.unskilled_workers || 0;
    const excavator = std.excavator || 0;
    const crane     = std.crane || 0;
    const stdTotal  = skilled + unskilled;

    // 카테고리별 실적 생산성 선택
    const benchmarkProductivity = std.category === '관목' ? shrubProductivity : treeProductivity;

    let finalSkilled = skilled;
    let finalUnskilled = unskilled;
    let avgTreesPerDay = std.trees_per_day;

    if (benchmarkProductivity && benchmarkProductivity > 0 && stdTotal > 0) {
      // 실적 생산성(주/인·일) → 표준 팀 기준 주/일로 환산
      const benchmarkTreesPerDay = benchmarkProductivity * stdTotal;
      avgTreesPerDay = (std.trees_per_day + benchmarkTreesPerDay) / 2;

      const avgTotalWorkers = Math.round((incoming / avgTreesPerDay) * stdTotal);
      const ratio = skilled / stdTotal;
      finalSkilled   = Math.max(1, Math.round(avgTotalWorkers * ratio));
      finalUnskilled = Math.max(0, avgTotalWorkers - finalSkilled);
    }

    totalSkilled   = Math.max(totalSkilled, finalSkilled);
    totalUnskilled = Math.max(totalUnskilled, finalUnskilled);
    totalExcavator = Math.max(totalExcavator, excavator);
    totalCrane     = Math.max(totalCrane, crane);

    recommendations.push({
      item: item.item,
      spec: item.spec,
      incoming,
      treesPerDay: Math.round(avgTreesPerDay * 10) / 10,
      daysNeeded: Math.round((incoming / avgTreesPerDay) * 10) / 10,
      skilled: finalSkilled,
      unskilled: finalUnskilled,
      excavator,
      crane,
      category: std.category,
      method: std.work_method,
      matched: true,
      hasBenchmark: !!benchmarkProductivity,
    });
  }

  return Response.json({
    recommendations,
    totalSkilled,
    totalUnskilled,
    totalExcavator,
    totalCrane,
    hasBenchmark: !!(shrubProductivity || treeProductivity),
  });
}
