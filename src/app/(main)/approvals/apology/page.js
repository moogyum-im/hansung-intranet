// 파일 경로: src/app/(main)/approvals/apology/page.js
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export default function ApologyPage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const router = useRouter();
    const [allEmployees, setAllEmployees] = useState([]);
    const [approvers, setApprovers] = useState([]);
    const [referrers, setReferrers] = useState([]);
    const [formData, setFormData] = useState({
        title: '시말서',
        incidentDate: new Date().toISOString().split('T')[0],
        incidentLocation: '',
        incidentDetails: '',
        incidentCause: '',
        preventionPlan: '',
    });
    const [loading, setLoading] = useState(false);
    const [documentNumber, setDocumentNumber] = useState('');
    const [attachmentFile, setAttachmentFile] = useState(null);

    useEffect(() => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const timestamp = date.getTime().toString().slice(-4);
        const documentPrefix = '인사';
        setDocumentNumber(`${documentPrefix}-${year}${month}${day}-${timestamp}`);
    }, []);

    useEffect(() => {
        const fetchEmployees = async () => {
            const { data, error } = await supabase.from('profiles').select('id, full_name, department, position');
            if (error) console.error("직원 목록 로딩 실패:", error);
            else setAllEmployees(data || []);
        };
        if (!employeeLoading && employee) {
            fetchEmployees();
            if (employee?.team_leader_id) {
                setApprovers([{ id: employee.team_leader_id }]);
            }
        }
    }, [employee, employeeLoading]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) setAttachmentFile(e.target.files[0]);
        else setAttachmentFile(null);
    };

    const addApprover = () => setApprovers([...approvers, { id: '' }]);
    const handleApproverChange = (index, id) => {
        const newApprovers = [...approvers];
        newApprovers[index].id = id;
        setApprovers(newApprovers);
    };
    const removeApprover = (index) => setApprovers(approvers.filter((_, i) => i !== index));

    const addReferrer = () => setReferrers([...referrers, { id: '' }]);
    const handleReferrerChange = (index, id) => {
        const newReferrers = [...referrers];
        newReferrers[index].id = id;
        setReferrers(newReferrers);
    };
    const removeReferrer = (index) => setReferrers(referrers.filter((_, i) => i !== index));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        if (approvers.length === 0 || approvers.some(app => !app.id)) {
            toast.error("결재자를 모두 지정해주세요.");
            setLoading(false);
            return;
        }

        let fileUrl = null, originalFileName = null;
        if (attachmentFile) {
            const fileExt = attachmentFile.name.split('.').pop();
            const safeFileName = `${uuidv4()}.${fileExt}`;
            const { data: uploadData, error: uploadError } = await supabase.storage.from('approval-documents').upload(safeFileName, attachmentFile);
            if (uploadError) { toast.error(`파일 업로드 실패: ${uploadError.message}`); setLoading(false); return; }
            const { data: urlData } = supabase.storage.from('approval-documents').getPublicUrl(uploadData.path);
            fileUrl = urlData.publicUrl;
            originalFileName = attachmentFile.name;
        }
        
        const approver_ids = approvers.map(app => app.id);
        const referrer_ids = referrers.map(ref => ref.id);
        const finalFormData = { ...formData, title: `시말서 (${employee?.full_name})` };

        const submissionData = {
            title: finalFormData.title,
            content: JSON.stringify(finalFormData),
            document_type: 'apology',
            approver_ids,
            referrer_ids,
            attachment_url: fileUrl,
            attachment_filename: originalFileName,
        };

        try {
            const response = await fetch('/api/submit-approval', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: '서버 응답 없음' }));
                throw new Error(errorData.error || '상신 실패');
            }
            toast.success("시말서가 성공적으로 제출되었습니다.");
            router.push('/approvals');
        } catch (error) {
            toast.error(`시말서 제출 실패: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (employeeLoading) return <div className="flex justify-center items-center h-screen">로딩 중...</div>;

    return (
        <div className="flex bg-gray-50 min-h-screen p-8 space-x-8">
            <div className="flex-1">
                <div className="bg-white p-10 rounded-xl shadow-lg border">
                    <h1 className="text-2xl font-bold text-center mb-8">시 말 서</h1>
                    <div className="text-right text-sm text-gray-500 mb-4"><p>문서번호: {documentNumber}</p><p>작성일: {new Date().toLocaleDateString('ko-KR')}</p></div>
                    <table className="w-full text-sm border-collapse border border-gray-300 mb-8">
                        <tbody>
                            <tr><th className="p-2 bg-gray-100 font-bold w-1/5 text-left border-b border-r">부서</th><td className="p-2 w-2/5 border-b border-r">{employee?.department}</td><th className="p-2 bg-gray-100 font-bold w-1/5 text-left border-b border-r">직위</th><td className="p-2 w-1/5 border-b">{employee?.position}</td></tr>
                            <tr><th className="p-2 bg-gray-100 font-bold text-left border-r">성명</th><td className="p-2">{employee?.full_name}</td></tr>
                        </tbody>
                    </table>
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div><label className="block text-gray-700 font-bold mb-2 text-sm">발생 일시</label><input type="date" name="incidentDate" value={formData.incidentDate} onChange={handleChange} className="w-full p-2 border rounded-md text-sm" /></div>
                            <div><label className="block text-gray-700 font-bold mb-2 text-sm">발생 장소</label><input type="text" name="incidentLocation" value={formData.incidentLocation} onChange={handleChange} className="w-full p-2 border rounded-md text-sm" /></div>
                        </div>
                        <div><label className="block text-gray-700 font-bold mb-2 text-sm">사건 경위</label><textarea name="incidentDetails" value={formData.incidentDetails} onChange={handleChange} rows="5" className="w-full p-2 border rounded-md text-sm" placeholder="발생한 사건을 육하원칙에 따라 객관적으로 서술" required /></div>
                        <div><label className="block text-gray-700 font-bold mb-2 text-sm">발생 원인</label><textarea name="incidentCause" value={formData.incidentCause} onChange={handleChange} rows="5" className="w-full p-2 border rounded-md text-sm" placeholder="사건이 발생하게 된 원인 분석" required /></div>
                        <div><label className="block text-gray-700 font-bold mb-2 text-sm">대책 및 재발 방지 계획</label><textarea name="preventionPlan" value={formData.preventionPlan} onChange={handleChange} rows="5" className="w-full p-2 border rounded-md text-sm" placeholder="향후 동일한 문제가 발생하지 않도록 하기 위한 계획" required /></div>
                        <div className="pt-8 text-center text-sm"><p className="leading-relaxed">상기 본인은 위 내용이 틀림없는 사실임을 확인하며, 이에 시말서를 제출합니다.</p><p className="mt-8">{new Date().getFullYear()}년 {new Date().getMonth() + 1}월 {new Date().getDate()}일</p><p className="mt-4">작성자: {employee?.full_name} (인)</p></div>
                    </div>
                </div>
            </div>
            <div className="w-96 p-8">
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg border space-y-6 sticky top-8">
                    <div className="border-b pb-4">
                        <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">결재선</h2><button type="button" onClick={addApprover} className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full hover:bg-blue-200">추가 +</button></div>
                        <div className="space-y-3">
                            {approvers.map((approver, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                    <span className="font-semibold text-sm text-gray-600">{index + 1}차:</span>
                                    <select value={approver.id} onChange={(e) => handleApproverChange(index, e.target.value)} className="w-full p-2 border rounded-md text-sm" required>
                                        <option value="">결재자 선택</option>
                                        {allEmployees.map(emp => (<option key={emp.id} value={emp.id}>{emp.full_name} ({emp.position})</option>))}
                                    </select>
                                    <button type="button" onClick={() => removeApprover(index)} className="text-red-500 hover:text-red-700 text-lg font-bold">×</button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="border-b pb-4">
                        <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">참조인</h2><button type="button" onClick={addReferrer} className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full hover:bg-blue-200">추가 +</button></div>
                        <div className="space-y-3">
                            {referrers.map((referrer, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                    <select value={referrer.id} onChange={(e) => handleReferrerChange(index, e.target.value)} className="w-full p-2 border rounded-md text-sm">
                                        <option value="">참조인 선택</option>
                                        {allEmployees.map(emp => (<option key={emp.id} value={emp.id}>{emp.full_name} ({emp.position})</option>))}
                                    </select>
                                    <button type="button" onClick={() => removeReferrer(index)} className="text-red-500 hover:text-red-700 text-lg font-bold">×</button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="border-b pb-4"><h2 className="text-lg font-bold mb-2">문서 첨부 (선택)</h2><input type="file" onChange={handleFileChange} className="w-full text-sm"/></div>
                    <div className="border-b pb-4"><h2 className="text-lg font-bold mb-2">기안 의견</h2><textarea placeholder="의견을 입력하세요" className="w-full p-2 border rounded-md h-20 resize-none"></textarea></div>
                    <button type="submit" disabled={loading} className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-semibold">{loading ? '제출 중...' : '시말서 제출'}</button>
                </form>
            </div>
        </div>
    );
}