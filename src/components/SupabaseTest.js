// src/components/SupabaseTest.js
'use client';

import { supabase } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';

export default function SupabaseTest() {
    const [status, setStatus] = useState("테스트 대기 중...");

    useEffect(() => {
        const runTest = async () => {
            setStatus("Supabase 연결 테스트 중...");
            try {
                // `Supabase` 클라이언트 인스턴스 자체에 문제가 없는지 확인
                if (!supabase || !supabase.from) {
                    setStatus("Supabase 클라이언트가 유효하지 않습니다.");
                    console.error("Supabase 클라이언트 객체:", supabase);
                    return;
                }

                // `chat_rooms` 테이블에서 데이터를 가져와 연결 확인
                const { data, error } = await supabase.from('chat_rooms').select('id').limit(1);

                if (error) {
                    setStatus(`연결 실패: ${error.message}`);
                    console.error("Supabase 연결 테스트 오류:", error);
                } else {
                    setStatus("연결 성공! 채팅방 데이터 로드됨.");
                    console.log("연결 성공! 채팅방 ID:", data[0]?.id);
                }
            } catch (e) {
                setStatus(`예외 발생: ${e.message}`);
                console.error("Supabase 연결 테스트 중 예외 발생:", e);
            }
        };

        runTest();
    }, []);

    return (
        <div style={{ padding: '20px', backgroundColor: 'lightyellow', margin: '20px' }}>
            <h3>Supabase 연결 테스트</h3>
            <p><strong>상태:</strong> {status}</p>
            <p>콘솔 로그를 확인하세요.</p>
        </div>
    );
}