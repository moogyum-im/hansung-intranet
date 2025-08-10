// 파일 경로: src/app/(main)/approvals/[id]/InternalApprovalView.jsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateApprovalStatus } from './actions';
import 'react-quill/dist/quill.snow.css'; // 본문 스타일을 위해 CSS import

// 내부 결재 전용 상세 보기 컴포넌트
const InternalApprovalView = ({ doc, profile, approvers, currentUserId }) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const isMyTurnToApprove = (approvers || []).some(approver => 
        approver.approver_id === currentUserId && (approver.status === '대기' || approver.status === '미결')
    );
    const isDocumentPending = doc.status === '진행중' || doc.status === 'pending';
    const showButtons = isMyTurnToApprove && isDocumentPending;

    const formData = doc.content ? JSON.parse(doc.content) : {};

    const handleApprovalAction = async (newStatus) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await updateApprovalStatus(doc.id, newStatus, currentUserId);
            if (result.error) throw new Error(result.error);
            alert(`결재가 성공적으로 ${newStatus}되었습니다.`);
            router.refresh();
        } catch (err) {
            setError(err.message);
            alert(`오류가 발생했습니다: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <style jsx global>{`@media print { body * { visibility: hidden; } #print-area, #print-area * { visibility: visible; } #print-area { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>
            <div className="w-full bg-gray-50 min-h-screen py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row gap-8">
                        <div id="print-area" className="flex-1 bg-white p-10 rounded-xl shadow-lg border">
                            <h1 className="text-2xl font-bold text-center mb-8">내부 결재</h1>
                            <div className="text-right text-sm text-gray-500 mb-4"><p>문서번호: {doc.id.substring(0, 8)}</p><p>작성일: {new Date(doc.created_at).toLocaleDateString('ko-KR')}</p></div>
                            <table className="w-full text-sm border-collapse border border-gray-300 mb-8">
                                <tbody>
                                    <tr><th className="p-2 bg-gray-100 font-bold w-1/5 text-left border-b border-r">기안부서</th><td className="p-2 w-2/5 border-b border-r">{profile?.department}</td><th className="p-2 bg-gray-100 font-bold w-1/5 text-left border-b border-r">직 위</th><td className="p-2 w-1/5 border-b">{profile?.position}</td></tr>
                                    <tr><th className="p-2 bg-gray-100 font-bold text-left border-b border-r">기안자</th><td className="p-2 border-b border-r">{profile?.full_name}</td><th className="p-2 bg-gray-100 font-bold text-left border-r">기안일자</th><td className="p-2">{new Date(doc.created_at).toLocaleDateString('ko-KR')}</td></tr>
                                    <tr><th className="p-2 bg-gray-100 font-bold text-left border-r">제목</th><td className="p-2" colSpan="3">{formData.subject}</td></tr>
                                </tbody>
                            </table>
                             
                            <div>
                                <h2 className="text-lg font-bold mb-2">내용</h2>
                                <div 
                                    className="p-4 border rounded-md min-h-[400px] ql-editor"
                                    dangerouslySetInnerHTML={{ __html: formData.body }}
                                />
                            </div>
                        </div>
                        <div className="w-full lg:w-80 flex-shrink-0">
                            <div className="bg-white p-6 rounded-xl shadow-lg border space-y-6 sticky top-8">
                                <div><h2 className="text-lg font-bold mb-4 border-b pb-2">결재선</h2><div className="space-y-2">{approvers.map(app => (<div key={app.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-md"><span>{app.approver?.full_name} ({app.approver?.position})</span><span className={`px-2 py-1 rounded-full text-xs font-semibold ${ app.status === '승인' ? 'bg-green-100 text-green-800' : app.status === '반려' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{app.status || '미결'}</span></div>))}</div></div>
                                {doc.attachment_url && ( <div className="border-t pt-4"><h2 className="text-lg font-bold mb-2">첨부 파일</h2><a href={doc.attachment_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all text-sm">{doc.attachment_filename || '파일 보기'}</a></div> )}
                                {showButtons ? ( <div className="border-t pt-4 space-y-3"><h2 className="text-lg font-bold mb-2">결재 처리</h2><button onClick={() => handleApprovalAction('승인')} disabled={isLoading} className="w-full px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">승인</button><button onClick={() => handleApprovalAction('반려')} disabled={isLoading} className="w-full px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">반려</button></div>
                                ) : ( <div className="border-t pt-4"><h2 className="text-lg font-bold mb-2">현재 상태</h2><div className="text-center font-semibold p-3 bg-gray-100 rounded-md">{doc.status === '승인' ? '최종 승인됨' : doc.status === '반려' ? '반려됨' : '결재 진행중'}</div></div> )}
                                <div className="border-t pt-4"><button onClick={() => window.print()} className="w-full px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">PDF로 저장</button></div>
                                {error && <p className="text-sm text-red-500 mt-4">오류: {error}</p>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default InternalApprovalView;