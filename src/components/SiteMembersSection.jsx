// 파일 경로: src/components/SiteMembersSection.jsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { useEmployee } from '@/contexts/EmployeeContext';

// ★★★ 누락되었던 InviteMemberModal 컴포넌트 정의를 여기에 추가합니다. ★★★
function InviteMemberModal({ isOpen, onClose, siteId, currentMembers, onMembersInvited }) {
    const supabase = createClient();
    const [allUsers, setAllUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        
        async function fetchUsers() {
            setLoading(true);
            const currentMemberIds = currentMembers.map(m => m.id);
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, department')
                .not('id', 'in', `(${currentMemberIds.join(',')})`); // 현재 멤버는 제외

            if (error) {
                console.error("초대할 사용자 목록 조회 실패:", error);
            } else {
                setAllUsers(data || []);
            }
            setLoading(false);
        }
        fetchUsers();
    }, [isOpen, currentMembers, supabase]);

    const handleUserSelect = (userId) => {
        setSelectedUsers(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleInvite = async () => {
        if (selectedUsers.length === 0) {
            alert("초대할 사용자를 선택해주세요.");
            return;
        }
        
        const membersToInsert = selectedUsers.map(userId => ({
            site_id: siteId,
            user_id: userId,
            role: '멤버' // 기본 역할은 '멤버'
        }));

        const { error } = await supabase.from('site_members').insert(membersToInsert);

        if (error) {
            alert("멤버 초대에 실패했습니다: " + error.message);
        } else {
            alert("멤버가 성공적으로 초대되었습니다.");
            onMembersInvited(); // 멤버 목록 새로고침
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">새 멤버 초대</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800">×</button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {loading ? <p>사용자 목록 로딩 중...</p> : 
                     allUsers.length === 0 ? <p>초대할 수 있는 사용자가 없습니다.</p> :
                     (
                        <div className="space-y-2">
                            {allUsers.map(user => (
                                <div key={user.id} className="flex items-center p-2 rounded-md hover:bg-gray-100 cursor-pointer" onClick={() => handleUserSelect(user.id)}>
                                    <input
                                        type="checkbox"
                                        id={`user-${user.id}`}
                                        checked={selectedUsers.includes(user.id)}
                                        readOnly
                                        className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                    />
                                    <label htmlFor={`user-${user.id}`} className="ml-3 text-sm text-gray-700 cursor-pointer">
                                        {user.full_name} <span className="text-gray-500">({user.department})</span>
                                    </label>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="px-6 py-4 flex justify-end gap-4 bg-gray-50">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">취소</button>
                    <button onClick={handleInvite} className="px-4 py-2 bg-blue-600 text-white rounded-lg">초대하기</button>
                </div>
            </div>
        </div>
    );
}

// 멤버 관리 드롭다운 메뉴
const MemberActionsDropdown = ({ member, isCurrentUserPM, onRoleChange, onRemoveMember }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleRoleChange = (newRole) => {
        onRoleChange(member.id, newRole);
        setIsOpen(false);
    };
    
    if (!isCurrentUserPM || member.role === 'PM') {
        return null; 
    }

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <div>
                <button onClick={() => setIsOpen(!isOpen)} type="button" className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                    관리
                    <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                        <button onClick={() => handleRoleChange(member.role === '멤버' ? '관리자' : '멤버')} className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            {member.role === '멤버' ? '관리자로 지정' : '멤버로 변경'}
                        </button>
                        <button onClick={() => onRemoveMember(member.id)} className="w-full text-left block px-4 py-2 text-sm text-red-700 hover:bg-red-50">
                            현장에서 내보내기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// 메인 참여자 관리 섹션 컴포넌트
export default function SiteMembersSection({ siteId }) {
    const supabase = createClient();
    const { employee: currentUser } = useEmployee();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const isCurrentUserPM = members.find(m => m.id === currentUser?.id)?.role === 'PM';

    const fetchMembers = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('site_members')
            .select('role, profiles (id, full_name, department, email)')
            .eq('site_id', siteId);

        if (error) {
            console.error("멤버 목록 조회 실패:", error);
        } else {
            const formattedData = data.map(item => ({ ...item.profiles, role: item.role }));
            setMembers(formattedData);
        }
        setLoading(false);
    }, [siteId, supabase]);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    const handleRoleChange = async (memberId, newRole) => {
        const { error } = await supabase
            .from('site_members')
            .update({ role: newRole })
            .eq('site_id', siteId)
            .eq('user_id', memberId);

        if (error) {
            alert('역할 변경에 실패했습니다: ' + error.message);
        } else {
            alert('역할이 성공적으로 변경되었습니다.');
            fetchMembers(); 
        }
    };

    const onRemoveMember = async (memberId) => {
        const memberToRemove = members.find(m => m.id === memberId);
        if (confirm(`정말로 '${memberToRemove.full_name}'님을 현장에서 내보내시겠습니까?`)) {
            const { error } = await supabase
                .from('site_members')
                .delete()
                .eq('site_id', siteId)
                .eq('user_id', memberId);

            if (error) {
                alert('멤버 내보내기에 실패했습니다: ' + error.message);
            } else {
                alert('멤버를 현장에서 내보냈습니다.');
                fetchMembers();
            }
        }
    };

    if (loading) return <p>참여자 목록을 불러오는 중입니다...</p>;

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">참여자 목록 ({members.length}명)</h3>
                {isCurrentUserPM && ( 
                    <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                        + 멤버 초대
                    </button>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">부서</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">역할</th>
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">관리</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {members.map(member => (
                            <tr key={member.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{member.full_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.department}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                     <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        member.role === 'PM' ? 'bg-green-100 text-green-800' :
                                        member.role === '관리자' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-gray-100 text-gray-800'
                                     }`}>
                                        {member.role}
                                     </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <MemberActionsDropdown 
                                        member={member} 
                                        isCurrentUserPM={isCurrentUserPM}
                                        onRoleChange={handleRoleChange}
                                        onRemoveMember={onRemoveMember}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <InviteMemberModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                siteId={siteId}
                currentMembers={members}
                onMembersInvited={fetchMembers}
            />
        </div>
    );
}