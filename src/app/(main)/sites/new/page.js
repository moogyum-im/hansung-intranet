// 파일 경로: src/app/(main)/sites/new/page.js
'use client';

import { useState, useEffect } from 'react';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '../../../../lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

// 현장 생성 페이지용 참여자 추가 모달 (재사용성을 위해 별도 컴포넌트화)
const NewSiteAddMemberModal = ({ isOpen, onClose, allUsers, currentSelectedMemberIds, onAdd }) => {
    const [selectedMemberId, setSelectedMemberId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    if (!isOpen) return null;

    const availableUsers = allUsers.filter(user => 
        !currentSelectedMemberIds.includes(user.id) && // 이미 추가된 멤버 제외
        (user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
         user.department.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleAdd = () => {
        if (selectedMemberId) {
            const userToAdd = allUsers.find(u => u.id === selectedMemberId);
            onAdd(userToAdd); // 선택된 사용자 객체를 부모로 전달
            setSelectedMemberId('');
            setSearchQuery('');
        } else {
            toast.error('추가할 참여자를 선택해주세요.');
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">참여자 추가</h2>
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="이름 또는 부서로 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full p-2 border rounded-md mb-2"
                    />
                    <select
                        value={selectedMemberId}
                        onChange={(e) => setSelectedMemberId(e.target.value)}
                        className="w-full p-2 border rounded-md"
                    >
                        <option value="">-- 참여자 선택 --</option>
                        {availableUsers.map(user => (
                            <option key={user.id} value={user.id}>
                                {user.full_name} ({user.department})
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex justify-end space-x-4">
                    <button onClick={onClose} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">
                        취소
                    </button>
                    <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        추가
                    </button>
                </div>
            </div>
        </div>
    );
};


export default function NewSitePageFinal() {
    const router = useRouter();
    const { employee } = useEmployee();

    const [formData, setFormData] = useState({
        name: '', site_type: '건축', contract_type: '도급', address: '',
        client: '', budget: null, start_date: '', end_date: '',
        description: '', pm_id: '',
        status: '진행중', // ★★★ 상태 추가 ★★★
        progress: 0,     // ★★★ 공정률 추가 (기본값 0) ★★★
    });

    const [allUsers, setAllUsers] = useState([]);
    const [selectedMembers, setSelectedMembers] = useState([]); // ★★★ 선택된 참여자 목록 ★★★
    const [isLoading, setIsLoading] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);

    useEffect(() => {
        async function fetchUsers() {
            const { data, error } = await supabase.from('profiles').select('id, full_name, department, position');
            if (error) {
                console.error("사용자 목록 조회 실패:", error);
                toast.error("사용자 목록을 불러오는데 실패했습니다.");
            } else {
                setAllUsers(data || []);
            }
        }
        fetchUsers();
    }, []);

    // PM 선택 시 selectedMembers에 자동으로 추가
    useEffect(() => {
        if (formData.pm_id) {
            const pmUser = allUsers.find(user => user.id === formData.pm_id);
            if (pmUser && !selectedMembers.some(member => member.id === pmUser.id)) {
                // PM이 이미 멤버에 없으면 추가
                setSelectedMembers(prev => [...prev, { ...pmUser, role: '현장소장' }]);
            } else if (pmUser) {
                // PM이 이미 멤버에 있으면 역할만 업데이트
                setSelectedMembers(prev => prev.map(member => 
                    member.id === pmUser.id ? { ...member, role: '현장소장' } : member
                ));
            }
        } else {
            // PM 선택 해제 시, PM이었던 멤버의 역할 초기화 또는 제거 (여기서는 역할 초기화)
            setSelectedMembers(prev => prev.map(member => 
                member.role === '현장소장' ? { ...member, role: '현장멤버' } : member
            ).filter(member => member.id !== employee.id || formData.pm_id)); // PM이 해제되면 생성자가 PM이 아닌 이상 일반 멤버로 남김
        }
    }, [formData.pm_id, allUsers, employee.id]);

    // 현장 생성자는 기본적으로 멤버로 추가
    useEffect(() => {
        if (employee && employee.id && allUsers.length > 0) {
            const creatorUser = allUsers.find(user => user.id === employee.id);
            if (creatorUser && !selectedMembers.some(member => member.id === creatorUser.id)) {
                setSelectedMembers(prev => [...prev, { ...creatorUser, role: '현장멤버' }]);
            }
        }
    }, [employee, allUsers, selectedMembers]);


    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: (name === 'budget' || name === 'progress') ? (value ? parseInt(value) : null) : value 
        }));
    };

    const handleAddMember = (userToAdd) => {
        // PM으로 이미 지정된 사람은 '현장소장' 역할을 유지하고, 나머지는 '현장멤버'로 추가
        const role = userToAdd.id === formData.pm_id ? '현장소장' : '현장멤버';
        setSelectedMembers(prev => [...prev, { ...userToAdd, role }]);
        setShowAddMemberModal(false);
    };

    const handleRemoveMember = (memberIdToRemove) => {
        // PM을 삭제할 경우 formData.pm_id도 초기화
        if (formData.pm_id === memberIdToRemove) {
            setFormData(prev => ({ ...prev, pm_id: '' }));
        }
        setSelectedMembers(prev => prev.filter(member => member.id !== memberIdToRemove));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!employee || !employee.id) {
            toast.error('로그인 정보가 유효하지 않습니다. 다시 로그인해주세요.');
            return;
        }
        if (!formData.name.trim()) {
            toast.error('현장 이름은 필수 항목입니다.'); return;
        }

        setIsLoading(true);

        try {
            // 최종 member_ids 배열 구성
            const finalMemberIds = Array.from(new Set(selectedMembers.map(m => m.id))); // 중복 제거

            const { data, error } = await supabase.rpc('create_new_site_and_add_members', {
                form_data: formData,
                creator_id: employee.id,
                member_ids: finalMemberIds, // ★★★ 업데이트된 참여자 ID 배열 ★★★
            });

            if (error) {
                console.error("현장 생성 RPC 에러:", error);
                throw error;
            }

            toast.success('새로운 현장이 성공적으로 생성되었습니다!');
            router.push(`/sites/${data}`);

        } catch (error) {
            toast.error('현장 생성에 실패했습니다: ' + error.message);
            console.error('현장 생성 실패 상세:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 현재 선택된 멤버 ID 목록 (모달에서 이미 선택된 멤버 제외하기 위함)
    const currentSelectedMemberIds = selectedMembers.map(m => m.id);

    return (
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    {/* 페이지 헤더 */}
                    <div className="pb-8 border-b border-gray-200">
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">새 현장 생성</h1>
                        <p className="mt-2 text-sm text-gray-500">새로운 건설 또는 조경 현장 정보를 체계적으로 등록합니다.</p>
                    </div>

                    <div className="mt-8 space-y-8">
                        {/* 기본 정보 패널 */}
                        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl">
                            <div className="p-6">
                                <h2 className="text-base font-semibold leading-7 text-gray-900">기본 정보</h2>
                                <p className="mt-1 text-sm leading-6 text-gray-600">현장의 이름, 유형 등 핵심 정보를 입력합니다.</p>
                                <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                                    <div className="sm:col-span-3">
                                        <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">현장 이름 <span className="text-red-500">*</span></label>
                                        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500" required />
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label htmlFor="client" className="block text-sm font-medium leading-6 text-gray-900">발주처</label>
                                        <input type="text" name="client" id="client" value={formData.client} onChange={handleChange} className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500" />
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label htmlFor="site_type" className="block text-sm font-medium leading-6 text-gray-900">공사 구분</label>
                                        <select name="site_type" id="site_type" value={formData.site_type} onChange={handleChange} className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500">
                                            <option>건축</option> <option>토목</option> <option>조경</option> <option>인테리어</option> <option>기타</option>
                                        </select>
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label htmlFor="contract_type" className="block text-sm font-medium leading-6 text-gray-900">계약 형태</label>
                                        <select name="contract_type" id="contract_type" value={formData.contract_type} onChange={handleChange} className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500">
                                            <option>도급</option> <option>관급</option> <option>자체 사업</option>
                                        </select>
                                    </div>
                                    <div className="col-span-full">
                                        <label htmlFor="address" className="block text-sm font-medium leading-6 text-gray-900">현장 주소</label>
                                        <input type="text" name="address" id="address" value={formData.address} onChange={handleChange} className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 기간 및 담당자 패널 */}
                        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl">
                             <div className="p-6">
                                <h2 className="text-base font-semibold leading-7 text-gray-900">기간 및 담당자</h2>
                                <p className="mt-1 text-sm leading-6 text-gray-600">공사 기간과 책임자를 지정합니다.</p>
                                <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                                    <div className="sm:col-span-3">
                                        <label htmlFor="start_date" className="block text-sm font-medium leading-6 text-gray-900">착공일</label>
                                        <input type="date" name="start_date" id="start_date" value={formData.start_date} onChange={handleChange} className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500" />
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label htmlFor="end_date" className="block text-sm font-medium leading-6 text-gray-900">준공일</label>
                                        <input type="date" name="end_date" id="end_date" value={formData.end_date} onChange={handleChange} className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500" />
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label htmlFor="pm_id" className="block text-sm font-medium leading-6 text-gray-900">현장 소장 (PM)</label>
                                        <select name="pm_id" id="pm_id" value={formData.pm_id} onChange={handleChange} className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500">
                                            <option value="">-- 담당자 선택 --</option>
                                            {allUsers.map(user => (
                                                <option key={user.id} value={user.id}>{user.full_name} ({user.department})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label htmlFor="budget" className="block text-sm font-medium leading-6 text-gray-900">총 예산 (원)</label>
                                        <input type="number" name="budget" id="budget" value={formData.budget || ''} onChange={handleChange} className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500" placeholder="숫자만 입력" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 진행 현황 패널 (새로 추가) */}
                        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl">
                            <div className="p-6">
                                <h2 className="text-base font-semibold leading-7 text-gray-900">진행 현황</h2>
                                <p className="mt-1 text-sm leading-6 text-gray-600">현장의 초기 상태 및 공정률을 설정합니다.</p>
                                <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                                    <div className="sm:col-span-3">
                                        <label htmlFor="status" className="block text-sm font-medium leading-6 text-gray-900">상태</label>
                                        <select name="status" id="status" value={formData.status} onChange={handleChange} className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500">
                                            <option value="진행중">진행중</option>
                                            <option value="완료">완료</option>
                                            <option value="보류">보류</option>
                                            <option value="중단">중단</option>
                                        </select>
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label htmlFor="progress" className="block text-sm font-medium leading-6 text-gray-900">공정률 ({formData.progress || 0}%)</label>
                                        <input
                                            type="range"
                                            name="progress"
                                            id="progress"
                                            min="0"
                                            max="100"
                                            value={formData.progress || 0}
                                            onChange={handleChange}
                                            className="mt-2 block w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer range-lg dark:bg-gray-700"
                                        />
                                        <div className="text-right text-xs text-gray-500 mt-1">{formData.progress || 0}%</div>
                                    </div>
                                </div>
                            </div>
                        </div>


                        {/* 참여자 목록 패널 (새로 추가) */}
                        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl">
                            <div className="p-6">
                                <h2 className="text-base font-semibold leading-7 text-gray-900">참여자 목록</h2>
                                <p className="mt-1 text-sm leading-6 text-gray-600">현장에 참여할 인원들을 추가합니다. (PM 포함)</p>
                                <div className="mt-6">
                                    {selectedMembers.length > 0 ? (
                                        <ul className="divide-y divide-gray-200 border rounded-md p-2">
                                            {selectedMembers.map(member => (
                                                <li key={member.id} className="flex items-center justify-between py-2 px-3">
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {member.full_name} ({member.department}) - {member.role}
                                                    </span>
                                                    {/* 생성자는 삭제 불가 (최소 1명 유지) */}
                                                    {member.id !== employee.id && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveMember(member.id)}
                                                            className="text-red-600 hover:text-red-800 text-sm ml-4"
                                                        >
                                                            삭제
                                                        </button>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-gray-500">추가된 참여자가 없습니다.</p>
                                    )}
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setShowAddMemberModal(true)}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-semibold"
                                        >
                                            + 참여자 추가
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>


                        {/* 개요 및 특이사항 패널 */}
                        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl">
                            <div className="p-6">
                                <h2 className="text-base font-semibold leading-7 text-gray-900">개요 및 특이사항</h2>
                                <p className="mt-1 text-sm leading-6 text-gray-600">현장에 대한 상세 설명이나 전달 사항을 입력합니다.</p>
                                <div className="mt-6">
                                    <textarea name="description" id="description" value={formData.description} onChange={handleChange} rows={5} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 참여자 추가 모달 */}
            <NewSiteAddMemberModal
                isOpen={showAddMemberModal}
                onClose={() => setShowAddMemberModal(false)}
                allUsers={allUsers}
                currentSelectedMemberIds={currentSelectedMemberIds}
                onAdd={handleAddMember}
            />

            {/* 하단 고정 버튼 영역 */}
            <div className="flex-shrink-0 px-8 py-4 border-t border-gray-200 bg-white flex justify-end gap-x-4">
                <Link href="/sites" className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                    취소
                </Link>
                <button type="submit" disabled={isLoading} className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:bg-green-300">
                    {isLoading ? '생성 중...' : '현장 생성하기'}
                </button>
            </div>
        </form>
    );
}