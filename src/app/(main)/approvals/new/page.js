// src/app/(main)/approvals/new/page.js
'use client'; 

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext'; // 경로 확인
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Select from 'react-select';

import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

// --- 템플릿 데이터 정의 (사유 필드 타입을 'richtext'로 변경) ---
const formTemplates = {
    leave_request: {
        title: '휴가 신청서',
        fields: [
            { name: '휴가 종류', type: 'select', required: true, options: ['연차', '오전 반차', '오후 반차', '병가', '경조사 휴가'] },
            { name: '휴가 기간', type: 'daterange', required: true },
            { name: '사유', type: 'richtext', required: true },
            { name: '첨부 파일', type: 'file', required: false },
        ]
    },
    expense_report: { 
        title: '지출 결의서',
        fields: [
            { name: '제목', type: 'text', required: true },
            { name: '지출 항목', type: 'text', required: true },
            { name: '금액', type: 'number', required: true },
            { name: '상세 내용', type: 'richtext', required: false },
            { name: '첨부 파일', type: 'file', required: false },
        ]
    },
    work_report: { 
        title: '업무 보고서',
        fields: [
            { name: '보고 제목', type: 'text', required: true },
            { name: '보고 내용', type: 'richtext', required: true },
            { name: '첨부 파일', type: 'file', required: false },
        ]
    }
};

