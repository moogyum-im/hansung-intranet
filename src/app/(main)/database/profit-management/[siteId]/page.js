import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import ProfitDetailClient from './ProfitDetailClient';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function ProfitDetailPage({ params }) {
  noStore();
  const { siteId } = params;

  const { data: site, error } = await supabase
    .from('construction_sites')
    .select('id, name, status, start_date, end_date, budget')
    .eq('id', siteId)
    .single();

  if (error || !site) notFound();

  return <ProfitDetailClient site={site} />;
}
