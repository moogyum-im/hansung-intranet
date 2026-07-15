import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 직종 분류
const SHRUB_WORKER_TYPES = new Set(['관목식재공']);
const TREE_WORKER_TYPES  = new Set(['식재공', '조경공', '보통인부', '보통인부(식재)', '식재반장']);
const TURF_WORKER_TYPES  = new Set(['잔디남', '잔디여', '잔디2', '잔디2(남)', '잔디2(여)', '잔디남2', '잔디여2', '잔디식재', '잔디2남']);

function parseSpec(spec) {
  const s = (spec || '').toUpperCase().replace(/\s/g, '');
  const get = (key) => { const m = s.match(new RegExp(key + '([\\d.]+)')); return m ? parseFloat(m[1]) : null; };
  return { H: get('H'), R: get('R'), B: get('B'), W: get('W') };
}

function safeInt(v) {
  const n = parseInt(String(v ?? '0').replace(/,/g, '').replace(/^-$/, '0'));
  return isNaN(n) || n < 0 ? 0 : n;
}

const SHRUB_KEYWORDS = ['철쭉','산철쭉','진달래','회양목','쥐똥','수수꽃다리','조팝','개나리','무궁화','화살나무','병꽃','황매화','꽝꽝','남천','사철나무','눈향'];
const GROUND_KEYWORDS = ['잔디','맥문동','수크령','억새','구절초','원추리','붓꽃','비비추','수선화','지피','초화'];

function classifyItem(item, spec) {
  const parsed = parseSpec(spec);
  const itemLower = (item || '').toLowerCase();
  if (GROUND_KEYWORDS.some(k => itemLower.includes(k))) return 'turf';
  if (SHRUB_KEYWORDS.some(k => item.includes(k)) || (!parsed.R && !parsed.B && parsed.H && parsed.H <= 1.2)) return 'shrub';
  return 'tree';
}

function matchStandard(standards, item, spec) {
  const parsed = parseSpec(spec);
  const itemLower = (item || '').toLowerCase();
  const isGround = GROUND_KEYWORDS.some(k => itemLower.includes(k));
  const isShrub  = SHRUB_KEYWORDS.some(k => item.includes(k)) || (!isGround && parsed.H && parsed.H <= 1.2);
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
    s.category === cat && s.spec_type === specType &&
    specVal > s.spec_min && specVal <= s.spec_max && s.work_method === method
  ) || null;
}

// planted 기준 + 직종별 인원 분리로 과투입 판단
function analyzeDay(standards, ledger, labor) {
  // 직종별 인원
  let shrubWorkers = 0, treeWorkers = 0, turfWorkers = 0, otherWorkers = 0;
  for (const r of labor) {
    const cnt = safeInt(r.count);
    if (SHRUB_WORKER_TYPES.has(r.type))     shrubWorkers += cnt;
    else if (TREE_WORKER_TYPES.has(r.type)) treeWorkers  += cnt;
    else if (TURF_WORKER_TYPES.has(r.type)) turfWorkers  += cnt;
    else otherWorkers += cnt;
  }
  const actualWorkers = shrubWorkers + treeWorkers + otherWorkers; // 잔디 제외

  // planted 기준으로 수종별 식재량
  let shrubPlanted = 0, treePlanted = 0;
  const plantedItems = [];
  for (const row of ledger) {
    if (row.isPastRecord) continue;
    const planted = safeInt(row.planted);
    if (!planted) continue;
    const cat = classifyItem(row.item, row.spec);
    if (cat === 'shrub') shrubPlanted += planted;
    else if (cat === 'tree') treePlanted += planted;
    plantedItems.push({ item: row.item, spec: row.spec, planted, cat });
  }

  // 권장 인원 계산 (공기권장 기준: planted / trees_per_day × team_size)
  let shrubRecommended = 0, treeRecommended = 0;

  if (shrubPlanted > 0 && shrubWorkers > 0) {
    // 관목: 식재량 기준 권장 관목식재공 수
    // 대표 기준: H0~0.3=1600/4명=400주/인, H0.3~0.7=600/4=150주/인
    // planted / 대표 생산성(주/인)으로 필요 인원 계산
    let totalShrubWork = 0;
    for (const row of ledger) {
      if (row.isPastRecord) continue;
      const planted = safeInt(row.planted);
      if (!planted) continue;
      if (classifyItem(row.item, row.spec) !== 'shrub') continue;
      const std = matchStandard(standards, row.item, row.spec);
      if (std) {
        const perPerson = std.trees_per_day / (std.skilled_workers + std.unskilled_workers);
        totalShrubWork += planted / perPerson;
      }
    }
    shrubRecommended = Math.ceil(totalShrubWork);
  }

  if (treePlanted > 0 && treeWorkers > 0) {
    let maxTree = 0;
    for (const row of ledger) {
      if (row.isPastRecord) continue;
      const planted = safeInt(row.planted);
      if (!planted) continue;
      if (classifyItem(row.item, row.spec) !== 'tree') continue;
      const std = matchStandard(standards, row.item, row.spec);
      if (std) {
        const needed = Math.ceil((planted / std.trees_per_day) * (std.skilled_workers + std.unskilled_workers));
        maxTree = Math.max(maxTree, needed);
      }
    }
    treeRecommended = maxTree;
  }

  const recommended = shrubRecommended + treeRecommended;

  // 과투입 판단: 직종별로 따로 판단
  // 잔디는 면적 데이터 없어서 권장 산출 불가 → 과투입 판단에서 제외
  const plantingWorkers = shrubWorkers + treeWorkers; // 잔디 제외한 식재 인원
  const isShrubOver = shrubRecommended > 0 && shrubWorkers > shrubRecommended * 1.2;
  const isTreeOver  = treeRecommended  > 0 && treeWorkers  > treeRecommended  * 1.2;
  const isOverStaffed = isShrubOver || isTreeOver;

  return {
    actualWorkers,
    plantingWorkers,
    shrubWorkers, treeWorkers, turfWorkers,
    shrubPlanted, treePlanted,
    shrubRecommended, treeRecommended,
    recommended,
    isOverStaffed,
    isShrubOver, isTreeOver,
    overCount: Math.max(0, plantingWorkers - recommended),
    items: plantedItems,
  };
}

