'use client'; 

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Select from 'react-select';
import { Suspense } from 'react';

// --- 템플릿 데이터 정의 ---
const formTemplates = {
    leave_request: {
        title: '휴가 신청서',
        fields: [
            { name: '휴가 종류', type: 'select', required: true, options: ['연차', '반차', '병가', '경조사 휴가'] },
            { name: '휴가 기간', type: 'daterange', required: true },
            { name: '사유', type: 'textarea', required: true },
        ]
    },
    expense_report: {
        title: '지출 결의서',
        fields: [
            { name: '지출 항목', type: 'text', required: true },
            { name: '금액', type: 'text', required: true },
            { name: '증빙 자료', type: 'file', required: false },
            { name: '상세 내용', type: 'textarea', required: true },
        ]
    },
    work_report: {
        title: '업무 보고서',
        fields: [
            { name: '보고일', type: 'date', required: true },
            { name: '금일 업무 요약', type: 'text', required: true },
            { name: '상세 보고', type: 'textarea', required: true },
            { name: '익일 업무 계획', type: 'textarea', required: false },
        ]
    }
};

// --- renderField 함수 ---
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
        
        case 'select':
            const options = Array.isArray(field.options) ? field.options : [];
            return (
                <select value={value} onChange={e => onChange(field.name, e.target.value)} required={field.required} className={baseClasses}>
                    <option value="" disabled>-- 선택 --</option>
                    {options.map(option => (<option key={option} value={option}>{option}</option>))}
                </select>
            );

        case 'file':
            return <input type="file" onChange={e => onChange(field.name, e.target.files[0])} required={field.required} className={baseClasses} />;
            
        default: 
            return <input type="text" value={value} onChange={e => onChange(field.name, e.target.value)} required={field.required} className={baseClasses} />;
    }
};

function NewApprovalPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const { employee } = useEmployee();
    
    const templateId = useMemo(() => searchParams.get('template'), [searchParams]);
    const formId = useMemo(() => searchParams.get('formId'), [searchParams]);

    const [allEmployees, setAllEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedForm, setSelectedForm] = useState(null);
    const [title, setTitle] = useState('');
    const [formData, setFormData] = useState({});
    const [approvers, setApprovers] = useState([]);
    const [referrers, setReferrers] = useState([]);

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            const { data: employees } = await supabase.from('profiles').select('id, full_name, department').order('full_name');
            setAllEmployees(employees || []);

            let formToLoad = null;

            if (templateId && formTemplates[templateId]) {
                formToLoad = formTemplates[templateId];
                setTitle(formToLoad.title);
            } else if (formId) {
                const { data: customForm, error } = await supabase.from('approval_forms').select('*').eq('id', formId).single();
                if (error || !customForm) {
                    toast.error("양식을 불러오는데 실패했습니다.");
                    router.push('/approvals/forms');
                    return;
                }
                formToLoad = customForm;
                setTitle(formToLoad.title);
            } else {
                formToLoad = { title: '사용자 정의 문서', fields: [] };
                setTitle('');
            }
            
            setSelectedForm(formToLoad);
            setFormData({});
            setApprovers([]);
            setReferrers([]);
            setLoading(false);
        };

        fetchInitialData();
    }, [templateId, formId, router]);

    const handleInputChange = useCallback((fieldName, value) => {
        setFormData(prev => ({ ...prev, [fieldName]: value }));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!employee) { toast.error('사용자 정보가 없습니다.'); return; }
        if (!title.trim()) { toast.error('제목을 입력해주세요.'); return; }
        if (approvers.length === 0) { toast.error('결재자를 1명 이상 지정해주세요.'); return; }

        setLoading(true);

        try {
            const { data: approvalDoc, error: insertError } = await supabase.from('approval_documents').insert({
                title,
                form_id: formId, 
                form_data: formData,
                form_fields: selectedForm?.fields || [],
                author_id: employee.id,
                status: '대기', 
                type: selectedForm?.title || '일반'
            }).select().single();

            if (insertError) throw insertError;
            if (!approvalDoc) throw new Error('결재 문서 생성에 실패했습니다.');

            const approverData = approvers.map((approver, index) => ({
                document_id: approvalDoc.id,
                approver_id: approver.value,
                step: index + 1,
                status: index === 0 ? '대기' : '미결',
            }));
            const { error: approverError } = await supabase.from('approval_document_approvers').insert(approverData);
            if (approverError) throw approverError;

            if (referrers.length > 0) {
                const referrerData = referrers.map(ref => ({ document_id: approvalDoc.id, referrer_id: ref.value }));
                const { error: referrerError } = await supabase.from('approval_document_referrers').insert(referrerData);
                if (referrerError) toast.error('참조인 지정에 실패했지만, 문서는 상신되었습니다.');
            }

            toast.success('결재가 성공적으로 상신되었습니다.');
            router.push('/approvals');
            router.refresh();

        } catch (error) {
            console.error("결재 상신 오류:", error);
            toast.error(`결재 상신 실패: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // ▼▼▼ 수정된 부분: useMemo를 조건부 return 문보다 위로 이동 ▼▼▼
    const employeeOptions = useMemo(() => {
        return allEmployees
            .filter(emp => emp.id !== employee?.id)
            .map(emp => ({ value: emp.id, label: `${emp.full_name} (${emp.department})` }));
    }, [allEmployees, employee?.id]);
    // ▲▲▲ 수정된 부분 끝 ▲▲▲

    if (loading) { // 이제 이 조건부 return 위에 useMemo가 항상 호출됩니다.
        return <div className="p-8 text-center">페이지를 불러오는 중...</div>;
    }
    
    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">{selectedForm?.title || '새 결재 문서 작성'}</h1>
                <p className="mt-2 text-gray-600">
                    {templateId ? '템플릿에 따라 내용을 작성하여 상신합니다.' : 
                     formId ? '내가 만든 양식에 따라 내용을 작성합니다.' : 
                     '자유 양식으로 내용을 작성합니다.'}
                </p>
            </header>
            
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border space-y-8">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800 mb-1">1. 내용 작성</h2>
                    <div className="space-y-6 border-t pt-6 mt-4">
                        <div>
                            <label className="font-semibold text-gray-800">제목 <span className="text-red-500">*</span></label>
                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full mt-2 p-2 border border-gray-300 rounded-md" />
                        </div>
                        {selectedForm?.fields?.map((field) => (
                            <div key={field.name}>
                                <label className="font-semibold text-gray-800">{field.name} {field.required && <span className="text-red-500">*</span>}</label>
                                {renderField(field, formData, handleInputChange)}
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h2 className="text-lg font-semibold text-gray-800 mb-1">2. 결재선 지정</h2>
                    <p className="text-sm text-gray-500 mb-4">결재를 받을 담당자를 순서대로 지정해주세요. (자기 자신 제외)</p>
                    <div className="border-t pt-6 mt-4">
                        <Select isMulti options={employeeOptions} value={approvers} onChange={setApprovers} className="mt-1" classNamePrefix="select" placeholder="결재자를 순서대로 선택..." />
                    </div>
                </div>
                
                <div>
                    <h2 className="text-lg font-semibold text-gray-800 mb-1">3. 참조인 지정 (선택)</h2>
                    <p className="text-sm text-gray-500 mb-4">이 결재 문서를 참고해야 할 담당자를 지정합니다.</p>
                    <div className="border-t pt-6 mt-4">
                        <Select isMulti options={employeeOptions} value={referrers} onChange={setReferrers} className="mt-1" classNamePrefix="select" placeholder="참조인을 선택하세요..." />
                    </div>
                </div>
                
                <div className="pt-6 border-t flex justify-end">
                    <button type="submit" disabled={loading} className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400">
                        {loading ? '상신 중...' : '상신하기'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default function NewApprovalPage() {
    return (
        <Suspense fallback={<div>폼을 로딩 중입니다...</div>}>
            <NewApprovalPageContent />
        </Suspense>
    );
}