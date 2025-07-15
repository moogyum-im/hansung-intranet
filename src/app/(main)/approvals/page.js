'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { useEmployee } from '@/contexts/EmployeeContext';
import { useDebounce } from '@/hooks/useDebounce'; // 1. 방금 만든 디바운스 훅 불러오기

// 결재 문서 아이템 컴포넌트
function ApprovalListItem({ doc }) {
    const getStatusChip = (status) => {
        const styles = {
            '진행중': 'bg-green-100 text-green-800', '대기': 'bg-yellow-100 text-yellow-800',
            '승인': 'bg-blue-100 text-blue-800', '반려': 'bg-red-100 text-red-800', '완료': 'bg-blue-100 text-blue-800',
        };
        return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
    };

    return (
        <Link href={`/approvals/${doc.id}`} className="block p-4 bg-white border rounded-lg hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <div className="flex-grow">
                    <p className="text-sm text-blue-600 font-semibold">{doc.type || '일반'}</p>
                    <p className="font-bold text-gray-800 truncate my-1">{doc.title}</p>
                    <p className="text-sm text-gray-500">
                        상신자: {doc.author_name || '정보 없음'} · 상신일: {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                </div>
                <div className="ml-4 flex-shrink-0">
                    {getStatusChip(doc.status)}
                </div>
            </div>
        </Link>
    );
}

// 메인 페이지 컴포넌트
export default function ApprovalListPage() {
    const { employee } = useEmployee();
    const [activeTab, setActiveTab] = useState('all');
    const [approvals, setApprovals] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // 2. 검색어 상태 관리
    const [searchTerm, setSearchTerm] = useState('');
    // 3. 디바운싱 적용된 검색어 (500ms = 0.5초 지연)
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const fetchApprovals = useCallback(async (tab, search) => {
        if (!employee) {
            console.log("ApprovalListPage: Employee not loaded or invalid, skipping fetchApprovals.");
            setLoading(false);
            return;
        }
        setLoading(true);

        try {
            // supabase.rpc를 사용하여 데이터베이스 함수 호출
            const { data, error } = await supabase.rpc('get_approvals_for_user', {
                p_employee_id: employee.id,
                p_tab_filter: tab,
                p_search_term: search || '' // 검색어가 없으면 빈 문자열 전달
            });
            
            if (error) {
                throw error;
            }
            setApprovals(data || []);

        } catch (error) {
            console.error('결재 목록 로드 오류:', error);
            setApprovals([]);
        } finally {
            setLoading(false);
        }
    }, [employee]);

    // 4. 디바운싱된 검색어가 바뀔 때만 fetchApprovals 함수를 호출
    useEffect(() => {
        if (employee) {
            fetchApprovals(activeTab, debouncedSearchTerm);
        }
    }, [debouncedSearchTerm, activeTab, fetchApprovals, employee]);

    const handleTabClick = (tab) => {
        setActiveTab(tab);
    };
    
    const tabs = [
        { key: 'all', label: '전체 결재' },
        { key: 'toReview', label: '받은 결재' },
        { key: 'submitted', label: '상신한 결재' },
        { key: 'completed', label: '완료된 결재' },
        { key: 'referred', label: '참조할 결재' }
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">전자 결재</h1>
                <Link href="/approvals/new?template=leave_request" className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors">
                    + 새 결재 상신
                </Link>
            </header>

            <div className="bg-white p-6 rounded-xl shadow-sm border">
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="제목, 작성자, 문서 종류, 작성일/완료일로 검색... (예: 휴가, 홍길동, 2025-07-15)"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)} // 5. 입력값은 즉시 state에 반영
                    />
                </div>

                <div className="border-b border-gray-200 mb-4">
                    <nav className="-mb-px flex space-x-6">
                        {tabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => handleTabClick(tab.key)}
                                className={`py-3 px-1 border-b-2 font-semibold text-base ${activeTab === tab.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div>
                    {loading ? (
                        <p className="text-center text-gray-500 py-10">목록을 불러오는 중...</p>
                    ) : approvals.length > 0 ? (
                        <div className="space-y-3">
                            {approvals.map(doc => <ApprovalListItem key={doc.id} doc={doc} />)}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-10">해당하는 결재 문서가 없습니다.</p>
                    )}
                </div>
            </div>
        </div>
    );
}