import ExcelJS from 'exceljs';

// 화면의 grid-cols-12 레이아웃을 그대로 흉내 내기 위해, 전체를 기준 컬럼으로 쪼개서
// 섹션마다 필요한 비율(가중치)로 merge 해서 쓴다. (12/3/4의 배수라 딱 나눠지는 60을 사용)
// 컬럼 수를 너무 잘게 쪼개면(예: 120개) 엑셀 자체의 열 머리글(A,B,...AA,AB...)이 너무 좁아져 뭉개져 보이므로
// 60개 + 넉넉한 너비로 가독성을 확보한다.
const TOTAL_UNITS = 60;
const UNIT_WIDTH = 4.2; // 엑셀 컬럼 너비 단위 (화면 오른쪽이 비어 보이지 않도록 넉넉하게)

const FIELD_MAPS = {
    labor_costs: { fields: ['name', 'price', 'count', 'type', 'prev_count', 'accum', 'total'], labels: ['성명', '단가', '공수', '직종', '전일누계', '출력누계', '금액'], title: '현장출력현황' },
    tree_costs: { fields: ['item', 'spec', 'price', 'design_count', 'prev_count', 'count', 'accum', 'vendor', 'total'], labels: ['품명', '규격', '단가', '설계수량', '전일누계', '금일수량', '전체누계', '거래처', '금액'], title: '수목반입현황' },
    material_costs: { fields: ['item', 'spec', 'price', 'prev_count', 'count', 'accum', 'total'], labels: ['품명', '규격', '단가', '전일누계', '금일수량', '전체누계', '금액'], title: '주요자재반입현황' },
    transport_costs: { fields: ['item', 'spec', 'count', 'price', 'vendor', 'total'], labels: ['품명', '규격', '수량', '단가', '거래처', '금액'], title: '운반비투입현황' },
    subcontract_costs: { fields: ['item', 'spec', 'price', 'count', 'vendor', 'total'], labels: ['품명', '규격', '단가', '수량', '거래처', '금액'], title: '자재납품 및 시공' },
    equipment_costs: { fields: ['item', 'price', 'prev_count', 'count', 'accum', 'total'], labels: ['품명', '단가', '전일누계', '금일', '출력누계', '금액'], title: '장비사용현황' },
    etc_costs: { fields: ['category', 'content', 'usage', 'total'], labels: ['계정', '내용', '사용처', '금액'], title: '기타경비' },
};

const LEDGER_MAP = {
    fields: ['item', 'spec', 'contract', 'base_incoming', 'incoming', 'not_incoming', 'prev_planted', 'prev_remain', 'planted', 'final_remain'],
    labels: ['수종명', '규격', '계약수량', '기반입', '금일반입', '미반입', '전일식재량', '전일미식재', '금일식재', '잔량(미식재)'],
};

const NUMERIC_FIELDS = new Set(['price', 'count', 'prev_count', 'accum', 'total', 'design_count', 'contract', 'base_incoming', 'incoming', 'not_incoming', 'prev_planted', 'prev_remain', 'planted', 'final_remain']);

const THIN = { style: 'thin', color: { argb: 'FF000000' } };
const BORDER_ALL = { top: THIN, left: THIN, bottom: THIN, right: THIN };

const safeParseJSON = (data) => {
    if (!data) return {};
    if (typeof data === 'object') return data;
    try { return JSON.parse(data); } catch (e) { return {}; }
};

const parseNumber = (str) => {
    if (typeof str === 'number') return str;
    if (!str) return 0;
    const match = str.toString().replace(/,/g, '').match(/-?\d*\.?\d+/);
    return match ? Number(match[0]) : 0;
};

const formatNumber = (num) => {
    const n = parseNumber(num);
    if (n === 0) return '0';
    if (n % 1 !== 0) return n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 4 });
    return Math.round(n).toLocaleString();
};

