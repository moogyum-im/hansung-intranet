'use client'

import { createResource } from '@/actions/resourceActions';
import { useRef, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full bg-indigo-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition"
        >
            {pending ? '업로드 중...' : '자료 생성'}
        </button>
    );
}

const initialState = {
    error: null,
    success: false,
    message: ''
};

export default function NewResourcePage() {
    const formRef = useRef(null);
    const router = useRouter();
    const [state, formAction] = useFormState(createResource, initialState);

    useEffect(() => {
        // [수정] 서버의 응답(state)을 콘솔에 출력하여 디버깅합니다.
        console.log("서버 액션 응답:", state);

        if (state?.success) {
            toast.success(state.message || '자료가 성공적으로 생성되었습니다.');
            formRef.current?.reset();
            setTimeout(() => {
                router.push('/admin/resources');
            }, 1500);
        } else if (state?.error) {
            toast.error(state.error);
        }
    }, [state, router]);

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">새 자료 업로드</h1>
            <p className="text-gray-600 mb-8">인트라넷 자료실에 공유할 새 파일을 업로드합니다.</p>
            
            <form ref={formRef} action={formAction} className="space-y-6">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">자료명</label>
                    <input type="text" name="name" id="name" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">설명</label>
                    <textarea name="description" id="description" rows="3" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                </div>
                <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700">분류</label>
                    <input type="text" name="category" id="category" placeholder="예: 로고, 서식, 템플릿" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                    <label htmlFor="file" className="block text-sm font-medium text-gray-700">파일 선택</label>
                    <input type="file" name="file" id="file" required className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                </div>
                <div className="pt-4">
                    <SubmitButton />
                </div>
            </form>
        </div>
    );
}