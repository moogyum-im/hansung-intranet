import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CATEGORY_LABEL_MAP = {
  evergreen_tree: '상록교목',
  deciduous_tree: '낙엽교목',
  evergreen_shrub: '상록관목',
  deciduous_shrub: '낙엽관목',
  ground_flower: '지피 및 초화류',
  base_work: '식재기반조성',
  subsidiary: '식재부대공사',
};
const catLabel = (name) => CATEGORY_LABEL_MAP[name] || name;

const MONTH_KR = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

// 현재 화면과 동일하게 홀수일 기반 컬럼 생성
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

// 해당 컬럼이 period 범위 안에 있는지
function colInPeriod(col, period) {
  const colStart = new Date(col.startDate).getTime();
  const colEnd   = new Date(col.endDate).getTime();
  const pStart   = new Date(period.start_date).getTime();
  const pEnd     = new Date(period.end_date).getTime();
  return colStart <= pEnd && colEnd >= pStart;
}

// hex → ARGB 문자열 (ExcelJS 형식)
function hexToArgb(hex) {
  return `FF${hex.replace('#', '').toUpperCase()}`;
}

// 색상을 흰색과 혼합해서 밝게 만들기 (amount: 0~1, 높을수록 밝아짐)
function lightenArgb(hex, amount) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0,2),16);
  const g = parseInt(h.slice(2,4),16);
  const b = parseInt(h.slice(4,6),16);
  const lr = Math.round(r + (255 - r) * amount);
  const lg = Math.round(g + (255 - g) * amount);
  const lb = Math.round(b + (255 - b) * amount);
  return `FF${lr.toString(16).padStart(2,'0').toUpperCase()}${lg.toString(16).padStart(2,'0').toUpperCase()}${lb.toString(16).padStart(2,'0').toUpperCase()}`;
}

// 해당 컬럼이 월의 마지막 컬럼인지 (다음 홀수일이 월을 넘어가는지)
function isLastOfMonth(col) {
  return col.day + 2 > col.lastDay;
}

