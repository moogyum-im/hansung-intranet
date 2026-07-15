import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 수령 추가
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: '요청 파싱 오류' }, { status: 400 }); }

  const { billing_id, received_date, received_amount, notes } = body;
  if (!billing_id || !received_date || received_amount == null) {
    return Response.json({ error: '필수 항목 누락' }, { status: 400 });
  }

  // 해당 기성 청구의 청구금액 조회 → 수령률 계산
  const { data: billing } = await supabase
    .from('progress_billings')
    .select('total_amount')
    .eq('id', billing_id)
    .single();

  const receipt_rate = billing?.total_amount > 0
    ? Math.round(received_amount / billing.total_amount * 1000) / 10
    : null;

  const { data, error } = await supabase
    .from('progress_billing_receipts')
    .insert({ billing_id, received_date, received_amount: Number(received_amount), receipt_rate, notes: notes || null })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}

// 수령 삭제
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'id 필요' }, { status: 400 });

  const { error } = await supabase
    .from('progress_billing_receipts')
    .delete()
    .eq('id', id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