export async function GET(request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '90');
  const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

  const [{ data: standards }, { data: sites }, { data: reports }] = await Promise.all([
    adminSupabase.from('planting_standards').select('*'),
    adminSupabase.from('construction_sites').select('id, name').order('name'),
    adminSupabase
      .from('daily_site_reports')
      .select('id, site_id, report_date, notes')
      .gte('report_date', since)
      .order('report_date', { ascending: false }),
  ]);

  const reportsBySite = {};
  for (const rep of reports || []) {
    if (!reportsBySite[rep.site_id]) reportsBySite[rep.site_id] = [];
    reportsBySite[rep.site_id].push(rep);
  }

  const siteResults = [];
  for (const site of sites || []) {
    const siteReports = reportsBySite[site.id] || [];
    if (!siteReports.length) continue;

    let totalPlanted = 0, workDays = 0, overStaffedDays = 0;
    const dailyList = [];

    for (const rep of siteReports) {
      let notes = rep.notes;
      if (typeof notes === 'string') { try { notes = JSON.parse(notes); } catch { continue; } }
      if (!notes) continue;

      const labor  = notes.labor_costs   || [];
      const ledger = notes.manual_ledger || [];

      const analysis = analyzeDay(standards || [], ledger, labor);
      const hasWork = analysis.shrubPlanted > 0 || analysis.treePlanted > 0;
      if (!hasWork) continue;

      workDays++;
      totalPlanted += analysis.shrubPlanted + analysis.treePlanted;
      if (analysis.isOverStaffed) overStaffedDays++;

      const totalP = analysis.shrubPlanted + analysis.treePlanted;
      dailyList.push({
        date: rep.report_date,
        actualWorkers: analysis.actualWorkers,
        plantingWorkers: analysis.plantingWorkers,
        shrubWorkers: analysis.shrubWorkers,
        treeWorkers: analysis.treeWorkers,
        turfWorkers: analysis.turfWorkers,
        recommended: analysis.recommended,
        shrubRecommended: analysis.shrubRecommended,
        treeRecommended: analysis.treeRecommended,
        isOverStaffed: analysis.isOverStaffed,
        isShrubOver: analysis.isShrubOver,
        isTreeOver: analysis.isTreeOver,
        overCount: analysis.overCount,
        planted: totalP,
        shrubPlanted: analysis.shrubPlanted,
        treePlanted: analysis.treePlanted,
        productivity: analysis.plantingWorkers > 0 && totalP > 0
          ? Math.round(totalP / analysis.plantingWorkers * 10) / 10
          : null,
        items: analysis.items.slice(0, 5),
      });
    }

    if (!workDays) continue;

    const productiveDays = dailyList.filter(d => d.productivity !== null);
    const avgProductivity = productiveDays.length
      ? Math.round(productiveDays.reduce((s, d) => s + d.productivity, 0) / productiveDays.length * 10) / 10
      : null;

    siteResults.push({
      id: site.id,
      name: site.name,
      totalDays: siteReports.length,
      workDays,
      overStaffedDays,
      overStaffedRate: Math.round(overStaffedDays / workDays * 100),
      totalPlanted,
      avgProductivity,
      reports: dailyList,
    });
  }

  siteResults.sort((a, b) => b.overStaffedDays - a.overStaffedDays);

  return Response.json({ sites: siteResults, since, days });
}
