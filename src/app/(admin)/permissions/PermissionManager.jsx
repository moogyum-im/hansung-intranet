'use client';

import { useState } from 'react';
import { grantPermissionAction, revokePermissionAction } from '@/actions/permissionsActions';
import { toast } from 'react-hot-toast';

export default function PermissionManager({ initialUsers, boards }) {
    const [users, setUsers] = useState(initialUsers);
    const [loadingStates, setLoadingStates] = useState({});

    const handlePermissionChange = async (userId, boardId, hasPermission) => {
        const loadingKey = `${userId}-${boardId}`;
        setLoadingStates(prev => ({ ...prev, [loadingKey]: true }));

        const result = hasPermission
            ? await revokePermissionAction(userId, boardId)
            : await grantPermissionAction(userId, boardId);

        if (result.error) {
            toast.error(result.error);
        } else {
            setUsers(currentUsers => currentUsers.map(user => {
                if (user.id === userId) {
                    const newPermissionIds = hasPermission
                        ? user.permissionIds.filter(id => id !== boardId)
                        : [...user.permissionIds, boardId];
                        
                    return { ...user, permissionIds: newPermissionIds };
                }
                return user;
            }));
            toast.success("권한이 성공적으로 변경되었습니다.");
        }
        
        setLoadingStates(prev => ({ ...prev, [loadingKey]: false }));
    };

    return (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">사용자</th>
                            {boards.map(board => (
                                <th key={board.id} scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{board.name}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map(user => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                                    <div className="text-sm text-gray-500">{user.email}</div>
                                </td>
                                {boards.map(board => {
                                    const hasPermission = user.permissionIds.includes(board.id);
                                    const loadingKey = `${user.id}-${board.id}`;
                                    const isLoading = loadingStates[loadingKey];
                                    return (
                                        <td key={board.id} className="px-6 py-4 whitespace-nowrap text-center">
                                            <button
                                                onClick={() => handlePermissionChange(user.id, board.id, hasPermission)}
                                                disabled={isLoading}
                                                className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-colors w-24 ${isLoading ? 'bg-gray-200 cursor-wait' : hasPermission ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
                                            >
                                                {isLoading ? '변경 중...' : hasPermission ? '권한 있음' : '권한 없음'}
                                            </button>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}