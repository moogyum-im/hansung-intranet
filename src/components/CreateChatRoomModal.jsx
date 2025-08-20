// 파일 경로: src/components/CreateChatRoomModal.jsx
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { toast } from 'react-hot-toast';
import { createGroupChat } from '@/actions/chatActions'; // 서버 액션을 직접 임포트

const XIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg> );

export default function CreateChatRoomModal({ onClose }) {
    const { employee: currentUser } = useEmployee();
    const [allEmployees, setAllEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchEmployees = async () => {
            if (!currentUser) return;
            const { data, error } = await supabase.from('profiles').select('id, full_name, position').not('id', 'eq', currentUser.id).order('full_name');
            if (error) toast.error('직원 목록을 불러오는 데 실패했습니다.');
            else setAllEmployees(data);
        };
        fetchEmployees();
    }, [currentUser]);

    const handleFormAction = async (formData) => {
        setIsLoading(true);
        const toastId = toast.loading('채팅방을 생성하는 중입니다...');

        const roomName = formData.get('roomName');
        const selectedParticipants = formData.getAll('participants');

        if (!roomName.trim()) {
            toast.error('채팅방 이름을 입력해주세요.', { id: toastId });
            setIsLoading(false);
            return;
        }
        if (selectedParticipants.length === 0) {
            toast.error('참여자를 1명 이상 선택해주세요.', { id: toastId });
            setIsLoading(false);
            return;
        }

        const result = await createGroupChat(roomName, selectedParticipants);
        
        if (result?.error) {
            toast.error(`생성 실패: ${result.error}`, { id: toastId });
        } else {
            toast.success('채팅방이 성공적으로 생성되었습니다.', { id: toastId });
            onClose(true);
        }
        setIsLoading(false);
    };

    const filteredEmployees = allEmployees.filter(emp =>
        emp.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <form action={handleFormAction}>
                    <div className="p-6 border-b"><div className="flex justify-between items-center"><h2 className="text-xl font-bold text-gray-800">새 채팅방 만들기</h2><button type="button" onClick={() => onClose(false)} className="p-1 rounded-full text-gray-500 hover:bg-gray-100"><XIcon /></button></div></div>
                    <div className="p-6 space-y-6">
                        <div>
                            <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 mb-1">채팅방 이름</label>
                            <input id="roomName" name="roomName" type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="예: 3분기 워크샵 준비" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">참여자 선택</label>
                             <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md mb-3" placeholder="이름으로 검색..." />
                            <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-2">
                                {filteredEmployees.map(employee => (
                                    <div key={employee.id} className="flex items-center justify-between p-2 rounded-md">
                                        <div><p className="font-medium">{employee.full_name}</p><p className="text-sm text-gray-500">{employee.position}</p></div>
                                        <input type="checkbox" name="participants" value={employee.id} className="h-5 w-5 rounded text-blue-600 border-gray-300" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-gray-50 border-t rounded-b-lg"><button type="submit" disabled={isLoading} className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400">{isLoading ? '생성 중...' : '만들기'}</button></div>
                </form>
            </div>
        </div>
    );
}