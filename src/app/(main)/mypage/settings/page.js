'use client';

import { useState } from 'react';
import { useEmployee } from '@/contexts/EmployeeContext';
import { updateProfileAction, updateUserPasswordAction } from '@/actions/authActions';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

function ProfileEditForm({ employee }) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        
        const formData = new FormData(event.currentTarget);
        const result = await updateProfileAction(formData);

        if (result.success) {
            toast.success(result.message);
        } else {
            toast.error(result.error);
        }
        setIsSubmitting(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">이름</label>
                <input name="fullName" defaultValue={employee.full_name} required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">직책</label>
                <input name="position" defaultValue={employee.position} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700">연락처</label>
                <input name="phone" defaultValue={employee.phone} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" />
            </div>
            <div className="flex justify-end">
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-400">
                    {isSubmitting ? '저장 중...' : '프로필 저장'}
                </button>
            </div>
        </form>
    );
}

// ★★★ 비밀번호 변경 로직 수정 ★★★
function PasswordChangeForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        const form = event.currentTarget;
        const formData = new FormData(form);
        
        // 서버 액션을 호출하기 전에 클라이언트에서 먼저 간단한 유효성 검사를 합니다.
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');

        if (newPassword.length < 6) {
            toast.error('비밀번호는 6자 이상이어야 합니다.');
            setIsSubmitting(false);
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('새 비밀번호가 일치하지 않습니다.');
            setIsSubmitting(false);
            return;
        }

        // 서버 액션 호출
        const result = await updateUserPasswordAction(formData);

        if (result.success) {
            toast.success(result.message);
            form.reset();
        } else {
            // Supabase에서 반환하는 에러 메시지를 좀 더 친절하게 변경합니다.
            let errorMessage = result.error;
            if (result.error?.includes('New password should be different from the old password.')) {
                errorMessage = '새 비밀번호는 기존 비밀번호와 달라야 합니다.';
            } else if (result.error?.includes('Password should be at least 6 characters.')) {
                errorMessage = '비밀번호는 6자 이상이어야 합니다.';
            }
            toast.error(errorMessage);
        }
        setIsSubmitting(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">새 비밀번호</label>
                <input name="newPassword" type="password" required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" placeholder="6자 이상 입력"/>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">새 비밀번호 확인</label>
                <input name="confirmPassword" type="password" required className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm" placeholder="다시 한번 입력"/>
            </div>
            <div className="flex justify-end">
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-400">
                    {isSubmitting ? '변경 중...' : '비밀번호 변경'}
                </button>
            </div>
        </form>
    );
}

export default function SettingsPage() {
    const { employee, loading } = useEmployee();

    if (loading) return <div className="p-8 text-center">로딩 중...</div>;
    if (!employee) return <div className="p-8 text-center">사용자 정보를 찾을 수 없습니다.</div>;

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-full">
            <header className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">개인정보 수정</h1>
                <p className="text-gray-600 mt-1.5">이름, 연락처 등 개인 정보를 관리합니다.</p>
            </header>
            <main className="max-w-2xl mx-auto space-y-8">
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-3">프로필 정보</h2>
                    <ProfileEditForm employee={employee} />
                </div>
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-3">비밀번호 변경</h2>
                    <PasswordChangeForm />
                </div>
                <div className="text-center mt-8">
                    <Link href="/mypage" className="text-sm font-medium text-gray-600 hover:text-blue-600">
                        ← 마이페이지로 돌아가기
                    </Link>
                </div>
            </main>
        </div>
    );
}