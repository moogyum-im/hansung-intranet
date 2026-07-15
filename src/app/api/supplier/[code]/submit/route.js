import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req, { params }) {
  const { code } = params;

  // 코드 검증
  const { data: token } = await supabaseAdmin
    .from('supplier_tokens')
    .select('company_name, is_active')
    .eq('code', code)
    .single();

  if (!token || !token.is_active) {
    return NextResponse.json({ error: '유효하지 않은 코드입니다.' }, { status: 403 });
  }

  const body = await req.json();
  const { rows, company_name, contact_info } = body;

  if (!rows?.length) {
    return NextResponse.json({ error: '등록할 데이터가 없습니다.' }, { status: 400 });
  }

  // tree_name, size 공백 제거 정규화
  const normalize = (str) => str?.replace(/\s+/g, '') ?? str;
  const normalizedRows = rows.map((row) => ({
    ...row,
    tree_name: normalize(row.tree_name),
    size: normalize(row.size),
  }));

  // 기존 데이터 조회 (단가 비교용)
  const { data: existing } = await supabaseAdmin
    .from('tree_sales_info')
    .select('tree_name, size, region, price')
    .eq('supplier_token_code', code);

  const existingMap = {};
  for (const row of (existing || [])) {
    const key = `${row.tree_name}||${row.size}||${row.region}`;
    existingMap[key] = row.price;
  }

  // 단가 변경 이력 기록
  const historyEntries = [];
  for (const row of normalizedRows) {
    if (!row.tree_name || !row.region) continue;
    const key = `${row.tree_name}||${row.size || ''}||${row.region}`;
    const oldPrice = existingMap[key];
    const newPrice = row.price != null ? Number(row.price) : null;

    if (oldPrice != null && newPrice != null && oldPrice !== newPrice) {
      historyEntries.push({
        supplier_token_code: code,
        company_name: company_name || token.company_name,
        region: row.region,
        tree_name: row.tree_name,
        size: row.size || null,
        old_price: oldPrice,
        new_price: newPrice,
      });
    }
  }

  if (historyEntries.length > 0) {
    await supabaseAdmin.from('tree_price_history').insert(historyEntries);
  }

  // 기존 데이터 삭제 후 재등록
  await supabaseAdmin
    .from('tree_sales_info')
    .delete()
    .eq('supplier_token_code', code);

  const insertData = normalizedRows.map((row) => ({
    region: row.region,
    tree_name: row.tree_name,
    size: row.size || null,
    price: row.price != null ? Number(String(row.price).replace(/,/g, '')) : null,
    quantity: row.quantity != null ? Number(String(row.quantity).replace(/,/g, '')) : null,
    company_name: company_name || token.company_name,
    contact_info: contact_info || null,
    remarks: row.remarks || null,
    supplier_token_code: code,
    last_updated: new Date().toISOString(),
  }));

  const { error } = await supabaseAdmin.from('tree_sales_info').insert(insertData);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    inserted: insertData.length,
    price_changes: historyEntries.length,
  });
}
