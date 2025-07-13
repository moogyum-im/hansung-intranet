// app/login/page.js
"use client"; // 클라이언트 컴포넌트임을 명시

import { useState } from 'react';
import Link from 'next/link';
import { loginAction } from '@/actions/authActions';

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
            // 로그인 성공 시 대시보드로 이동 (브라우저 전체 새로고침)
            window.location.href = '/dashboard'; 
        } else {
            // 서버 액션으로부터 받은 에러 메시지를 화면에 표시합니다.
            setMessage(result.error || '알 수 없는 오류가 발생했습니다.');
            setIsSubmitting(false); // 오류 발생 시 버튼을 다시 활성화합니다.
        }
    };
    
    return (
        // 전체 화면을 차지하는 배경 설정: 어둡고 세련된 느낌으로 변경
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4 overflow-hidden">
            {/* 배경 그라데이션 또는 패턴 (선택 사항) */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-800 to-gray-950 opacity-90"></div>
            
            {/* 은은한 배경 효과 (예: SVG 패턴 또는 블러 처리된 이미지) */}
            <div 
                className="absolute inset-0 bg-cover bg-center opacity-10" // opacity를 더 낮춰 은은하게
                style={{ backgroundImage: "url('https://placehold.co/1920x1080/1a1a1a/ffffff?text=Subtle+Pattern')" }} // 더 어둡고 미묘한 패턴
            ></div>
            
            {/* 콘텐츠를 위한 오버레이 (약간의 블러 효과 추가) */}
            <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-md"></div> {/* 블러 강도 높임 */}

            {/* 로그인 폼 컨테이너: 투명도와 그림자 강화, 둥근 모서리 */}
            <div className="relative z-10 w-full max-w-md p-10 space-y-8 bg-white/5 backdrop-blur-xl shadow-4xl rounded-3xl border border-white/10 text-white transform transition-all duration-300 hover:scale-[1.01]"> {/* 패딩, 투명도, 블러, 그림자, 호버 효과 강화 */}
                
                <div className="text-center">
                    <Link href="/" className="inline-block mb-8"> {/* 마진 증가 */}
                        {/* 로고 파일만 표시, 글자 제거 */}
                        <img 
                            src="/hansung_logo.png" 
                            alt="HANSUNG Logo" 
                            className="w-48 h-auto mx-auto drop-shadow-2xl" // 로고 크기 더 키우고 그림자 강화
                        />
                    </Link>
                    {/* "인트라넷 로그인" 글자 제거 */}
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                    <div className="space-y-5"> {/* 간격 조정 */}
                        <div>
                            <label htmlFor="email-address" className="block text-sm font-medium text-white/90 mb-1">이메일 주소</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                required
                                className="mt-1 block w-full px-5 py-3 bg-white/10 border border-white/20 rounded-xl shadow-inner placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 text-white transition-colors duration-200"
                                placeholder="id@hansung.co.kr"
                                disabled={isSubmitting}
                            />
                        </div>
                        <div>
                            <label htmlFor="password-sr" className="block text-sm font-medium text-white/90 mb-1">비밀번호</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="mt-1 block w-full px-5 py-3 bg-white/10 border border-white/20 rounded-xl shadow-inner placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 text-white transition-colors duration-200"
                                placeholder="비밀번호"
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>
                  
                    {message && (
                        <div className="p-3 bg-red-500/40 text-red-100 text-sm font-medium rounded-xl text-center backdrop-blur-sm border border-red-400/60">
                            {message}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full flex justify-center py-3.5 px-4 border border-transparent text-base font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-wait shadow-xl"
                        >
                            {isSubmitting ? '로그인 중...' : '로그인'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
