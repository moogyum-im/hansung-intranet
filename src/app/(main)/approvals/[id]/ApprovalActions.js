// src/app/(main)/approvals/[id]/ApprovalActions.js

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { processApprovalAction } from './actions'; // 서버 액션을 불러옵니다.

export default function ApprovalActions({ document, approvers, currentUserId }) {
    const router = useRouter();
    const [comment, setComment] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const myApprovalStep = approvers.find(
        (step) => step.approver_id === currentUserId && step.status === '대기'
    );
    
    if (!myApprovalStep) {
        return null; // 내가 처리할 결재가 아니면 이 컴포넌트는 렌더링되지 않습니다.
    }

    const isFinalApprover = approvers.length > 0 && approvers[approvers.length - 1].approver_id === currentUserId;

    const handleProcessApproval = async (newStatusInKorean) => {
        if (isProcessing) return;

        if (newStatusInKorean === '반려' && !comment.trim()) {
            alert('반려 시에는 결재 의견을 반드시 입력해주세요.');
            return;
        }

        setIsProcessing(true);
        try {
            const result = await processApprovalAction({
                documentId: document.id,
                approverId: myApprovalStep.approver_id,
                newStatus: newStatusInKorean === '승인' ? 'approved' : 'rejected',
                comment,
                isFinalApprover,
            });

            if (result.success) {
                alert(result.message || '결재가 성공적으로 처리되었습니다.');
                router.refresh();
            } else {
                alert(result.message || '결재 처리 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error('클라이언트 측 결재 처리 오류:', error);
            alert('오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border mt-6">
            <h2 className="text-xl font-bold border-b pb-3 mb-4">결재 처리</h2>
            <div className="space-y-4">
                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="의견을 남겨주세요. (반려 시 필수)"
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows="4"
                    disabled={isProcessing}
                />
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={() => handleProcessApproval('반려')}
                        disabled={isProcessing}
                        className="px-6 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 disabled:bg-red-300 transition"
                    >
                        {isProcessing ? '처리중...' : '반려'}
                    </button>
                    <button
                        onClick={() => handleProcessApproval('승인')}
                        disabled={isProcessing}
                        className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition"
                    >
                        {isProcessing ? '처리중...' : '승인'}
                    </button>
                </div>
            </div>
        </div>
    );
}
