import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { JWT } from 'https://esm.sh/google-auth-library@9';
import { GoogleSpreadsheet } from 'https://esm.sh/google-spreadsheet@4';

console.log("Sync Tree Sales function started.");

Deno.serve(async (_req) => {
  try {
    // Vault에서 안전하게 인증 정보와 환경 변수를 가져옵니다.
    const serviceAccountCreds = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDS')!);
    const SPREADSHEET_ID = Deno.env.get('GOOGLE_SPREADSHEET_ID')!;
    const SHEET_NAME = Deno.env.get('GOOGLE_SHEET_NAME')!;
    
    // Supabase 관리자 클라이언트 초기화 (RLS를 우회하기 위해 service_role_key 사용)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Google Sheets 인증
    const serviceAccountAuth = new JWT({
      email: serviceAccountCreds.client_email,
      key: serviceAccountCreds.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle[SHEET_NAME];
    if (!sheet) throw new Error(`Sheet '${SHEET_NAME}' not found.`);
    
    const rows = await sheet.getRows();
    console.log(`${rows.length} rows found in Google Sheet.`);

    // 시트 데이터를 DB에 넣을 형식으로 변환
    const treeData = rows.map(row => ({
      // ★★★ 중요: '지역', '수목명' 등은 구글 시트의 첫 번째 행(헤더)과 정확히 일치해야 합니다 ★★★
      region: row.get('지역'),
      tree_name: row.get('수목명'),
      size: row.get('규격'),
      price: parseInt(row.get('가격'), 10) || null,
      quantity: parseInt(row.get('수량'), 10) || null,
      contact_info: row.get('연락처'),
      remarks: row.get('비고'),
      last_updated: new Date().toISOString(),
      google_sheet_row_id: `row-${row.rowNumber}` // 각 행의 고유 ID 생성
    }));
    
    // 데이터가 있을 경우에만 DB 작업 수행
    if (treeData.length > 0) {
        // DB에 데이터 삽입/업데이트 (Upsert)
        // onConflict: 'google_sheet_row_id' -> google_sheet_row_id가 겹치면 새로 삽입하는 대신 업데이트
        const { error } = await supabaseAdmin
          .from('tree_sales_info')
          .upsert(treeData, { onConflict: 'google_sheet_row_id' });

        if (error) throw error;
    }

    return new Response(JSON.stringify({ message: `${treeData.length}개의 데이터가 성공적으로 동기화되었습니다.` }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error during sync:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});