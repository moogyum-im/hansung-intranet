'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

// --- 아이콘 컴포넌트 ---
const PlusIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" {...props}><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg> );
const ChevronRightIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-400" {...props}><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 010-1.06L10.94 10 7.21 6.29a.75.75 0 111.06-1.06l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06 0z" clipRule="evenodd" /></svg> );
const FormModal = ({ formToEdit, onClose, onSave, onDelete }) => { /* 이전의 FormModal 코드와 동일, 생략 */ };

// --- 템플릿 데이터 정의 ---
const formTemplates = [
    { name: '휴가 신청서', description: '연차, 반차, 병가 등 휴가 신청 시 사용합니다.', templateId: 'leave_request' },
    { name: '지출 결의서', description: '업무 관련 비용 지출 시 증빙을 위해 사용합니다.', templateId: 'expense_report' },
    { name: '업무 보고서', description: '일일, 주간, 월간 업무 보고 시 사용합니다.', templateId: 'work_report' }
];

export default function ApprovalFormsPage() {
    const [myForms, setMyForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingForm, setEditingForm] = useState(null);

    const fetchMyForms = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('approval_forms').select('*').order('created_at', { ascending: false });
        if (error) { toast.error("내가 만든 양식 목록을 불러올 수 없습니다."); } else { setMyForms(data || []); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchMyForms(); }, [fetchMyForms]);

    const handleSaveForm = async (formData) => { /* 이전 저장 로직과 동일, 생략 */ };
    const handleDeleteForm = async (formId) => { /* 이전 삭제 로직과 동일, 생략 */ };

    const handleOpenModal = (form = null) => {
        setEditingForm(form);
        setIsModalOpen(true);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">결재 양식</h1>
                <p className="text-gray-600">템플릿으로 새 결재를 시작하거나, 나만의 양식을 만들고 관리합니다.</p>
            </header>

            {/* ★★★★★ 1. 템플릿으로 시작하기 섹션 ★★★★★ */}
            <section className="mb-10">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-3 border-b">템플릿으로 시작하기</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {formTemplates.map(template => (
                        <Link key={template.templateId} href={`/approvals/new?template=${template.templateId}`}
                              className="block p-5 border rounded-xl bg-white shadow-sm cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition-all">
                            <h3 className="font-semibold text-lg text-blue-700">{template.name}</h3>
                            <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                        </Link>
                    ))}
                </div>
            </section>

            {/* ★★★★★ 2. 내가 만든 양식 관리 섹션 ★★★★★ */}
            <section>
                <div className="flex justify-between items-center mb-4 pb-3 border-b">
                    <h2 className="text-xl font-semibold text-gray-800">내가 만든 양식</h2>
                    <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-gray-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-sm hover:bg-gray-700 transition-colors">
                        <PlusIcon /> 새 커스텀 양식 추가
                    </button>
                </div>
                {loading ? (<p className="text-center py-10">목록 로딩 중...</p>) : (
                    <div className="space-y-3">
                        {myForms.length > 0 ? myForms.map(form => (
                            <div key={form.id} className="bg-white p-5 rounded-lg shadow-sm border flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800">{form.title || '제목 없음'}</h3>
                                    <p className="text-sm text-gray-500 mt-1">{form.description || '설명 없음'}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Link href={`/approvals/new?formId=${form.id}`} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">사용</Link>
                                    <button onClick={() => handleOpenModal(form)} className="px-3 py-1.5 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">수정</button>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center text-gray-400 py-16 border-2 border-dashed rounded-lg">
                                <p>생성된 커스텀 양식이 없습니다.</p>
                                <p className="mt-1 text-sm">{'\'새 커스텀 양식 추가\' 버튼을 눌러 나만의 양식을 만들어보세요.'}</p>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {isModalOpen && <FormModal formToEdit={editingForm} onClose={() => setIsModalOpen(false)} onSave={handleSaveForm} onDelete={handleDeleteForm} />}
        </div>
    );
}