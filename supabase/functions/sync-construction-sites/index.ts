import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Papa from 'https://esm.sh/papaparse@5.4.1'; // Papaparse import 확인

console.log("Sync Construction Sites function (CSV method) started.");

Deno.serve(async (_req) => {
  try {
    const CSV_URL = Deno.env.get('GOOGLE_SHEET_CSV_URL_CONSTRUCTION');
    if (!CSV_URL) throw new Error("GOOGLE_SHEET_CSV_URL_CONSTRUCTION is not set.");
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    const csvContent = await response.text();

    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    });
    
    const records = parseResult.data;
    
    if (records.length === 0) {
      return new Response(JSON.stringify({ message: "No new data to sync." }), { status: 200 });
    }
    
    const siteData = records.map((record, index) => ({
      company_name: record['업체명'],
      brand_name: record['브랜드명'],
      complex_name: record['단지명'],
      region: record['지역'],
      scheduled_move_in: record['입주예정'],
      remarks: record['비고'],
      last_updated: new Date().toISOString(),
      google_sheet_row_id: `row-${index + 2}`
    }));

    await supabaseAdmin.from('construction_site_info').delete().neq('id', 0);
    const { error: insertError } = await supabaseAdmin.from('construction_site_info').insert(siteData);
    if (insertError) throw insertError;

    return new Response(JSON.stringify({ message: `Successfully synced ${siteData.length} rows.` }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});