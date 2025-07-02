"use client";

import { useState } from 'react';
import UserModal from '@/components/UserModal';
// ★ 경로 수정: src/actions/userActions.js 파일을 가리킵니다.
import { addUserAction, updateUserAction } from '@/actions/userActions';

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
                setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...formData, name: formData.full_name } : u));
                alert('성공적으로 수정되었습니다.');
            } else {
                const result = await addUserAction(formData);
                if (result.error) throw new Error(result.error);
                const newUser = { ...result.data };
                setUsers([newUser, ...users]);
                alert('신규 직원이 성공적으로 추가되었습니다.');
            }
            handleCloseModal();
        } catch (error) {
            alert(`오류 발생: ${error.message}`);
        }
    };
    
    const filteredUsers = users.filter(u => 
        (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <header className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold">사용자 관리</h1>
                <button onClick={() => handleOpenModal(null)} className="bg-blue-600 text-white font-bold py-2 px-5 rounded-lg shadow-sm">신규 직원 추가</button>
            </header>
            <div className="mb-4"><input type="text" placeholder="이름 또는 이메일로 검색..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full max-w-sm p-2 border rounded-lg" /></div>
            <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-sm">
                    <thead><tr>{['이름', '부서', '직급', '이메일', '연락처', '상태', '관리'].map(h => <th key={h} className="p-3 text-left font-semibold text-gray-600">{h}</th>)}</tr></thead>
                    <tbody>
                        {filteredUsers.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="p-3 font-bold text-gray-800">{user.name}</td><td>{user.department}</td><td>{user.position}</td><td>{user.email}</td><td>{user.phone}</td><td>{user.status}</td>
                                <td><button onClick={() => handleOpenModal(user)} className="text-blue-600 hover:underline font-medium">수정</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && <UserModal userToEdit={editingUser} onClose={handleCloseModal} onSave={handleSaveUser} />}
        </div>
    );
}