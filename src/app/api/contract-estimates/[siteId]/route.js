import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(_, { params }) {
  const { siteId } = params;

  const { data, error } = await supabase
    .from('contract_estimates')
    .select('*, contract_estimate_items(*)')
    .eq('site_id', siteId)
    .order('version', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // 항목을 sort_order 순으로 정렬
  const estimates = (data || []).map(e => ({
    ...e,
    contract_estimate_items: (e.contract_estimate_items || [])
      .sort((a, b) => a.sort_order - b.sort_order),
  }));

  return Response.json(estimates);
}

export async function POST(request, { params }) {
  const { siteId } = params;

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: '요청 파싱 오류' }, { status: 400 }); }

  const { meta = {}, items = [] } = body;

  // 다음 버전 번호 결정
  const { data: existing } = await supabase
    .from('contract_estimates')
    .select('version')
    .eq('site_id', siteId)
    .order('version', { ascending: false })
    .limit(1);

  const nextVersion = (existing?.[0]?.version ?? 0) + 1;
  const autoLabel = nextVersion === 1 ? '원계약' : `${nextVersion - 1}차 변경`;

  // 기존 버전 current 해제
  await supabase
    .from('contract_estimates')
    .update({ is_current: false })
    .eq('site_id', siteId);

  // 새 버전 생성
  const { data: estimate, error: estErr } = await supabase
    .from('contract_estimates')
    .insert({
      site_id: siteId,
      version: nextVersion,
      version_label: meta.version_label || autoLabel,
      version_date: meta.version_date || null,
      is_current: true,
    })
    .select()
    .single();

  if (estErr) return Response.json({ error: estErr.message }, { status: 500 });

  // 항목 일괄 삽입
  if (items.length > 0) {
    const rows = items.map((item, idx) => ({
      estimate_id: estimate.id,
      category: item.category || 'supplementary',
      sort_order: idx,
      item_name: item.item_name || '',
      spec: item.spec || '',
      unit: item.unit || '',
      quantity: Number(item.quantity) || 0,
      material_unit_price: Number(item.material_unit_price) || 0,
      labor_unit_price: Number(item.labor_unit_price) || 0,
      overhead_unit_price: Number(item.overhead_unit_price) || 0,
      material_amount: Number(item.material_amount) || 0,
      labor_amount: Number(item.labor_amount) || 0,
      overhead_amount: Number(item.overhead_amount) || 0,
      total_amount: Number(item.total_amount) || 0,
      notes: item.notes || '',
    }));

    const { error: itemErr } = await supabase
      .from('contract_estimate_items')
      .insert(rows);

    if (itemErr) return Response.json({ error: itemErr.message }, { status: 500 });
  }

  return Response.json({ success: true, estimate });
}

export async function DELETE(request, { params }) {
  const { siteId } = params;
  const { searchParams } = new URL(request.url);
  const estimateId = searchParams.get('estimateId');

  if (!estimateId) return Response.json({ error: 'estimateId 필요' }, { status: 400 });

  const { error } = await supabase
    .from('contract_estimates')
    .delete()
    .eq('id', estimateId)
    .eq('site_id', siteId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
