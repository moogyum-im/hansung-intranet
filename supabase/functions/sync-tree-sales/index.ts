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

    // 천 단위 쉼표 제거: "35,000" → "35000"
    // 구글 시트가 숫자를 텍스트로 저장 시 CSV에 쉼표가 그대로 포함되어
    // 파서가 컬럼을 잘못 분리하는 문제 방지. 두 번 실행해 100만 이상 처리.
    let cleanedCsv = csvContent.replace(/(\d),(\d{3})(?=[,\r\n]|$)/gm, '$1$2');
    cleanedCsv = cleanedCsv.replace(/(\d),(\d{3})(?=[,\r\n]|$)/gm, '$1$2');
    log("CSV cleaned (thousands separators removed).");

    // Deno 표준 CSV 파서 사용 (헤더를 컬럼명으로 자동 사용 — 구글 폼 응답 시트 대응)
    const records = parse(cleanedCsv, {
      skipFirstRow: true,
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
      price: parseInt(String(record['가격']).replace(/,/g, ''), 10) || null,
      quantity: parseInt(String(record['수량']).replace(/,/g, ''), 10) || null,
      company_name: record['업체명'],
      contact_info: record['연락처'],
      remarks: record['비고'],
      last_updated: new Date().toISOString(),
      google_sheet_row_id: `row-${index + 2}`
    }));

    log("Data successfully mapped. Preparing to upsert.");

    // 구글 시트에서 온 데이터만 삭제 (공급업체 직접 입력 데이터는 보존)
    const { error: deleteError } = await supabaseAdmin
      .from('tree_sales_info')
      .delete()
      .is('supplier_token_code', null);
    if (deleteError) throw deleteError;
    log("Old sheet data deleted (supplier entries preserved).");

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