// 인트라넷 화면은 식재장부/비용표에서 "전일 내역"(과거부터 누적되어 넘어온, 오늘 변동이 없는 행)을
// 기본적으로 접어서 숨기고, 금일 실제로 입력/변동이 있었던 행만 보여준다.
// 그런데 저장된 notes JSON 자체에는 과거 행도 함께 들어있는 경우가 많아(화면에서 접었다 펼 수 있게 하려고),
// 그대로 내보내면 모든 날짜 시트에 과거 데이터까지 전부 중복으로 찍힌다.
// 그래서 엑셀에는 "해당 날짜에 실제로 변동(활동)이 있었던 행"만 걸러서 담는다 (화면 기본 보기와 동일).
const ACTIVITY_FIELDS = {
    manual_ledger: ['incoming', 'planted'],
    labor_costs: ['count', 'total'],
    tree_costs: ['count', 'total'],
    material_costs: ['count', 'total'],
    transport_costs: ['count', 'total'],
    subcontract_costs: ['count', 'total'],
    equipment_costs: ['count', 'total'],
    // etc_costs는 화면에서도 누적 이력 없이 항상 '그날 입력분'만 저장되므로 필터하지 않음
};

function filterTodayOnly(key, rows) {
    const fields = ACTIVITY_FIELDS[key];
    if (!fields) return rows || [];
    return (rows || []).filter(row => fields.some(f => parseNumber(row[f]) > 0));
}

const buildPhotoArray = (photos, type) => {
    const filtered = (photos || []).filter(p => p?.timeType === type);
    if (filtered.every(p => typeof p.rowIndex !== 'number')) return filtered;
    const arr = [];
    filtered.forEach(p => { arr[typeof p.rowIndex === 'number' ? p.rowIndex : arr.length] = p; });
    return arr;
};

async function fetchImageBuffer(url) {
    if (!url) return null;
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const buffer = await res.arrayBuffer();
        const lower = url.toLowerCase();
        const extension = lower.includes('.png') ? 'png' : lower.includes('.gif') ? 'gif' : 'jpeg';
        return { buffer, extension };
    } catch (e) {
        return null;
    }
}

// total 단위를 weights 비율대로 정수 분할 (합계가 정확히 total이 되도록 나머지를 분배)
function distribute(total, weights) {
    const sumW = weights.reduce((a, b) => a + b, 0);
    const raw = weights.map(w => (total * w) / sumW);
    const floors = raw.map(Math.floor);
    let remainder = total - floors.reduce((a, b) => a + b, 0);
    const order = raw.map((v, i) => ({ i, frac: v - floors[i] })).sort((a, b) => b.frac - a.frac);
    const result = [...floors];
    for (let k = 0; k < remainder; k++) result[order[k % order.length].i]++;
    return result.map(v => Math.max(1, v));
}

function offsetsOf(colStart, widths) {
    const offsets = [];
    let cur = colStart;
    widths.forEach(w => { offsets.push(cur); cur += w; });
    return offsets;
}

// 줄바꿈(wrapText)이 들어가는 셀은 엑셀이 열 때 행 높이를 자동으로 재계산해주지 않기 때문에,
// 텍스트 길이 기준으로 필요한 줄 수를 추정해 명시적으로 행 높이를 지정해준다.
function estimateWrapHeight(texts, colSpanUnits, fontSize = 8) {
    const widthPx = colSpanUnits * UNIT_WIDTH * 7 + 5;
    const avgCharPx = fontSize * 1.05; // 한글 기준 대략적인 글자 폭
    const charsPerLine = Math.max(4, Math.floor(widthPx / avgCharPx));
    let maxLines = 1;
    (texts || []).filter(Boolean).forEach(t => {
        const lines = Math.max(1, Math.ceil(String(t).length / charsPerLine));
        if (lines > maxLines) maxLines = lines;
    });
    return Math.max(16, maxLines * (fontSize * 1.7));
}

