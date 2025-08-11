import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { JWT } from 'https://esm.sh/google-auth-library@9';
import { GoogleSpreadsheet } from 'https://esm.sh/google-spreadsheet@4';
import { parse } from 'https://deno.land/std@0.207.0/csv/mod.ts';

// 디버깅을 위해 console.log 대신 Deno.stdout.write를 사용
const log = (message: string) => {
  console.log(message);
};

Deno.serve(async (_req) => {
  try {
    log("Function started.");

    // --- CSV 방식으로 전환 ---
    const CSV_URL = Deno.env.get('GOOGLE_SHEET_CSV_URL_TREES');
    if (!CSV_URL) throw new Error("GOOGLE_SHEET_CSV_URL_TREES is not set.");
    log(`Fetching CSV from: ${CSV_URL}`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
    
    const csvContent = await response.text();
    log("CSV content fetched successfully.");
    
    // Deno 표준 CSV 파서 사용
    const records = parse(csvContent, {
      skipFirstRow: true,
      columns: ['지역', '수목명', '규격', '가격', '수량', '업체명', '연락처', '비고'],
    });
    log(`Parsed ${records.length} records from CSV.`);
    
    if (records.length === 0) {
      log("No data to sync. Exiting.");
      return new Response(JSON.stringify({ message: "No new data to sync." }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    
    const treeData = records.map((record, index) => ({
      region: record['지역'],
      tree_name: record['수목명'],
      size: record['규격'],
      price: parseInt(record['가격'], 10) || null,
      quantity: parseInt(record['수량'], 10) || null,
      company_name: record['업체명'],
      contact_info: record['연락처'],
      remarks: record['비고'],
      last_updated: new Date().toISOString(),
      google_sheet_row_id: `row-${index + 2}`
    }));

    log("Data successfully mapped. Preparing to upsert.");

    // 기존 데이터를 모두 지우고 새로 삽입
    const { error: deleteError } = await supabaseAdmin.from('tree_sales_info').delete().neq('id', 0);
    if (deleteError) throw deleteError;
    log("Old data deleted.");

    const { error: insertError } = await supabaseAdmin.from('tree_sales_info').insert(treeData);
    if (insertError) throw insertError;
    log(`Successfully inserted ${treeData.length} rows.`);

    return new Response(JSON.stringify({ message: `Successfully synced ${treeData.length} rows.` }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // 에러 객체를 문자열로 변환하여 출력
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error during sync:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});