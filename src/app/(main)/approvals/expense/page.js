'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import FileUploadDnd from '@/components/FileUploadDnd';

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
        cardNumberLastFour: '',
    });
    const [approvers, setApprovers] = useState([]);
    const [referrers, setReferrers] = useState([]);

    const [loading, setLoading] = useState(false);
    const [documentNumber, setDocumentNumber] = useState('');
    const [attachments, setAttachments] = useState([]);

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
                if (employee.id !== employee.team_leader_id) {
                    setApprovers([{ id: employee.team_leader_id, full_name: '', position: '' }]);
                }
            }
        }
    }, [employee, employeeLoading]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUploadComplete = (files) => {
        setAttachments(files);
    };

    const addApprover = () => setApprovers([...approvers, { id: '' }]);
    const handleApproverChange = (index, id) => {
        const newApprovers = [...approvers];
        const selectedEmployee = allEmployees.find(emp => emp.id === id);
        newApprovers[index] = {
            id: id,
            full_name: selectedEmployee?.full_name || '',
            position: selectedEmployee?.position || '',
        };
        setApprovers(newApprovers);
    };
    const removeApprover = (index) => setApprovers(approvers.filter((_, i) => i !== index));

    const addReferrer = () => setReferrers([...referrers, { id: '' }]);
    const handleReferrerChange = (index, id) => {
        const newReferrers = [...referrers];
        const selectedEmployee = allEmployees.find(emp => emp.id === id);
        newReferrers[index] = {
            id: id,
            full_name: selectedEmployee?.full_name || '',
            position: selectedEmployee?.position || '',
        };
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

        const approver_ids_with_names = approvers.map(app => ({
            id: app.id,
            full_name: allEmployees.find(emp => emp.id === app.id)?.full_name || '알 수 없음',
            position: allEmployees.find(emp => emp.id === app.id)?.position || '알 수 없음',
        }));
        const referrer_ids_with_names = referrers.map(ref => ({
            id: ref.id,
            full_name: allEmployees.find(emp => emp.id === ref.id)?.full_name || '알 수 없음',
            position: allEmployees.find(emp => emp.id === ref.id)?.position || '알 수 없음',
        }));

        const submissionData = {
            title: `지출결의서 (${employee?.full_name})`,
            content: JSON.stringify({
                ...formData,
                requesterName: employee.full_name,
                requesterDepartment: employee.department,
                requesterPosition: employee.position,
            }),
            document_type: 'expense_report',
            approver_ids: approver_ids_with_names,
            referrer_ids: referrer_ids_with_names,
            attachments: attachments.length > 0 ? attachments : null,
            requester_id: employee.id,
            requester_name: employee.full_name,
            requester_department: employee.department,
            requester_position: employee.position,
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
            router.push('/mypage');
        } catch (error) {
            toast.error(`지출결의서 상신 실패: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (employeeLoading) return <div className="flex justify-center items-center h-screen">로딩 중...</div>;
    if (!employee) return <div className="flex justify-center items-center h-screen text-red-500">직원 정보를 불러올 수 없습니다. 다시 로그인 해주세요.</div>;

    return (
        <div className="flex flex-col lg:flex-row bg-gray-50 min-h-screen p-4 sm:p-8 lg:space-x-8 space-y-6 lg:space-y-0">
            {/* 좌측: 기안서 작성 영역 */}
            <div className="flex-1 w-full">
                <div className="bg-white p-6 sm:p-10 rounded-xl shadow-lg border">
                    <h1 className="text-2xl font-bold text-center mb-8">지출결의서 작성</h1>
                    <div className="text-right text-sm text-gray-500 mb-4">
                        <p>문서번호: {documentNumber}</p>
                        <p>작성일: {new Date().toLocaleDateString('ko-KR')}</p>
                    </div>

                    <div className="mb-8 border border-gray-300 overflow-x-auto">
                        <table className="w-full text-sm border-collapse min-w-[500px]">
                            <tbody>
                                <tr>
                                    <th className="p-2 bg-gray-100 font-bold w-1/5 text-left border-r border-b">기안부서</th>
                                    <td className="p-2 w-2/5 border-b border-r">{employee?.department}</td>
                                    <th className="p-2 bg-gray-100 font-bold w-1/5 text-left border-r border-b">직 위</th>
                                    <td className="p-2 w-1/5 border-b">{employee?.position}</td>
                                </tr>
                                <tr>
                                    <th className="p-2 bg-gray-100 font-bold text-left border-r">기안자</th>
                                    <td className="p-2 border-r">{employee?.full_name}</td>
                                    <th className="p-2 bg-gray-100 font-bold text-left border-r">기안일자</th>
                                    <td className="p-2">{new Date().toLocaleDateString('ko-KR')}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="mb-8 border border-gray-300">
                        <h2 className="p-2 bg-gray-100 font-bold border-b">지출 정보</h2>
                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-700 font-bold mb-1 text-sm">지출일자</label>
                                    <input type="date" name="expenseDate" value={formData.expenseDate} onChange={handleChange} className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-bold mb-1 text-sm">금액 (숫자만 입력)</label>
                                    <input type="number" name="amount" value={formData.amount} onChange={handleChange} placeholder="예: 5000" className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-700 font-bold mb-1 text-sm">계정 과목</label>
                                    <select name="accountType" value={formData.accountType} onChange={handleChange} className="w-full p-2 border rounded-md text-sm">
                                        <option>교통비</option>
                                        <option>식비</option>
                                        <option>비품구매</option>
                                        <option>접대비</option>
                                        <option>기타</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-bold mb-1 text-sm">결제 수단</label>
                                    <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="w-full p-2 border rounded-md text-sm">
                                        <option>법인카드</option>
                                        <option>개인카드</option>
                                        <option>현금</option>
                                    </select>
                                </div>
                            </div>
                            {formData.paymentMethod === '법인카드' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-gray-700 font-bold mb-1 text-sm">카드번호 뒷 4자리</label>
                                        <input type="text" name="cardNumberLastFour" value={formData.cardNumberLastFour} onChange={handleChange} placeholder="XXXX" maxLength="4" className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="border border-gray-300">
                        <h2 className="p-2 bg-gray-100 font-bold border-b">상세 내역 (적요)</h2>
                        <div className="p-4">
                            <textarea name="description" value={formData.description} onChange={handleChange} placeholder="상세 사용 내역을 입력하세요. (예: OOO팀 점심 식대)" className="w-full p-3 border rounded-md h-40 resize-none focus:ring-2 focus:ring-blue-500 outline-none" required />
                        </div>
                    </div>
                </div>
            </div>

            {/* 우측: 결재선 및 첨부파일 영역 */}
            <div className="w-full lg:w-96">
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg border space-y-6 lg:sticky lg:top-8">
                    <div className="border-b pb-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">결재선</h2>
                            <button type="button" onClick={addApprover} className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full hover:bg-blue-200 transition-colors">추가 +</button>
                        </div>
                        <div className="space-y-3">
                            {approvers.map((approver, index) => (
                                <div key={index} className="flex items-center space-x-2 animate-in fade-in slide-in-from-right-1">
                                    <span className="font-semibold text-sm text-gray-600 shrink-0">{index + 1}차:</span>
                                    <select value={approver.id} onChange={(e) => handleApproverChange(index, e.target.value)} className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500" required>
                                        <option value="">결재자 선택</option>
                                        {allEmployees.map(emp => (<option key={emp.id} value={emp.id}>{emp.full_name} ({emp.position})</option>))}
                                    </select>
                                    <button type="button" onClick={() => removeApprover(index)} className="text-red-500 hover:text-red-700 text-xl font-bold px-1">×</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border-b pb-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">참조인</h2>
                            <button type="button" onClick={addReferrer} className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full hover:bg-gray-200 transition-colors">추가 +</button>
                        </div>
                        <div className="space-y-3">
                            {referrers.map((referrer, index) => (
                                <div key={index} className="flex items-center space-x-2 animate-in fade-in slide-in-from-right-1">
                                    <select value={referrer.id} onChange={(e) => handleReferrerChange(index, e.target.value)} className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500">
                                        <option value="">참조인 선택</option>
                                        {allEmployees.map(emp => (<option key={emp.id} value={emp.id}>{emp.full_name} ({emp.position})</option>))}
                                    </select>
                                    <button type="button" onClick={() => removeReferrer(index)} className="text-red-500 hover:text-red-700 text-xl font-bold px-1">×</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border-b pb-4">
                        <FileUploadDnd onUploadComplete={handleUploadComplete} />
                    </div>

                    <div className="border-b pb-4">
                        <h2 className="text-lg font-bold mb-2">기안 의견</h2>
                        <textarea placeholder="의견을 입력하세요" className="w-full p-2 border rounded-md h-20 resize-none text-sm focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-bold shadow-lg transform active:scale-95 transition-all"
                    >
                        {loading ? '상신 중...' : '결재 상신'}
                    </button>
                </form>
            </div>
        </div>
    );
}