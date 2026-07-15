export const dynamic = 'force-dynamic';

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import SupplierCodesClient from './SupplierCodesClient';

export default async function SupplierCodesPage() {
  const supabase = createServerComponentClient({ cookies });

  const { data: tokens } = await supabase
    .from('supplier_tokens')
    .select('*')
    .order('created_at', { ascending: false });

  return <SupplierCodesClient initialTokens={tokens || []} />;
}
