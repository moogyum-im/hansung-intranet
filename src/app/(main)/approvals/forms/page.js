'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

// --- 아이콘 컴포넌트 ---
const PlusIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" {...props}><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg> );
const TrashIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" {...props}><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193v-.443A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" /></svg> );
const XIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg> );

// --- 양식 생성/수정 모달 컴포넌트 ---
const FormModal = ({ formToEdit, onClose, onSave, onDelete }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [fields, setFields] = useState([]);

    useEffect(() => {
        if (formToEdit) {
            setTitle(formToEdit.title || '');
            setDescription(formToEdit.description || '');
            setFields(formToEdit.fields || [{ name: '', label: '', type: 'text', required: true }]);
        } else {
            setFields([{ name: '제목', label: '제목', type: 'text', required: true }]);
        }
    }, [formToEdit]);

    const handleFieldChange = (index, prop, value) => {
        const newFields = [...fields];
        newFields[index][prop] = value;
        setFields(newFields);
    };

    const addField = () => {
        setFields([...fields, { name: '', label: '', type: 'text', required: true }]);
    };

    const removeField = (index) => {
        const newFields = fields.filter((_, i) => i !== index);
        setFields(newFields);
    };
    
    const handleSave = () => {
        const processedFields = fields.map(f => ({
            ...f,
            name: f.label.replace(/\s+/g, '').toLowerCase()
        }));
        onSave({ id: formToEdit?.id, title, description, fields: processedFields });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <header className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-bold">{formToEdit ? '양식 수정' : '새 양식 만들기'}</h2>
                    <button onClick={onClose}><XIcon /></button>
                </header>
                <main className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="font-semibold">양식 제목</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full mt-1 p-2 border rounded" />
                    </div>
                    <div>
                        <label className="font-semibold">양식 설명</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full mt-1 p-2 border rounded" rows="2" />
                    </div>
                    <div className="border-t pt-4">
                        <h3 className="font-semibold mb-2">입력 필드 구성</h3>
                        <div className="space-y-3">
                            {fields.map((field, index) => (
                                <div key={index} className="p-3 border rounded-md bg-gray-50 flex items-end gap-2">
                                    <div className="flex-grow">
                                        <label className="text-sm font-medium">필드 라벨 (예: 휴가 기간)</label>
                                        <input type="text" value={field.label} onChange={e => handleFieldChange(index, 'label', e.target.value)} className="w-full p-1 border rounded" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">입력 타입</label>
                                        <select value={field.type} onChange={e => handleFieldChange(index, 'type', e.target.value)} className="w-full p-1 border rounded">
                                            <option value="text">한 줄 텍스트</option>
                                            <option value="textarea">여러 줄 텍스트</option>
                                            <option value="date">날짜</option>
                                            <option value="daterange">기간 (날짜)</option>
                                            <option value="select">선택 목록</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 pt-6">
                                        <input type="checkbox" checked={field.required} onChange={e => handleFieldChange(index, 'required', e.target.checked)} id={`required-${index}`} />
                                        <label htmlFor={`required-${index}`} className="text-sm">필수</label>
                                    </div>
                                    <button onClick={() => removeField(index)} className="p-2 text-red-500 hover:bg-red-100 rounded">
                                        <TrashIcon />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button onClick={addField} className="mt-4 px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-md">+ 필드 추가</button>
                    </div>
                </main>
                <footer className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                    {formToEdit && <button onClick={() => onDelete(formToEdit.id)} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700">삭제</button>}
                    <button onClick={onClose} className="px-4 py-2 bg-white border rounded-md font-semibold hover:bg-gray-100">취소</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">저장</button>
                </footer>
            </div>
        </div>
    );
};

// --- 메인 페이지 컴포넌트 ---
export default function ApprovalFormsPage() {
    const [myForms, setMyForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingForm, setEditingForm] = useState(null);

    const fetchMyForms = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('approval_forms').select('*').order('created_at', { ascending: false });
        if (error) { toast.error("내 양식 목록을 불러올 수 없습니다."); } else { setMyForms(data || []); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchMyForms(); }, [fetchMyForms]);

    const handleSaveForm = async (formData) => {
        if (!formData.title) {
            toast.error('양식 제목은 필수입니다.');
            return;
        }
        const { id, ...formContent } = formData;
        const upsertData = { ...formContent };
        const promise = id 
            ? supabase.from('approval_forms').update(upsertData).eq('id', id)
            : supabase.from('approval_forms').insert(upsertData);
        const { error } = await promise;
        if (error) {
            toast.error(`양식 저장에 실패했습니다: ${error.message}`);
        } else {
            toast.success(`양식이 성공적으로 저장되었습니다.`);
            setIsModalOpen(false);
            fetchMyForms();
        }
    };

    const handleDeleteForm = async (formId) => {
        if (!window.confirm('정말로 이 양식을 삭제하시겠습니까?')) return;
        const { error } = await supabase.from('approval_forms').delete().eq('id', formId);
        if (error) {
            toast.error(`삭제 실패: ${error.message}`);
        } else {
            toast.success('양식이 삭제되었습니다.');
            setIsModalOpen(false);
            fetchMyForms();
        }
    };

    const handleOpenModal = (form = null) => {
        setEditingForm(form);
        setIsModalOpen(true);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">결재 양식 관리</h1>
                <p className="text-gray-600">연,월차 신청의 경우 관리부 필수 참조바랍니다.</p>
            </header>

            <section>
                <div className="flex justify-between items-center mb-4 pb-3 border-b">
                    <h2 className="text-xl font-semibold text-gray-800">내 양식 목록</h2>
                    <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-sm hover:bg-blue-700 transition-colors">
                        <PlusIcon /> 새 양식 만들기
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
                                <p>생성된 양식이 없습니다.</p>
                                <p className="mt-1 text-sm">{'\'새 양식 만들기\' 버튼을 눌러 나만의 양식을 만들어보세요.'}</p>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {isModalOpen && <FormModal formToEdit={editingForm} onClose={() => setIsModalOpen(false)} onSave={handleSaveForm} onDelete={handleDeleteForm} />}
        </div>
    );
}