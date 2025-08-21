// 파일 경로: src/app/(admin)/resources/page.jsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { deleteResource } from '@/actions/resourceActions';
import { revalidatePath } from 'next/cache';

async function ResourceDeleteButton({ id, path }) {
    const deleteAction = async () => {
        "use server";
        await deleteResource(id, path);
        revalidatePath('/admin/resources'); // 경로 재검증
    };
    return (
        <form action={deleteAction}>
            <button type="submit" className="text-red-600 hover:text-red-900">삭제</button>
        </form>
    );
}

export default async function ManageResourcesPage() {
    const supabase = createServerComponentClient({ cookies });
    const { data: resources } = await supabase.from('resources').select('*').order('created_at', { ascending: false });

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">자료실 관리</h1>
                    <p className="text-gray-600 mt-2">등록된 자료를 관리하고 새 자료를 추가합니다.</p>
                </div>
                <Link href="/admin/resources/new" className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-indigo-700 transition">
                    + 새 자료 추가
                </Link>
            </div>
            
            <div className="overflow-x-auto bg-white rounded-lg shadow border">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">자료명</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">분류</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">생성일</th>
                            <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {resources?.map((resource) => (
                            <tr key={resource.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{resource.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{resource.category}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(resource.created_at).toLocaleDateString('ko-KR')}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                    {/* 수정 기능은 추후 구현 */}
                                    <span className="text-gray-300">수정</span>
                                    <ResourceDeleteButton id={resource.id} path={resource.file_path} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}