export async function GET(request, { params }) {
  const { id } = params;
  const url = new URL(request.url);
  const color = url.searchParams.get('color') || '#0891b2';

  // 플랜 + 아이템 + 기간 로드
  const { data: plan, error } = await supabase
    .from('execution_plans')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !plan) {
    return new Response(JSON.stringify({ error: 'Plan not found' }), { status: 404 });
  }

  const { data: items } = await supabase
    .from('execution_items')
    .select('*, periods:execution_item_periods(*)')
    .eq('plan_id', id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  const planItems = items || [];
  const columns = generateColumns(plan.start_date, plan.end_date);
  const monthGroups = groupByMonth(columns);
  const categories = [...new Set(planItems.map(i => i.category).filter(Boolean))];

  const LEFT_COLS = 4; // 수종명, 규격, 수량, 단위
  const barArgb     = hexToArgb(color);          // 진한 원색 (헤더 텍스트용)
  const barLightArgb = lightenArgb(color, 0.52); // 50% 희석 (바 채우기용)

  const workbook = new ExcelJS.Workbook();
  workbook.creator = '한성개발';
  const sheet = workbook.addWorksheet(plan.title || '공정표', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    views: [{ state: 'frozen', xSplit: LEFT_COLS, ySplit: 2 }],
  });

  // ── 열 너비 설정 ──
  sheet.getColumn(1).width = 20; // 수종명
  sheet.getColumn(2).width = 12; // 규격
  sheet.getColumn(3).width = 7;  // 수량
  sheet.getColumn(4).width = 5;  // 단위
  for (let i = 0; i < columns.length; i++) {
    sheet.getColumn(LEFT_COLS + 1 + i).width = 3;
  }

  // ── 헤더 행 1: 빈칸 + 월 ──
  const headerRow1 = sheet.getRow(1);
  headerRow1.height = 16;

  // 왼쪽 헤더 병합
  sheet.mergeCells(1, 1, 1, LEFT_COLS);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = plan.title || '공정표';
  titleCell.font = { bold: true, size: 10, color: { argb: 'FF111827' } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };

  // 월 헤더 (병합)
  let colOffset = LEFT_COLS + 1;
  for (const g of monthGroups) {
    if (g.count > 1) {
      sheet.mergeCells(1, colOffset, 1, colOffset + g.count - 1);
    }
    const cell = sheet.getCell(1, colOffset);
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

  // ── 헤더 행 2: 컬럼명 + 일자 ──
  const headerRow2 = sheet.getRow(2);
  headerRow2.height = 14;

  const leftHeaders = ['수종명', '규격', '수량', '단위'];
  leftHeaders.forEach((h, i) => {
    const cell = sheet.getCell(2, i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 8, color: { argb: 'FF6B7280' } };
    cell.alignment = { horizontal: i >= 2 ? 'center' : 'left', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
  });

  columns.forEach((col, i) => {
    const cell = sheet.getCell(2, LEFT_COLS + 1 + i);
    cell.value = col.day === 1 ? col.day : (col.day % 10 === 1 ? col.day : '');
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

  let currentRow = 3;

  // ── 대분류 + 항목 행 ──
  for (const catName of categories) {
    const catItems = planItems.filter(i => i.category === catName);

    // 대분류 헤더 행
    const catRow = sheet.getRow(currentRow);
    catRow.height = 16;

    sheet.mergeCells(currentRow, 1, currentRow, LEFT_COLS);
    const catCell = sheet.getCell(currentRow, 1);
    catCell.value = catLabel(catName);
    catCell.font = { bold: true, size: 9, color: { argb: barArgb } };
    catCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

    // 대분류 배경: 아주 연한 해당 색
    const catBg = color.replace('#', '');
    const r = Math.min(255, parseInt(catBg.slice(0,2),16) + 220);
    const g2 = Math.min(255, parseInt(catBg.slice(2,4),16) + 220);
    const b = Math.min(255, parseInt(catBg.slice(4,6),16) + 220);
    const lightArgb = `FF${r.toString(16).padStart(2,'0').toUpperCase()}${g2.toString(16).padStart(2,'0').toUpperCase()}${b.toString(16).padStart(2,'0').toUpperCase()}`;

    catCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightArgb } };
    catCell.border = {
      bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      top:    { style: 'thin', color: { argb: 'FFE5E7EB' } },
    };

    columns.forEach((col, i) => {
      const cell = sheet.getCell(currentRow, LEFT_COLS + 1 + i);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightArgb } };
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
      const row = sheet.getRow(currentRow);
      row.height = 14;

      // 왼쪽: 수종명, 규격, 수량, 단위
      const leftVals = [item.species_name, item.spec, Number(item.quantity).toLocaleString(), item.unit];
      leftVals.forEach((v, i) => {
        const cell = sheet.getCell(currentRow, i + 1);
        cell.value = v ?? '';
        cell.font = { size: 8, color: { argb: 'FF374151' }, bold: i === 0 };
        cell.alignment = {
          horizontal: i >= 2 ? 'center' : 'left',
          vertical: 'middle',
          indent: i === 0 ? 2 : 0,
        };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        cell.border = {
          bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } },
          right: i === LEFT_COLS - 1 ? { style: 'thin', color: { argb: 'FFD1D5DB' } } : undefined,
        };
      });

      // 간트 컬럼: period가 있으면 색칠
      const periods = item.periods || [];
      for (let ci = 0; ci < columns.length; ci++) {
        const col = columns[ci];
        const cell = sheet.getCell(currentRow, LEFT_COLS + 1 + ci);

        const matchedPeriod = periods.find(p => colInPeriod(col, p));
        if (matchedPeriod) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: barLightArgb } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        }
        cell.border = {
          right: isLastOfMonth(col)
            ? { style: 'thin', color: { argb: 'FFD1D5DB' } }
            : { style: 'hair', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } },
        };
      }

      // 메모: 각 period의 첫 번째 컬럼에 텍스트 삽입
      for (const period of periods) {
        if (!period.note) continue;
        const firstColIdx = columns.findIndex(col => colInPeriod(col, period));
        if (firstColIdx < 0) continue;
        const noteCell = sheet.getCell(currentRow, LEFT_COLS + 1 + firstColIdx);
        noteCell.value = period.note;
        noteCell.font = { size: 7, color: { argb: barArgb }, bold: true };
        noteCell.alignment = { vertical: 'middle' };
      }

      currentRow++;
    }
  }

  // 파일명
  const safeTitle = (plan.title || '공정표').replace(/[/\\?%*:|"<>]/g, '-');
  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(safeTitle)}.xlsx`,
    },
  });
}
