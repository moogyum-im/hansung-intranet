// src/app/api/construction-status/[id]/route.js
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// --- PUT (Update) 요청 핸들러 ---
export async function PUT(request, { params }) {
    const cookieStore = cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                get(name) {
                    return cookieStore.get(name)?.value;
                },
                // PUT, DELETE 시에도 필요하면 set/remove 추가
            },
        }
    );

    const { id } = params; // URL 경로에서 수정할 데이터의 ID 가져오기
    if (!id) {
        return NextResponse.json({ message: '수정할 ID가 제공되지 않았습니다.' }, { status: 400 });
    }

    try {
        const updatedDataFromClient = await request.json(); // 클라이언트에서 보낸 수정할 데이터
        console.log(`API PUT - 수신된 수정 데이터 (ID: ${id}):`, JSON.stringify(updatedDataFromClient, null, 2));

        // id, created_at 필드는 보통 직접 업데이트하지 않으므로 제외
        const { id: dataId, created_at, ...dataToUpdate } = updatedDataFromClient;

        // Supabase 테이블에 실제로 존재하는 컬럼들만 updateData에 포함되도록 필터링 (선택적이지만 안전)
        const allowedKeys = ['company_name', 'brand_name', 'complex_name', 'location', 'move_in_schedule', 'remarks'];
        const finalDataToUpdate = {};
        allowedKeys.forEach(key => {
            if (dataToUpdate.hasOwnProperty(key)) {
                finalDataToUpdate[key] = dataToUpdate[key] === undefined ? null : dataToUpdate[key];
            }
        });
        console.log(`API PUT - Supabase에 UPDATE 할 데이터 (ID: ${id}):`, JSON.stringify(finalDataToUpdate, null, 2));


        const tableName = 'construction_sites'; // !!! 실제 테이블 이름으로 변경하세요 !!!
        const { data, error } = await supabase
            .from(tableName)
            .update(finalDataToUpdate) // 필터링된 데이터로 업데이트
            .eq('id', id)           // 해당 ID의 행만
            .select()               // 업데이트된 전체 행 데이터 반환 요청
            .single();              // 하나의 객체만 반환

        if (error) {
            console.error(`Supabase UPDATE 오류 (${tableName}, ID: ${id}):`, error);
            return NextResponse.json({ message: error.message, details: error.details, hint: error.hint, code: error.code }, { status: 400 });
        }

        console.log(`API PUT - Supabase UPDATE 성공 (${tableName}, ID: ${id}), 반환 데이터:`, data);
        return NextResponse.json(data); // 성공 시 업데이트된 데이터 반환

    } catch (e) {
        console.error(`PUT API 요청 처리 중 예외 발생 (ID: ${id}):`, e);
        return NextResponse.json({ message: e.message || '데이터를 수정하는데 실패했습니다. 입력 형식을 확인해주세요.' }, { status: 500 });
    }
}

// --- DELETE 요청 핸들러 ---
export async function DELETE(request, { params }) {
    const cookieStore = cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                get(name) {
                    return cookieStore.get(name)?.value;
                },
            },
        }
    );

    const { id } = params; // URL 경로에서 삭제할 데이터의 ID 가져오기
    console.log(`API DELETE - 삭제 요청 ID: ${id}`);

    if (!id) {
        return NextResponse.json({ message: '삭제할 ID가 제공되지 않았습니다.' }, { status: 400 });
    }

    try {
        const tableName = 'construction_sites'; // !!! 실제 테이블 이름으로 변경하세요 !!!
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', id); // 해당 ID의 행 삭제

        if (error) {
            console.error(`Supabase DELETE 오류 (${tableName}, ID: ${id}):`, error);
            return NextResponse.json({ message: error.message, details: error.details, hint: error.hint, code: error.code }, { status: 400 });
        }

        console.log(`API DELETE - ID: ${id} 성공적으로 삭제됨 (${tableName})`);
        // 성공 시, 클라이언트의 response.json() 호출을 고려하여 간단한 성공 메시지 반환
        return NextResponse.json({ message: '성공적으로 삭제되었습니다.' }, { status: 200 });
        // 또는, 본문 없는 성공 응답: return new Response(null, { status: 204 });

    } catch (e) {
        console.error(`DELETE API 요청 처리 중 예외 발생 (ID: ${id}):`, e);
        return NextResponse.json({ message: e.message || '데이터를 삭제하는데 실패했습니다.' }, { status: 500 });
    }
}