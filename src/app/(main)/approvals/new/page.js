// 파일 경로: src/app/(main)/approvals/new/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Select from 'react-select';

// 필드 렌더링 헬퍼 함수
const renderField = (field, formData, onChange) => {
    const value = formData[field.name] || '';
    const baseClasses = "w-full mt-2 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500";
    
    switch (field.type) {
        case 'textarea': 
            return <textarea value={value} onChange={e => onChange(field.name, e.target.value)} required={field.required} className={baseClasses} rows="5" />;
        case 'date': 
            return <input type="date" value={value} onChange={e => onChange(field.name, e.target.value)} required={field.required} className={baseClasses} />;
        case 'daterange':
            const rangeValue = value || {};
            return (
                <div className="flex items-center gap-4 mt-2">
                    <input type="date" value={rangeValue.start || ''} onChange={e => onChange(field.name, { ...rangeValue, start: e.target.value })} required={field.required} className={baseClasses} />
                    <span className="text-gray-500">~</span>
                    <input type="date" value={rangeValue.end || ''} onChange={e => onChange(field.name, { ...rangeValue, end: e.target.value })} required={field.required} className={baseClasses} min={rangeValue.start || ''} />
                </div>
            );
        default: 
            return <input type="text" value={value} onChange={e => onChange(field.name, e.target.value)} required={field.required} className={baseClasses} />;
    }
};

export default function NewApprovalPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { employee } = useEmployee();

    const [forms, setForms] = useState([]);
    const [selectedFormId, setSelectedFormId] = useState('');
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(true);
    const [allEmployees, setAllEmployees] = useState([]);
    const [approvers, setApprovers] = useState([]);

    const selectedForm = forms.find(f => String(f.id) === selectedFormId);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [formsRes, employeesRes] = await Promise.all([
            supabase.from('approval_forms').select('*').order('created_at', { ascending: false }),
            supabase.from('profiles').select('id, full_name, department').order('full_name')
        ]);
        
        if (formsRes.error) { 
            toast.error("결재 양식 목록 로딩 실패");
        } else {
            setForms(formsRes.data || []);
            const formIdFromUrl = searchParams.get('formId');
            if (formIdFromUrl) {
                setSelectedFormId(formIdFromUrl);
            }
        }

        if (employeesRes.error) { 
            toast.error("직원 목록 로딩 실패");
        } else {
            setAllEmployees(employeesRes.data || []);
        }
        setLoading(false);
    }, [searchParams]);

    useEffect(() => { 
        fetchData(); 
    }, [fetchData]);

    const handleFormChange = (e) => {
        setSelectedFormId(e.target.value);
        setFormData({});
        setApprovers([]);
    };

    const handleInputChange = (fieldName, value) => {
        setFormData(prev => ({ ...prev, [fieldName]: value }));
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!employee || !selectedForm) {
            toast.error('결재 양식을 선택해주세요.');
            return;
        }
        if (approvers.length === 0) {
            toast.error('결재자를 1명 이상 지정해주세요.');
            return;
        }

        let startDate = null, endDate = null;
        (selectedForm.fields || []).forEach(field => {
            if (field.type === 'daterange') {
                startDate = formData[field.name]?.start;
                endDate = formData[field.name]?.end;
            } else if (field.type === 'date' && !startDate) {
                startDate = endDate = formData[field.name];
            }
        });
        
        const approvalType = formData['결재 종류'] || selectedForm.title;
        const title = formData['제목'] || selectedForm.title;

        const { data: approvalDoc, error: insertError } = await supabase.from('approval_documents').insert({
            title: title, form_id: selectedForm.id, form_data: formData,
            author_id: employee.id, status: '대기', type: approvalType,
            start_date: startDate, end_date: endDate,
        }).select().single();

        if (insertError || !approvalDoc) {
            toast.error('결재 상신 실패: ' + insertError.message);
            console.error("결재 문서 생성 실패:", insertError);
            return;
        }
        
        const approverData = approvers.map((approver, index) => ({ 
            document_id: approvalDoc.id, approver_id: approver.value, 
            step: index + 1, status: index === 0 ? '대기' : '미결', 
        }));
        
        const { error: approverError } = await supabase.from('approval_document_approvers').insert(approverData);

        if (approverError) {
            toast.error('결재선 지정 실패: ' + approverError.message);
            console.error("결재선 저장 실패:", approverError);
        } else {
            toast.success('결재가 성공적으로 상신되었습니다.');
            router.push('/approvals');
            router.refresh();
        }
    };

    if (loading) {
        return <div className="p-8 text-center">페이지를 불러오는 중...</div>;
    }
    
    const employeeOptions = allEmployees.map(emp => ({ 
        value: emp.id, 
        label: `${emp.full_name} (${emp.department})` 
    }));

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">새 결재 문서 작성</h1>
                <p className="mt-2 text-gray-600">결재 양식을 선택하고 내용을 작성하여 상신합니다.</p>
            </header>
            
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                    <h2 className="text-lg font-semibold text-gray-800 mb-1">1. 결재 양식 선택</h2>
                    <p className="text-sm text-gray-500 mb-4">작성할 문서의 종류를 선택해주세요.</p>
                    <select onChange={handleFormChange} value={selectedFormId} className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500">
                        <option value="" disabled>--- 양식을 선택하세요 ---</option>
                        {forms.map(form => <option key={form.id} value={form.id}>{form.title || '제목 없는 양식'}</option>)}
                    </select>
                </div>

                {selectedForm && (
                    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border space-y-8 animate-fade-in">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800 mb-1">2. 내용 작성</h2>
                            {/* ★★★★★ 작은따옴표를 큰따옴표로 수정 ★★★★★ */}
                            <p className="text-sm text-gray-500 mb-4">선택한 "<span className="font-bold text-blue-600">{selectedForm.title}</span>" 양식에 따라 내용을 입력합니다.</p>
                            <div className="space-y-6 border-t pt-6">
                                {(selectedForm.fields || []).map((field) => (
                                    <div key={field.name}>
                                        <label className="font-semibold text-gray-800">{field.name} {field.required && <span className="text-red-500">*</span>}</label>
                                        {renderField(field, formData, handleInputChange)}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800 mb-1">3. 결재선 지정</h2>
                            <p className="text-sm text-gray-500 mb-4">결재를 받을 담당자를 순서대로 지정해주세요.</p>
                            <div className="border-t pt-6">
                                <Select 
                                    isMulti 
                                    options={employeeOptions} 
                                    value={approvers} 
                                    onChange={setApprovers} 
                                    className="mt-1" 
                                    classNamePrefix="select" 
                                    placeholder="결재자를 순서대로 선택..." 
                                />
                            </div>
                        </div>
                        <div className="pt-6 border-t flex justify-end">
                            <button type="submit" className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors">상신하기</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}