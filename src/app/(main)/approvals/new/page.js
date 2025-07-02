// 파일 경로: src/app/(main)/approvals/new/page.js
'use client';

import { useState, useEffect, useCallback, useRef } from 'react'; // ★★★ useRef 추가 ★★★
import { useEmployee } from '@/contexts/EmployeeContext';
import { createClient } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';

// 동적으로 생성된 폼 필드를 렌더링하는 컴포넌트
const DynamicFormField = ({ field, value, onChange }) => {
    const commonProps = {
        name: field.label,
        value: value || '',
        onChange: onChange,
        className: 'form-input',
        required: field.required
    };

    switch (field.type) {
        case 'textarea':
            return <textarea {...commonProps} rows={5} />;
        case 'date':
            return <input type="date" {...commonProps} />;
        case 'number':
            return <input type="number" {...commonProps} />;
        case 'select':
            return (
                <select {...commonProps} className="form-select">
                    <option value="">-- 선택 --</option>
                    {(field.options || '').split(',').map(opt => {
                        const trimmedOpt = opt.trim();
                        return <option key={trimmedOpt} value={trimmedOpt}>{trimmedOpt}</option>
                    })}
                </select>
            );
        default: // 'text'
            return <input type="text" {...commonProps} />;
    }
};

export default function NewApprovalPage() {
    const supabase = createClient();
    const router = useRouter();
    const { employee: currentUser } = useEmployee();

    const [allForms, setAllForms] = useState([]);
    const [selectedForm, setSelectedForm] = useState(null);
    const [formData, setFormData] = useState({});
    const [title, setTitle] = useState('');
    
    const [allUsers, setAllUsers] = useState([]);
    const [approvers, setApprovers] = useState([{ id: '' }]);
    const [files, setFiles] = useState([]);
    const fileInputRef = useRef(null);

    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        async function fetchData() {
            console.log("1. fetchData 함수 실행 시작"); // 디버깅 로그 1

            const { data: formsData, error: formsError } = await supabase.from('approval_forms').select('*');
            
            console.log("2. Supabase 양식 데이터 응답:", { formsData, formsError }); 

            if (formsError) {
                console.error("양식 목록 조회 실패:", formsError);
            } else {
                setAllForms(formsData || []);
                console.log("3. allForms 상태에 설정된 데이터:", formsData || []);
            }
            
            const { data: usersData, error: usersError } = await supabase.from('profiles').select('id, full_name, department');
            if (usersError) {
                console.error("사용자 목록 조회 실패:", usersError);
            } else {
                setAllUsers(usersData || []);
            }
        }
        fetchData();
    }, [supabase]);

    const handleFormChange = (e) => {
        const formId = e.target.value;
        const form = allForms.find(f => f.id === formId);
        setSelectedForm(form);
        setFormData({});
    };

    const handleFieldChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleFileChange = (e) => {
        setFiles(Array.from(e.target.files));
    };

    const handleApproverChange = (index, approverId) => {
        const newApprovers = [...approvers];
        newApprovers[index] = { id: approverId };
        setApprovers(newApprovers);
    };
    
    const addApprover = () => setApprovers([...approvers, { id: '' }]);
    const removeApprover = (index) => {
        if (approvers.length > 1) {
            setApprovers(approvers.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedForm || !title.trim() || approvers.some(a => !a.id)) {
            alert('양식, 제목, 결재자를 모두 올바르게 선택해주세요.');
            return;
        }
        setIsLoading(true);

        try {
            const { data: docData, error: docError } = await supabase
                .from('approval_documents')
                .insert({
                    form_id: selectedForm.id,
                    author_id: currentUser.id,
                    title: title,
                    form_data: formData,
                })
                .select()
                .single();
            if (docError) throw docError;

            let attachmentsData = [];
            if (files.length > 0) {
                const uploadPromises = files.map(file => {
                    const fileExtension = file.name.split('.').pop();
                    const newFileName = `${uuidv4()}.${fileExtension}`;
                    const filePath = `${docData.id}/${newFileName}`;
                    return supabase.storage.from('approval-documents').upload(filePath, file);
                });
                const uploadResults = await Promise.all(uploadPromises);

                for(let i=0; i<uploadResults.length; i++) {
                    const result = uploadResults[i];
                    if (result.error) throw result.error;
                    attachmentsData.push({ path: result.data.path, name: files[i].name, size: files[i].size });
                }

                const { error: fileUpdateError } = await supabase
                    .from('approval_documents')
                    .update({ attachments: attachmentsData })
                    .eq('id', docData.id);
                if (fileUpdateError) throw fileUpdateError;
            }

            const approverDataToInsert = approvers.map((approver, index) => ({
                document_id: docData.id,
                approver_id: approver.id,
                step: index + 1
            }));
            const { error: approverError } = await supabase.from('approval_document_approvers').insert(approverDataToInsert);
            if (approverError) throw approverError;

            alert('결재 문서가 성공적으로 상신되었습니다.');
            router.push('/approvals');
            
        } catch (error) {
            alert('결재 상신에 실패했습니다: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full overflow-y-auto p-6">
            <header className="mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900">결재 문서 작성</h1>
            </header>
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-8 max-w-4xl mx-auto space-y-8">
                <div>
                    <label htmlFor="form-select" className="block text-lg font-semibold text-gray-800 mb-2">1. 결재 양식 선택</label>
                    <select id="form-select" onChange={handleFormChange} defaultValue="" className="form-select mt-1 w-full">
                        <option value="" disabled>-- 양식을 선택하세요 --</option>
                        {allForms.map(form => (
                            <option key={form.id} value={form.id}>{form.form_name}</option>
                        ))}
                    </select>
                </div>
                
                {selectedForm && (
                    <>
                        <div className="border-t pt-8 space-y-6">
                             <h2 className="text-lg font-semibold text-gray-800">2. 내용 입력</h2>
                             <div>
                                 <label htmlFor="title" className="form-label">제목 <span className="text-red-500">*</span></label>
                                 <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="form-input" required />
                             </div>
                             {selectedForm.form_fields?.map(field => (
                                 <div key={field.label}>
                                     <label htmlFor={field.label} className="form-label">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                                     <DynamicFormField field={field} value={formData[field.label]} onChange={handleFieldChange} />
                                 </div>
                             ))}
                        </div>
                        
                        <div className="border-t pt-8 space-y-2">
                            <h2 className="text-lg font-semibold text-gray-800">3. 첨부 파일</h2>
                            <input type="file" ref={fileInputRef} multiple onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"/>
                            {files.length > 0 && (
                                <ul className="list-disc pl-5 text-sm text-gray-600">
                                    {files.map((file, i) => <li key={i}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</li>)}
                                </ul>
                            )}
                        </div>

                        <div className="border-t pt-8 space-y-4">
                            <h2 className="text-lg font-semibold text-gray-800">4. 결재선 지정</h2>
                            {approvers.map((approver, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <span className="font-medium w-20">{index + 1}차 결재자:</span>
                                    <select value={approver.id} onChange={(e) => handleApproverChange(index, e.target.value)} className="form-select flex-1">
                                        <option value="">-- 결재자 선택 --</option>
                                        {allUsers.filter(u => u.id !== currentUser.id).map(user => (
                                            <option key={user.id} value={user.id}>{user.full_name} ({user.department})</option>
                                        ))}
                                    </select>
                                    {approvers.length > 1 && (
                                        <button type="button" onClick={() => removeApprover(index)} className="text-red-500 p-2 hover:bg-red-50 rounded-full">삭제</button>
                                    )}
                                </div>
                            ))}
                             <button type="button" onClick={addApprover} className="text-sm font-medium text-blue-600 hover:text-blue-700">+ 결재선 추가</button>
                        </div>

                        <div className="flex justify-end gap-4 pt-8 border-t">
                            <Link href="/approvals" className="px-4 py-2 bg-gray-200 rounded-lg">취소</Link>
                            <button type="submit" disabled={isLoading} className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:bg-green-300">
                                {isLoading ? '상신 중...' : '상신하기'}
                            </button>
                        </div>
                    </>
                )}
            </form>
        </div>
    );
}