import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CATEGORY_LABEL_MAP = {
  evergreen_tree: '상록교목', deciduous_tree: '낙엽교목',
  evergreen_shrub: '상록관목', deciduous_shrub: '낙엽관목',
  ground_flower: '지피 및 초화류', base_work: '식재기반조성', subsidiary: '식재부대공사',
};
const catLabel = (name) => CATEGORY_LABEL_MAP[name] || name;
const MONTH_KR = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

function generateColumns(startDate, endDate) {
  const cols = [];
  const end = new Date(endDate);
  let cur = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth(), 1);
  while (cur <= end) {
    const y = cur.getFullYear(), m = cur.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= lastDay; d += 2) {
      const endDay = Math.min(d + 1, lastDay);
      cols.push({
        year: y, month: m, day: d, lastDay,
        isFirst: d === 1,
        startDate: `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,
        endDate:   `${y}-${String(m+1).padStart(2,'0')}-${String(endDay).padStart(2,'0')}`,
      });
    }
    cur = new Date(y, m + 1, 1);
  }
  return cols;
}

function groupByMonth(cols) {
  const groups = [];
  cols.forEach(col => {
    const key = `${col.year}-${col.month}`;
    const last = groups[groups.length - 1];
    if (last?.key === key) last.count++;
    else groups.push({ key, year: col.year, month: col.month, count: 1 });
  });
  return groups;
}

function colInPeriod(col, period) {
  return new Date(col.startDate) <= new Date(period.end_date) &&
         new Date(col.endDate)   >= new Date(period.start_date);
}

function isLastOfMonth(col) { return col.day + 2 > col.lastDay; }

function hexToArgb(hex) { return `FF${hex.replace('#','').toUpperCase()}`; }

function lightenArgb(hex, amount) {
  const h = hex.replace('#','');
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
  const lr = Math.round(r+(255-r)*amount), lg = Math.round(g+(255-g)*amount), lb = Math.round(b+(255-b)*amount);
  return `FF${lr.toString(16).padStart(2,'0').toUpperCase()}${lg.toString(16).padStart(2,'0').toUpperCase()}${lb.toString(16).padStart(2,'0').toUpperCase()}`;
}

function lightenHex(hex, amount) {
  const h = hex.replace('#','');
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
  const lr = Math.round(r+(255-r)*amount), lg = Math.round(g+(255-g)*amount), lb = Math.round(b+(255-b)*amount);
  return `FF${lr.toString(16).padStart(2,'0').toUpperCase()}${lg.toString(16).padStart(2,'0').toUpperCase()}${lb.toString(16).padStart(2,'0').toUpperCase()}`;
}

function getQuarterLabel(startDate) {
  if (!startDate) return '';
  const d = new Date(startDate);
  return `${d.getFullYear()}년 ${Math.ceil((d.getMonth()+1)/3)}분기`;
}

export async function GET(request) {
  const url = new URL(request.url);
  const planIdsParam = url.searchParams.get('planIds') || '';
  const color = url.searchParams.get('color') || '#0891b2';
  const planIds = planIdsParam.split(',').map(s => s.trim()).filter(Boolean);

  if (planIds.length === 0) {
    return new Response(JSON.stringify({ error: 'planIds required' }), { status: 400 });
  }

  // 플랜 목록 (날짜순)
  const { data: plans, error } = await supabase
    .from('execution_plans')
    .select('*')
    .in('id', planIds)
    .order('start_date', { ascending: true });

  if (error || !plans?.length) {
    return new Response(JSON.stringify({ error: 'Plans not found' }), { status: 404 });
  }

  // 각 플랜의 아이템 + 기간
  const plansWithItems = await Promise.all(
    plans.map(async plan => {
      const { data: items } = await supabase
        .from('execution_items')
        .select('*, periods:execution_item_periods(*)')
        .eq('plan_id', plan.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      return { ...plan, items: items || [] };
    })
  );

  // 통합 날짜 범위
  const startDate = plansWithItems[0].start_date;
  const endDate   = plansWithItems[plansWithItems.length - 1].end_date;

  // 카테고리 순서: 모든 플랜에 걸쳐 등장 순서 유지
  const allItems = plansWithItems.flatMap(p => p.items);
  const categories = [...new Set(allItems.map(i => i.category).filter(Boolean))];

  const columns     = generateColumns(startDate, endDate);
  const monthGroups = groupByMonth(columns);
  const LEFT_COLS   = 5; // 수종명, 규격, 수량, 단위, 분기
  const barArgb     = hexToArgb(color);
  const barLightArgb = lightenArgb(color, 0.52);
  const catLightArgb = lightenHex(color, 0.88); // 대분류 배경

  const workbook = new ExcelJS.Workbook();
  workbook.creator = '한성개발';

  // 파일 제목
  const quarterLabels = plansWithItems.map(p => getQuarterLabel(p.start_date)).join(' + ');
  const sheetTitle = quarterLabels;

  const sheet = workbook.addWorksheet(sheetTitle.slice(0, 31), {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    views: [{ state: 'frozen', xSplit: LEFT_COLS, ySplit: 3 }],
  });

  // 열 너비
  sheet.getColumn(1).width = 20; // 수종명
  sheet.getColumn(2).width = 12; // 규격
  sheet.getColumn(3).width = 7;  // 수량
  sheet.getColumn(4).width = 5;  // 단위
  sheet.getColumn(5).width = 8;  // 분기
  for (let i = 0; i < columns.length; i++) {
    sheet.getColumn(LEFT_COLS + 1 + i).width = 3;
  }

  // ── 행 1: 제목 + 분기 범위 표시 ──
  sheet.getRow(1).height = 18;
  sheet.mergeCells(1, 1, 1, LEFT_COLS);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = sheetTitle;
  titleCell.font = { bold: true, size: 11, color: { argb: 'FF111827' } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };

  // 분기별 날짜 범위를 간트 헤더 행 1에 표시
  // (합쳐진 날짜 범위라 월 헤더만 사용)
  let colOffset = LEFT_COLS + 1;
  for (const g of monthGroups) {
    if (g.count > 1) sheet.mergeCells(1, colOffset, 1, colOffset + g.count - 1);
    const cell = sheet.getCell(1, colOffset);
    cell.value = '';
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    colOffset += g.count;
  }

  // ── 행 2: 월 헤더 ──
  sheet.getRow(2).height = 16;
  sheet.mergeCells(2, 1, 2, LEFT_COLS);
  const monthLabelCell = sheet.getCell(2, 1);
  monthLabelCell.value = `${startDate.slice(0,7)} ~ ${endDate.slice(0,7)}`;
  monthLabelCell.font = { size: 8, color: { argb: 'FF6B7280' } };
  monthLabelCell.alignment = { horizontal: 'left', vertical: 'middle' };
  monthLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
  monthLabelCell.border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };

  colOffset = LEFT_COLS + 1;
  for (const g of monthGroups) {
    if (g.count > 1) sheet.mergeCells(2, colOffset, 2, colOffset + g.count - 1);
    const cell = sheet.getCell(2, colOffset);
    cell.value = MONTH_KR[g.month];
    cell.font = { bold: true, size: 9, color: { argb: 'FF374151' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      right:  { style: 'thin', color: { argb: 'FFD1D5DB' } },
    };
    colOffset += g.count;
  }

  // ── 행 3: 컬럼명 + 일자 ──
  sheet.getRow(3).height = 14;
  const leftHeaders = ['수종명', '규격', '수량', '단위', '분기'];
  leftHeaders.forEach((h, i) => {
    const cell = sheet.getCell(3, i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 8, color: { argb: 'FF6B7280' } };
    cell.alignment = { horizontal: i >= 2 ? 'center' : 'left', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      right: i === LEFT_COLS - 1 ? { style: 'thin', color: { argb: 'FFD1D5DB' } } : undefined,
    };
  });

  columns.forEach((col, i) => {
    const cell = sheet.getCell(3, LEFT_COLS + 1 + i);
    cell.value = (col.day === 1 || col.day % 10 === 1) ? col.day : '';
    cell.font = { size: 7, color: { argb: 'FF9CA3AF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      right: isLastOfMonth(col)
        ? { style: 'thin', color: { argb: 'FFD1D5DB' } }
        : { style: 'hair', color: { argb: 'FFE5E7EB' } },
    };
  });

  let currentRow = 4;

  // ── 대분류별 행 렌더링 ──
  for (const catName of categories) {
    const catItems = allItems.filter(i => i.category === catName);

    // 대분류 헤더
    sheet.getRow(currentRow).height = 16;
    sheet.mergeCells(currentRow, 1, currentRow, LEFT_COLS);
    const catCell = sheet.getCell(currentRow, 1);
    catCell.value = catLabel(catName);
    catCell.font = { bold: true, size: 9, color: { argb: barArgb } };
    catCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    catCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: catLightArgb } };
    catCell.border = {
      top:    { style: 'thin', color: { argb: 'FFE5E7EB' } },
      bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    };
    columns.forEach((col, i) => {
      const cell = sheet.getCell(currentRow, LEFT_COLS + 1 + i);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: catLightArgb } };
      cell.border = {
        right: isLastOfMonth(col)
          ? { style: 'thin', color: { argb: 'FFD1D5DB' } }
          : { style: 'hair', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
    });
    currentRow++;

    // 항목 행
    for (const item of catItems) {
      // 이 항목이 속한 플랜의 분기 레이블
      const ownerPlan = plansWithItems.find(p => p.id === item.plan_id);
      const quarterLabel = ownerPlan ? getQuarterLabel(ownerPlan.start_date) : '';

      sheet.getRow(currentRow).height = 14;
      const leftVals = [item.species_name, item.spec, Number(item.quantity).toLocaleString(), item.unit, quarterLabel];
      leftVals.forEach((v, i) => {
        const cell = sheet.getCell(currentRow, i + 1);
        cell.value = v ?? '';
        cell.font = { size: 8, color: { argb: i === 4 ? 'FF9CA3AF' : 'FF374151' }, bold: i === 0 };
        cell.alignment = { horizontal: i >= 2 ? 'center' : 'left', vertical: 'middle', indent: i === 0 ? 2 : 0 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        cell.border = {
          bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } },
          right: i === LEFT_COLS - 1 ? { style: 'thin', color: { argb: 'FFD1D5DB' } } : undefined,
        };
      });

      // 간트 바
      const periods = item.periods || [];
      for (let ci = 0; ci < columns.length; ci++) {
        const col = columns[ci];
        const cell = sheet.getCell(currentRow, LEFT_COLS + 1 + ci);
        const matched = periods.find(p => colInPeriod(col, p));
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: matched ? barLightArgb : 'FFFFFFFF' } };
        cell.border = {
          right: isLastOfMonth(col)
            ? { style: 'thin', color: { argb: 'FFD1D5DB' } }
            : { style: 'hair', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } },
        };
      }

      // 메모: 첫 번째 해당 셀에 텍스트
      for (const period of periods) {
        if (!period.note) continue;
        const fi = columns.findIndex(col => colInPeriod(col, period));
        if (fi < 0) continue;
        const noteCell = sheet.getCell(currentRow, LEFT_COLS + 1 + fi);
        noteCell.value = period.note;
        noteCell.font = { size: 7, color: { argb: barArgb }, bold: true };
        noteCell.alignment = { vertical: 'middle' };
      }

      currentRow++;
    }
  }

  // 파일명: "2025년 1분기 + 2분기.xlsx" 형식
  const safeTitle = sheetTitle.replace(/[/\\?%*:|"<>]/g, '-');
  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(safeTitle)}.xlsx`,
    },
  });
}
