export const dynamic = 'force-dynamic';

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import PriceHistoryClient from './PriceHistoryClient';

export default async function PriceHistoryPage() {
  const supabase = createServerComponentClient({ cookies });

  const { data: history } = await supabase
    .from('tree_price_history')
    .select('*')
    .order('changed_at', { ascending: false })
    .limit(500);

  return <PriceHistoryClient initialHistory={history || []} />;
}