// --- renderField 함수 (richtext 타입 케이스 추가) ---
const renderField = (field, formData, onChange) => {
    const value = formData[field.name] || '';
    const baseClasses = "w-full mt-2 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500";
    
    switch (field.type) {
        case 'textarea': return <textarea value={value} onChange={e => onChange(field.name, e.target.value)} required={field.required} className={baseClasses} rows="5" />;
        case 'date': return <input type="date" value={value} onChange={e => onChange(field.name, e.target.value)} required={field.required} className={baseClasses} />;
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
        case 'file': return <input type="file" onChange={e => onChange(field.name, e.target.files[0])} required={field.required} className={baseClasses} />;
        case 'richtext':
            return (
                <ReactQuill
                    theme="snow"
                    value={value}
                    onChange={content => onChange(field.name, content)}
                    required={field.required}
                    className="mt-2 bg-white rounded-md border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500"
                    placeholder="내용을 입력하세요. (표, 이미지, 서식 등)"
                    modules={{
                        toolbar: [
                            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                            ['bold', 'italic', 'underline', 'strike'],
                            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                            [{ 'indent': '-1'}, { 'indent': '+1' }],
                            [{ 'align': [] }],
                            ['link', 'image', 'video'],
                            ['clean'],
                        ],
                        clipboard: {
                            matchVisual: false,
                        },
                    }}
                />
            );
        default: return <input type="text" value={value} onChange={e => onChange(field.name, e.target.value)} required={field.required} className={baseClasses} />;
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
    const [fileToUpload, setFileToUpload] = useState(null);

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            const { data: employees } = await supabase.from('profiles').select('id, full_name, department').order('full_name');
            setAllEmployees(employees || []);
            
            let formToLoad = null;
            if (templateId && formTemplates[templateId]) {
                formToLoad = formTemplates[templateId];
            } else if (formId) {
                const { data: customForm, error: formError } = await supabase.from('approval_forms').select('*').eq('id', formId).single();
                if (formError) {
                    console.error("Custom form load error:", formError);
                    toast.error("양식 정보를 불러오는데 실패했습니다.");
                    router.push('/approvals/forms');
                    return;
                }
                formToLoad = customForm;
            }
            if (formToLoad) {
                setSelectedForm(formToLoad);
                setTitle(formToLoad.title);
            } else {
                router.push('/approvals/forms');
                return;
            }
            const initialFormData = {};
            formToLoad.fields?.forEach(field => {
                if (field.type === 'richtext') {
                    initialFormData[field.name] = '';
                } else if (field.type === 'daterange') {
                    initialFormData[field.name] = { start: '', end: '' };
                } else {
                    initialFormData[field.name] = '';
                }
            });
            setFormData(initialFormData);
            setApprovers([]);
            setReferrers([]);
            setFileToUpload(null);
            setLoading(false);
        };
        fetchInitialData();
    }, [templateId, formId, router]);

    const handleInputChange = useCallback((fieldName, value) => {
        if (fieldName === '첨부 파일') {
            setFileToUpload(value);
        } else {
            setFormData(prev => ({ ...prev, [fieldName]: value }));
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!employee || !title.trim() || approvers.length === 0) {
            toast.error('제목과 결재선은 필수 항목입니다.'); return;
        }
        setLoading(true);

        let fileUrl = null;
        if (fileToUpload) {
            const originalFileName = fileToUpload.name;
            const fileExtension = originalFileName.includes('.') ? originalFileName.split('.').pop() : '';
            const baseFileNameWithoutExt = originalFileName.includes('.') ? originalFileName.substring(0, originalFileName.lastIndexOf('.')) : originalFileName;
            
            // ★★★ 파일 이름 정제 로직 더욱 강화 (한글, 공백, 괄호 등 모든 특수 문자를 하이픈으로) ★★★
            const sanitizedBaseFileName = baseFileNameWithoutExt
                .replace(/[^a-zA-Z0-9.\-_가-힣]/g, '-') // 알파벳, 숫자, 점, 하이픈, 언더바, 한글만 허용하고 나머지는 하이픈으로 대체
                .replace(/\s+/g, '-') // 공백을 하이픈으로 (혹시 위에서 처리 안 된 공백이 있다면)
                .replace(/-{2,}/g, '-') // 연속된 하이픈을 하나로
                .replace(/^-+|-+$/g, ''); // 시작/끝 하이픈 제거

            // 최종 파일 이름: 타임스탬프-정제된파일명.확장자 (확장자는 소문자로 통일)
            const fileName = `${Date.now()}-${sanitizedBaseFileName}${fileExtension ? '.' + fileExtension.toLowerCase() : ''}`;
            
            try {
                const { data, error } = await supabase.storage
                    .from('chat-attachments') // 버킷 이름
                    .upload(fileName, fileToUpload, { // 정제된 fileName 사용
                        cacheControl: '3600',
                        upsert: false
                    });
                
                if (error) throw error;
                
                const { data: publicUrlData } = supabase.storage
                    .from('chat-attachments') // 버킷 이름
                    .getPublicUrl(fileName);
                
                fileUrl = publicUrlData.publicUrl;
                toast.success('파일 업로드 완료.');

            } catch (error) {
                console.error('파일 업로드 실패:', error);
                toast.error(`파일 업로드 실패: ${error.message}`);
                setLoading(false);
                return;
            }
        }

        try {
            const finalFormData = { ...formData };
            if (fileUrl) {
                finalFormData['첨부 파일'] = fileUrl;
            }

            const { data: approvalDoc, error: insertError } = await supabase.from('approval_documents').insert({
                title,
                form_id: formId, 
                form_data: finalFormData,
                form_fields: selectedForm?.fields || [],
                author_id: employee.id,
                status: '대기', 
                type: selectedForm?.title || '일반',
                attachments: fileUrl ? [fileUrl] : null,
            }).select().single();

            if (insertError) throw insertError;

            const approverData = approvers.map((approver, index) => ({ document_id: approvalDoc.id, approver_id: approver.value, step: index + 1, status: index === 0 ? '대기' : '미결' }));
            const { error: approverError } = await supabase.from('approval_document_approvers').insert(approverData);
            if (approverError) throw approverError;

            if (referrers.length > 0) {
                const referrerData = referrers.map(ref => ({
                    document_id: approvalDoc.id,
                    referrer_id: ref.value
                }));
                const { error: referrerError } = await supabase.from('approval_document_referrers').insert(referrerData);
                if (referrerError) throw referrerError;
            }

            toast.success('결재가 성공적으로 상신되었습니다.');
            router.push('/approvals');
            router.refresh();
        } catch (error) {
            console.error('결재 상신 실패:', error);
            toast.error(`결재 상신 실패: ${error.message || '알 수 없는 오류'}`);
        } finally {
            setLoading(false);
        }
    };

    const employeeOptions = useMemo(() => {
        return allEmployees.filter(emp => emp.id !== employee?.id).map(emp => ({ value: emp.id, label: `${emp.full_name} (${emp.department})` }));
    }, [allEmployees, employee?.id]);

    if (loading) { return <div className="p-8 text-center">페이지를 불러오는 중...</div>; }
    
    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
            <div> 
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">{selectedForm?.title || '새 결재 문서 작성'}</h1>
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
                        <div className="border-t pt-6 mt-4">
                            <Select isMulti options={employeeOptions} value={approvers} onChange={setApprovers} className="mt-1" classNamePrefix="select" placeholder="결재자를 순서대로 선택..." />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800 mb-1">3. 참조인 지정 (선택)</h2>
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
        </div>
    );
}

// Suspense 경계 (최상단 layout.js에 <Suspense>가 이미 있다면 여기서는 불필요)
export default function NewApprovalPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">양식 로딩 중...</div>}>
            <NewApprovalPageContent />
        </Suspense>
    );
}