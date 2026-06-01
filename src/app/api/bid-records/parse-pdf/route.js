import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY 미설정' }, { status: 500 });

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: '요청 파싱 오류' }, { status: 400 });
    }

    const { pdf_url, project_id } = body;
    if (!pdf_url || !project_id) {
        return NextResponse.json({ error: 'pdf_url 또는 project_id 누락' }, { status: 400 });
    }

    // PDF 다운로드
    let pdfBase64;
    try {
        const res = await fetch(pdf_url);
        if (!res.ok) throw new Error(`PDF 다운로드 실패: ${res.status}`);
        const arrayBuffer = await res.arrayBuffer();
        pdfBase64 = Buffer.from(arrayBuffer).toString('base64');
    } catch (e) {
        return NextResponse.json({ error: `PDF 로드 오류: ${e.message}` }, { status: 500 });
    }

    const prompt = `이 PDF는 한국 건설·조경 공사의 입찰 비교표입니다.
A사, B사(우리 회사), C사 3개 회사의 항목별 수량·단가·금액이 나란히 나열되어 있습니다.

각 항목을 아래 JSON 배열 형식으로 추출해 주세요.
- 숫자에서 쉼표를 제거하고 정수만 사용하세요.
- 소계·합계·계 행은 제외하세요.
- 수량은 모든 회사 공통이므로 한 번만 추출합니다.
- 단가와 금액은 회사별로 각각 추출합니다.

반드시 JSON 배열만 반환하고, 다른 설명 텍스트는 포함하지 마세요:

[
  {
    "order": 순번,
    "name": "명칭",
    "spec": "규격",
    "unit": "단위",
    "quantity": 수량정수,
    "A_unit_price": A사단가정수,
    "A_amount": A사금액정수,
    "B_unit_price": B사단가정수,
    "B_amount": B사금액정수,
    "C_unit_price": C사단가정수,
    "C_amount": C사금액정수
  }
]

없거나 읽기 어려운 값은 0으로 처리하세요. 가능한 모든 항목을 추출해 주세요.`;

    let aiRes;
    try {
        aiRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-beta': 'pdfs-2024-09-25',
            },
            body: JSON.stringify({
                model: 'claude-opus-4-8',
                max_tokens: 16000,
                messages: [{
                    role: 'user',
                    content: [
                        {
                            type: 'document',
                            source: {
                                type: 'base64',
                                media_type: 'application/pdf',
                                data: pdfBase64,
                            },
                        },
                        { type: 'text', text: prompt },
                    ],
                }],
            }),
        });
    } catch (e) {
        return NextResponse.json({ error: `Claude API 연결 오류: ${e.message}` }, { status: 500 });
    }

    if (!aiRes.ok) {
        const errText = await aiRes.text();
        return NextResponse.json({ error: `Claude API 오류 (${aiRes.status}): ${errText.slice(0, 500)}` }, { status: 500 });
    }

    const aiData = await aiRes.json();
    const text = aiData.content?.[0]?.text || '';

    // JSON 배열 추출
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
        return NextResponse.json({ error: 'AI가 JSON 형식으로 응답하지 않았습니다.', raw: text.slice(0, 300) }, { status: 500 });
    }

    let parsed;
    try {
        parsed = JSON.parse(jsonMatch[0]);
    } catch {
        return NextResponse.json({ error: 'JSON 파싱 실패', raw: jsonMatch[0].slice(0, 300) }, { status: 500 });
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
        return NextResponse.json({ error: '항목이 추출되지 않았습니다.' }, { status: 500 });
    }

    // 기존 항목·비용 삭제 후 새로 삽입
    const { data: existingItems } = await supabase.from('bid_items').select('id').eq('project_id', project_id);
    if (existingItems?.length > 0) {
        const itemIds = existingItems.map(i => i.id);
        await supabase.from('bid_costs').delete().in('item_id', itemIds);
        await supabase.from('bid_items').delete().eq('project_id', project_id);
    }

    // 항목 삽입 (배치)
    const itemsToInsert = parsed.map((row, idx) => ({
        project_id,
        item_name: String(row.name || `항목 ${row.order || idx + 1}`),
        spec: String(row.spec || ''),
        unit: String(row.unit || '식'),
        quantity: Number(row.quantity) || 0,
        display_order: Number(row.order || idx + 1),
    }));

    const { data: insertedItems, error: insertErr } = await supabase
        .from('bid_items')
        .insert(itemsToInsert)
        .select();

    if (insertErr) {
        return NextResponse.json({ error: `항목 저장 실패: ${insertErr.message}` }, { status: 500 });
    }

    // 단가·금액 삽입
    const costsToInsert = [];
    for (let i = 0; i < insertedItems.length; i++) {
        const row = parsed[i];
        const itemId = insertedItems[i].id;
        for (const key of ['A', 'B', 'C']) {
            costsToInsert.push({
                item_id: itemId,
                company_key: key,
                unit_price: Number(row[`${key}_unit_price`]) || 0,
                amount: Number(row[`${key}_amount`]) || 0,
            });
        }
    }

    if (costsToInsert.length > 0) {
        // 배치 크기 500으로 나눠서 삽입
        for (let i = 0; i < costsToInsert.length; i += 500) {
            await supabase.from('bid_costs').insert(costsToInsert.slice(i, i + 500));
        }
    }

    return NextResponse.json({ success: true, count: insertedItems.length });
}
