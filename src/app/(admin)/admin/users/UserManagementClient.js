"use client";

import { useState } from 'react';
import UserModal from '@/components/UserModal';
import { addUserAction, updateUserAction, deleteUserAction } from '@/actions/userActions';

export default function UserManagementClient({ initialUsers }) {
    const [users, setUsers] = useState(initialUsers || []);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const handleOpenModal = (user = null) => { setEditingUser(user); setIsModalOpen(true); };
    const handleCloseModal = () => { setIsModalOpen(false); setEditingUser(null); };

    const handleSaveUser = async (formData) => {
        try {
            if (editingUser) {
                const result = await updateUserAction(editingUser.id, formData);
                if (result.error) throw new Error(result.error);
                // [수정] page.js의 데이터 형식('name')에 맞게 상태를 업데이트합니다.
                setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...formData, name: formData.full_name } : u));
                alert('성공적으로 수정되었습니다.');
            } else {
                const result = await addUserAction(formData);
                if (result.error) throw new Error(result.error);
                // [수정] page.js의 데이터 형식('name')에 맞게 새 사용자 객체를 만듭니다.
                const newUser = { ...formData, id: result.data.id, email: result.data.email, name: formData.full_name };
                setUsers([newUser, ...users]);
                alert('신규 직원이 성공적으로 추가되었습니다.');
            }
            handleCloseModal();
        } catch (error) {
            alert(`오류 발생: ${error.message}`);
        }
    };
    
    const handleDeleteUser = async (userId, userName) => {
        if (window.confirm(`${userName} 님을 정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
            try {
                const result = await deleteUserAction(userId);
                if (result.error) throw new Error(result.error);
                setUsers(users.filter(u => u.id !== userId));
                alert(`${userName} 님이 성공적으로 삭제되었습니다.`);
            } catch (error) {
                alert(`삭제 중 오류 발생: ${error.message}`);
            }
        }
    };
    
    // [수정] 검색 필드를 'name' 기준으로 변경합니다.
    const filteredUsers = users.filter(u => 
        (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <header className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-gray-900">사용자 관리</h1>
                <button onClick={() => handleOpenModal(null)} className="bg-blue-600 text-white font-bold py-2 px-5 rounded-lg shadow hover:bg-blue-700 transition-colors">신규 직원 추가</button>
            </header>
            <div className="mb-4">
                <input 
                    type="text" 
                    placeholder="이름 또는 이메일로 검색..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="w-full max-w-sm p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                />
            </div>
            <div className="bg-white rounded-lg shadow-md overflow-x-auto border border-gray-200">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                        <tr>
                            {['이름', '부서', '직급', '이메일', '연락처', '상태', '관리'].map(h => 
                                <th key={h} scope="col" className="py-3 px-6">{h}</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(user => (
                            <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                                {/* --- [최종 수정] user.full_name -> user.name 으로 변경 --- */}
                                <td className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap">{user.name}</td>
                                <td className="py-4 px-6">{user.department}</td>
                                <td className="py-4 px-6">{user.position}</td>
                                <td className="py-4 px-6">{user.email}</td>
                                <td className="py-4 px-6">{user.phone}</td>
                                <td className="py-4 px-6">{user.status}</td>
                                <td className="py-4 px-6">
                                    <div className="flex gap-4">
                                        <button onClick={() => handleOpenModal(user)} className="font-medium text-blue-600 hover:underline">수정</button>
                                        <button onClick={() => handleDeleteUser(user.id, user.name)} className="font-medium text-red-600 hover:underline">삭제</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && <UserModal userToEdit={editingUser} onClose={handleCloseModal} onSave={handleSaveUser} />}
        </div>
    );
}