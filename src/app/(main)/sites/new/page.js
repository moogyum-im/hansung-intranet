// 파일 경로: src/app/(main)/sites/new/page.js
'use client';

import { useState, useEffect } from 'react';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '../../../../lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewSitePageFinal() {

    const router = useRouter();
    const { employee } = useEmployee();

    const [formData, setFormData] = useState({
        name: '', site_type: '건축', contract_type: '도급', address: '',
        client: '', budget: '', start_date: '', end_date: '',
        description: '', pm_id: ''
    });

    const [allUsers, setAllUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        async function fetchUsers() {
            const { data, error } = await supabase.from('profiles').select('id, full_name, department');
            if (error) console.error("사용자 목록 조회 실패:", error);
            else setAllUsers(data || []);
        }
        fetchUsers();
    }, [supabase]);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? (value ? parseInt(value) : '') : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!employee || !employee.id) {
            alert('로그인 정보가 유효하지 않습니다. 다시 로그인해주세요.');
            return;
        }
        if (!formData.name.trim()) {
            alert('현장 이름은 필수 항목입니다.'); return;
        }
        setIsLoading(true);

        try {
            // ★★★ 데이터베이스 함수(RPC)를 호출하는 방식으로 변경 ★★★
            const { data, error } = await supabase.rpc('create_new_site_and_add_members', {
                form_data: formData,
                creator_id: employee.id
            });

            if (error) throw error;

            alert('새로운 현장이 성공적으로 생성되었습니다!');
            router.push(`/sites/${data}`); // 함수는 생성된 현장의 ID를 반환합니다.

        } catch (error) {
            alert('현장 생성에 실패했습니다: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

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
                                        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm" required />
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label htmlFor="client" className="block text-sm font-medium leading-6 text-gray-900">발주처</label>
                                        <input type="text" name="client" id="client" value={formData.client} onChange={handleChange} className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm" />
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label htmlFor="site_type" className="block text-sm font-medium leading-6 text-gray-900">공사 구분</label>
                                        <select name="site_type" id="site_type" value={formData.site_type} onChange={handleChange} className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm">
                                            <option>건축</option> <option>토목</option> <option>조경</option> <option>인테리어</option> <option>기타</option>
                                        </select>
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label htmlFor="contract_type" className="block text-sm font-medium leading-6 text-gray-900">계약 형태</label>
                                        <select name="contract_type" id="contract_type" value={formData.contract_type} onChange={handleChange} className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm">
                                            <option>도급</option> <option>관급</option> <option>자체 사업</option>
                                        </select>
                                    </div>
                                    <div className="col-span-full">
                                        <label htmlFor="address" className="block text-sm font-medium leading-6 text-gray-900">현장 주소</label>
                                        <input type="text" name="address" id="address" value={formData.address} onChange={handleChange} className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm" />
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
                                        <input type="date" name="start_date" id="start_date" value={formData.start_date} onChange={handleChange} className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm" />
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label htmlFor="end_date" className="block text-sm font-medium leading-6 text-gray-900">준공일</label>
                                        <input type="date" name="end_date" id="end_date" value={formData.end_date} onChange={handleChange} className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm" />
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label htmlFor="pm_id" className="block text-sm font-medium leading-6 text-gray-900">현장 소장 (PM)</label>
                                        <select name="pm_id" id="pm_id" value={formData.pm_id} onChange={handleChange} className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm">
                                            <option value="">-- 담당자 선택 --</option>
                                            {allUsers.map(user => (
                                                <option key={user.id} value={user.id}>{user.full_name} ({user.department})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="sm:col-span-3">
                                        <label htmlFor="budget" className="block text-sm font-medium leading-6 text-gray-900">총 예산 (원)</label>
                                        <input type="number" name="budget" id="budget" value={formData.budget} onChange={handleChange} className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm" placeholder="숫자만 입력" />
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
                                    <textarea name="description" id="description" value={formData.description} onChange={handleChange} rows={5} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

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