'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import FileUploadDnd from '@/components/FileUploadDnd';

export default function ApologyPage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const router = useRouter();

    const [allEmployees, setAllEmployees] = useState([]);
    const [formData, setFormData] = useState({
        incidentDate: '',
        incidentDetails: '',
        cause: '',
        solution: '',
        apologyContent: '',
    });
    const [approvers, setApprovers] = useState([]);
    const [referrers, setReferrers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [attachments, setAttachments] = useState([]);

    useEffect(() => {
        const fetchEmployees = async () => {
            const { data, error } = await supabase.from('profiles').select('id, full_name, department, position');
            if (error) console.error("직원 목록 로딩 실패:", error);
            else setAllEmployees(data || []);
        };
        if (!employeeLoading && employee) {
            fetchEmployees();
            if (employee?.team_leader_id && employee.id !== employee.team_leader_id) {
                setApprovers([{ id: employee.team_leader_id }]);
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
        newApprovers[index] = { id };
        setApprovers(newApprovers);
    };
    const removeApprover = (index) => setApprovers(approvers.filter((_, i) => i !== index));

    const addReferrer = () => setReferrers([...referrers, { id: '' }]);
    const handleReferrerChange = (index, id) => {
        const newReferrers = [...referrers];
        newReferrers[index] = { id };
        setReferrers(newReferrers);
    };
    const removeReferrer = (index) => setReferrers(referrers.filter((_, i) => i !== index));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (!employee) {
            toast.error("사용자 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
            setLoading(false);
            return;
        }
        if (approvers.length === 0 || approvers.some(app => !app.id)) {
            toast.error("결재자를 모두 지정해주세요.");
            setLoading(false);
            return;
        }

        const approver_ids_with_details = approvers.map(app => {
            const emp = allEmployees.find(e => e.id === app.id);
            return {
                id: app.id,
                full_name: emp?.full_name || '알 수 없음',
                position: emp?.position || '알 수 없음',
            };
        });
        const referrer_ids_with_details = referrers.map(ref => {
            const emp = allEmployees.find(e => e.id === ref.id);
            return {
                id: ref.id,
                full_name: emp?.full_name || '알 수 없음',
                position: emp?.position || '알 수 없음',
            };
        });

        const submissionData = {
            title: `시말서 (${employee?.full_name})`,
            content: JSON.stringify({
                ...formData,
                requesterName: employee.full_name,
                requesterDepartment: employee.department,
                requesterPosition: employee.position,
            }),
            document_type: 'apology',
            approver_ids: approver_ids_with_details,
            referrer_ids: referrer_ids_with_details,
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
            toast.success("시말서가 성공적으로 상신되었습니다.");
            router.push('/mypage');
        } catch (error) {
            toast.error(`시말서 상신 실패: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (employeeLoading) return <div className="flex justify-center items-center h-screen">로딩 중...</div>;
    if (!employee) return <div className="flex justify-center items-center h-screen text-red-500">직원 정보를 불러올 수 없습니다.</div>;

    return (
        <div className="flex flex-col lg:flex-row bg-gray-50 min-h-screen p-4 sm:p-8 lg:space-x-8 space-y-6 lg:space-y-0">
            <div className="flex-1 w-full">
                <div className="bg-white p-6 sm:p-10 rounded-xl shadow-lg border">
                    <h1 className="text-2xl font-bold text-center mb-8">시 말 서</h1>
                    <div className="text-right text-sm text-gray-500 mb-4">
                        <p>작성일: {new Date().toLocaleDateString('ko-KR')}</p>
                    </div>
                    <div className="mb-8 border border-gray-300 overflow-x-auto">
                        <table className="w-full text-sm border-collapse min-w-[500px]">
                            <tbody>
                                <tr>
                                    <th className="p-2 bg-gray-100 font-bold w-1/5 text-left border-r border-b">소속</th>
                                    <td className="p-2 w-2/5 border-b border-r">{employee?.department || '정보 없음'}</td>
                                    <th className="p-2 bg-gray-100 font-bold w-1/5 text-left border-r border-b">직위</th>
                                    <td className="p-2 w-1/5 border-b">{employee?.position || '정보 없음'}</td>
                                </tr>
                                <tr>
                                    <th className="p-2 bg-gray-100 font-bold text-left border-r">성명</th>
                                    <td className="p-2 border-r">{employee?.full_name || '정보 없음'}</td>
                                    <th className="p-2 bg-gray-100 font-bold text-left border-r">작성일</th>
                                    <td className="p-2">{new Date().toLocaleDateString('ko-KR')}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="block text-gray-700 font-bold mb-2 text-sm">발생 일시</label>
                            <input type="datetime-local" name="incidentDate" value={formData.incidentDate} onChange={handleChange} className="w-full p-2 border rounded-md text-sm" required />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-bold mb-2 text-sm">사건 내용</label>
                            <textarea name="incidentDetails" value={formData.incidentDetails} onChange={handleChange} className="w-full p-3 border rounded-md h-40 resize-none" required />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-bold mb-2 text-sm">발생 원인</label>
                            <textarea name="cause" value={formData.cause} onChange={handleChange} className="w-full p-3 border rounded-md h-24 resize-none" required />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-bold mb-2 text-sm">대책 및 처리</label>
                            <textarea name="solution" value={formData.solution} onChange={handleChange} className="w-full p-3 border rounded-md h-24 resize-none" required />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-bold mb-2 text-sm">시말 내용</label>
                            <textarea name="apologyContent" value={formData.apologyContent} onChange={handleChange} className="w-full p-3 border rounded-md h-40 resize-none" required />
                        </div>
                        <div className="pt-8 text-center border-t">
                            <p>위와 같이 시말서를 제출합니다.</p>
                            <p className="mt-4">{new Date().getFullYear()}년 {new Date().getMonth() + 1}월 {new Date().getDate()}일</p>
                            <p className="mt-4 font-bold">제출자: {employee?.full_name} (인)</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 결재선 설정 사이드바 */}
            <div className="w-full lg:w-96 p-0">
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg border space-y-6 lg:sticky lg:top-8">
                    <div className="border-b pb-4">
                        <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">결재선</h2><button type="button" onClick={addApprover} className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full hover:bg-blue-200">추가 +</button></div>
                        <div className="space-y-3">
                            {approvers.map((approver, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                    <span className="font-semibold text-sm text-gray-600 shrink-0">{index + 1}차:</span>
                                    <select value={approver.id} onChange={(e) => handleApproverChange(index, e.target.value)} className="w-full p-2 border rounded-md text-sm" required >
                                        <option value="">결재자 선택</option>
                                        {allEmployees.map(emp => (<option key={emp.id} value={emp.id}>{emp.full_name} ({emp.position})</option>))}
                                    </select>
                                    <button type="button" onClick={() => removeApprover(index)} className="text-red-500 hover:text-red-700 text-lg font-bold px-2">×</button>
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
                                    <button type="button" onClick={() => removeReferrer(index)} className="text-red-500 hover:text-red-700 text-lg font-bold px-2">×</button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="border-b pb-4">
                        <h2 className="text-lg font-bold mb-2">증빙 자료 (선택)</h2>
                        <FileUploadDnd onUploadComplete={handleUploadComplete} />
                    </div>
                    <button type="submit" disabled={loading} className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-semibold shadow-md transition-transform active:scale-95">
                        {loading ? '상신 중...' : '시말서 상신'}
                    </button>
                </form>
            </div>
        </div>
    );
}