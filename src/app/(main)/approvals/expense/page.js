// 파일 경로: src/app/(main)/approvals/expense/page.js
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export default function ExpenseReportPage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const router = useRouter();

    const [allEmployees, setAllEmployees] = useState([]);
    const [formData, setFormData] = useState({
        title: '지출결의서',
        expenseDate: new Date().toISOString().split('T')[0],
        accountType: '교통비',
        paymentMethod: '법인카드',
        amount: '',
        description: '',
    });
    // ★★★ 1. 결재선과 참조인을 배열로 관리하도록 변경 ★★★
    const [approvers, setApprovers] = useState([]);
    const [referrers, setReferrers] = useState([]);

    const [loading, setLoading] = useState(false);
    const [documentNumber, setDocumentNumber] = useState('');
    const [attachmentFile, setAttachmentFile] = useState(null);

    useEffect(() => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const timestamp = date.getTime().toString().slice(-4);
        const documentPrefix = '지출';
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
            document_type: 'expense_report',
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
            toast.success("지출결의서가 성공적으로 상신되었습니다.");
            router.push('/approvals');
        } catch (error) {
            toast.error(`지출결의서 상신 실패: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (employeeLoading) return <div className="flex justify-center items-center h-screen">로딩 중...</div>;

    return (
        <div className="flex bg-gray-50 min-h-screen p-8 space-x-8">
            <div className="flex-1">
                <div className="bg-white p-10 rounded-xl shadow-lg border">
                    <h1 className="text-2xl font-bold text-center mb-8">지출결의서</h1>
                    <div className="text-right text-sm text-gray-500 mb-4"><p>문서번호: {documentNumber}</p><p>작성일: {new Date().toLocaleDateString('ko-KR')}</p></div>
                    <div className="mb-8 border border-gray-300"><table className="w-full text-sm border-collapse"><tbody>
                        <tr><th className="p-2 bg-gray-100 font-bold w-1/5 text-left border-r border-b">기안부서</th><td className="p-2 w-2/5 border-b border-r">{employee?.department}</td><th className="p-2 bg-gray-100 font-bold w-1/5 text-left border-r border-b">직 위</th><td className="p-2 w-1/5 border-b">{employee?.position}</td></tr>
                        <tr><th className="p-2 bg-gray-100 font-bold text-left border-r">기안자</th><td className="p-2 border-r">{employee?.full_name}</td><th className="p-2 bg-gray-100 font-bold text-left border-r">기안일자</th><td className="p-2">{new Date().toLocaleDateString('ko-KR')}</td></tr>
                    </tbody></table></div>
                    
                    <div className="mb-8 border border-gray-300">
                        <h2 className="p-2 bg-gray-100 font-bold border-b">지출 정보</h2>
                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-gray-700 font-bold mb-2 text-sm">지출일자</label><input type="date" name="expenseDate" value={formData.expenseDate} onChange={handleChange} className="w-full p-2 border rounded-md text-sm" /></div>
                                <div><label className="block text-gray-700 font-bold mb-2 text-sm">금액 (숫자만 입력)</label><input type="number" name="amount" value={formData.amount} onChange={handleChange} placeholder="예: 5000" className="w-full p-2 border rounded-md text-sm" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-gray-700 font-bold mb-2 text-sm">계정 과목</label><select name="accountType" value={formData.accountType} onChange={handleChange} className="w-full p-2 border rounded-md text-sm"><option>교통비</option><option>식비</option><option>비품구매</option><option>접대비</option><option>기타</option></select></div>
                                <div><label className="block text-gray-700 font-bold mb-2 text-sm">결제 수단</label><select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="w-full p-2 border rounded-md text-sm"><option>법인카드</option><option>개인카드</option><option>현금</option></select></div>
                            </div>
                        </div>
                    </div>

                    <div className="border border-gray-300"><h2 className="p-2 bg-gray-100 font-bold border-b">상세 내역 (적요)</h2><div className="p-4"><textarea name="description" value={formData.description} onChange={handleChange} placeholder="상세 사용 내역을 입력하세요. (예: OOO팀 점심 식대)" className="w-full p-3 border rounded-md h-40 resize-none" required /></div></div>
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
                    <div className="border-b pb-4"><h2 className="text-lg font-bold mb-2">증빙 영수증 첨부</h2><input type="file" onChange={handleFileChange} className="w-full text-sm"/></div>
                    <div className="border-b pb-4"><h2 className="text-lg font-bold mb-2">기안 의견</h2><textarea placeholder="의견을 입력하세요" className="w-full p-2 border rounded-md h-20 resize-none"></textarea></div>
                    <button type="submit" disabled={loading} className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-semibold">{loading ? '상신 중...' : '결재 상신'}</button>
                </form>
            </div>
        </div>
    );
}