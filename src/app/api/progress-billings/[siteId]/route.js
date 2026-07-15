import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(_, { params }) {
  const { siteId } = params;

  const { data, error } = await supabase
    .from('progress_billings')
    .select('*, progress_billing_items(*), progress_billing_receipts(*)')
    .eq('site_id', siteId)
    .order('billing_round', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const billings = (data || []).map(b => ({
    ...b,
    progress_billing_items: (b.progress_billing_items || []).sort((a, b) => a.sort_order - b.sort_order),
    progress_billing_receipts: (b.progress_billing_receipts || []).sort((a, b) => new Date(a.received_date) - new Date(b.received_date)),
  }));

  return Response.json(billings);
}

export async function POST(request, { params }) {
  const { siteId } = params;

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: '요청 파싱 오류' }, { status: 400 }); }

  const { meta = {}, items = [] } = body;

  const { data: existing } = await supabase
    .from('progress_billings')
    .select('billing_round')
    .eq('site_id', siteId)
    .order('billing_round', { ascending: false })
    .limit(1);

  const nextRound = (existing?.[0]?.billing_round ?? 0) + 1;
  const totalAmount = items.reduce((sum, i) => sum + (Number(i.billing_amount) || 0), 0);

  // 예상 수령일 자동 계산: 청구 기간 종료 익월 25일
  let expectedReceiveDate = meta.expected_receive_date || null;
  if (!expectedReceiveDate && meta.billing_period_end) {
    const end = new Date(meta.billing_period_end);
    const receiveYear  = end.getMonth() === 11 ? end.getFullYear() + 1 : end.getFullYear();
    const receiveMonth = end.getMonth() === 11 ? 0 : end.getMonth() + 1;
    expectedReceiveDate = `${receiveYear}-${String(receiveMonth + 1).padStart(2, '0')}-25`;
  }

  const { data: billing, error: billErr } = await supabase
    .from('progress_billings')
    .insert({
      site_id: siteId,
      billing_round: nextRound,
      billing_date: meta.billing_date || null,
      billing_period_start: meta.billing_period_start || null,
      billing_period_end: meta.billing_period_end || null,
      expected_receive_date: expectedReceiveDate,
      total_amount: totalAmount,
      notes: meta.notes || null,
    })
    .select()
    .single();

  if (billErr) return Response.json({ error: billErr.message }, { status: 500 });

  if (items.length > 0) {
    const rows = items.map((item, idx) => ({
      billing_id: billing.id,
      category: item.category || 'supplementary',
      sort_order: idx,
      item_name: item.item_name || '',
      spec: item.spec || '',
      unit: item.unit || '',
      contract_quantity: Number(item.contract_quantity) || 0,
      billing_quantity: Number(item.billing_quantity) || 0,
      billing_rate: Number(item.billing_rate) || 0,
      unit_price: Number(item.unit_price) || 0,
      contract_amount: Number(item.contract_amount) || 0,
      billing_amount: Number(item.billing_amount) || 0,
      notes: item.notes || '',
    }));
    const { error: itemErr } = await supabase.from('progress_billing_items').insert(rows);
    if (itemErr) return Response.json({ error: itemErr.message }, { status: 500 });
  }

  return Response.json({ success: true, billing }, { status: 201 });
}

export async function DELETE(request, { params }) {
  const { siteId } = params;
  const { searchParams } = new URL(request.url);
  const billingId = searchParams.get('billingId');
  if (!billingId) return Response.json({ error: 'billingId 필요' }, { status: 400 });

  const { error } = await supabase
    .from('progress_billings')
    .delete()
    .eq('id', billingId)
    .eq('site_id', siteId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
