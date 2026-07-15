export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import SupplierForm from './SupplierForm';

export default async function SupplierSubmitPage({ params }) {
  const { code } = params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: token } = await supabase
    .from('supplier_tokens')
    .select('company_name, is_active')
    .eq('code', code)
    .single();

  if (!token || !token.is_active) notFound();

  const { data: trees } = await supabase
    .from('tree_sales_info')
    .select('*')
    .eq('supplier_token_code', code)
    .order('tree_name', { ascending: true });

  return (
    <SupplierForm
      code={code}
      companyName={token.company_name}
      initialTrees={trees || []}
    />
  );
}
