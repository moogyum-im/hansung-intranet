import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { JWT } from 'https://esm.sh/google-auth-library@9';
import { GoogleSpreadsheet } from 'https://esm.sh/google-spreadsheet@4';

console.log("Sync Tree Sales function started.");

Deno.serve(async (_req) => {
  try {
    const serviceAccountCreds = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_CREDS')!);
    const SPREADSHEET_ID = Deno.env.get('GOOGLE_SPREADSHEET_ID')!;
    const SHEET_NAME = Deno.env.get('GOOGLE_SHEET_NAME')!;
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

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

    const treeData = rows.map(row => ({
      region: row.get('지역'),
      tree_name: row.get('수목명'),
      size: row.get('규격'),
      price: parseInt(row.get('가격'), 10) || null,
      quantity: parseInt(row.get('수량'), 10) || null,
      // ★★★ 업체명 데이터 추가 ★★★
      company_name: row.get('업체명'), 
      contact_info: row.get('연락처'),
      remarks: row.get('비고'),
      last_updated: new Date().toISOString(),
      google_sheet_row_id: `row-${row.rowNumber}`
    }));
    
    if (treeData.length > 0) {
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