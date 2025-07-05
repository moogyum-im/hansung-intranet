// 파일 경로: src/app/(main)/approvals/forms/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

// 아이콘 및 모달 컴포넌트는 이전과 동일...
const PlusIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" {...props}><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg> );
const TrashIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" {...props}><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-1.157.046-2.14.349-2.833.766A3.25 3.25 0 00.93 7.855c.214 1.001.708 2.453 1.46 3.844l.001.002c.793 1.464 1.91 2.823 2.99 3.876l.23.231c1.137 1.095 2.523 1.94 4.38 2.193a.75.75 0 00.74-.838l-.043-.655a20.932 20.932 0 01-3.666-4.522l-.001-.002c-.752-1.39-1.248-2.842-1.46-3.844a1.75 1.75 0 011.096-1.938c.642-.388 1.54-.67 2.627-.714v-.443A1.25 1.25 0 018.75 2.5h2.5A1.25 1.25 0 0112.5 3.75v.443c1.087.044 1.985.326 2.627.714a1.75 1.75 0 011.096 1.938c-.212 1.002-.708 2.452-1.46 3.844l-.001-.002a20.932 20.932 0 01-3.666 4.522l-.043.655a.75.75 0 00.74.838c1.857-.253 3.243-1.098 4.38-2.193l.23-.231c1.08-1.053 2.197-2.412 2.99-3.876l.001-.002c.752-1.391 1.246-2.843 1.46-3.844a3.25 3.25 0 00-2.237-3.088c-.693-.417-1.676-.72-2.833-.766v-.443A2.75 2.75 0 0011.25 1h-2.5z" clipRule="evenodd" /></svg> );
const ChevronRightIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-400" {...props}><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 010-1.06L10.94 10 7.21 6.29a.75.75 0 111.06-1.06l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06 0z" clipRule="evenodd" /></svg> );

function FormModal({ formToEdit, onClose, onSave, onDelete }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [fields, setFields] = useState([{ name: '', type: 'text', required: true }]);

    useEffect(() => {
        if (formToEdit) {
            setTitle(formToEdit.title || '');
            setDescription(formToEdit.description || '');
            setFields((formToEdit.fields && Array.isArray(formToEdit.fields) && formToEdit.fields.length > 0) ? formToEdit.fields : [{ name: '', type: 'text', required: true }]);
        } else {
            setTitle(''); setDescription(''); setFields([{ name: '', type: 'text', required: true }]);
        }
    }, [formToEdit]);
    
    const handleFieldChange = (index, event) => { const newFields = [...fields]; newFields[index][event.target.name] = event.target.type === 'checkbox' ? event.target.checked : event.target.value; setFields(newFields); };
    const addField = () => setFields([...fields, { name: '', type: 'text', required: false }]);
    const removeField = (index) => setFields(fields.filter((_, i) => i !== index));

    const handleSave = () => {
        if (!title.trim()) return toast.error('양식 이름을 입력해주세요.');
        const validFields = fields.filter(f => f.name && f.name.trim() !== '');
        if (validFields.length === 0) return toast.error('최소 1개 이상의 유효한 입력 항목이 필요합니다.');
        onSave({ id: formToEdit?.id, title, description, fields: validFields });
    };

    return ( <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4" onClick={onClose}><div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl" onClick={e => e.stopPropagation()}><div className="p-5 border-b"><h2 className="text-lg font-bold">{formToEdit ? '결재 양식 수정' : '새 결재 양식 생성'}</h2></div><div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto"><div className="space-y-2"><label className="font-semibold">양식 이름</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 연차 휴가 신청서" className="w-full p-2 border rounded" /></div><div className="space-y-2"><label className="font-semibold">설명</label><input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="예: 연차, 반차, 경조사 휴가 신청 시 사용" className="w-full p-2 border rounded" /></div><div><h3 className="font-semibold mb-2">입력 항목 설정</h3><div className="space-y-3">{fields.map((field, index) => (<div key={index} className="bg-gray-50 p-4 rounded-lg border flex items-center gap-4"><span className="text-gray-500 font-bold">{index + 1}</span><div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4"><input type="text" name="name" placeholder="항목 이름 (예: 휴가 사유)" value={field.name} onChange={e => handleFieldChange(index, e)} className="p-2 border rounded" /><select name="type" value={field.type} onChange={e => handleFieldChange(index, e)} className="p-2 border rounded bg-white"><option value="text">한 줄 텍스트</option><option value="textarea">여러 줄 텍스트</option><option value="date">날짜</option><option value="daterange">기간 (시작일~종료일)</option><option value="number">숫자</option><option value="checkbox">체크박스</option></select></div><div className="flex items-center gap-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="required" checked={field.required} onChange={e => handleFieldChange(index, e)} />필수</label><button onClick={() => removeField(index)} className="text-gray-400 hover:text-red-500"><TrashIcon /></button></div></div>))}</div><button onClick={addField} className="mt-4 flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800"><PlusIcon /> 항목 추가</button></div></div><div className="px-6 py-4 flex justify-between items-center bg-gray-50 rounded-b-xl border-t"><div>{formToEdit?.id && (<button onClick={() => onDelete(formToEdit.id)} className="px-5 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200">양식 삭제</button>)}</div><div className="flex justify-end gap-3 flex-grow"><button onClick={onClose} className="px-5 py-2 bg-gray-200 rounded-lg">취소</button><button onClick={handleSave} className="px-5 py-2 bg-green-600 text-white rounded-lg">저장</button></div></div></div></div> );
}

