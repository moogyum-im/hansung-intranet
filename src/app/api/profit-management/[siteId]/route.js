import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function safeNum(v) { return Number(v) || 0; }
function safeParseJSON(s) { try { return JSON.parse(s || '{}'); } catch { return {}; } }

function parseSpec(specStr) {
  const s = (specStr || '').toUpperCase().replace(/\s/g, '');
  const get = (key) => { const m = s.match(new RegExp(key + '([\\d.]+)')); return m ? parseFloat(m[1]) : null; };
  return { H: get('H'), R: get('R'), B: get('B'), W: get('W') };
}

// 규격 문자열로 카테고리 추정 (수기장부는 category 없음)
function guessCategoryFromSpec(specStr) {
  const p = parseSpec(specStr);
  if (p.R && p.R >= 8) return '교목';
  if (p.B && p.B >= 4) return '교목';
  if (p.H && p.H >= 1.5) return '교목';
  return '관목';
}

// 수기장부 항목용 표준 품셈 매핑
function findStandardForLedger(standards, specStr) {
  const p = parseSpec(specStr);
  const cat = guessCategoryFromSpec(specStr);

  if (cat === '교목') {
    if (p.B) {
      const s = standards.find(s => s.category === '교목' && s.spec_type === 'B' && p.B > s.spec_min && p.B <= s.spec_max);
      if (s) return s;
    }
    if (p.R) {
      const s = standards.find(s => s.category === '교목' && s.spec_type === 'R' && p.R > s.spec_min && p.R <= s.spec_max);
      if (s) return s;
    }
    if (p.H) {
      const s = standards.find(s => s.category === '교목' && s.spec_type === 'H' && p.H > s.spec_min && p.H <= s.spec_max);
      if (s) return s;
    }
  } else {
    if (p.H) {
      const s = standards.find(s => s.category === '관목' && s.spec_type === 'H' && p.H > s.spec_min && p.H <= s.spec_max);
      if (s) return s;
    }
  }
  return null;
}

// 실행 내역서 항목용 표준 품셈 매핑
function findStandardForEstimate(standards, category, spec) {
  const parsed = parseSpec(spec);
  const isShrub = ['evergreen_shrub', 'deciduous_shrub', 'ground_flower'].includes(category);
  const cat = isShrub ? '관목' : '교목';
  const method = cat === '교목' ? '기계' : '인력';

  let specType, specVal;
  if (cat === '교목') {
    if (parsed.B) { specType = 'B'; specVal = parsed.B; }
    else if (parsed.R) { specType = 'R'; specVal = parsed.R; }
    else if (parsed.H) { specType = 'H'; specVal = parsed.H; }
  } else {
    specType = 'H'; specVal = parsed.H || 0.3;
  }
  if (!specVal) return null;

  return standards.find(s =>
    s.category === cat && s.spec_type === specType &&
    specVal > s.spec_min && specVal <= s.spec_max && s.work_method === method
  ) || null;
}

// 식재 관련 작업자 유형
const PLANT_WORKER_TYPES = ['식재공', '조경공', '식재'];
function isPlantWorker(type) {
  return PLANT_WORKER_TYPES.some(t => (type || '').includes(t));
}

// 굴삭기 장비 판별
function isExcavator(itemName) {
  return /굴착기|굴삭기|포크레인|0[23]W|backhoe/i.test(itemName || '');
}

