// 파일 경로: src/app/(main)/sites/[siteId]/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEmployee } from '@/contexts/EmployeeContext';
import { createClient } from '@/lib/supabaseClient';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import DailyReportSection from '@/components/DailyReportSection'; 
import SiteMembersSection from '@/components/SiteMembersSection';
import SiteDocumentsSection from '@/components/SiteDocumentsSection';
// import SiteScheduleSection from '@/components/SiteScheduleSection'; // ★★★ "일정" 컴포넌트 임포트 삭제 ★★★

// 개요 탭 컴포넌트
const OverviewTab = ({ site }) => (
    <div className="space-y-6">
        <div>
            <h3 className="text-lg font-semibold text-gray-900">현장 설명</h3>
            <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{site.description || '등록된 설명이 없습니다.'}</p>
        </div>
        <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900">진행 현황</h3>
            <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">상태</dt>
                    <dd className="mt-1 text-sm text-gray-900">{site.status}</dd>
                </div>
                 <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">공정률</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${site.progress}%` }}></div>
                        </div>
                        <p className="text-right">{site.progress}%</p>
                    </dd>
                </div>
                <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">시작일</dt>
                    <dd className="mt-1 text-sm text-gray-900">{site.start_date || '-'}</dd>
                </div>
                <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">종료일</dt>
                    <dd className="mt-1 text-sm text-gray-900">{site.end_date || '-'}</dd>
                </div>
                 <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">총 예산</dt>
                    <dd className="mt-1 text-lg font-semibold text-gray-900">{site.budget ? `${site.budget.toLocaleString()} 원` : '-'}</dd>
                </div>
            </dl>
        </div>
    </div>
);


export default function SiteDetailPage({ params }) {
    const { siteId } = params;
    const supabase = createClient();
    const { employee } = useEmployee();

    const [site, setSite] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview'); 

    const fetchSiteDetails = useCallback(async () => {
        if (!employee) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('construction_sites')
            .select('*')
            .eq('id', siteId)
            .single();

        if (error || !data) {
            console.error("현장 정보 조회 실패:", error);
            setSite(null);
        } else {
            setSite(data);
        }
        setLoading(false);
    }, [siteId, employee, supabase]);

    useEffect(() => {
        fetchSiteDetails();
    }, [fetchSiteDetails]);

    if (loading) {
        return <div className="h-full flex items-center justify-center"><p>현장 정보를 불러오는 중입니다...</p></div>;
    }

    if (!site) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <h2 className="text-2xl font-bold mb-2">현장을 찾을 수 없습니다.</h2>
                <p className="text-gray-600">존재하지 않거나 접근 권한이 없는 현장입니다.</p>
                <Link href="/sites" className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    현장 목록으로 돌아가기
                </Link>
            </div>
        );
    }
    
    // ★★★ tabs 배열에서 "일정" 탭 제거 ★★★
    const tabs = [
        { id: 'overview', label: '개요' },
        { id: 'reports', label: '일일 보고' },
        { id: 'documents', label: '문서함' },
        { id: 'members', label: '참여자' },
    ];

    return (
        <div className="h-full flex flex-col">
            {/* 페이지 상단 헤더 */}
            <header className="p-6 border-b border-gray-200 bg-white flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-900">{site.name}</h1>
                <p className="text-sm text-gray-500 mt-1">현장 대시보드</p>
            </header>

            {/* 탭 네비게이션 */}
            <div className="px-6 border-b border-gray-200 bg-white flex-shrink-0">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`${
                                activeTab === tab.id
                                    ? 'border-green-500 text-green-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* 탭 콘텐츠 영역 */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="bg-white rounded-lg shadow p-6">
                    {activeTab === 'overview' && <OverviewTab site={site} />}
                    {activeTab === 'reports' && <DailyReportSection siteId={site.id} />}
                    {activeTab === 'documents' && <SiteDocumentsSection siteId={site.id} />}
                    {activeTab === 'members' && <SiteMembersSection siteId={site.id} />}
                    {/* ★★★ "일정" 탭 렌더링 로직 삭제 ★★★ */}
                </div>
            </div>
        </div>
    );
}