"use client";

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { translateAuthError } from '@/lib/authErrorMessages';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setMessage('');
        setIsError(false);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        setIsSubmitting(false);

        if (error) {
            setIsError(true);
            setMessage(translateAuthError(error, '요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'));
            return;
        }

        setIsSent(true);
        setMessage('입력하신 이메일로 비밀번호 재설정 링크를 보냈습니다. 메일함을 확인해주세요.');
    };

    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-800 to-gray-950 opacity-90"></div>
            <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-md"></div>

            <div className="relative z-10 w-full max-w-md p-10 space-y-8 bg-white/5 backdrop-blur-xl shadow-4xl rounded-3xl border border-white/10 text-white">
                <div className="text-center">
                    <Link href="/login" className="inline-block mb-8">
                        <img
                            src="/hansung_logo.png"
                            alt="HANSUNG Logo"
                            className="w-48 h-auto mx-auto drop-shadow-2xl"
                        />
                    </Link>
                    <h1 className="text-lg font-bold text-white/90">비밀번호 재설정</h1>
                    <p className="mt-2 text-sm text-white/60">
                        가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
                    </p>
                </div>

                {!isSent ? (
                    <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                        <div>
                            <label htmlFor="email-address" className="block text-sm font-medium text-white/90 mb-1">이메일 주소</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 block w-full px-5 py-3 bg-white/10 border border-white/20 rounded-xl shadow-inner placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 text-white transition-colors duration-200"
                                placeholder="id@han-sung.com"
                                disabled={isSubmitting}
                            />
                        </div>

                        {message && (
                            <div className={`p-3 text-sm font-medium rounded-xl text-center backdrop-blur-sm border ${isError ? 'bg-red-500/40 text-red-100 border-red-400/60' : 'bg-blue-500/40 text-blue-100 border-blue-400/60'}`}>
                                {message}
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full flex justify-center py-3.5 px-4 border border-transparent text-base font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-wait shadow-xl"
                            >
                                {isSubmitting ? '전송 중...' : '재설정 링크 보내기'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="p-4 bg-blue-500/20 text-blue-100 text-sm rounded-xl text-center border border-blue-400/40">
                        {message}
                    </div>
                )}

                <div className="text-center">
                    <Link href="/login" className="text-sm text-white/70 hover:text-white underline">
                        로그인 화면으로 돌아가기
                    </Link>
                </div>
            </div>
        </div>
    );
}
