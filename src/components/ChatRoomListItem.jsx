import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { useEmployee } from '@/contexts/EmployeeContext';

const LeaveIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> );

const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    if (date.toLocaleDateString() !== now.toLocaleDateString()) {
        return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
    }
    return date.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const Avatar = ({ participant }) => (
    <div className="relative w-full h-full rounded-full overflow-hidden bg-gray-200">
        {participant?.avatar_url ? (
            <Image src={participant.avatar_url} alt={participant.full_name} layout="fill" objectFit="cover" />
        ) : (
            <span className="font-bold text-gray-500 text-xl flex items-center justify-center h-full">
                {participant?.full_name?.charAt(0) || '?'}
            </span>
        )}
    </div>
);

export default function ChatRoomListItem({ room, onLeave }) {
    const { employee } = useEmployee();
    const otherParticipants = room.participants || [];
    // ✨ is_direct_message 대신 type 칼럼을 사용하도록 수정
    const isDirect = room.type === 'direct' && otherParticipants.length === 1;
    const roomName = isDirect ? otherParticipants[0].full_name : room.name;

    const handleLeaveClick = async (e) => {
        e.stopPropagation();
        e.preventDefault();

        if (confirm(`'${roomName}' 채팅방을 나가시겠습니까?`)) {
            const { error } = await supabase.rpc('leave_chat_room', {
                p_room_id: room.id,
                p_user_id: employee?.id
            });

            if (error) {
                toast.error("채팅방을 나가는 데 실패했습니다.");
            } else {
                toast.success("채팅방을 나갔습니다.");
                onLeave(room.id);
            }
        }
    };

    return (
        <div className="flex items-center p-4 hover:bg-gray-100 transition-colors duration-150 group">
            <Link href={`/chatrooms/${room.id}`} className="flex-1 flex items-center min-w-0">
                <div className="relative flex-shrink-0 w-14 h-14 mr-4">
                    {isDirect ? (
                        <div className="w-14 h-14"><Avatar participant={otherParticipants[0]} /></div>
                    ) : (
                        <div className="w-full h-full relative">
                            {otherParticipants.slice(0, 2).map((p, index) => (
                                <div key={p.id} className={`absolute w-9 h-9 rounded-full border-2 border-white ${index === 0 ? 'top-0 left-0 z-10' : 'bottom-1 right-1'}`}>
                                    <Avatar participant={p} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 truncate">{roomName}</p>
                    <p className={`text-sm truncate mt-1 ${room.unread_count > 0 ? 'text-gray-800 font-semibold' : 'text-gray-500'}`}>
                        {room.last_message_content || '아직 메시지가 없습니다.'}
                    </p>
                </div>
                <div className="flex flex-col items-end ml-4 text-xs text-right flex-shrink-0 w-24">
                    <p className="text-gray-400 whitespace-nowrap">{formatTime(room.last_message_at)}</p>
                    {room.unread_count > 0 && (
                        <span className="mt-2 w-6 h-6 bg-red-500 text-white font-bold flex items-center justify-center text-sm rounded-full">
                            {room.unread_count}
                        </span>
                    )}
                </div>
            </Link>
            <button onClick={handleLeaveClick} className="ml-4 p-2 rounded-full bg-gray-200 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 hover:text-red-600">
                <LeaveIcon />
            </button>
        </div>
    );
}