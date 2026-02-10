'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useEmployee } from '../../../../contexts/EmployeeContext'; 
import { supabase } from '../../../../lib/supabase/client';
import { notFound, useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import DailyReportSection from '@/components/DailyReportSection'; 
import SiteDocumentsSection from '@/components/SiteDocumentsSection';
import SiteMembersSection from '@/components/SiteMembersSection'; 
import { toast } from 'react-hot-toast';

// 현장 상세 정보 수정 폼 컴포넌트
const SiteEditForm = ({ site, allUsers, onSave, onCancel, isSaving }) => {
    const [formData, setFormData] = useState({
        name: site.name || '',
        site_type: site.site_type || '조경',
        contract_type: site.contract_type || '도급',
        address: site.address || '',
        client: site.client || '',
        budget: site.budget || null,
        start_date: site.start_date || '',
        end_date: site.end_date || '',
        description: site.description || '',
        pm_id: site.pm_id || '',
        staff_id: site.staff_id || '',
        status: site.status || '진행중', 
        progress_plant: site.progress_plant || 0,
        progress_facility: site.progress_facility || 0,
        // UI용 임시 상태 (일보 설정과 연동됨)
        is_plant_active: site.is_plant_active ?? true,
        is_facility_active: site.is_facility_active ?? true
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (name === 'budget' || name.includes('progress') ? (value ? parseFloat(value) : 0) : value)
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // 🚀 UUID 에러 방지: 빈 문자열을 null로 변환
        const submissionData = {
            ...formData,
            pm_id: formData.pm_id === "" ? null : formData.pm_id,
            staff_id: formData.staff_id === "" ? null : formData.staff_id
        };
        onSave(submissionData);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-10 rounded-xl shadow-lg border border-gray-100 animate-fade-in font-sans">
            <h1 className="text-2xl font-bold text-center mb-8 text-gray-800">현장 정보 수정</h1>
            
            <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <tbody>
                        <tr className="border-b border-gray-200">
                            <th className="p-3 bg-gray-50 font-semibold w-1/5 text-left border-r border-gray-200 text-gray-700">현장 이름 <span className="text-red-500">*</span></th>
                            <td className="p-3 w-2/5 border-r border-gray-200">
                                <input type="text" name="name" value={formData.name} onChange={handleChange} required
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-800 transition-all" />
                            </td>
                            <th className="p-3 bg-gray-50 font-semibold w-1/5 text-left border-r border-gray-200 text-gray-700">발주처</th>
                            <td className="p-3">
                                <input type="text" name="client" value={formData.client} onChange={handleChange}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-800 transition-all" />
                            </td>
                        </tr>
                        <tr className="border-b border-gray-200">
                            <th className="p-3 bg-gray-50 font-semibold text-left border-r border-gray-200 text-gray-700">공사 구분</th>
                            <td className="p-3 border-r border-gray-200">
                                <select name="site_type" value={formData.site_type} onChange={handleChange}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-800">
                                    <option>조경</option> <option>건축</option> <option>토목</option> <option>인테리어</option> <option>기타</option>
                                </select>
                            </td>
                            <th className="p-3 bg-gray-50 font-semibold text-left border-r border-gray-200 text-gray-700">계약 형태</th>
                            <td className="p-3">
                                <select name="contract_type" value={formData.contract_type} onChange={handleChange}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-800">
                                    <option>도급</option> <option>관급</option> <option>자체 사업</option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <th className="p-3 bg-gray-50 font-semibold text-left border-r border-gray-200 text-gray-700">현장 주소</th>
                            <td className="p-3" colSpan="3">
                                <input type="text" name="address" value={formData.address} onChange={handleChange}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-800 transition-all" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden">
                <h2 className="p-3 bg-gray-100 font-bold border-b border-gray-200 text-gray-800">공사 관리 및 담당자</h2>
                <div className="p-4 grid grid-cols-2 gap-6 text-sm">
                    <div>
                        <label className="block text-gray-700 font-medium mb-1">현장 소장 (PM)</label>
                        <select name="pm_id" value={formData.pm_id} onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-800">
                            <option value="">-- 소장 선택 --</option>
                            {allUsers.map(user => (
                                <option key={user.id} value={user.id}>{user.full_name} ({user.department})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-700 font-medium mb-1">현장 담당자</label>
                        <select name="staff_id" value={formData.staff_id} onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-800">
                            <option value="">-- 담당자 선택 --</option>
                            {allUsers.map(user => (
                                <option key={user.id} value={user.id}>{user.full_name} ({user.department})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-700 font-medium mb-1">착공일</label>
                        <input type="date" name="start_date" value={formData.start_date} onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-800" />
                    </div>
                    <div>
                        <label className="block text-gray-700 font-medium mb-1">준공일</label>
                        <input type="date" name="end_date" value={formData.end_date} onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-800" />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-gray-700 font-medium mb-1">총 도급액 (원)</label>
                        <input type="number" name="budget" value={formData.budget || ''} onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-800 font-bold" placeholder="숫자만 입력" />
                    </div>
                </div>
            </div>

            <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden font-sans">
                <h2 className="p-3 bg-gray-100 font-bold border-b border-gray-200 text-gray-800">공종 관리 및 실시간 공정 현황</h2>
                <div className="p-4 grid grid-cols-2 gap-8 text-sm">
                    <div className="space-y-4 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-blue-700">
                            <input type="checkbox" name="is_plant_active" checked={formData.is_plant_active} onChange={handleChange} className="w-4 h-4" />
                            식재 공종 반영
                        </label>
                        <div className={formData.is_plant_active ? "opacity-100" : "opacity-30 pointer-events-none"}>
                            <label className="block text-gray-700 font-medium mb-1">식재 공정률 ({formData.progress_plant}%)</label>
                            <input type="range" name="progress_plant" min="0" max="100" step="0.1" value={formData.progress_plant} onChange={handleChange}
                                className="w-full h-2 bg-blue-500 rounded-lg appearance-none cursor-pointer" />
                        </div>
                    </div>
                    <div className="space-y-4 p-4 bg-green-50/50 rounded-lg border border-green-100">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-green-700">
                            <input type="checkbox" name="is_facility_active" checked={formData.is_facility_active} onChange={handleChange} className="w-4 h-4" />
                            시설물 공종 반영
                        </label>
                        <div className={formData.is_facility_active ? "opacity-100" : "opacity-30 pointer-events-none"}>
                            <label className="block text-gray-700 font-medium mb-1">시설물 공정률 ({formData.progress_facility}%)</label>
                            <input type="range" name="progress_facility" min="0" max="100" step="0.1" value={formData.progress_facility} onChange={handleChange}
                                className="w-full h-2 bg-green-500 rounded-lg appearance-none cursor-pointer" />
                        </div>
                    </div>
                    <div className="col-span-2">
                        <p className="text-xs text-orange-600 font-bold">* 수정 시 현장 정보가 업데이트되며, 작업일보 작성 시 일보 데이터로 덮어씌워집니다.</p>
                    </div>
                </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
                <h2 className="p-3 bg-gray-100 font-bold border-b border-gray-200 text-gray-800">개요 및 특이사항</h2>
                <div className="p-4">
                    <textarea name="description" value={formData.description} onChange={handleChange} rows={5}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-800" />
                </div>
            </div>

            <div className="mt-8 flex justify-end space-x-3">
                <button type="button" onClick={onCancel} className="px-5 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors">취소</button>
                <button type="submit" disabled={isSaving} className="px-5 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400">
                    {isSaving ? '저장 중...' : '현장 정보 저장'}
                </button>
            </div>
        </form>
    );
};

// 현장 상세 정보 읽기 전용 뷰 컴포넌트
const SiteDetailView = ({ site, onEdit, siteMembers, allUsers, onAddMember, isAddingMember, onDeleteSite }) => {
    const pm = useMemo(() => allUsers.find(user => user.id === site.pm_id), [allUsers, site.pm_id]);
    const staff = useMemo(() => allUsers.find(user => user.id === site.staff_id), [allUsers, site.staff_id]);

    const statusStyles = {
        '진행중': 'bg-blue-100 text-blue-800 ring-blue-500/10',
        '완료': 'bg-green-100 text-green-800 ring-green-500/10',
        '보류': 'bg-yellow-100 text-yellow-800 ring-yellow-500/10',
        '중단': 'bg-red-100 text-red-800 ring-red-500/10',
    };

    return (
        <div className="bg-white p-10 rounded-xl shadow-lg border border-gray-100 animate-fade-in font-sans italic-none">
            <div className="flex justify-between items-center mb-8 border-b pb-6">
                <h1 className="text-3xl font-black text-gray-900">{site.name || '현장 이름 없음'}</h1>
                <span className={`inline-flex items-center px-4 py-2 text-sm font-black rounded-full ring-1 ring-inset ${statusStyles[site.status] || 'bg-gray-100 text-gray-800 ring-gray-500/10'}`}>
                    {site.status || '진행중'}
                </span>
            </div>

            <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <tbody>
                        <tr className="border-b border-gray-200">
                            <th className="p-4 bg-gray-50 font-bold w-1/5 text-left border-r border-gray-200 text-gray-700">공사 구분 / 계약</th>
                            <td className="p-4 w-2/5 border-r border-gray-200 text-gray-800 font-bold">{site.site_type || '-'} / {site.contract_type || '-'}</td>
                            <th className="p-4 bg-gray-50 font-bold w-1/5 text-left border-r border-gray-200 text-gray-700">발주처</th>
                            <td className="p-4 text-gray-800 font-bold">{site.client || '-'}</td>
                        </tr>
                        <tr className="border-b border-gray-200">
                            <th className="p-4 bg-gray-50 font-bold text-left border-r border-gray-200 text-gray-700">현장 소장 (PM)</th>
                            <td className="p-4 border-r border-gray-200 text-blue-700 font-black text-base">{pm ? `${pm.full_name} (${pm.department})` : '-'}</td>
                            <th className="p-4 bg-gray-50 font-bold text-left border-r border-gray-200 text-gray-700">현장 담당자</th>
                            <td className="p-4 text-gray-800 font-black text-base">{staff ? `${staff.full_name} (${staff.department})` : '-'}</td>
                        </tr>
                        <tr>
                            <th className="p-4 bg-gray-50 font-bold text-left border-r border-gray-200 text-gray-700">현장 주소</th>
                            <td className="p-4 text-gray-800" colSpan="3">{site.address || '-'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* 🚀 연동된 공정률 바 표시 영역 */}
            <div className={`grid gap-6 mb-8 ${(site.is_plant_active ?? true) && (site.is_facility_active ?? true) ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {(site.is_plant_active ?? true) && (
                    <div className="p-6 border-2 border-blue-100 rounded-xl bg-blue-50/30">
                        <label className="block text-blue-800 font-black mb-3 text-sm">식재 공정률 (연동)</label>
                        <div className="flex items-end gap-3">
                            <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden border border-blue-200">
                                <div className="bg-blue-600 h-full transition-all duration-1000" style={{ width: `${site.progress_plant || 0}%` }}></div>
                            </div>
                            <span className="text-2xl font-black text-blue-700 leading-none">{site.progress_plant || 0}%</span>
                        </div>
                    </div>
                )}
                {(site.is_facility_active ?? true) && (
                    <div className="p-6 border-2 border-green-100 rounded-xl bg-green-50/30">
                        <label className="block text-green-800 font-black mb-3 text-sm">시설물 공정률 (연동)</label>
                        <div className="flex items-end gap-3">
                            <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden border border-green-200">
                                <div className="bg-green-600 h-full transition-all duration-1000" style={{ width: `${site.progress_facility || 0}%` }}></div>
                            </div>
                            <span className="text-2xl font-black text-green-700 leading-none">{site.progress_facility || 0}%</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden">
                <h2 className="p-3 bg-gray-100 font-bold border-b border-gray-200 text-gray-800">공사 일정 및 총 도급액</h2>
                <div className="p-4 grid grid-cols-3 gap-6 text-sm">
                    <div>
                        <label className="block text-gray-500 font-medium mb-1">착공일</label>
                        <p className="p-2 border border-gray-100 rounded bg-gray-50 font-bold">{site.start_date || '-'}</p>
                    </div>
                    <div>
                        <label className="block text-gray-500 font-medium mb-1">준공일</label>
                        <p className="p-2 border border-gray-100 rounded bg-gray-50 font-bold">{site.end_date || '-'}</p>
                    </div>
                    <div>
                        <label className="block text-gray-500 font-medium mb-1">총 도급액</label>
                        <p className="p-2 border border-gray-100 rounded bg-blue-50 text-blue-800 font-black text-base">
                            {site.budget ? `${site.budget.toLocaleString()} 원` : '-'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden font-sans">
                <div className="p-3 bg-gray-100 font-bold border-b border-gray-200 text-gray-800 flex justify-between items-center">
                    <span>참여자 목록</span>
                    <button onClick={onAddMember} disabled={isAddingMember} className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">+ 참여자 추가</button>
                </div>
                <div className="p-4 text-sm">
                    {siteMembers.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {siteMembers.map(member => {
                                const user = allUsers.find(u => u.id === member.user_id); 
                                return user ? (
                                    <div key={member.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center font-bold text-blue-600 border border-blue-100">{user.full_name.charAt(0)}</div>
                                        <div>
                                            <p className="font-black text-gray-800">{user.full_name}</p>
                                            <p className="text-gray-500 text-[10px] uppercase font-bold">{user.department} · {member.role}</p>
                                        </div>
                                    </div>
                                ) : null;
                            })}
                        </div>
                    ) : (
                        <p className="text-gray-400 py-4 text-center">등록된 참여자가 없습니다.</p>
                    )}
                </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
                <h2 className="p-3 bg-gray-100 font-bold border-b border-gray-200 text-gray-800">개요 및 특이사항</h2>
                <div className="p-4">
                    <p className="w-full p-4 border border-gray-100 rounded-md bg-gray-50 h-32 overflow-auto text-sm whitespace-pre-wrap text-gray-700 leading-relaxed font-medium">
                        {site.description || '등록된 설명이 없습니다.'}
                    </p>
                </div>
            </div>

            <div className="mt-8 flex justify-end space-x-3">
                <button onClick={onDeleteSite} className="px-6 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-600 hover:text-white font-bold transition-all border border-red-100">현장 삭제</button>
                <button onClick={onEdit} className="px-8 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-black shadow-lg transition-all">현장 정보 수정</button>
            </div>
        </div>
    );
};

// 참여자 추가 모달
const AddMemberModal = ({ isOpen, onClose, allUsers, currentSiteMembers, onAdd }) => {
    const [selectedMemberId, setSelectedMemberId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const currentMemberUserIds = useMemo(() => new Set((currentSiteMembers || []).map(member => member.user_id)), [currentSiteMembers]); 
    const availableUsers = useMemo(() => (allUsers || []).filter(user => 
        !currentMemberUserIds.has(user.id) && 
        ((user.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
         (user.department || '').toLowerCase().includes(searchQuery.toLowerCase()))
    ), [allUsers, currentMemberUserIds, searchQuery]);

    if (!isOpen) return null;

    const handleAdd = () => {
        if (selectedMemberId) {
            onAdd(selectedMemberId);
            setSelectedMemberId('');
            setSearchQuery('');
        } else {
            toast.error('추가할 참여자를 선택해주세요.');
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900/70 flex justify-center items-center z-50 p-4 backdrop-blur-sm font-sans">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
                <h2 className="text-xl font-black mb-6 text-gray-900">참여자 추가</h2>
                <div className="mb-6">
                    <input type="text" placeholder="이름 또는 부서 검색" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-xl mb-3 focus:ring-2 focus:ring-blue-500 outline-none" />
                    <select value={selectedMemberId} onChange={(e) => setSelectedMemberId(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">-- 선택 --</option>
                        {availableUsers.map(user => (
                            <option key={user.id} value={user.id}>{user.full_name} ({user.department || '미지정'})</option>
                        ))}
                    </select>
                </div>
                <div className="flex justify-end space-x-3">
                    <button onClick={onClose} className="px-5 py-2.5 text-gray-500 font-bold">취소</button>
                    <button onClick={handleAdd} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-black shadow-lg shadow-blue-200">추가하기</button>
                </div>
            </div>
        </div>
    );
};

export default function SiteDetailPage() {
    const router = useRouter();
    const { siteId } = useParams();
    const { employee } = useEmployee();

    const [site, setSite] = useState(null);
    const [siteMembers, setSiteMembers] = useState([]); 
    const [allUsers, setAllUsers] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview'); 
    const [isEditing, setIsEditing] = useState(false); 
    const [isSaving, setIsSaving] = useState(false); 
    const [showAddMemberModal, setShowAddMemberModal] = useState(false); 
    const [isAddingMember, setIsAddingMember] = useState(false); 

    // 🚀 [연동 핵심] 최신 작업일보에서 공정률 및 활성화 여부 동기화
    const syncProgressFromDailyReport = useCallback(async () => {
        if (!siteId) return;

        try {
            const { data, error } = await supabase
                .from('daily_site_reports')
                .select('notes')
                .eq('site_id', siteId)
                .order('report_date', { ascending: false })
                .limit(1);

            if (error) throw error;

            if (data?.[0]) {
                const reportNotes = JSON.parse(data[0].notes);
                const plant = parseFloat(reportNotes.progress_plant) || 0;
                const facility = parseFloat(reportNotes.progress_facility) || 0;
                const is_plant_active = reportNotes.is_plant_active ?? true;
                const is_facility_active = reportNotes.is_facility_active ?? true;

                // DB의 현장 테이블 업데이트 (기본 공정률 값만)
                const { error: updateError } = await supabase
                    .from('construction_sites')
                    .update({ 
                        progress_plant: plant, 
                        progress_facility: facility 
                    })
                    .eq('id', siteId);

                if (!updateError) {
                    setSite(prev => prev ? ({ 
                        ...prev, 
                        progress_plant: plant, 
                        progress_facility: facility,
                        is_plant_active,
                        is_facility_active
                    }) : null);
                }
            }
        } catch (err) {
            console.error("공정률 연동 실패:", err);
        }
    }, [siteId]);

    const fetchSiteDetails = useCallback(async () => {
        if (!employee || !siteId) {
            setLoading(false);
            return;
        }
        setLoading(true);

        try {
            const { data: siteData, error: siteError } = await supabase.from('construction_sites').select('*').eq('id', siteId).single();
            if (siteError || !siteData) {
                setSite(null);
                return;
            }
            setSite(siteData);

            const { data: membersData } = await supabase.from('site_members').select('*, member:profiles!user_id(id, full_name, department, position)').eq('site_id', siteId);
            setSiteMembers(membersData || []);

            const { data: usersData } = await supabase.from('profiles').select('id, full_name, department, position');
            setAllUsers(usersData || []);

            // 페이지 로드 시 공정률 연동 실행
            await syncProgressFromDailyReport();

        } catch (error) {
            toast.error("현장 정보를 불러오는데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    }, [siteId, employee, syncProgressFromDailyReport]);

    useEffect(() => {
        fetchSiteDetails();
    }, [fetchSiteDetails]);

    const handleSaveSite = async (updatedFormData) => {
        setIsSaving(true);
        try {
            const { error } = await supabase.from('construction_sites').update(updatedFormData).eq('id', siteId);
            if (error) throw error;
            toast.success('현장 정보가 성공적으로 업데이트되었습니다.');
            setIsEditing(false);
            fetchSiteDetails();
        } catch (error) {
            toast.error(`실패: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddMember = async (userIdToAdd) => {
        setIsAddingMember(true);
        try {
            const { error } = await supabase.from('site_members').insert({ site_id: siteId, user_id: userIdToAdd, role: '현장멤버' });
            if (error) throw error;
            toast.success('참여자가 추가되었습니다.');
            setShowAddMemberModal(false);
            fetchSiteDetails();
        } catch (error) {
            toast.error(`실패: ${error.message}`);
        } finally {
            setIsAddingMember(false);
        }
    };

    const handleDeleteSite = async () => {
        if (!confirm(`정말로 이 현장을 삭제하시겠습니까?`)) return;
        try {
            const { error } = await supabase.from('construction_sites').delete().eq('id', siteId);
            if (error) throw error;
            toast.success('현장이 삭제되었습니다.');
            router.push('/sites');
        } catch (error) {
            toast.error("삭제 중 오류가 발생했습니다.");
        }
    };

    if (loading) return <div className="h-full flex items-center justify-center text-gray-600 font-sans">현장 정보를 불러오는 중입니다...</div>;
    if (!site) return <div className="h-full flex flex-col items-center justify-center font-sans">현장을 찾을 수 없습니다.</div>;
    
    const tabs = [
        { id: 'overview', label: '현장 대시보드' },
        { id: 'reports', label: '작업일보' },
        { id: 'documents', label: '공무 서류' },
        { id: 'members', label: '참여자 관리' },
    ];

    return (
        <div className="h-full flex flex-col bg-gray-100 font-sans">
            <header className="px-8 py-6 bg-white shadow-sm flex-shrink-0 border-b flex justify-between items-center font-sans">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">{site.name}</h1>
                    <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wider">{site.client} · {site.site_type}</p>
                </div>
                <nav className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
                    {tabs.map((tab) => (
                        <button key={tab.id} onClick={() => { setActiveTab(tab.id); if(tab.id === 'overview') syncProgressFromDailyReport(); }}
                            className={`px-6 py-2 text-xs font-black rounded-lg transition-all ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </header>

            <div className="flex-1 overflow-y-auto p-8">
                {activeTab === 'overview' && (
                    <div className="max-w-6xl mx-auto">
                        {isEditing ? (
                            <SiteEditForm site={site} allUsers={allUsers} onSave={handleSaveSite} onCancel={() => setIsEditing(false)} isSaving={isSaving} />
                        ) : (
                            <SiteDetailView site={site} onEdit={() => setIsEditing(true)} siteMembers={siteMembers} allUsers={allUsers} onAddMember={() => setShowAddMemberModal(true)} isAddingMember={isAddingMember} onDeleteSite={handleDeleteSite} />
                        )}
                    </div>
                )}
                {activeTab === 'reports' && <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 p-2 overflow-hidden"><DailyReportSection siteId={site.id} /></div>}
                {activeTab === 'documents' && <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl p-8 border border-gray-100"><SiteDocumentsSection siteId={site.id} /></div>}
                {activeTab === 'members' && <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl p-8 border border-gray-100"><SiteMembersSection siteId={site.id} allUsers={allUsers} /></div>}
            </div>

            <AddMemberModal isOpen={showAddMemberModal} onClose={() => setShowAddMemberModal(false)} allUsers={allUsers} currentSiteMembers={siteMembers} onAdd={handleAddMember} />
        </div>
    );
}