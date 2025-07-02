// app/login/page.js
"use client"; // ★★★ 가장 중요한 변경점: 클라이언트 컴포넌트로 전환 ★★★

import { useState } from 'react';
import Link from 'next/link';
import { loginAction } from '@/actions/authActions';

// searchParams는 이제 클라이언트 컴포넌트에서 직접 접근할 수 없으므로,
// 필요하다면 useSearchParams 훅을 사용해야 하지만, 지금 구조에서는 상태(message)로 대체합니다.
export default function LoginPage() {
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // 폼 제출 이벤트를 처리하는 함수
    const handleSubmit = async (event) => {
        event.preventDefault(); // 기본 폼 제출 동작(페이지 새로고침)을 막습니다.
        setIsSubmitting(true);
        setMessage('');

        const formData = new FormData(event.currentTarget);
        const result = await loginAction(formData);

        if (result.success) {
            // ★★★ 가장 중요한 마법의 코드 ★★★
            // router.push가 아닌, window.location을 사용하여 브라우저 전체를 새로고침하며 이동합니다.
            // 이것이 '시차(Jet Lag)' 문제를 해결하는 가장 확실하고 검증된 방법입니다.
            window.location.href = '/dashboard';
        } else {
            // 서버 액션으로부터 받은 에러 메시지를 화면에 표시합니다.
            setMessage(result.error || '알 수 없는 오류가 발생했습니다.');
            setIsSubmitting(false); // 오류 발생 시 버튼을 다시 활성화합니다.
        }
    };
    
    return (
        // 전체 화면을 차지하는 배경 설정
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            {/* 배경 블러 효과를 위한 가상 요소 */}
            <div 
                className="absolute inset-0 bg-cover bg-center filter blur-sm"
                style={{ backgroundImage: "url('/background.jpg')" }}
            ></div>
            {/* 콘텐츠를 위한 오버레이 */}
            <div className="absolute inset-0 bg-black bg-opacity-30"></div>

            <div className="relative z-10 w-full max-w-md p-8 space-y-6 bg-white/90 backdrop-blur-sm shadow-2xl rounded-2xl border border-gray-200/50">
                
                <div className="text-center">
                    <Link href="/" className="inline-block mb-4">
                        <img src="/logo.png" alt="HANSUNG Logo" className="w-32 h-auto mx-auto"/>
                    </Link>
                    <h2 className="text-2xl font-bold text-gray-800">
                        인트라넷 로그인
                    </h2>
                </div>

                {/* ★★★ form 태그의 action을 제거하고, onSubmit을 사용합니다. ★★★ */}
                <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email-address" className="text-sm font-medium text-gray-700">이메일 주소</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                required
                                className="mt-1 block w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                placeholder="id@hansung.co.kr"
                                disabled={isSubmitting} // 제출 중에는 비활성화
                            />
                        </div>
                        <div>
                            <label htmlFor="password-sr" className="text-sm font-medium text-gray-700">비밀번호</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="mt-1 block w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                placeholder="비밀번호"
                                disabled={isSubmitting} // 제출 중에는 비활성화
                            />
                        </div>
                    </div>
                  
                    {message && (
                        <div className="p-3 bg-red-100 text-red-700 text-sm font-medium rounded-lg text-center">
                            {message}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isSubmitting} // 제출 중에는 비활성화
                            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-300 transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-wait"
                        >
                            {isSubmitting ? '로그인 중...' : '로그인'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}