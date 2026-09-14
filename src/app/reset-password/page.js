"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { translateAuthError } from '@/lib/authErrorMessages';

export default function ResetPasswordPage() {
    const router = useRouter();
    const [isReady, setIsReady] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDone, setIsDone] = useState(false);

    useEffect(() => {
        // 재설정 이메일 링크를 통해 들어오면 supabase-js가 URL의 토큰을 읽어
        // 임시 세션을 만들고 PASSWORD_RECOVERY 이벤트를 발생시킨다.
        const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setIsReady(true);
            }
        });

        // 이미 처리된 뒤 렌더링된 경우를 대비해 세션도 한 번 직접 확인
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) setIsReady(true);
        });

        return () => authListener.subscription.unsubscribe();
    }, []);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage('');
        setIsError(false);

        if (password.length < 6) {
            setIsError(true);
            setMessage('비밀번호는 6자 이상이어야 합니다.');
            return;
        }
        if (password !== confirmPassword) {
            setIsError(true);
            setMessage('비밀번호가 일치하지 않습니다.');
            return;
        }

        setIsSubmitting(true);
        const { error } = await supabase.auth.updateUser({ password });
        setIsSubmitting(false);

        if (error) {
            setIsError(true);
            setMessage(translateAuthError(error, '비밀번호 변경에 실패했습니다. 잠시 후 다시 시도해주세요.'));
            return;
        }

        await supabase.auth.signOut();
        setIsDone(true);
        setTimeout(() => router.push('/login'), 2000);
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
                    <h1 className="text-lg font-bold text-white/90">새 비밀번호 설정</h1>
                </div>

                {isDone ? (
                    <div className="p-4 bg-blue-500/20 text-blue-100 text-sm rounded-xl text-center border border-blue-400/40">
                        비밀번호가 변경되었습니다. 잠시 후 로그인 화면으로 이동합니다.
                    </div>
                ) : !isReady ? (
                    <div className="p-4 bg-white/10 text-white/70 text-sm rounded-xl text-center border border-white/20">
                        재설정 링크를 확인하는 중입니다...<br />
                        메일의 링크로 바로 들어오지 않았다면{' '}
                        <Link href="/forgot-password" className="underline text-blue-300">비밀번호 찾기</Link>를 다시 시도해주세요.
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-white/90 mb-1">새 비밀번호</label>
                            <input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 block w-full px-5 py-3 bg-white/10 border border-white/20 rounded-xl shadow-inner placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 text-white transition-colors duration-200"
                                placeholder="6자 이상"
                                disabled={isSubmitting}
                            />
                        </div>
                        <div>
                            <label htmlFor="confirm-password" className="block text-sm font-medium text-white/90 mb-1">새 비밀번호 확인</label>
                            <input
                                id="confirm-password"
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="mt-1 block w-full px-5 py-3 bg-white/10 border border-white/20 rounded-xl shadow-inner placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 text-white transition-colors duration-200"
                                placeholder="비밀번호 재입력"
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
                                {isSubmitting ? '변경 중...' : '비밀번호 변경'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
