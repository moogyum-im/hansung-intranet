// 파일 경로: src/app/(main)/approvals/leave/page.js
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export default function LeaveRequestPage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const router = useRouter();

    const [allEmployees, setAllEmployees] = useState([]);
    const [formData, setFormData] = useState({
        title: '휴가신청서',
        leaveType: '연차',
        startDate: '',
        endDate: '',
        reason: '',
    });
    // ★★★ 1. 결재선과 참조인을 배열로 관리하도록 변경 ★★★
    const [approvers, setApprovers] = useState([]);
    const [referrers, setReferrers] = useState([]);
    
    const [duration, setDuration] = useState('0일');
    const [loading, setLoading] = useState(false);
    const [documentNumber, setDocumentNumber] = useState('');
    const [attachmentFile, setAttachmentFile] = useState(null);

    useEffect(() => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const timestamp = date.getTime().toString().slice(-4);
        const documentPrefix = '휴가';
        setDocumentNumber(`${documentPrefix}-${year}${month}${day}-${timestamp}`);
    }, []);

    useEffect(() => {
        if (formData.startDate && formData.endDate) {
            const start = new Date(formData.startDate);
            const end = new Date(formData.endDate);
            if (end < start) { setDuration('잘못된 날짜'); return; }
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            setDuration(`${diffDays}일`);
        } else {
            setDuration('0일');
        }
    }, [formData.startDate, formData.endDate]);

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
        if (e.target.files && e.target.files.length > 0) {
            setAttachmentFile(e.target.files[0]);
        } else {
            setAttachmentFile(null);
        }
    };
    
    // ★★★ 2. 결재선/참조인 추가, 변경, 삭제를 위한 함수들 ★★★
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
            if (uploadError) {
                toast.error(`파일 업로드 실패: ${uploadError.message}`);
                setLoading(false); return;
            }
            const { data: urlData } = supabase.storage.from('approval-documents').getPublicUrl(uploadData.path);
            fileUrl = urlData.publicUrl;
            originalFileName = attachmentFile.name;
        }

        // ★★★ 3. ID 목록을 배열로 만들어 API에 전달 ★★★
        const approver_ids = approvers.map(app => app.id);
        const referrer_ids = referrers.map(ref => ref.id);

        const submissionData = {
            title: formData.title,
            content: JSON.stringify(formData),
            document_type: 'leave_request',
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
            toast.success("휴가신청서가 성공적으로 상신되었습니다.");
            router.push('/approvals');
        } catch (error) {
            toast.error(`휴가신청서 상신 실패: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (employeeLoading) return <div className="flex justify-center items-center h-screen">로딩 중...</div>;

    return (
        <div className="flex bg-gray-50 min-h-screen p-8 space-x-8">
            <div className="flex-1">
                <div className="bg-white p-10 rounded-xl shadow-lg border">
                    <h1 className="text-2xl font-bold text-center mb-8">연차휴가원</h1>
                    <div className="text-right text-sm text-gray-500 mb-4"><p>문서번호: {documentNumber}</p><p>작성일: {new Date().toLocaleDateString('ko-KR')}</p></div>
                    <div className="mb-8 border border-gray-300"><table className="w-full text-sm border-collapse"><tbody>
                        <tr><th className="p-2 bg-gray-100 font-bold w-1/5 text-left border-r border-b">기안부서</th><td className="p-2 w-2/5 border-b border-r">{employee?.department}</td><th className="p-2 bg-gray-100 font-bold w-1/5 text-left border-r border-b">직 위</th><td className="p-2 w-1/5 border-b">{employee?.position}</td></tr>
                        <tr><th className="p-2 bg-gray-100 font-bold text-left border-r border-b">기안자</th><td className="p-2 border-b border-r">{employee?.full_name}</td><th className="p-2 bg-gray-100 font-bold text-left border-r border-b">기안일자</th><td className="p-2 border-b">{new Date().toLocaleDateString('ko-KR')}</td></tr>
                        <tr><th className="p-2 bg-gray-100 font-bold text-left border-r">문서번호</th><td className="p-2">{documentNumber}</td><th className="p-2 bg-gray-100 font-bold text-left border-r">보존연한</th><td className="p-2"><select className="bg-white border rounded-md p-1 w-full"><option>5년</option></select></td></tr>
                    </tbody></table></div>
                    <div className="mb-8 border border-gray-300"><h2 className="p-2 bg-gray-100 font-bold border-b">휴가 정보</h2><div className="p-4 flex items-center justify-between text-sm"><span>총 휴가: <strong>{employee?.total_leave_days || 0}일</strong></span><span>사용 휴가: <strong>{employee?.used_leave_days || 0}일</strong></span><span>잔여 휴가: <strong className="text-blue-600">{employee?.total_leave_days - employee?.used_leave_days || 0}일</strong></span></div></div>
                    <div className="mb-8 border border-gray-300"><h2 className="p-2 bg-gray-100 font-bold border-b">신청 정보</h2><div className="p-4">
                        <div className="grid grid-cols-2 gap-4"><div_><label className="block text-gray-700 font-bold mb-2 text-sm">휴가 종류</label><select name="leaveType" value={formData.leaveType} onChange={handleChange} className="w-full p-2 border rounded-md text-sm"><option>연차</option><option>오전 반차</option><option>오후 반차</option></select></div_><div_><label className="block text-gray-700 font-bold mb-2 text-sm">휴가 일수</label><input type="text" name="duration" value={duration} readOnly className="w-full p-2 border rounded-md text-sm bg-gray-100" /></div_></div>
                        <div className="flex items-center space-x-4 mt-4"><label className="block text-gray-700 font-bold text-sm">시작일</label><input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="p-2 border rounded-md text-sm" /><span>~</span><label className="block text-gray-700 font-bold text-sm">종료일</label><input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className="p-2 border rounded-md text-sm" /></div>
                    </div></div>
                    <div className="mb-8 border border-gray-300"><h2 className="p-2 bg-gray-100 font-bold border-b">휴가 사유</h2><div className="p-4"><textarea name="reason" value={formData.reason} onChange={handleChange} className="w-full p-3 border rounded-md h-40 resize-none" required /></div></div>
                </div>
            </div>
            <div className="w-96 p-8">
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg border space-y-6 sticky top-8">
                    {/* ★★★ 4. 결재선과 참조인 UI를 동적으로 변경 ★★★ */}
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
                                    <select value={referrer.id} onChange={(e) => handleReferrerChange(index, e.target.value)} className="w-full p-2 border rounded-md text-sm" required>
                                        <option value="">참조인 선택</option>
                                        {allEmployees.map(emp => (<option key={emp.id} value={emp.id}>{emp.full_name} ({emp.position})</option>))}
                                    </select>
                                    <button type="button" onClick={() => removeReferrer(index)} className="text-red-500 hover:text-red-700 text-lg font-bold">×</button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="border-b pb-4"><h2 className="text-lg font-bold mb-2">파일 첨부</h2><input type="file" onChange={handleFileChange} className="w-full text-sm"/></div>
                    <div className="border-b pb-4"><h2 className="text-lg font-bold mb-2">기안 의견</h2><textarea placeholder="의견을 입력하세요" className="w-full p-2 border rounded-md h-20 resize-none"></textarea></div>
                    <button type="submit" disabled={loading} className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-semibold">{loading ? '상신 중...' : '결재 상신'}</button>
                </form>
            </div>
        </div>
    );
}