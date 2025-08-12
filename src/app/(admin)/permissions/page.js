import { getUsersWithPermissions, getAllBoards } from '@/actions/permissionsActions';
import PermissionManager from './PermissionManager';

export default async function PermissionManagementPage() {
    const { users, error: usersError } = await getUsersWithPermissions();
    const { boards, error: boardsError } = await getAllBoards();

    if (usersError || boardsError) {
        return <div className="p-8 text-center text-red-500">데이터를 불러오는 중 오류가 발생했습니다: {usersError || boardsError}</div>;
    }
    
    if (!users || !boards) {
        return <div className="p-8 text-center">사용자 또는 게시판 정보를 찾을 수 없습니다.</div>;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <header className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">DB 게시판 접근 권한 관리</h1>
                <p className="mt-2 text-sm text-gray-600">사용자별로 접근 가능한 DB 게시판을 설정합니다.</p>
            </header>
            
            <PermissionManager initialUsers={users} boards={boards} />
        </div>
    );
}