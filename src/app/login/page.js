"use client";

import { useState } from 'react';
import Link from 'next/link';
import { loginAction } from '@/actions/authActions';

export default function LoginPage() {
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setMessage('');

        const formData = new FormData(event.currentTarget);
        const result = await loginAction(formData);

        if (result && result.error) {
            setMessage(result.error);
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-800 to-gray-950 opacity-90"></div>
            <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-md"></div>

            <div className="relative z-10 w-full max-w-md p-10 space-y-8 bg-white/5 backdrop-blur-xl shadow-4xl rounded-3xl border border-white/10 text-white">
                <div className="text-center">
                    <Link href="/" className="inline-block mb-8">
                        <img 
                            src="/hansung_logo.png" 
                            alt="HANSUNG Logo" 
                            className="w-48 h-auto mx-auto drop-shadow-2xl"
                        />
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                    <div className="space-y-5">
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
                            <label htmlFor="password" className="block text-sm font-medium text-white/90 mb-1">비밀번호</label>
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
                  
                    {/* ★★★ '자동 로그인' 체크박스를 다시 추가했습니다. ★★★ */}
                    <div className="flex items-center">
                        <input
                            id="remember-me"
                            name="remember-me" // 이 이름으로 서버 액션에 전달됩니다.
                            type="checkbox"
                            defaultChecked
                            className="h-4 w-4 text-blue-500 bg-white/10 border-white/30 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="remember-me" className="ml-2 block text-sm text-white/80">
                            자동 로그인
                        </label>
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