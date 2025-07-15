'use client'; 

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Select from 'react-select';

import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

const formTemplates = {
    leave_request: {
        title: '휴가 신청서',
        fields: [
            { name: '휴가 종류', type: 'select', required: true, options: ['연차', '오전 반차', '오후 반차', '병가', '경조사 휴가'] },
            { name: '휴가 기간', type: 'daterange', required: true },
            { name: '사유', type: 'richtext', required: true },
            { name: '첨부 파일', type: 'file', required: false },
        ]
    }
};

const renderField = (field, formData, handleInputChange) => {
    const value = formData[field.name] || '';
    const baseClasses = "w-full mt-2 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500";
    
    switch (field.type) {
        case 'date': 
            return <input type="date" value={value} onChange={e => handleInputChange(field.name, e.target.value)} required={field.required} className={baseClasses} />;
        case 'daterange':
            const rangeValue = value || {};
            return (
                <div className="flex items-center gap-4 mt-2">
                    <input type="date" value={rangeValue.start || ''} onChange={e => handleInputChange(field.name, { ...rangeValue, start: e.target.value })} required={field.required} className={baseClasses} />
                    <span className="text-gray-500">~</span>
                    <input type="date" value={rangeValue.end || ''} onChange={e => handleInputChange(field.name, { ...rangeValue, end: e.target.value })} required={field.required} className={baseClasses} min={rangeValue.start || ''} />
                </div>
            );
        case 'select':
            return (
                <select value={value} onChange={e => handleInputChange(field.name, e.target.value)} required={field.required} className={baseClasses}>
                    <option value="" disabled>-- 선택 --</option>
                    {(field.options || []).map(option => (<option key={option} value={option}>{option}</option>))}
                </select>
            );
        case 'file': 
            return <input type="file" onChange={e => handleInputChange(field.name, e.target.files[0])} className="w-full mt-2 p-2 border border-gray-300 rounded-md file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />;
        case 'richtext':
            return (
                <ReactQuill
                    theme="snow"
                    value={value}
                    onChange={content => handleInputChange(field.name, content)}
                    className="mt-2 bg-white rounded-md border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500"
                    placeholder="내용을 입력하세요..."
                />
            );
        default: 
            return <input type="text" value={value} onChange={e => handleInputChange(field.name, e.target.value)} required={field.required} className={baseClasses} />;
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

    const handleInputChange = useCallback((fieldName, value) => {
        setFormData(prev => ({ ...prev, [fieldName]: value }));
    }, []);
    
    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            const { data: employeesData } = await supabase.from('profiles').select('id, full_name, department').order('full_name');
            setAllEmployees(employeesData || []);
            
            let formToLoad = null;
            if (templateId && formTemplates[templateId]) {
                formToLoad = formTemplates[templateId];
            } else if (formId) {
                const { data: customForm } = await supabase.from('approval_forms').select('*').eq('id', formId).single();
                if (customForm) formToLoad = customForm;
            }
            
            if (formToLoad) {
                setSelectedForm(formToLoad);
                setTitle(formToLoad.title);
                const initialFormData = {};
                (formToLoad.fields || []).forEach(field => { initialFormData[field.name] = ''; });
                setFormData(initialFormData);
            } else {
                toast.error("유효한 양식을 찾을 수 없습니다.");
                router.push('/approvals/forms');
                return;
            }
            setLoading(false);
        };
        fetchInitialData();
    }, [templateId, formId, router]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!employee || !title.trim() || approvers.length === 0) {
            toast.error('제목과 결재선은 필수 항목입니다.');
            return;
        }
        setLoading(true);

        const fileToUpload = formData['첨부 파일'];
        let fileUrl = null;

        // 1. 파일 업로드 처리
        if (fileToUpload) {
            const fileName = `${Date.now()}-${fileToUpload.name.replace(/[^a-zA-Z0-9.\-_가-힣]/g, '-')}`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('chat-attachments') // 올바른 버킷 이름
                .upload(fileName, fileToUpload);

            if (uploadError) {
                toast.error(`파일 업로드 실패: ${uploadError.message}`);
                setLoading(false);
                return;
            }
            
            const { data: publicUrlData } = supabase.storage
                .from('chat-attachments')
                .getPublicUrl(fileName);
            fileUrl = publicUrlData.publicUrl;
        }
        
        const finalFormData = { ...formData };
        if (fileUrl) {
            finalFormData['첨부 파일'] = { name: fileToUpload.name, url: fileUrl };
        }

        // 2. 데이터베이스 저장 처리
        try {
            const { data: approvalDoc, error: insertError } = await supabase.from('approval_documents').insert({
                title,
                form_id: formId, 
                form_data: finalFormData,
                form_fields: selectedForm?.fields || [],
                author_id: employee.id,
                status: '대기', 
                type: selectedForm?.title || '일반',
            }).select().single();

            if (insertError) throw insertError;

            const approverData = approvers.map((approver, index) => ({ document_id: approvalDoc.id, approver_id: approver.value, step: index + 1, status: index === 0 ? '대기' : '미결' }));
            const { error: approverError } = await supabase.from('approval_document_approvers').insert(approverData);
            if (approverError) throw approverError;

            if (referrers.length > 0) {
                const referrerData = referrers.map(ref => ({ document_id: approvalDoc.id, referrer_id: ref.value }));
                const { error: referrerError } = await supabase.from('approval_document_referrers').insert(referrerData);
                if (referrerError) throw referrerError;
            }

            toast.success('결재가 성공적으로 상신되었습니다.');
            router.push('/approvals');
            router.refresh();
        } catch (error) {
            toast.error(`결재 상신 실패: ${error.message || '알 수 없는 오류'}`);
        } finally {
            setLoading(false);
        }
    };

    const employeeOptions = useMemo(() => allEmployees.filter(emp => emp.id !== employee?.id).map(emp => ({ value: emp.id, label: `${emp.full_name} (${emp.department})` })), [allEmployees, employee?.id]);

    if (loading) return <div className="p-8 text-center">페이지를 불러오는 중...</div>;
    
    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">{selectedForm?.title}</h1>
            </header>
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border space-y-8">
                <div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-4">1. 내용 작성</h2>
                    <div className="space-y-6 pt-4">
                        <div>
                            <label className="font-semibold text-gray-700">제목 <span className="text-red-500">*</span></label>
                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full mt-2 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" placeholder="결재 문서의 제목을 입력하세요" />
                        </div>
                        {(selectedForm?.fields || []).map((field) => (
                            <div key={field.name}>
                                <label className="font-semibold text-gray-700">{field.name} {field.required && <span className="text-red-500">*</span>}</label>
                                {renderField(field, formData, handleInputChange)}
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-4">2. 결재선 지정</h2>
                    <div className="pt-4">
                        <Select isMulti options={employeeOptions} value={approvers} onChange={setApprovers} className="mt-1" classNamePrefix="select" placeholder="결재자를 순서대로 선택..."/>
                    </div>
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-4">3. 참조인 지정 <span className="text-base font-normal text-gray-500">(선택)</span></h2>
                    <div className="pt-4">
                        <Select isMulti options={employeeOptions} value={referrers} onChange={setReferrers} className="mt-1" classNamePrefix="select" placeholder="참조인을 선택하세요..."/>
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
        <Suspense fallback={<div className="p-8 text-center">양식 로딩 중...</div>}>
            <NewApprovalPageContent />
        </Suspense>
    );
}