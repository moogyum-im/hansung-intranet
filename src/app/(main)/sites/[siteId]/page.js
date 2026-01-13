'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useEmployee } from '../../../../contexts/EmployeeContext'; 
import { supabase } from '../../../../lib/supabase/client';
import { notFound, useRouter, useParams } from 'next/navigation'; // useParams 추가
import Link from 'next/link';
import DailyReportSection from '@/components/DailyReportSection'; 
import SiteDocumentsSection from '@/components/SiteDocumentsSection';
import SiteMembersSection from '@/components/SiteMembersSection'; 
import { toast } from 'react-hot-toast';

// 현장 상세 정보 수정 폼 컴포넌트 (UI 서류 형식)
const SiteEditForm = ({ site, allUsers, onSave, onCancel, isSaving }) => {
    const [formData, setFormData] = useState({
        name: site.name || '',
        site_type: site.site_type || '건축',
        contract_type: site.contract_type || '도급',
        address: site.address || '',
        client: site.client || '',
        budget: site.budget || null,
        start_date: site.start_date || '',
        end_date: site.end_date || '',
        description: site.description || '',
        pm_id: site.pm_id || '',
        status: site.status || '진행중', 
        progress: site.progress || 0, 
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'budget' || name === 'progress' ? (value ? parseInt(value, 10) : null) : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-10 rounded-xl shadow-lg border border-gray-100 animate-fade-in">
            <h1 className="text-2xl font-bold text-center mb-8 text-gray-800 font-sans">현장 정보 수정</h1>
            
            <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden font-sans">
                <table className="w-full text-sm font-sans">
                    <tbody>
                        <tr className="border-b border-gray-200">
                            <th className="p-3 bg-gray-50 font-semibold w-1/5 text-left border-r border-gray-200 text-gray-700 font-sans">현장 이름 <span className="text-red-500">*</span></th>
                            <td className="p-3 w-2/5 border-r border-gray-200 font-sans">
                                <input type="text" name="name" value={formData.name} onChange={handleChange} required
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-800 transition-all duration-200 font-sans" />
                            </td>
                            <th className="p-3 bg-gray-50 font-semibold w-1/5 text-left border-r border-gray-200 text-gray-700 font-sans font-sans">발주처</th>
                            <td className="p-3 font-sans">
                                <input type="text" name="client" value={formData.client} onChange={handleChange}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-800 transition-all duration-200 font-sans" />
                            </td>
                        </tr>
                        <tr className="border-b border-gray-200">
                            <th className="p-3 bg-gray-50 font-semibold text-left border-r border-gray-200 text-gray-700 font-sans">공사 구분</th>
                            <td className="p-3 border-r border-gray-200 font-sans">
                                <select name="site_type" value={formData.site_type} onChange={handleChange}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-800 transition-all duration-200 font-sans">
                                    <option>건축</option> <option>토목</option> <option>조경</option> <option>인테리어</option> <option>기기/배관</option> <option>기타</option>
                                </select>
                            </td>
                            <th className="p-3 bg-gray-50 font-semibold text-left border-r border-gray-200 text-gray-700 font-sans font-sans">계약 형태</th>
                            <td className="p-3 font-sans">
                                <select name="contract_type" value={formData.contract_type} onChange={handleChange}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-800 transition-all duration-200 font-sans">
                                    <option>도급</option> <option>관급</option> <option>자체 사업</option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <th className="p-3 bg-gray-50 font-semibold text-left border-r border-gray-200 text-gray-700 font-sans">현장 주소</th>
                            <td className="p-3 font-sans" colSpan="3">
                                <input type="text" name="address" value={formData.address} onChange={handleChange}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-800 transition-all duration-200 font-sans" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden font-sans">
                <h2 className="p-3 bg-gray-100 font-bold border-b border-gray-200 text-gray-800 font-sans">기간 및 담당자</h2>
                <div className="p-4 grid grid-cols-2 gap-6 text-sm">
                    <div className="font-sans">
                        <label htmlFor="start_date" className="block text-gray-700 font-medium mb-1 font-sans">착공일</label>
                        <input type="date" name="start_date" value={formData.start_date} onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-800 transition-all duration-200 font-sans" />
                    </div>
                    <div className="font-sans">
                        <label htmlFor="end_date" className="block text-gray-700 font-medium mb-1 font-sans">준공일</label>
                        <input type="date" name="end_date" value={formData.end_date} onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-800 transition-all duration-200 font-sans" />
                    </div>
                    <div className="font-sans font-sans">
                        <label htmlFor="pm_id" className="block text-gray-700 font-medium mb-1 font-sans font-sans">현장 소장 (PM)</label>
                        <select name="pm_id" value={formData.pm_id} onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-800 transition-all duration-200 font-sans font-sans">
                            <option value="">-- 담당자 선택 --</option>
                            {allUsers.map(user => (
                                <option key={user.id} value={user.id}>{user.full_name} ({user.department})</option>
                            ))}
                        </select>
                    </div>
                    <div className="font-sans">
                        <label htmlFor="budget" className="block text-gray-700 font-medium mb-1 font-sans font-sans">총 예산 (원)</label>
                        <input type="number" name="budget" value={formData.budget || ''} onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-800 transition-all duration-200 font-sans" placeholder="숫자만 입력" />
                    </div>
                </div>
            </div>

            <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden font-sans font-sans font-sans">
                <h2 className="p-3 bg-gray-100 font-bold border-b border-gray-200 text-gray-800 font-sans font-sans">진행 현황</h2>
                <div className="p-4 grid grid-cols-2 gap-6 text-sm">
                    <div className="font-sans font-sans">
                        <label htmlFor="status" className="block text-gray-700 font-medium mb-1 font-sans font-sans font-sans">상태</label>
                        <select name="status" value={formData.status} onChange={handleChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-800 transition-all duration-200 font-sans font-sans font-sans">
                            <option value="진행중">진행중</option>
                            <option value="완료">완료</option>
                            <option value="보류">보류</option>
                            <option value="중단">중단</option>
                        </select>
                    </div>
                    <div className="font-sans font-sans">
                        <label htmlFor="progress" className="block text-gray-700 font-medium mb-1 font-sans font-sans">공정률 ({formData.progress || 0}%)</label>
                        <input
                            type="range"
                            name="progress"
                            min="0"
                            max="100"
                            value={formData.progress || 0}
                            onChange={handleChange}
                            className="w-full h-2 bg-blue-500 rounded-lg appearance-none cursor-pointer mt-2 transition-all duration-200 font-sans font-sans"
                            style={{ background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${formData.progress || 0}%, #E5E7EB ${formData.progress || 0}%, #E5E7EB 100%)` }}
                        />
                        <div className="text-right text-xs text-gray-600 mt-1 font-sans font-sans font-sans font-sans font-sans">{formData.progress || 0}%</div>
                    </div>
                </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden font-sans font-sans font-sans">
                <h2 className="p-3 bg-gray-100 font-bold border-b border-gray-200 text-gray-800 font-sans font-sans font-sans font-sans">개요 및 특이사항</h2>
                <div className="p-4 font-sans font-sans">
                    <textarea name="description" value={formData.description} onChange={handleChange} rows={5}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-800 transition-all duration-200 font-sans font-sans font-sans" />
                </div>
            </div>

            <div className="mt-8 flex justify-end space-x-3 font-sans font-sans font-sans font-sans font-sans">
                <button type="button" onClick={onCancel}
                    className="px-5 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors duration-200 font-sans font-sans font-sans">
                    취소
                </button>
                <button type="submit" disabled={isSaving}
                    className="px-5 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400 transition-colors duration-200 font-sans font-sans font-sans font-sans">
                    {isSaving ? '저장 중...' : '현장 정보 저장'}
                </button>
            </div>
        </form>
    );
};


// 현장 상세 정보 읽기 전용 뷰 컴포넌트 (UI 서류 형식)
const SiteDetailView = ({ site, onEdit, siteMembers, allUsers, onAddMember, isAddingMember, onDeleteSite }) => {
    const pm = useMemo(() => allUsers.find(user => user.id === site.pm_id), [allUsers, site.pm_id]);

    const statusStyles = {
        '진행중': 'bg-blue-100 text-blue-800 ring-blue-500/10',
        '완료': 'bg-green-100 text-green-800 ring-green-500/10',
        '보류': 'bg-yellow-100 text-yellow-800 ring-yellow-500/10',
        '중단': 'bg-red-100 text-red-800 ring-red-500/10',
    };

    return (
        <div className="bg-white p-10 rounded-xl shadow-lg border border-gray-100 animate-fade-in font-sans italic-none">
            <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 font-sans">{site.name || '현장 이름 없음'}</h1>
            <div className="text-right text-sm text-gray-500 mb-6 font-sans">
                <p className="font-sans">문서번호: {site.id}</p>
                <p className="font-sans font-sans">작성일: {new Date(site.created_at).toLocaleDateString('ko-KR')}</p>
            </div>

            <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden font-sans">
                <table className="w-full text-sm font-sans font-sans font-sans">
                    <tbody>
                        <tr className="border-b border-gray-200">
                            <th className="p-3 bg-gray-50 font-semibold w-1/5 text-left border-r border-gray-200 text-gray-700 font-sans">공사 구분</th>
                            <td className="p-3 w-2/5 border-r border-gray-200 text-gray-800 font-sans font-sans">{site.site_type || '-'}</td>
                            <th className="p-3 bg-gray-50 font-semibold w-1/5 text-left border-r border-gray-200 text-gray-700 font-sans">계약 형태</th>
                            <td className="p-3 text-gray-800 font-sans font-sans">{site.contract_type || '-'}</td>
                        </tr>
                        <tr className="border-b border-gray-200">
                            <th className="p-3 bg-gray-50 font-semibold text-left border-r border-gray-200 text-gray-700 font-sans font-sans">발주처</th>
                            <td className="p-3 border-r border-gray-200 text-gray-800 font-sans font-sans">{site.client || '-'}</td>
                            <th className="p-3 bg-gray-50 font-semibold text-left border-r border-gray-200 text-gray-700 font-sans">현장 소장 (PM)</th>
                            <td className="p-3 text-gray-800 font-sans font-sans">{pm ? `${pm.full_name} (${pm.department})` : '-'}</td>
                        </tr>
                        <tr>
                            <th className="p-3 bg-gray-50 font-semibold text-left border-r border-gray-200 text-gray-700 font-sans">현장 주소</th>
                            <td className="p-3 text-gray-800 font-sans" colSpan="3">{site.address || '-'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden font-sans font-sans">
                <h2 className="p-3 bg-gray-100 font-bold border-b border-gray-200 text-gray-800 font-sans font-sans">진행 현황 및 기간</h2>
                <div className="p-4 grid grid-cols-2 gap-6 text-sm">
                    <div className="font-sans">
                        <label className="block text-gray-700 font-medium mb-1 font-sans font-sans font-sans">상태</label>
                        <span className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full ring-1 ring-inset font-sans font-sans ${statusStyles[site.status] || 'bg-gray-100 text-gray-800 ring-gray-500/10'}`}>
                            {site.status || '진행중'}
                        </span>
                    </div>
                    <div className="font-sans font-sans">
                        <label className="block text-gray-700 font-medium mb-1 font-sans">공정률</label>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2 font-sans font-sans font-sans">
                            <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 font-sans font-sans font-sans" style={{ width: `${site.progress || 0}%` }}></div>
                        </div>
                        <p className="text-right text-sm text-gray-700 mt-1 font-sans font-sans font-sans font-sans font-sans">{site.progress || 0}%</p>
                    </div>
                    <div className="font-sans font-sans">
                        <label className="block text-gray-700 font-medium mb-1 font-sans font-sans">착공일</label>
                        <p className="w-full p-2 border border-gray-200 rounded-md bg-gray-50 text-gray-800 font-sans font-sans font-sans font-sans">{site.start_date || '-'}</p>
                    </div>
                    <div className="font-sans font-sans font-sans">
                        <label className="block text-gray-700 font-medium mb-1 font-sans font-sans">준공일</label>
                        <p className="w-full p-2 border border-gray-200 rounded-md bg-gray-50 text-gray-800 font-sans font-sans font-sans font-sans">{site.end_date || '-'}</p>
                    </div>
                    <div className="col-span-2 font-sans font-sans">
                        <label className="block text-gray-700 font-medium mb-1 font-sans font-sans font-sans">총 예산</label>
                        <p className="w-full p-2 border border-gray-200 rounded-md bg-gray-50 text-gray-800 font-sans font-sans font-sans font-sans">{site.budget ? `${site.budget.toLocaleString()} 원` : '-'}</p>
                    </div>
                </div>
            </div>

            <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden font-sans font-sans font-sans">
                <h2 className="p-3 bg-gray-100 font-bold border-b border-gray-200 text-gray-800 font-sans font-sans font-sans">참여자 목록</h2>
                <div className="p-4 text-sm font-sans font-sans font-sans">
                    {siteMembers.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-sans font-sans">
                            {siteMembers.map(member => {
                                const user = allUsers.find(u => u.id === member.user_id); 
                                return user ? (
                                    <div key={member.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-md shadow-sm border border-gray-100 font-sans font-sans">
                                        <span className="font-medium text-gray-800 font-sans font-sans font-sans">{user.full_name}</span>
                                        <span className="text-gray-600 text-xs font-sans font-sans font-sans font-sans">({user.department || '부서 미지정'} - {member.role})</span>
                                    </div>
                                ) : null;
                            })}
                        </div>
                    ) : (
                        <p className="text-gray-500 py-4 text-center font-sans font-sans font-sans font-sans">등록된 참여자가 없습니다.</p>
                    )}
                    <div className="mt-5 flex justify-end font-sans font-sans font-sans font-sans">
                        <button
                            onClick={onAddMember}
                            disabled={isAddingMember}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 text-sm font-semibold transition-colors duration-200 shadow font-sans font-sans font-sans font-sans font-sans"
                        >
                            {isAddingMember ? '추가 중...' : '+ 참여자 추가'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden font-sans font-sans font-sans">
                <h2 className="p-3 bg-gray-100 font-bold border-b border-gray-200 text-gray-800 font-sans font-sans font-sans font-sans">개요 및 특이사항</h2>
                <div className="p-4 font-sans font-sans font-sans">
                    <p className="w-full p-3 border border-gray-200 rounded-md bg-gray-50 h-40 overflow-auto text-sm whitespace-pre-wrap text-gray-800 font-sans font-sans font-sans">{site.description || '등록된 설명이 없습니다.'}</p>
                </div>
            </div>

            <div className="mt-8 flex justify-end space-x-3 font-sans font-sans font-sans font-sans font-sans font-sans font-sans font-sans font-sans font-sans">
                <button
                    onClick={onDeleteSite}
                    className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold transition-colors duration-200 shadow-md font-sans font-sans font-sans font-sans"
                >
                    현장 삭제
                </button>
                <button
                    onClick={onEdit}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold transition-colors duration-200 shadow-md font-sans font-sans font-sans font-sans font-sans"
                >
                    현장 정보 수정
                </button>
            </div>
        </div>
    );
};


// 참여자 추가 모달
const AddMemberModal = ({ isOpen, onClose, allUsers, currentSiteMembers, onAdd }) => {
    const [selectedMemberId, setSelectedMemberId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // [중요 수정] useMemo 로직을 컴포넌트 최상단(조건부 리턴 전)으로 이동하고 null 방어 코드 추가
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
        <div className="fixed inset-0 bg-gray-800 bg-opacity-60 flex justify-center items-center z-50 p-4 animate-fade-in-up font-sans font-sans font-sans font-sans font-sans font-sans">
            <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-md transform transition-all duration-300 ease-out scale-100 opacity-100 font-sans font-sans font-sans font-sans font-sans font-sans">
                <h2 className="text-xl font-bold mb-5 text-gray-800 font-sans font-sans font-sans font-sans">참여자 추가</h2>
                <div className="mb-4 font-sans font-sans font-sans font-sans">
                    <input
                        type="text"
                        placeholder="이름 또는 부서로 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full p-2.5 border border-gray-300 rounded-md mb-3 focus:ring-blue-500 focus:border-blue-500 text-gray-800 transition-all duration-200 font-sans font-sans font-sans font-sans font-sans font-sans font-sans font-sans"
                    />
                    <select
                        value={selectedMemberId}
                        onChange={(e) => setSelectedMemberId(e.target.value)}
                        className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-800 transition-all duration-200 font-sans font-sans font-sans font-sans font-sans font-sans font-sans font-sans"
                    >
                        <option value="">-- 참여자 선택 --</option>
                        {availableUsers.map(user => (
                            <option key={user.id} value={user.id}>
                                {user.full_name} ({user.department || '부서 미지정'})
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex justify-end space-x-3 font-sans font-sans font-sans font-sans font-sans font-sans">
                    <button onClick={onClose} className="px-5 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors duration-200 font-sans font-sans font-sans font-sans font-sans font-sans font-sans font-sans font-sans font-sans font-sans font-sans">
                        취소
                    </button>
                    <button onClick={handleAdd} className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 shadow-md font-sans font-sans font-sans font-sans font-sans font-sans font-sans font-sans font-sans font-sans font-sans font-sans font-sans font-sans font-sans">
                        추가
                    </button>
                </div>
            </div>
        </div>
    );
};


export default function SiteDetailPage() {
    const router = useRouter();
    const { siteId } = useParams(); // params 대신 useParams 사용
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

    // [중요 수정] useMemo 선언 시 데이터 부재 상황 방지
    const pm = useMemo(() => {
        if (!site || !allUsers.length) return null;
        return allUsers.find(user => user.id === site.pm_id);
    }, [allUsers, site]);

    const currentMemberUserIds = useMemo(() => new Set((siteMembers || []).map(member => member.user_id)), [siteMembers]); 
    const availableUsers = useMemo(() => (allUsers || []).filter(user => 
        !currentMemberUserIds.has(user.id)
    ), [allUsers, currentMemberUserIds]);


    const fetchSiteDetails = useCallback(async () => {
        if (!employee || !siteId) {
            setLoading(false);
            return;
        }
        setLoading(true);

        try {
            const { data: siteData, error: siteError } = await supabase
                .from('construction_sites')
                .select('*')
                .eq('id', siteId)
                .single();

            if (siteError || !siteData) {
                console.error("현장 정보 조회 실패:", siteError);
                setSite(null);
                return;
            }
            setSite(siteData);

            const { data: membersData, error: membersError } = await supabase
                .from('site_members')
                .select('*, member:profiles!user_id(id, full_name, department, position)') 
                .eq('site_id', siteId);

            if (membersError) {
                console.error("현장 참여자 조회 실패:", membersError);
                setSiteMembers([]);
            } else {
                setSiteMembers(membersData || []);
            }

            const { data: usersData, error: usersError } = await supabase.from('profiles').select('id, full_name, department, position');
            if (usersError) {
                console.error("사용자 목록 조회 실패:", usersError);
                setAllUsers([]);
            } else {
                setAllUsers(usersData || []);
            }

        } catch (error) {
            console.error("데이터 로딩 중 오류 발생:", error);
            toast.error("현장 정보를 불러오는데 실패했습니다.");
            setSite(null);
        } finally {
            setLoading(false);
        }
    }, [siteId, employee]);

    useEffect(() => {
        fetchSiteDetails();
    }, [fetchSiteDetails]);

    const handleSaveSite = async (updatedFormData) => {
        setIsSaving(true);
        try {
            const dataToUpdate = {
                ...updatedFormData,
                pm_id: updatedFormData.pm_id === '' ? null : updatedFormData.pm_id
            };

            const { error } = await supabase
                .from('construction_sites')
                .update(dataToUpdate)
                .eq('id', siteId);

            if (error) throw error;

            toast.success('현장 정보가 성공적으로 업데이트되었습니다.');
            setIsEditing(false);
            fetchSiteDetails();
        } catch (error) {
            console.error("현장 정보 업데이트 실패:", error);
            toast.error(`현장 정보 업데이트 실패: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddMember = async (userIdToAdd) => {
        setIsAddingMember(true);
        try {
            if (siteMembers.some(member => member.user_id === userIdToAdd)) {
                toast.error('이미 현장에 추가된 참여자입니다.');
                setIsAddingMember(false);
                return;
            }

            const { error } = await supabase
                .from('site_members')
                .insert({
                    site_id: siteId,
                    user_id: userIdToAdd, 
                    role: '현장멤버'
                });

            if (error) throw error;

            toast.success('참여자가 성공적으로 추가되었습니다.');
            setShowAddMemberModal(false);
            fetchSiteDetails();
        } catch (error) {
            console.error("참여자 추가 실패:", error);
            toast.error(`참여자 추가 실패: ${error.message}`);
        } finally {
            setIsAddingMember(false);
        }
    };

    const handleDeleteSite = async () => {
        if (!confirm(`정말로 현장 "${site.name}"을(를) 삭제하시겠습니까?\n모든 관련 데이터가 영구적으로 삭제됩니다.`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('construction_sites')
                .delete()
                .eq('id', siteId);

            if (error) throw error;

            toast.success('현장이 성공적으로 삭제되었습니다.');
            router.push('/sites');
        } catch (error) {
            console.error("현장 삭제 실패:", error);
            toast.error(`현장 삭제 실패: ${error.message}`);
        }
    };


    if (loading) {
        return <div className="h-full flex items-center justify-center text-gray-600 font-sans italic-none"><p className="font-sans font-sans font-sans font-sans font-sans font-sans font-sans">현장 정보를 불러오는 중입니다...</p></div>;
    }

    if (!site) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-gray-50 font-sans font-sans font-sans font-sans font-sans font-sans">
                <h2 className="text-2xl font-bold mb-2 text-gray-800 font-sans font-sans font-sans">현장을 찾을 수 없습니다.</h2>
                <p className="text-gray-600 font-sans font-sans font-sans font-sans font-sans">존재하지 않거나 접근 권한이 없는 현장입니다.</p>
                <Link href="/sites" className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow font-sans font-sans font-sans">
                    현장 목록으로 돌아가기
                </Link>
            </div>
        );
    }
    
    const tabs = [
        { id: 'overview', label: '개요' },
        { id: 'reports', label: '일일 보고' },
        { id: 'documents', label: '문서함' },
        { id: 'members', label: '참여자' },
    ];

    return (
        <div className="h-full flex flex-col bg-gray-100 font-sans font-sans font-sans font-sans font-sans font-sans font-sans">
            <header className="px-6 py-4 bg-white shadow-md flex-shrink-0 border-b border-gray-200 font-sans font-sans font-sans font-sans font-sans font-sans font-sans font-sans">
                <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight font-sans font-sans font-sans font-sans">{site.name}</h1>
                <p className="text-sm text-gray-500 mt-1 font-sans font-sans font-sans font-sans font-sans">현장 대시보드</p>
            </header>

            <div className="bg-white shadow-inner border-b border-gray-200 flex-shrink-0 sticky top-0 z-10 font-sans font-sans font-sans font-sans font-sans font-sans font-sans">
                <nav className="px-6 flex space-x-6 lg:space-x-8 font-sans font-sans font-sans font-sans font-sans" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`${
                                activeTab === tab.id
                                    ? 'border-green-500 text-green-600 font-semibold'
                                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                            } relative group flex items-center py-3 px-1 border-b-2 text-sm transition-all duration-300 ease-in-out
                                focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 font-sans font-sans font-sans font-sans font-sans font-sans`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="flex-1 overflow-y-auto p-6 font-sans font-sans font-sans">
                {activeTab === 'overview' && (
                    <div className="min-h-[calc(100vh-250px)] font-sans font-sans font-sans">
                        {isEditing ? (
                            <SiteEditForm
                                site={site}
                                allUsers={allUsers}
                                onSave={handleSaveSite}
                                onCancel={() => setIsEditing(false)}
                                isSaving={isSaving}
                            />
                        ) : (
                            <SiteDetailView
                                site={site}
                                onEdit={() => setIsEditing(true)}
                                siteMembers={siteMembers}
                                allUsers={allUsers}
                                onAddMember={() => setShowAddMemberModal(true)}
                                isAddingMember={isAddingMember}
                                onDeleteSite={handleDeleteSite}
                            />
                        )}
                    </div>
                )}
                {activeTab === 'reports' && (
                    <div className="bg-white rounded-xl shadow-lg p-6 min-h-[calc(100vh-250px)] border border-gray-100 animate-fade-in font-sans font-sans font-sans">
                        <DailyReportSection siteId={site.id} />
                    </div>
                )}
                {activeTab === 'documents' && (
                    <div className="bg-white rounded-xl shadow-lg p-6 min-h-[calc(100vh-250px)] border border-gray-100 animate-fade-in font-sans font-sans font-sans">
                        <SiteDocumentsSection siteId={site.id} />
                    </div>
                )}
                {activeTab === 'members' && (
                    <div className="bg-white rounded-xl shadow-lg p-6 min-h-[calc(100vh-250px)] border border-gray-100 animate-fade-in font-sans font-sans font-sans">
                        <SiteMembersSection siteId={site.id} allUsers={allUsers} />
                    </div>
                )}
            </div>

            <AddMemberModal
                isOpen={showAddMemberModal}
                onClose={() => setShowAddMemberModal(false)}
                allUsers={allUsers}
                currentSiteMembers={siteMembers}
                onAdd={handleAddMember}
            />
        </div>
    );
}