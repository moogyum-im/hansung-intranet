// 파일 경로: src/app/(main)/approvals/internal/page.js
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import dynamic from 'next/dynamic'; // 리치 텍스트 에디터를 위한 dynamic import
import 'react-quill/dist/quill.snow.css'; // 리치 텍스트 에디터 CSS

// 리치 텍스트 에디터는 브라우저에서만 동작하므로, dynamic import로 불러옵니다.
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

export default function InternalApprovalPage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const router = useRouter();

    const [allEmployees, setAllEmployees] = useState([]);
    // ★★★ 1. formData 상태를 '내부 결재'에 맞게 변경 ★★★
    const [formData, setFormData] = useState({
        title: '내부결재',
        subject: '', // 제목
        body: '',    // 내용 (리치 텍스트)
        approverId: '',
        referenceId: '',
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
        const documentPrefix = '내부';
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
                setFormData(prev => ({ ...prev, approverId: employee.team_leader_id }));
            }
        }
    }, [employee, employeeLoading]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleQuillChange = (value) => {
        setFormData(prev => ({ ...prev, body: value }));
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

        if (!employee) {
            toast.error("사용자 정보를 불러오는 중입니다.");
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

        // ★★★ 2. document_type을 'internal_approval'로 변경 ★★★
        const submissionData = {
            title: formData.title,
            content: JSON.stringify(formData),
            document_type: 'internal_approval',
            approver_id: formData.approverId,
            reference_id: formData.referenceId || null,
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
            toast.success("내부결재 문서가 성공적으로 상신되었습니다.");
            router.push('/approvals');
        } catch (error) {
            toast.error(`내부결재 상신 실패: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (employeeLoading) return <div className="flex justify-center items-center h-screen">로딩 중...</div>;

    return (
        <div className="flex bg-gray-50 min-h-screen p-8 space-x-8">
            <div className="flex-1">
                <div className="bg-white p-10 rounded-xl shadow-lg border">
                    <h1 className="text-2xl font-bold text-center mb-8">내부 결재</h1>
                    <div className="text-right text-sm text-gray-500 mb-4"><p>문서번호: {documentNumber}</p><p>작성일: {new Date().toLocaleDateString('ko-KR')}</p></div>
                    <div className="mb-8 border border-gray-300"><table className="w-full text-sm border-collapse"><tbody>
                        <tr><th className="p-2 bg-gray-100 font-bold w-1/5 text-left border-r border-b">기안부서</th><td className="p-2 w-2/5 border-b border-r">{employee?.department}</td><th className="p-2 bg-gray-100 font-bold w-1/5 text-left border-r border-b">직 위</th><td className="p-2 w-1/5 border-b">{employee?.position}</td></tr>
                        <tr><th className="p-2 bg-gray-100 font-bold text-left border-r">기안자</th><td className="p-2 border-r">{employee?.full_name}</td><th className="p-2 bg-gray-100 font-bold text-left border-r">기안일자</th><td className="p-2">{new Date().toLocaleDateString('ko-KR')}</td></tr>
                    </tbody></table></div>
                    
                    {/* ★★★ 3. JSX(UI)를 '내부 결재' 양식으로 변경 ★★★ */}
                    <div className="mb-8">
                        <label className="block text-gray-700 font-bold mb-2 text-sm">제목</label>
                        <input
                            type="text"
                            name="subject"
                            value={formData.subject}
                            onChange={handleChange}
                            placeholder="결재 문서의 제목을 입력하세요"
                            className="w-full p-2 border rounded-md text-sm"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 font-bold mb-2 text-sm">내용</label>
                        <div className="bg-white">
                            <ReactQuill
                                theme="snow"
                                value={formData.body}
                                onChange={handleQuillChange}
                                style={{ height: '400px' }}
                            />
                        </div>
                    </div>
                </div>
            </div>
            <div className="w-96 p-8">
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg border space-y-6 sticky top-8">
                    <div className="border-b pb-4"><h2 className="text-lg font-bold mb-4">결재선</h2><label className="block text-gray-700 font-medium mb-2">결재자</label><select name="approverId" value={formData.approverId} onChange={handleChange} className="w-full p-2 border rounded-md mb-4 text-sm" required><option value="">결재자 선택</option>{allEmployees.map(emp => (<option key={emp.id} value={emp.id}>{emp.full_name} ({emp.position})</option>))}</select><label className="block text-gray-700 font-medium mb-2">참조인 (선택)</label><select name="referenceId" value={formData.referenceId} onChange={handleChange} className="w-full p-2 border rounded-md text-sm"><option value="">참조인 없음</option>{allEmployees.map(emp => (<option key={emp.id} value={emp.id}>{emp.full_name} ({emp.position})</option>))}</select></div>
                    <div className="border-b pb-4"><h2 className="text-lg font-bold mb-2">파일 첨부</h2><input type="file" onChange={handleFileChange} className="w-full text-sm"/></div>
                    <div className="border-b pb-4"><h2 className="text-lg font-bold mb-2">기안 의견</h2><textarea placeholder="의견을 입력하세요" className="w-full p-2 border rounded-md h-20 resize-none"></textarea></div>
                    <button type="submit" disabled={loading} className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-semibold">{loading ? '상신 중...' : '결재 상신'}</button>
                </form>
            </div>
        </div>
    );
}