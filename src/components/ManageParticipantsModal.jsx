// 파일 경로: src/components/ManageParticipantsModal.jsx
'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useEmployee } from '@/contexts/EmployeeContext';
import { removeParticipant, leaveChatRoom } from '@/actions/chatActions'; // 서버 액션 임포트

const XIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg> );

export default function ManageParticipantsModal({ room, participants, onClose }) {
    const { employee: currentUser } = useEmployee();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleRemove = async (participantId) => {
        if (!confirm('정말로 이 참여자를 내보내시겠습니까?')) return;

        setIsProcessing(true);
        const result = await removeParticipant(room.id, participantId);
        if (result?.error) {
            toast.error(`내보내기 실패: ${result.error}`);
        } else {
            toast.success('참여자를 내보냈습니다.');
            onClose(true); // 성공 시 모달 닫고 목록 새로고침
        }
        setIsProcessing(false);
    };

    const handleLeave = async () => {
        if (!confirm('정말로 이 채팅방을 나가시겠습니까?')) return;
        setIsProcessing(true);
        // leaveChatRoom은 성공 시 자동으로 페이지를 이동시키므로, 별도 처리가 필요 없습니다.
        await leaveChatRoom(room.id);
        // 실패할 경우를 대비해 isProcessing 상태를 풀어줍니다.
        setIsProcessing(false);
    };

    const isRoomCreator = room.created_by === currentUser?.id;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-6 border-b flex justify-between items-center"><h2 className="text-xl font-bold text-gray-800">참여자 관리</h2><button type="button" onClick={() => onClose(false)} className="p-1 rounded-full text-gray-500 hover:bg-gray-100"><XIcon /></button></div>
                <div className="p-6 max-h-80 overflow-y-auto">
                    <ul className="space-y-3">
                        {participants.map(p => (
                            <li key={p.user_id} className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">{p.profiles.full_name}</p>
                                    <p className="text-sm text-gray-500">{p.profiles.position}</p>
                                </div>
                                {isRoomCreator && p.user_id !== currentUser?.id && (
                                    <button
                                        onClick={() => handleRemove(p.user_id)}
                                        disabled={isProcessing}
                                        className="text-xs font-semibold text-red-600 hover:text-red-800"
                                    >
                                        내보내기
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
                    <button
                        onClick={handleLeave}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-md hover:bg-red-700 disabled:bg-gray-400"
                    >
                        채팅방 나가기
                    </button>
                </div>
            </div>
        </div>
    );
}