// 파일 경로: src/components/ApprovalItem.jsx (새로 생성하거나 덮어씌울 파일)
'use client'; // 이 컴포넌트는 클라이언트에서 사용될 것임을 명시

import { useState, useEffect } from 'react';

// 결재 문서 목록 아이템 컴포넌트
// 이 컴포넌트는 ApprovalDetailModal의 기능도 일부 포함하여 조건부 렌더링 됩니다.
// isOpen이 true이면 모달 형태로, false이면 목록 아이템 형태로 작동합니다.
export default function ApprovalItem({ approval, onToggleExpand, isExpanded, employee, onApproveReject, onCancelRequest, isOpen, onClose, approvalListType }) {
    const [approverComment, setApproverComment] = useState(approval?.approver_comment || '');
    const [isProcessing, setIsProcessing] = useState(false); // 승인/반려/취소 처리 중

    // approval prop이 변경될 때마다 결재 의견 초기화
    useEffect(() => {
        if (approval) {
            setApproverComment(approval.approver_comment || '');
        }
    }, [approval]);

    const isApprover = employee?.id === approval?.approver_id;
    const isRequester = employee?.id === approval?.requested_by;
    const canApproveReject = isApprover && approval?.status === '대기';
    const canCancelRequest = isRequester && approval?.status === '대기';

    const statusClasses = approval?.status === '승인' ? 'bg-green-100 text-green-800' :
                          approval?.status === '반려' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800';

    const handleApproveClick = async (status) => {
        setIsProcessing(true);
        await onApproveReject(approval.id, status, approverComment);
        setIsProcessing(false);
        if (onClose) onClose(); // 모달일 경우 닫기
    };

    const handleCancelClick = async () => {
        if (confirm('정말로 이 결재 요청을 취소하시겠습니까?')) {
            setIsProcessing(true);
            await onCancelRequest(approval.id);
            setIsProcessing(false);
            if (onClose) onClose(); // 모달일 경우 닫기
        }
    };

    // approvalListType에 따라 추가될 표시 텍스트 (마이페이지/결재함에서 사용)
    const typeIndicator = approvalListType === 'requested' ? ' (요청함)' : 
                          (approvalListType === 'received' && approval.status === '대기') ? ' (처리 대기)' : '';

    // 이 컴포넌트가 모달로 사용될 때와 목록 아이템으로 사용될 때를 구분합니다.
    // isOpen이 제공되고 true이면 모달로 작동
    if (isOpen) { // ApprovalDetailModal 역할을 하는 부분
        if (!approval) return null; // approval이 없으면 모달을 렌더링하지 않음
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col h-[90vh] overflow-hidden">
                    {/* 모달 헤더 */}
                    <div className="p-6 border-b flex justify-between items-center bg-gray-50 flex-shrink-0">
                        <h2 className="text-2xl font-bold text-gray-800">결재 문서</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl font-bold leading-none">×</button>
                    </div>

                    {/* 결재 문서 본문 (스크롤 가능 영역) */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        <div className="mb-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">유형: <span className="font-semibold text-gray-700">{approval.request_type}</span></p>
                                    <h3 className="text-3xl font-bold text-gray-900">{approval.title}</h3>
                                </div>
                                <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${statusClasses}`}>
                                    {approval.status}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-700 mb-4">
                                <div>
                                    <p><span className="font-semibold">요청자:</span> {approval.requested_user?.full_name || '알 수 없음'}</p>
                                    <p><span className="font-semibold">결재자:</span> {approval.approving_user?.full_name || '알 수 없음'}</p>
                                </div>
                                <div>
                                    <p><span className="font-semibold">요청일:</span> {new Date(approval.requested_at).toLocaleDateString()}</p>
                                    {approval.approved_at && <p><span className="font-semibold">처리일:</span> {new Date(approval.approved_at).toLocaleDateString()}</p>}
                                </div>
                            </div>
                        </div>

                        <div className="border p-4 rounded-lg bg-gray-50 text-gray-800 whitespace-pre-wrap mb-6">
                            {approval.content || '내용 없음'}
                        </div>

                        {/* 첨부 파일 섹션 */}
                        {approval.file_url && (
                            <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                                <p className="font-semibold text-blue-800 mb-2">첨부 파일:</p>
                                <a href={approval.file_url} target="_blank" rel="noopener noreferrer" 
                                   download={approval.file_metadata?.name || 'attached_file'} 
                                   className="flex items-center gap-2 text-blue-600 hover:underline">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" /></svg>
                                    <span>{approval.file_metadata?.name || '파일 다운로드'}</span>
                                    <span className="text-xs ml-2">({(approval.file_metadata?.size / 1024).toFixed(1)} KB)</span>
                                </a>
                            </div>
                        )}

                        {/* 결재자 의견 섹션 (반려 시에만) */}
                        {approval.approver_comment && approval.status === '반려' && (
                            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
                                <p className="font-semibold text-red-800">결재자 의견:</p>
                                <p className="text-red-700 whitespace-pre-wrap">{approval.approver_comment}</p>
                            </div>
                        )}
                    </div>

                    {/* 모달 푸터 (결재 처리 버튼 영역) */}
                    <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 flex-shrink-0">
                        {canApproveReject && (
                            <>
                                <textarea
                                    value={approverComment}
                                    onChange={(e) => setApproverComment(e.target.value)}
                                    placeholder="결재 의견 (선택사항)"
                                    rows="2"
                                    className="flex-1 p-2 border rounded-md"
                                ></textarea>
                                <button onClick={() => handleApproveClick('반려')} disabled={isProcessing} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400">
                                    반려
                                </button>
                                <button onClick={() => handleApproveClick('승인')} disabled={isProcessing} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400">
                                    승인
                                </button>
                            </>
                        )}
                        {canCancelRequest && ( // 요청자이고 대기 중일 때만 취소 버튼
                            <button onClick={handleCancelClick} disabled={isProcessing} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400">
                                결재 요청 취소
                            </button>
                        )}
                        {/* 결재 처리나 취소할 권한이 없으면 닫기 버튼만 보여줌 */}
                        {!(canApproveReject || canCancelRequest) && (
                            <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
                                닫기
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    } else { // 이 컴포넌트가 일반 목록 아이템으로 사용되는 경우
        return (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
                <button 
                    onClick={onToggleExpand}
                    className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                    <div className="flex-1 text-left">
                        <p className="text-sm font-semibold text-gray-800">
                            {approval.title} 
                            <span className="text-gray-500 font-normal">{typeIndicator}</span>
                        </p>
                        <p className="text-xs text-gray-600 mt-1">유형: {approval.request_type}</p>
                        <p className="text-xs text-gray-600 mt-1">요청: {approval.requested_user?.full_name || '알 수 없음'} / 결재: {approval.approving_user?.full_name || '알 수 없음'}</p>
                    </div>
                    <span className={`px-2 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${statusClasses}`}>
                        {approval.status}
                    </span>
                    <span className={`transform transition-transform duration-300 ml-4 ${isExpanded ? 'rotate-180' : ''}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </span>
                </button>
                {isExpanded && (
                    <div className="p-4 border-t space-y-3 text-gray-700">
                        <div><p className="font-semibold">내용:</p><p className="ml-2 mt-1 whitespace-pre-wrap">{approval.content || '-'}</p></div>
                        {approval.approver_comment && (
                            <div><p className="font-semibold">결재자 의견:</p><p className="ml-2 mt-1 whitespace-pre-wrap">{approval.approver_comment}</p></div>
                        )}
                        {approval.file_url && (
                            <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                                <p className="font-semibold text-blue-800 mb-2">첨부 파일:</p>
                                <a href={approval.file_url} target="_blank" rel="noopener noreferrer" 
                                   download={approval.file_metadata?.name || 'attached_file'} 
                                   className="flex items-center gap-2 text-blue-600 hover:underline">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" /></svg>
                                    <span>{approval.file_metadata?.name || '파일 다운로드'}</span>
                                    <span className="text-xs ml-2">({(approval.file_metadata?.size / 1024).toFixed(1)} KB)</span>
                                </a>
                            </div>
                        )}
                        <div className="flex justify-end gap-2 mt-4">
                            {canApproveReject && (
                                <>
                                    <input 
                                        type="text" 
                                        placeholder="결재 의견 (선택사항)" 
                                        value={approverComment} 
                                        onChange={(e) => setApproverComment(e.target.value)} 
                                        className="flex-1 p-2 border rounded-md"
                                    />
                                    <button onClick={() => onApproveReject(approval.id, '반려', approverComment)} disabled={isProcessing} className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:bg-gray-400">반려</button>
                                    <button onClick={() => onApproveReject(approval.id, '승인', approverComment)} disabled={isProcessing} className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:bg-gray-400">승인</button>
                                </>
                            )}
                            {canCancelRequest && !canApproveReject && (
                                <button onClick={() => onCancelRequest(approval.id)} disabled={isProcessing} className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:bg-gray-400">요청 취소</button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }
}