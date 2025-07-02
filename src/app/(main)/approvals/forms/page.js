// 파일 경로: src/app/(main)/approvals/forms/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabaseClient';
import Link from 'next/link';

// 새 양식 생성/수정 모달
function FormModal({ isOpen, onClose, onSave, formToEdit }) {
    const [formName, setFormName] = useState('');
    const [description, setDescription] = useState('');
    const [fields, setFields] = useState([{ label: '', type: 'text', required: true }]);

    useEffect(() => {
        if (isOpen) {
            if (formToEdit) {
                setFormName(formToEdit.form_name);
                setDescription(formToEdit.description || '');
                setFields(formToEdit.form_fields && formToEdit.form_fields.length > 0 ? formToEdit.form_fields : [{ label: '', type: 'text', required: true }]);
            } else {
                setFormName('');
                setDescription('');
                setFields([{ label: '', type: 'text', required: true }]);
            }
        }
    }, [isOpen, formToEdit]);

    const addField = () => {
        setFields([...fields, { label: '', type: 'text', required: true }]);
    };

    const handleFieldChange = (index, event) => {
        const newFields = [...fields];
        const { name, value, type, checked } = event.target;
        newFields[index][name] = type === 'checkbox' ? checked : value;
        setFields(newFields);
    };

    const removeField = (index) => {
        if (fields.length <= 1) {
            alert('최소 하나 이상의 항목이 필요합니다.');
            return;
        }
        const newFields = fields.filter((_, i) => i !== index);
        setFields(newFields);
    };

    const handleSubmit = () => {
        if (!formName.trim()) return alert('양식 이름은 필수입니다.');
        if (fields.some(field => !field.label.trim())) {
            alert('모든 항목의 이름(Label)을 입력해주세요.');
            return;
        }
        onSave({ form_name: formName, description, form_fields: fields }, formToEdit?.id);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col">
                <h2 className="text-xl font-bold p-6 border-b">{formToEdit ? '양식 수정' : '새 양식 생성'}</h2>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                        <label className="form-label">양식 이름</label>
                        <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="form-input" />
                    </div>
                    <div>
                        <label className="form-label">설명</label>
                        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="form-input" />
                    </div>
                    <h3 className="font-semibold border-t pt-4">입력 항목 설정</h3>
                    {fields.map((field, index) => (
                        <div key={index} className="p-4 border rounded-md space-y-2 relative bg-gray-50">
                            <button onClick={() => removeField(index)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 font-bold text-xl">×</button>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label text-xs">항목 이름 (Label)</label>
                                    <input type="text" name="label" value={field.label} onChange={(e) => handleFieldChange(index, e)} className="form-input" placeholder="예: 휴가 종류" />
                                </div>
                                <div>
                                    <label className="form-label text-xs">입력 타입 (Type)</label>
                                    <select name="type" value={field.type} onChange={(e) => handleFieldChange(index, e)} className="form-select">
                                        <option value="text">한 줄 텍스트</option>
                                        <option value="textarea">여러 줄 텍스트</option>
                                        <option value="date">날짜</option>
                                        <option value="number">숫자</option>
                                        <option value="select">선택 (옵션)</option>
                                    </select>
                                </div>
                            </div>
                             {field.type === 'select' && (
                                <div>
                                    <label className="form-label text-xs">옵션 (쉼표(,)로 구분)</label>
                                    <input type="text" name="options" value={field.options || ''} onChange={(e) => handleFieldChange(index, e)} className="form-input" placeholder="예: 연차, 반차, 경조사" />
                                </div>
                            )}
                            <div>
                                <label className="flex items-center">
                                    <input type="checkbox" name="required" checked={field.required} onChange={(e) => handleFieldChange(index, e)} className="rounded text-green-600 focus:ring-green-500" />
                                    <span className="ml-2 text-sm">필수 항목</span>
                                </label>
                            </div>
                        </div>
                    ))}
                    <button onClick={addField} className="text-sm font-medium text-blue-600 hover:text-blue-700">+ 항목 추가</button>
                </div>
                <div className="px-6 py-4 flex justify-end gap-4 bg-gray-50 border-t">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm">취소</button>
                    <button onClick={handleSubmit} className="px-4 py-2 bg-green-600 text-white rounded-md shadow-sm">저장</button>
                </div>
            </div>
        </div>
    );
}

// 메인 양식 관리 페이지
export default function AllFormsPage() {
    const supabase = createClient();
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingForm, setEditingForm] = useState(null);
    
    const fetchForms = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('approval_forms').select('*').order('created_at');
        if (error) console.error("양식 목록 조회 실패:", error);
        else setForms(data || []);
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchForms();
    }, [fetchForms]);

    const handleSaveForm = async (formData, formId) => {
        let error;
        if (formId) {
            // 수정 로직
            ({ error } = await supabase.from('approval_forms').update(formData).eq('id', formId));
        } else {
            // 생성 로직
            ({ error } = await supabase.from('approval_forms').insert(formData));
        }

        if (error) alert("양식 저장에 실패했습니다: " + error.message);
        else {
            alert("양식이 성공적으로 저장되었습니다.");
            setIsModalOpen(false);
            setEditingForm(null); // 상태 초기화
            fetchForms();
        }
    };

    const openNewFormModal = () => {
        setEditingForm(null);
        setIsModalOpen(true);
    };

    const openEditFormModal = (form) => {
        setEditingForm(form);
        setIsModalOpen(true);
    };
    
    return (
        <div className="h-full overflow-y-auto p-6">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900">결재 양식 관리</h1>
                <div className="flex items-center gap-4">
                    <Link href="/approvals" className="text-sm font-medium text-gray-600 hover:text-green-600">
                        ← 결재함으로 돌아가기
                    </Link>
                    <button onClick={openNewFormModal} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        + 새 양식 추가
                    </button>
                </div>
            </header>
            <div className="bg-white rounded-lg shadow">
                {loading ? <p className="p-4 text-center text-gray-500">로딩 중...</p> :
                 forms.length === 0 ? <p className="p-4 text-center text-gray-500">생성된 양식이 없습니다.</p> :
                 (
                    <ul className="divide-y divide-gray-200">
                        {forms.map((form) => (
                            <li key={form.id}>
                                <button onClick={() => openEditFormModal(form)} className="w-full text-left p-4 hover:bg-gray-50 flex justify-between items-center">
                                    <div>
                                        <h2 className="font-bold text-lg text-gray-800">{form.form_name}</h2>
                                        <p className="text-sm text-gray-600">{form.description}</p>
                                    </div>
                                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </li>
                        ))}
                    </ul>
                 )
                }
            </div>
            <FormModal 
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingForm(null); }}
                onSave={handleSaveForm}
                formToEdit={editingForm}
            />
        </div>
    );
}