export default function ApprovalFormsPage() {
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingForm, setEditingForm] = useState(null);

    const fetchForms = useCallback(async () => { setLoading(true); const { data, error } = await supabase.from('approval_forms').select('*').order('created_at', { ascending: false }); if (error) { toast.error("양식 목록을 불러올 수 없습니다."); console.error("양식 로딩 실패:", error.message); } else { setForms(data || []); } setLoading(false); }, []);
    useEffect(() => { fetchForms(); }, [fetchForms]);
    
    const handleSaveForm = async (formDataWithId) => { const { id, ...formContent } = formDataWithId; if (!formContent.title || formContent.title.trim() === '') { toast.error('양식 이름은 필수입니다.'); return; } let result; if (id) { result = await supabase.from('approval_forms').update(formContent).eq('id', id); } else { result = await supabase.from('approval_forms').insert(formContent); } const { error } = result; if (error) { toast.error(`저장 실패: ${error.message}`); console.error("🔴 양식 저장/수정 실패:", error); } else { toast.success("양식이 성공적으로 저장되었습니다."); fetchForms(); } setIsModalOpen(false); setEditingForm(null); };
    const handleDeleteForm = async (formId) => { if (!window.confirm("정말로 이 양식을 삭제하시겠습니까?")) return; const { error } = await supabase.from('approval_forms').delete().eq('id', formId); if (error) toast.error("삭제 실패: " + error.message); else { toast.success("양식이 삭제되었습니다."); fetchForms(); } setIsModalOpen(false); };

    return ( <div className="p-6 bg-gray-50 min-h-screen"><header className="flex justify-between items-center mb-6"><h1 className="text-2xl font-bold">결재 양식 관리</h1><div className="flex items-center gap-4"><Link href="/approvals" className="text-sm font-medium text-gray-600 hover:text-black">← 결재함으로 돌아가기</Link><button onClick={() => { setEditingForm(null); setIsModalOpen(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-sm hover:bg-blue-700"><PlusIcon /> 새 양식 추가</button></div></header>{loading ? (<p className="text-center py-10 text-gray-500">양식 목록을 불러오는 중...</p>) : (<div className="space-y-3">{forms.map(form => (<div key={form.id} onClick={() => { setEditingForm(form); setIsModalOpen(true); }} className="bg-white p-5 rounded-lg shadow-sm border flex justify-between items-center cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"><div><h3 className="font-bold text-lg text-gray-800">{form.title || '제목 없음'}</h3><p className="text-sm text-gray-500 mt-1">{form.description}</p></div><ChevronRightIcon /></div>))}{forms.length === 0 && (<div className="text-center text-gray-400 py-16 border-2 border-dashed rounded-lg"><p>생성된 결재 양식이 없습니다.</p><p className="mt-1 text-sm">'새 양식 추가' 버튼을 눌러 시작하세요.</p></div>)}</div>)}{isModalOpen && <FormModal formToEdit={editingForm} onClose={() => setIsModalOpen(false)} onSave={handleSaveForm} onDelete={handleDeleteForm} />}</div> );
}