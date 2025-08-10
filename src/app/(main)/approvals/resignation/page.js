// 파일 경로: src/app/(main)/approvals/resignation/page.js
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export default function ResignationPage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const router = useRouter();

    const [allEmployees, setAllEmployees] = useState([]);
    const [approvers, setApprovers] = useState([]);
    // ★★★ 1. formData에 resignationReason 추가 ★★★
    const [formData, setFormData] = useState({
        title: '사직서',
        resignationDate: '', // 퇴사 예정일
        residentId: '', // 주민등록번호
        resignationReason: '', // 퇴사 사유
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
        if (e.target.files && e.target.files.length > 0) {
            setAttachmentFile(e.target.files[0]);
        } else {
            setAttachmentFile(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (!formData.resignationDate || !formData.residentId) {
            toast.error("퇴사 예정일과 주민등록번호를 모두 입력해주세요.");
            setLoading(false);
            return;
        }
        if (approvers.length === 0 || approvers.some(app => !app.id)) {
            toast.error("결재자를 모두 지정해주세요.");
            setLoading(false);
            return;
        }

        let fileUrl = null;
        let originalFileName = null;

        if (attachmentFile) {
            const fileExt = attachmentFile.name.split('.').pop();
            const safeFileName = `${uuidv4()}.${fileExt}`;
            const { data: uploadData, error: uploadError } = await supabase.storage.from('approval-documents').upload(safeFileName, attachmentFile);
            if (uploadError) {
                toast.error(`파일 업로드 실패: ${uploadError.message}`);
                setLoading(false);
                return;
            }
            const { data: urlData } = supabase.storage.from('approval-documents').getPublicUrl(uploadData.path);
            fileUrl = urlData.publicUrl;
            originalFileName = attachmentFile.name;
        }
        
        const approver_ids = approvers.map(app => app.id);
        const finalFormData = { ...formData, title: `사직서 (${employee?.full_name})` };

        const submissionData = {
            title: finalFormData.title,
            content: JSON.stringify(finalFormData),
            document_type: 'resignation',
            approver_ids,
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
            toast.success("사직서가 성공적으로 제출되었습니다.");
            router.push('/approvals');
        } catch (error) {
            toast.error(`사직서 제출 실패: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (employeeLoading) return <div className="flex justify-center items-center h-screen">로딩 중...</div>;

    return (
        <div className="flex bg-gray-50 min-h-screen p-8 space-x-8">
            <div className="flex-1">
                <div className="bg-white p-10 rounded-xl shadow-lg border">
                    <h1 className="text-2xl font-bold text-center mb-8">사 직 서</h1>
                    <div className="mb-8 border border-gray-300"><table className="w-full text-sm border-collapse"><tbody>
                        <tr><th className="p-2 bg-gray-100 font-bold w-1/5 text-left border-r border-b">기안부서</th><td className="p-2 w-2/5 border-b border-r">{employee?.department}</td><th className="p-2 bg-gray-100 font-bold w-1/5 text-left border-r border-b">직 위</th><td className="p-2 w-1/5 border-b">{employee?.position}</td></tr>
                        <tr><th className="p-2 bg-gray-100 font-bold text-left border-r">기안자</th><td className="p-2 border-r">{employee?.full_name}</td><th className="p-2 bg-gray-100 font-bold text-left border-r">기안일자</th><td className="p-2">{new Date().toLocaleDateString('ko-KR')}</td></tr>
                    </tbody></table></div>
                    
                    <div className="space-y-6 text-sm">
                        {/* ★★★ 2. 기존 문구 삭제 및 퇴사 사유 입력란 추가 ★★★ */}
                        <div className="mb-8">
                            <label className="block text-gray-700 font-bold mb-2">퇴사 사유</label>
                            <textarea
                                name="resignationReason"
                                value={formData.resignationReason}
                                onChange={handleChange}
                                className="w-full p-3 border rounded-md h-24 resize-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="퇴사 사유를 기재해 주십시오."
                                required
                            />
                        </div>
                        
                        <div className="border p-4 rounded-md space-y-3 bg-gray-50">
                            <h3 className="font-bold text-center">서 약 서</h3>
                            <p className="leading-relaxed">본인은 퇴직에 따른 사무 인수, 인계의 절차로 최종 퇴사시까지 책입과 의무를 완수하고, 재직 시 업무상 취득한 비밀사항을 타인에게 누설하여 귀사의 경영에 막대한 손해와 피해를 준다는 사실을 지각하고 일체 어느 누구에게도 누설하지 않겠습니다.</p>
                            <p className="leading-relaxed">퇴직금 수령 등 환불품(금)은 퇴직일 전일까지 반환하겠습니다.</p>
                            <p className="leading-relaxed">기타 회사와 관련한 제반사항은 회사규정에 의거 퇴직일 전일까지 처리하겠습니다.</p>
                            <p className="leading-relaxed">만일 본인이 상기 사항을 위반하였을 때에는 이유 여하를 막론하고 서약에 의거 민, 형사상의 책임을 지며, 회사에서 요구하는 손해배상의 의무를 지겠습니다.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-x-6 items-end">
                            <div>
                                <label className="block text-gray-700 font-bold mb-2">퇴사 예정일</label>
                                <input type="date" name="resignationDate" value={formData.resignationDate} onChange={handleChange} className="w-full p-2 border rounded-md" required />
                            </div>
                            <div>
                                <label className="block text-gray-700 font-bold mb-2">주민등록번호</label>
                                <input type="text" name="residentId" value={formData.residentId} onChange={handleChange} className="w-full p-2 border rounded-md" placeholder="생년월일-뒷자리 첫째" required />
                            </div>
                        </div>

                        <div className="pt-8 text-center">
                            <p>{new Date().getFullYear()}년 {new Date().getMonth() + 1}월 {new Date().getDate()}일</p>
                            <p className="mt-4">성 명: {employee?.full_name} (인)</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="w-96 p-8">
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg border space-y-6 sticky top-8">
                    <div className="border-b pb-4">
                        <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">결재선</h2><button type="button" onClick={() => setApprovers([...approvers, { id: '' }])} className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full hover:bg-blue-200">추가 +</button></div>
                        <div className="space-y-3">
                            {approvers.map((approver, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                    <span className="font-semibold text-sm text-gray-600">{index + 1}차:</span>
                                    <select value={approver.id} onChange={(e) => { const newApprovers = [...approvers]; newApprovers[index].id = e.target.value; setApprovers(newApprovers); }} className="w-full p-2 border rounded-md text-sm" required>
                                        <option value="">결재자 선택</option>
                                        {allEmployees.map(emp => (<option key={emp.id} value={emp.id}>{emp.full_name} ({emp.position})</option>))}
                                    </select>
                                    <button type="button" onClick={() => setApprovers(approvers.filter((_, i) => i !== index))} className="text-red-500 hover:text-red-700 text-lg font-bold">×</button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="border-b pb-4"><h2 className="text-lg font-bold mb-2">문서 첨부 (선택)</h2><input type="file" onChange={handleFileChange} className="w-full text-sm"/></div>
                    <div className="border-b pb-4"><h2 className="text-lg font-bold mb-2">기안 의견</h2><textarea placeholder="의견을 입력하세요" className="w-full p-2 border rounded-md h-20 resize-none"></textarea></div>
                    <button type="submit" disabled={loading} className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-semibold">{loading ? '제출 중...' : '사직서 제출'}</button>
                </form>
            </div>
        </div>
    );
}