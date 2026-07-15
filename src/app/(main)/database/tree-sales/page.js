import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import TreeSalesClient from './TreeSalesClient';

export default async function TreeSalesPage() {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  const [{ data: salesData }, { data: historyData }, { data: tokensData }] = await Promise.all([
    supabase
      .from('tree_sales_info')
      .select('*')
      .order('region', { ascending: true })
      .order('tree_name', { ascending: true }),
    supabase
      .from('tree_price_history')
      .select('supplier_token_code, tree_name, size, region, old_price, new_price, changed_at')
      .order('changed_at', { ascending: false }),
    supabase
      .from('supplier_tokens')
      .select('*')
      .order('created_at', { ascending: false }),
  ]);

  const allData = salesData || [];

  // 항목별 최신 변경 이력만 남기기 (key: supplier_token_code||tree_name||size||region)
  const priceChangeMap = {};
  for (const h of (historyData || [])) {
    const key = `${h.supplier_token_code}||${h.tree_name}||${h.size || ''}||${h.region}`;
    if (!priceChangeMap[key]) priceChangeMap[key] = h;
  }

  const lastSyncTime = allData.length > 0
    ? allData.reduce(
        (max, item) => ((item.last_updated || '') > max ? item.last_updated : max), ''
      )
    : null;

  return (
    <TreeSalesClient
      initialData={allData}
      lastSyncTime={lastSyncTime}
      priceChangeMap={priceChangeMap}
      initialTokens={tokensData || []}
    />
  );
}