export async function GET(_, { params }) {
  const { siteId } = params;

  try {
    const [
      { data: site },
      { data: executionEstimates },
      { data: billings },
      { data: standards },
      { data: reports },
    ] = await Promise.all([
      supabase.from('construction_sites').select('id, name, status, start_date, end_date, budget').eq('id', siteId).single(),
      supabase.from('execution_estimates').select('*, execution_estimate_items(*)').eq('site_id', siteId).order('version', { ascending: true }),
      supabase.from('progress_billings').select('*, progress_billing_items(*)').eq('site_id', siteId).order('billing_round', { ascending: true }),
      supabase.from('planting_standards').select('*'),
      supabase.from('daily_site_reports').select('id, report_date, notes').eq('site_id', siteId).order('report_date', { ascending: true }),
    ]);

    // ── 실행 내역서 ──
    const TREE_CATS = ['evergreen_tree', 'deciduous_tree', 'evergreen_shrub', 'deciduous_shrub', 'ground_flower'];
    const currentEstimate = (executionEstimates || []).find(e => e.is_current)
      || (executionEstimates || []).at(-1) || null;
    const estimateItems = (currentEstimate?.execution_estimate_items || []).sort((a, b) => a.sort_order - b.sort_order);
    const executionTotal = estimateItems.reduce((s, i) => s + safeNum(i.total_amount), 0);

    // ── 기성 청구 ──
    const billingList = (billings || []).map(b => ({
      id: b.id, billing_round: b.billing_round,
      billing_date: b.billing_date, total_amount: b.total_amount,
    }));
    const billingCumulative = billingList.reduce((s, b) => s + safeNum(b.total_amount), 0);

    // ── 일보 파싱 ──
    const parsedReports = (reports || []).map(r => ({
      report_date: r.report_date,
      ...safeParseJSON(r.notes),
    }));

    // ── 비용 집계 (당일 항목만, isPastRecord 제외) ──
    const COST_KEYS = [
      { key: 'tree_costs',       label: '수목' },
      { key: 'subcontract_costs', label: '시공/납품' },
      { key: 'material_costs',   label: '자재비' },
      { key: 'equipment_costs',  label: '장비대' },
      { key: 'labor_costs',      label: '노무비' },
      { key: 'transport_costs',  label: '운반비' },
      { key: 'etc_costs',        label: '기타경비' },
    ];

    const settlementCosts = COST_KEYS.map(({ key, label }) => {
      const total = parsedReports.reduce((sum, r) => {
        const items = Array.isArray(r[key]) ? r[key] : [];
        return sum + items.filter(i => !i.isPastRecord).reduce((s, i) => s + safeNum(i.total), 0);
      }, 0);
      return { item: label, total };
    });
    const totalCost = settlementCosts.reduce((s, c) => s + c.total, 0);

    // ── 일별 인원 현황 ──
    const dailyLabor = parsedReports.map(r => {
      const items = Array.isArray(r.labor_costs) ? r.labor_costs.filter(l => !l.isPastRecord) : [];
      const count = items.reduce((s, l) => s + safeNum(l.count), 0);
      const amount = items.reduce((s, l) => s + safeNum(l.total), 0);
      return { date: r.report_date, count: Math.round(count * 10) / 10, amount };
    }).filter(d => d.count > 0);

    // ── 수목 실적 (마지막 일보의 누계 반입량) ──
    const lastReport = [...parsedReports].reverse().find(r => r.manual_ledger?.length);
    const treeActuals = (lastReport?.manual_ledger || [])
      .filter(row => row.item && (safeNum(row.base_incoming) + safeNum(row.incoming)) > 0)
      .map(row => ({
        item: row.item,
        spec: row.spec || '',
        accum: safeNum(row.base_incoming) + safeNum(row.incoming),
        total: 0,
      }));

    // ── 계획 항목 (실행 내역서 수목류) ──
    const plannedItems = estimateItems
      .filter(i => TREE_CATS.includes(i.category))
      .map(i => ({ species_name: i.item_name, spec: i.spec || '', quantity: i.quantity, unit: i.unit || '주' }));

    // ═══════════════════════════════════════
    // 효율 분석 (수기장부 금일식재 × 표준품셈)
    // ═══════════════════════════════════════
    const speciesEffMap = {};
    const efficiencyByDate = [];

    parsedReports.forEach(r => {
      const ledger   = Array.isArray(r.manual_ledger)    ? r.manual_ledger    : [];
      const laborList = Array.isArray(r.labor_costs)     ? r.labor_costs.filter(l => !l.isPastRecord) : [];
      const equipList = Array.isArray(r.equipment_costs) ? r.equipment_costs.filter(e => !e.isPastRecord) : [];

      // 실제 식재 인원 (식재공/조경공 유형)
      const actualPlantWorkers = laborList
        .filter(l => isPlantWorker(l.type))
        .reduce((s, l) => s + safeNum(l.count), 0);

      // 실제 전체 인원
      const actualTotal = laborList.reduce((s, l) => s + safeNum(l.count), 0);

      // 실제 굴삭기
      const actualExcavator = equipList
        .filter(e => isExcavator(e.item))
        .reduce((s, e) => s + safeNum(e.count), 0);

      // 금일 식재 항목들로 표준 공수 계산
      let stdPersonDays = 0;
      let stdExcavator  = 0;
      const daySpecies  = [];

      ledger.forEach(row => {
        const planted = safeNum(row.planted);
        if (!planted || !row.item) return;

        const std = findStandardForLedger(standards || [], row.spec || '');
        if (!std) return;

        const days  = planted / std.trees_per_day;
        const spd   = days * (std.skilled_workers + std.unskilled_workers);
        stdPersonDays += spd;
        stdExcavator  += days * std.excavator;

        daySpecies.push({
          item: row.item, spec: row.spec || '',
          planted, treesPerDay: std.trees_per_day,
          category: guessCategoryFromSpec(row.spec || ''),
          stdPersonDays: Math.round(spd * 10) / 10,
        });

        // 수종별 누계 집계
        const k = `${row.item}||${row.spec || ''}`;
        if (!speciesEffMap[k]) {
          speciesEffMap[k] = {
            item: row.item, spec: row.spec || '',
            category: guessCategoryFromSpec(row.spec || ''),
            totalPlanted: 0, totalStdPD: 0,
            treesPerDay: std.trees_per_day,
          };
        }
        speciesEffMap[k].totalPlanted += planted;
        speciesEffMap[k].totalStdPD   += spd;
      });

      // 당일 식재 또는 인원이 있는 날만 기록
      if (stdPersonDays > 0 || actualPlantWorkers > 0) {
        const efficiency = actualPlantWorkers > 0
          ? Math.round(stdPersonDays / actualPlantWorkers * 100)
          : null;

        efficiencyByDate.push({
          date: r.report_date,
          actualPlantWorkers:  Math.round(actualPlantWorkers * 10) / 10,
          actualTotal:         Math.round(actualTotal * 10) / 10,
          actualExcavator:     Math.round(actualExcavator * 10) / 10,
          stdPersonDays:       Math.round(stdPersonDays * 10) / 10,
          stdExcavator:        Math.round(stdExcavator * 10) / 10,
          efficiency,
          species: daySpecies,
        });
      }
    });

    const bySpecies = Object.values(speciesEffMap)
      .map(s => ({ ...s, totalStdPD: Math.round(s.totalStdPD * 10) / 10 }))
      .sort((a, b) => b.totalPlanted - a.totalPlanted);

    const totalStdPD    = efficiencyByDate.reduce((s, d) => s + d.stdPersonDays, 0);
    const totalActualPD = efficiencyByDate.reduce((s, d) => s + d.actualPlantWorkers, 0);
    const overallEff    = totalActualPD > 0 ? Math.round(totalStdPD / totalActualPD * 100) : null;

    // ── 공수 계획 (실행 내역서 기준) ──
    const laborPlan = { skilled: 0, unskilled: 0, excavator: 0, crane: 0 };
    const plantingAnalysis = estimateItems.filter(i => TREE_CATS.includes(i.category)).map(item => {
      const std = findStandardForEstimate(standards || [], item.category, item.spec);
      if (!std || !item.quantity) return { ...item, std: null, planned: null };
      const days = item.quantity / std.trees_per_day;
      const planned = {
        days:       Math.round(days * 10) / 10,
        skilled:    Math.round(days * std.skilled_workers * 10) / 10,
        unskilled:  Math.round(days * std.unskilled_workers * 10) / 10,
        excavator:  Math.round(days * std.excavator * 10) / 10,
        crane:      Math.round(days * std.crane * 10) / 10,
        treesPerDay: std.trees_per_day, method: std.work_method,
      };
      laborPlan.skilled   += planned.skilled;
      laborPlan.unskilled += planned.unskilled;
      laborPlan.excavator += planned.excavator;
      laborPlan.crane     += planned.crane;
      return {
        species_name: item.item_name, spec: item.spec, category: item.category,
        quantity: item.quantity, unit: item.unit, planned_amount: item.total_amount,
        std: { spec_type: std.spec_type, work_method: std.work_method }, planned,
      };
    });
    laborPlan.total = Math.round((laborPlan.skilled + laborPlan.unskilled) * 10) / 10;

    const laborActualTotal = dailyLabor.reduce((s, d) => s + d.count, 0);
    const progressRateDecimal = executionTotal > 0 ? billingCumulative / executionTotal : 0;
    const laborActual = {
      total: Math.round(laborActualTotal * 10) / 10,
      plannedSoFar: laborPlan.total > 0 ? Math.round(laborPlan.total * progressRateDecimal * 10) / 10 : null,
      ratio: laborPlan.total > 0 && progressRateDecimal > 0
        ? Math.round(laborActualTotal / (laborPlan.total * progressRateDecimal) * 1000) / 10
        : null,
      excavator: 0,
    };

    // ── 작업일보 물리 공정률 (가장 최근 일보) ──
    const lastReportWithProgress = [...parsedReports].reverse().find(r =>
      safeNum(r.progress_plant) > 0 || safeNum(r.progress_facility) > 0
    );
    const physicalProgressPlant    = lastReportWithProgress ? Math.round(safeNum(lastReportWithProgress.progress_plant) * 100) / 100 : null;
    const physicalProgressFacility = lastReportWithProgress ? Math.round(safeNum(lastReportWithProgress.progress_facility) * 100) / 100 : null;
    const physicalProgressDate     = lastReportWithProgress?.report_date || null;

    // ── 요약 ──
    const contractAmount = safeNum(site?.budget) || executionTotal;
    const progressRate   = contractAmount > 0 ? billingCumulative / contractAmount * 100 : 0;
    const profit     = billingCumulative - totalCost;
    const profitRate = billingCumulative > 0 ? profit / billingCumulative * 100 : 0;

    const summary = {
      contractAmount,
      progressRate:    Math.round(progressRate * 10) / 10,
      earnedValue:     billingCumulative,
      totalCost,
      profit,
      profitRate:      Math.round(profitRate * 10) / 10,
      reportCount:     reports?.length || 0,
      lastReportDate:  reports?.length ? reports[reports.length - 1].report_date : null,
      physicalProgressPlant,
      physicalProgressFacility,
      physicalProgressDate,
    };

    const estimateHistory = (executionEstimates || []).map(e => ({
      id: e.id, version: e.version, version_label: e.version_label,
      version_date: e.version_date, is_current: e.is_current,
      total_amount: (e.execution_estimate_items || []).reduce((s, i) => s + safeNum(i.total_amount), 0),
    }));

    return Response.json({
      site, summary, executionTotal, billingCumulative, billingList,
      estimateHistory,
      estimateVersionLabel: currentEstimate?.version_label || '',
      currentEstimate: currentEstimate ? {
        id: currentEstimate.id,
        version_label: currentEstimate.version_label,
        version_date:  currentEstimate.version_date,
        total_amount:  executionTotal,
      } : null,
      hasEstimate:      estimateItems.length > 0,
      plantingAnalysis, laborPlan, laborActual,
      settlementCosts,  dailyLabor, treeActuals, plannedItems,
      efficiencyAnalysis: {
        daily:    efficiencyByDate,
        bySpecies,
        overall: {
          stdPersonDays:    Math.round(totalStdPD * 10) / 10,
          actualPersonDays: Math.round(totalActualPD * 10) / 10,
          efficiency:       overallEff,
        },
      },
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