function styleCell(cell, { bold = false, size = 8, color = 'FF111827', align = 'left', fill, numeric = false, wrap = false, shrink = false } = {}) {
    cell.font = { bold, size, color: { argb: color } };
    // shrink: 텍스트가 길어도 줄바꿈으로 행 높이를 늘리지 않고, 셀 안에서 글자 크기를 자동으로 줄여 한 줄에 맞춘다.
    // (옆에 나란히 배치된 다른 표들의 행 높이와 어긋나지 않도록, 줄바꿈이 곤란한 자리에 사용)
    cell.alignment = { horizontal: align, vertical: 'middle', wrapText: wrap, shrinkToFit: shrink };
    cell.border = BORDER_ALL;
    if (fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
    if (numeric) cell.numFmt = '#,##0';
}

function band(sheet, row, colStart, colSpan, text, { bold = true, size = 9, align = 'left', fill = 'FFFFF7D6', color = 'FF111827' } = {}) {
    if (colSpan > 1) sheet.mergeCells(row, colStart, row, colStart + colSpan - 1);
    const cell = sheet.getCell(row, colStart);
    cell.value = text;
    styleCell(cell, { bold, size, align, fill, color });
    return row + 1;
}

// colStart~colStart+colSpan-1 영역에 표(제목/헤더/데이터/합계)를 그려 넣고, 다음 행 번호를 반환
function writeTable(sheet, startRow, colStart, colSpan, config, rows) {
    let r = startRow;
    r = band(sheet, r, colStart, colSpan, `▣ ${config.title} (${rows.length}건)`, { fill: 'FFFFF7D6', size: 9 });

    const widths = distribute(colSpan, config.labels.map(() => 1));
    const offsets = offsetsOf(colStart, widths);

    const headerRow = sheet.getRow(r);
    config.labels.forEach((label, i) => {
        if (widths[i] > 1) sheet.mergeCells(r, offsets[i], r, offsets[i] + widths[i] - 1);
        const cell = headerRow.getCell(offsets[i]);
        cell.value = label;
        styleCell(cell, { bold: true, size: 7, color: 'FF374151', align: 'center', fill: 'FFF3F4F6' });
    });
    r++;

    if (rows.length === 0) {
        sheet.mergeCells(r, colStart, r, colStart + colSpan - 1);
        const cell = sheet.getCell(r, colStart);
        cell.value = '내역 없음';
        styleCell(cell, { size: 7, color: 'FF9CA3AF', align: 'center' });
        r++;
    } else {
        rows.forEach(row => {
            const dataRow = sheet.getRow(r);
            config.fields.forEach((field, i) => {
                if (widths[i] > 1) sheet.mergeCells(r, offsets[i], r, offsets[i] + widths[i] - 1);
                const cell = dataRow.getCell(offsets[i]);
                const isNumeric = NUMERIC_FIELDS.has(field);
                cell.value = isNumeric ? (parseNumber(row[field]) || null) : (row[field] ?? '');
                styleCell(cell, { size: 7, align: isNumeric ? 'right' : 'center', numeric: isNumeric });
            });
            r++;
        });

        const totalRow = sheet.getRow(r);
        config.fields.forEach((field, i) => {
            if (widths[i] > 1) sheet.mergeCells(r, offsets[i], r, offsets[i] + widths[i] - 1);
            const cell = totalRow.getCell(offsets[i]);
            const isNumeric = NUMERIC_FIELDS.has(field);
            if (i === 0) cell.value = '합계';
            else if (isNumeric) cell.value = rows.reduce((acc, row) => acc + parseNumber(row[field]), 0) || null;
            styleCell(cell, { bold: true, size: 7, color: 'FF1D4ED8', align: isNumeric ? 'right' : 'center', fill: 'FFEFF6FF', numeric: isNumeric });
        });
        r++;
    }
    return r;
}

export async function exportDailyReportsExcel({ site, reports, startDate, endDate }) {
    const filtered = (reports || [])
        .filter(r => r.report_date >= startDate && r.report_date <= endDate)
        .slice()
        .sort((a, b) => {
            if (a.report_date !== b.report_date) return a.report_date < b.report_date ? -1 : 1;
            const catA = safeParseJSON(a.notes)?.report_category || 'plant';
            const catB = safeParseJSON(b.notes)?.report_category || 'plant';
            return catA.localeCompare(catB);
        });

    if (filtered.length === 0) {
        throw new Error('선택한 기간에 작업일보가 없습니다.');
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = '한성개발';
    const usedSheetNames = new Set();

    for (const report of filtered) {
        const notes = safeParseJSON(report.notes);
        const category = notes.report_category || 'plant';
        const categoryLabel = category === 'facility' ? '시설' : '식재';

        let sheetName = `${report.report_date}_${categoryLabel}`;
        let suffix = 2;
        while (usedSheetNames.has(sheetName)) sheetName = `${report.report_date}_${categoryLabel}(${suffix++})`;
        usedSheetNames.add(sheetName);

        const sheet = workbook.addWorksheet(sheetName, {
            pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
            views: [{ showGridLines: false }],
        });
        for (let i = 1; i <= TOTAL_UNITS; i++) sheet.getColumn(i).width = UNIT_WIDTH;

        const contractAmt = parseNumber(notes.total_contract_amount ?? site?.budget);
        const settlementCosts = notes.settlement_costs || [];
        const sTotals = settlementCosts.reduce((acc, cur) => ({
            prev: acc.prev + parseNumber(cur.prev), today: acc.today + parseNumber(cur.today), total: acc.total + parseNumber(cur.total)
        }), { prev: 0, today: 0, total: 0 });
        const spendRate = contractAmt > 0 ? ((sTotals.total / contractAmt) * 100).toFixed(2) : '0.00';

        // ── BLOCK 1 : 상단 헤더 (grid-cols-12 → col-span-7 | col-span-5) ──
        let r = 1;
        const [leftSpan, rightSpan] = distribute(TOTAL_UNITS, [7, 5]);
        const rightStart = 1 + leftSpan;

        // 제목은 2행을 세로 병합해서 오른쪽 메타 표(현장명/작업일시)와 높이를 맞추고, 뱃지 행은 그만큼 한 칸 아래로 내린다.
        sheet.mergeCells(r, 1, r + 1, leftSpan);
        const titleCell = sheet.getCell(r, 1);
        titleCell.value = '작 업 일 보';
        styleCell(titleCell, { bold: true, size: 16, align: 'center', fill: 'FFFFFFFF' });
        let leftR = r + 2;
        {
            const badgeRow = sheet.getRow(leftR);
            const texts = [
                `총 도급액: ${formatNumber(contractAmt)}원`,
                `금일 사용: ${formatNumber(sTotals.today)}원`,
                `누적 집행: ${formatNumber(sTotals.total)}원 (${spendRate}%)`,
            ];
            if (site?.is_plant_active) texts.push(`식재 공정률: ${(parseNumber(notes.progress_plant_prev) + parseNumber(notes.progress_plant)).toFixed(4)}%`);
            if (site?.is_facility_active) texts.push(`시설 공정률: ${(parseNumber(notes.progress_facility_prev) + parseNumber(notes.progress_facility)).toFixed(4)}%`);
            const widths = distribute(leftSpan, texts.map(() => 1));
            const offsets = offsetsOf(1, widths);
            texts.forEach((t, i) => {
                if (widths[i] > 1) sheet.mergeCells(leftR, offsets[i], leftR, offsets[i] + widths[i] - 1);
                const cell = badgeRow.getCell(offsets[i]);
                cell.value = t;
                styleCell(cell, { bold: true, size: 7, align: 'center', fill: 'FFF9FAFB', color: i === 2 ? 'FFDC2626' : i >= 3 ? 'FF1D4ED8' : 'FF111827', wrap: true });
            });
            sheet.getRow(leftR).height = estimateWrapHeight(texts, widths[0], 7);
            leftR++;
        }

        let rightR = r;
        {
            const metaRow = sheet.getRow(rightR);
            const widths = distribute(rightSpan, [18, 46, 18, 18]);
            const offsets = offsetsOf(rightStart, widths);
            const metaCells = [['현장명', site?.name || '-'], ['작업일시', report.report_date]];
            metaCells.forEach(([label, value], pairIdx) => {
                const labelCol = offsets[pairIdx * 2], labelW = widths[pairIdx * 2];
                if (labelW > 1) sheet.mergeCells(rightR, labelCol, rightR, labelCol + labelW - 1);
                const labelCell = metaRow.getCell(labelCol);
                labelCell.value = label;
                styleCell(labelCell, { bold: true, size: 8, align: 'center', fill: 'FFF9FAFB' });
                const valueCol = offsets[pairIdx * 2 + 1], valueW = widths[pairIdx * 2 + 1];
                if (valueW > 1) sheet.mergeCells(rightR, valueCol, rightR, valueCol + valueW - 1);
                const valueCell = metaRow.getCell(valueCol);
                valueCell.value = value;
                styleCell(valueCell, { size: 8, align: 'center', wrap: true });
            });
            sheet.getRow(rightR).height = estimateWrapHeight([site?.name], widths[1], 8);
            rightR++;

            ['plant', 'facility'].forEach(k => {
                const isActive = k === 'plant' ? site?.is_plant_active : site?.is_facility_active;
                if (!isActive) return;
                const progRow = sheet.getRow(rightR);
                if (widths[0] > 1) sheet.mergeCells(rightR, offsets[0], rightR, offsets[0] + widths[0] - 1);
                const labelCell = progRow.getCell(offsets[0]);
                labelCell.value = k === 'plant' ? '식재공정' : '시설공정';
                styleCell(labelCell, { bold: true, size: 8, align: 'center', fill: 'FFEFF6FF' });
                if (widths[1] > 1) sheet.mergeCells(rightR, offsets[1], rightR, offsets[1] + widths[1] - 1);
                const prevCell = progRow.getCell(offsets[1]);
                prevCell.value = `전일 ${notes[`progress_${k}_prev`] || '0.0000'}%`;
                styleCell(prevCell, { size: 8, align: 'center' });
                sheet.mergeCells(rightR, offsets[2], rightR, offsets[3] + widths[3] - 1);
                const todayCell = progRow.getCell(offsets[2]);
                todayCell.value = `금일(입력) ${notes[`progress_${k}`] || '0.0000'}%`;
                styleCell(todayCell, { size: 8, align: 'center', color: 'FF1D4ED8', fill: 'FFEFF6FF' });
                rightR++;
            });
        }
        r = Math.max(leftR, rightR);

        // ── BLOCK 2 : 전일/금일 작업 요약 | 식재 수기장부 | 실시간 정산 내역 (grid-cols-12 → 3 | 5 | 4) ──
        // 저장된 notes에는 과거부터 누적된 '전일 내역'도 함께 들어있을 수 있으므로, 그날 실제 활동이 있었던 행만 추려낸다.
        // 데이터가 없는 날에도 섹션 자체는 항상 같은 비율로 그려서(공란으로 표시) 모든 날짜 시트의 양식이 통일되게 한다.
        const todayLedgerRows = filterTodayOnly('manual_ledger', notes.manual_ledger);
        const [workSpan, ledgerSpan, settleSpan] = distribute(TOTAL_UNITS, [3, 5, 4]);
        const workStart = 1;
        const ledgerStart = workStart + workSpan;
        const settleStart = ledgerStart + ledgerSpan;
        const blockStart = r;

        let workR = blockStart;
        workR = band(sheet, workR, workStart, workSpan, '전일 작업 요약', { size: 9, fill: 'FFF9FAFB' });
        const prevLines = (notes.prev_work || '').split('\n').filter(l => l.trim() !== '');
        if (prevLines.length === 0) prevLines.push('-');
        prevLines.forEach((line, i) => {
            const cell = sheet.getCell(workR, workStart);
            sheet.mergeCells(workR, workStart, workR, workStart + workSpan - 1);
            cell.value = `${i + 1}. ${line}`;
            // 줄바꿈 대신 shrinkToFit을 써서, 글자가 길어도 행 높이를 늘리지 않고 한 줄 안에서 글자 크기만 줄인다.
            // (행 높이가 늘어나면 옆에 나란히 붙는 수기장부/정산내역 표까지 같은 행 높이를 공유해 늘어져버림)
            styleCell(cell, { size: 8, align: 'left', shrink: true });
            workR++;
        });
        workR = band(sheet, workR, workStart, workSpan, '금일 작업 요약', { size: 9, fill: 'FFEFF6FF' });
        const todayLines = (notes.today_work || '').split('\n').filter(l => l.trim() !== '');
        if (todayLines.length === 0) todayLines.push('-');
        todayLines.forEach((line, i) => {
            const cell = sheet.getCell(workR, workStart);
            sheet.mergeCells(workR, workStart, workR, workStart + workSpan - 1);
            cell.value = `${i + 1}. ${line}`;
            styleCell(cell, { size: 8, align: 'left', color: 'FF1D4ED8', shrink: true });
            workR++;
        });

        const ledgerR = writeTable(sheet, blockStart, ledgerStart, ledgerSpan, { title: '식재 및 반입 수기 장부(금일분)', fields: LEDGER_MAP.fields, labels: LEDGER_MAP.labels }, todayLedgerRows);

        let settleR = blockStart;
        settleR = band(sheet, settleR, settleStart, settleSpan, '▣ 정산 내역 합계', { fill: 'FFE2E8F0', size: 9 });
        {
            const widths = distribute(settleSpan, [1, 1, 1, 1]);
            const offsets = offsetsOf(settleStart, widths);
            const headerRow = sheet.getRow(settleR);
            ['항목', '전일', '금일', '누계'].forEach((label, i) => {
                if (widths[i] > 1) sheet.mergeCells(settleR, offsets[i], settleR, offsets[i] + widths[i] - 1);
                const cell = headerRow.getCell(offsets[i]);
                cell.value = label;
                styleCell(cell, { bold: true, size: 8, align: 'center', fill: 'FFF3F4F6' });
            });
            settleR++;

            if (settlementCosts.length === 0) {
                sheet.mergeCells(settleR, settleStart, settleR, settleStart + settleSpan - 1);
                const cell = sheet.getCell(settleR, settleStart);
                cell.value = '내역 없음';
                styleCell(cell, { size: 7, color: 'FF9CA3AF', align: 'center' });
                settleR++;
            } else {
                settlementCosts.forEach(row => {
                    const dataRow = sheet.getRow(settleR);
                    [row.item, parseNumber(row.prev) || null, parseNumber(row.today) || null, parseNumber(row.total) || null].forEach((val, i) => {
                        if (widths[i] > 1) sheet.mergeCells(settleR, offsets[i], settleR, offsets[i] + widths[i] - 1);
                        const cell = dataRow.getCell(offsets[i]);
                        cell.value = val;
                        styleCell(cell, { size: 8, align: i === 0 ? 'center' : 'right', numeric: i > 0 });
                    });
                    settleR++;
                });
            }

            const totalRow = sheet.getRow(settleR);
            ['총 합계', sTotals.prev || null, sTotals.today || null, sTotals.total || null].forEach((val, i) => {
                if (widths[i] > 1) sheet.mergeCells(settleR, offsets[i], settleR, offsets[i] + widths[i] - 1);
                const cell = totalRow.getCell(offsets[i]);
                cell.value = val;
                styleCell(cell, { bold: true, size: 8, color: 'FF1D4ED8', align: i === 0 ? 'center' : 'right', fill: 'FFEFF6FF', numeric: i > 0 });
            });
            settleR++;
        }

        r = Math.max(workR, ledgerR, settleR);

        // ── BLOCK 3 : 비용 테이블 3열 (grid-cols-3) : [노무+수목] | [자재+운반+외주] | [장비+기타] ──
        const [col1Span, col2Span, col3Span] = distribute(TOTAL_UNITS, [1, 1, 1]);
        const col1Start = 1, col2Start = col1Start + col1Span, col3Start = col2Start + col2Span;
        const col1Keys = ['labor_costs', 'tree_costs'];
        const col2Keys = ['material_costs', 'transport_costs', 'subcontract_costs'];
        const col3Keys = ['equipment_costs', 'etc_costs'];

        const renderColumn = (keys, colStart, colSpan) => {
            let cr = r;
            keys.forEach(key => {
                const rows = filterTodayOnly(key, notes[key] || []);
                cr = writeTable(sheet, cr, colStart, colSpan, FIELD_MAPS[key], rows);
            });
            return cr;
        };
        const end1 = renderColumn(col1Keys, col1Start, col1Span);
        const end2 = renderColumn(col2Keys, col2Start, col2Span);
        const end3 = renderColumn(col3Keys, col3Start, col3Span);
        r = Math.max(end1, end2, end3);

        // ── BLOCK 4 : 시공 사진 대지 (grid-cols-4, 블록 내부는 전일|금일 2열) ──
        const todayPhotos = buildPhotoArray(report.photos, 'today');
        const tomorrowPhotos = buildPhotoArray(report.photos, 'tomorrow');
        const maxPhotoRows = Math.max(todayPhotos.length, tomorrowPhotos.length);

        if (maxPhotoRows > 0) {
            r = band(sheet, r, 1, TOTAL_UNITS, `▣ 시공 사진 대지 (${maxPhotoRows}건)`, { fill: 'FFFFF7D6', size: 10 });

            const [b1, b2, b3, b4] = distribute(TOTAL_UNITS, [1, 1, 1, 1]);
            const blockSpans = [b1, b2, b3, b4];
            const blockStarts = offsetsOf(1, blockSpans);

            for (let chunkStart = 0; chunkStart < maxPhotoRows; chunkStart += 4) {
                const rowTop = r;
                const idxInChunk = [0, 1, 2, 3].map(i => chunkStart + i).filter(idx => idx < maxPhotoRows);

                const imagePromises = idxInChunk.map(idx => Promise.all([
                    fetchImageBuffer(tomorrowPhotos[idx]?.url),
                    fetchImageBuffer(todayPhotos[idx]?.url),
                ]));
                const results = await Promise.all(imagePromises);

                idxInChunk.forEach((idx, pos) => {
                    const blockStart = blockStarts[pos];
                    const blockSpan = blockSpans[pos];
                    const [halfA, halfB] = distribute(blockSpan, [1, 1]);
                    const colA = blockStart, colB = blockStart + halfA;
                    let br = rowTop;

                    sheet.mergeCells(br, blockStart, br, blockStart + blockSpan - 1);
                    const noCell = sheet.getCell(br, blockStart);
                    noCell.value = `NO. ${String(idx + 1).padStart(2, '0')}`;
                    styleCell(noCell, { bold: true, size: 8, color: 'FF6B7280', align: 'left', fill: 'FFFFFFFF' });
                    br++;

                    sheet.mergeCells(br, colA, br, colA + halfA - 1);
                    const prevLabel = sheet.getCell(br, colA);
                    prevLabel.value = '전일';
                    styleCell(prevLabel, { bold: true, size: 8, color: 'FF6B7280', align: 'center', fill: 'FFF3F4F6' });
                    sheet.mergeCells(br, colB, br, colB + halfB - 1);
                    const todayLabel = sheet.getCell(br, colB);
                    todayLabel.value = '금일';
                    styleCell(todayLabel, { bold: true, size: 8, color: 'FFFFFFFF', align: 'center', fill: 'FF2563EB' });
                    br++;

                    const imgRow = br;
                    sheet.mergeCells(br, colA, br, colA + halfA - 1);
                    sheet.mergeCells(br, colB, br, colB + halfB - 1);
                    sheet.getCell(br, colA).border = BORDER_ALL;
                    sheet.getCell(br, colB).border = BORDER_ALL;
                    sheet.getRow(br).height = 112;

                    const [prevImg, todayImg] = results[pos];
                    if (prevImg) {
                        const imageId = workbook.addImage({ buffer: prevImg.buffer, extension: prevImg.extension });
                        sheet.addImage(imageId, { tl: { col: colA - 1 + 0.08, row: imgRow - 1 + 0.05 }, ext: { width: 210, height: 145 } });
                    } else {
                        const cell = sheet.getCell(br, colA);
                        cell.value = '사진 없음';
                        styleCell(cell, { size: 8, color: 'FF9CA3AF', align: 'center' });
                    }
                    if (todayImg) {
                        const imageId = workbook.addImage({ buffer: todayImg.buffer, extension: todayImg.extension });
                        sheet.addImage(imageId, { tl: { col: colB - 1 + 0.08, row: imgRow - 1 + 0.05 }, ext: { width: 210, height: 145 } });
                    } else {
                        const cell = sheet.getCell(br, colB);
                        cell.value = '사진 없음';
                        styleCell(cell, { size: 8, color: 'FF9CA3AF', align: 'center' });
                    }
                    br++;

                    const prevDescText = tomorrowPhotos[idx]?.description || '';
                    const todayDescText = todayPhotos[idx]?.description || '';
                    sheet.mergeCells(br, colA, br, colA + halfA - 1);
                    const prevDesc = sheet.getCell(br, colA);
                    prevDesc.value = prevDescText;
                    styleCell(prevDesc, { size: 8, align: 'left', wrap: true });
                    sheet.mergeCells(br, colB, br, colB + halfB - 1);
                    const todayDesc = sheet.getCell(br, colB);
                    todayDesc.value = todayDescText;
                    styleCell(todayDesc, { size: 8, align: 'left', color: 'FF1D4ED8', wrap: true });
                    sheet.getRow(br).height = estimateWrapHeight([prevDescText, todayDescText], halfA, 8);
                });

                r = rowTop + 4; // NO행 + 라벨행 + 이미지행 + 설명행
            }
        }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const safeSiteName = (site?.name || '현장').replace(/[/\\?%*:|"<>]/g, '-');
    const fileName = `${safeSiteName}_작업일보_${startDate}~${endDate}.xlsx`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { count: filtered.length, fileName };
}
