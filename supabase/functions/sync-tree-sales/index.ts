import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { parse } from 'https://deno.land/std@0.207.0/csv/mod.ts'; // Deno 표준 라이브러리의 CSV 파서 사용

console.log("Sync Tree Sales function (CSV method) started.");

Deno.serve(async (_req) => {
  try {
    // 이제 Vault나 복잡한 인증 대신, 환경 변수에서 CSV URL만 가져옵니다.
    const CSV_URL = Deno.env.get('GOOGLE_SHEET_CSV_URL_TREES')!;
    if (!CSV_URL) throw new Error("GOOGLE_SHEET_CSV_URL_TREES is not set.");
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. 웹에 게시된 CSV URL에서 데이터를 다운로드합니다.
    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    const csvContent = await response.text();

    // 2. 다운로드한 텍스트를 CSV 형식으로 파싱합니다.
    // headers: true 옵션은 첫 번째 줄을 헤더로 인식하게 합니다.
    const records = parse(csvContent, {
      skipFirstRow: true, // 첫 번째 행(헤더)은 건너뛰기
      columns: ['지역', '수목명', '규격', '가격', '수량', '업체명', '연락처', '비고'], // 헤더 이름을 명시적으로 지정
    });
    
    console.log(`${records.length} rows found in CSV.`);
    
    // 3. 파싱한 데이터를 DB에 넣을 형식으로 변환합니다.
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
      google_sheet_row_id: `row-${index + 2}` // CSV는 행 번호 정보가 없으므로 순서대로 ID 부여
    }));

    if (treeData.length > 0) {
        // 4. 기존 데이터를 모두 지우고, 새로 가져온 데이터로 덮어씁니다.
        // (CSV 방식은 특정 행만 업데이트하기 어려워, 전체 삭제 후 전체 삽입이 가장 간단하고 확실합니다.)
        await supabaseAdmin.from('tree_sales_info').delete().neq('id', 0); // 모든 행 삭제
        const { error: insertError } = await supabaseAdmin.from('tree_sales_info').insert(treeData);
        if (insertError) throw insertError;
    }

    return new Response(JSON.stringify({ message: `${treeData.length}개의 데이터가 성공적으로 동기화되었습니다.` }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error during CSV sync:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});