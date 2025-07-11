// src/app/(main)/approvals/page.js
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// --- 재사용 컴포넌트: 결재 문서 목록 ---
const ApprovalList = ({ documents, activeTab }) => {
    if (documents.length === 0) {
        return <p className="text-center text-gray-500 py-16">해당하는 결재 문서가 없습니다.</p>;
    }

    const getStatusChip = (status) => {
        const styles = {
            '대기': 'bg-yellow-100 text-yellow-800',
            '진행중': 'bg-green-100 text-green-800',
            '승인': 'bg-blue-100 text-blue-800',
            '반려': 'bg-red-100 text-red-800',
        };
        return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
    };

    return (
        <div className="space-y-3">
            {documents.map(doc => (
                <Link key={doc.id} href={`/approvals/${doc.id}`} className="block p-4 rounded-lg border bg-white hover:bg-gray-50 shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                        <p className="font-semibold text-gray-800 truncate">{doc.title}</p>
                        {/* 탭별 상태 표시 로직 강화 */}
                        {(activeTab === 'toReview' || activeTab === 'completed') && doc.approver_status ? getStatusChip(doc.approver_status) : getStatusChip(doc.status)}
                    </div>
                    <p className="text-sm text-gray-600">
                        작성자: <span className="font-medium">{doc.author?.full_name || doc.author_full_name || '알 수 없는 작성자'}</span> |
                        <span className="ml-1 text-gray-500"> 상신일: {new Date(doc.created_at).toLocaleDateString()}</span>
                        {(activeTab === 'completed' && doc.processed_at) && ( // 완료된 결재의 결재 완료일 표시
                            <span className="ml-1 text-gray-500"> | 완료일: {new Date(doc.processed_at).toLocaleDateString()}</span>
                        )}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">문서 종류: {doc.type || '미지정'}</p>
                </Link>
            ))}
        </div>
    );
};


// --- 메인 페이지 컴포넌트 ---
export default function ApprovalsPage() {
    const router = useRouter();
    const { employee, loading: employeeLoading } = useEmployee();
    const [activeTab, setActiveTab] = useState('all'); // 초기 탭을 'all' (전체 결재)로 변경
    
    const [documents, setDocuments] = useState([]); // 현재 표시될 문서 목록
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 검색 필터 상태
    const [mainSearchQuery, setMainSearchQuery] = useState(''); // 메인 검색어
    const [searchTarget, setSearchTarget] = useState('all'); // 검색 대상: 'all', 'title', 'author', 'type', 'createdDate'

    const [searchCompletionDate, setSearchCompletionDate] = useState(''); // 결재 완료일 (승인/반려일)
    
    const [documentTypes, setDocumentTypes] = useState([]); // 동적으로 가져올 문서 종류 목록

    // 디바운스를 위한 ref
    const debounceTimeoutRef = useRef(null);

    // 문서 종류 목록 가져오기 (콤보박스 옵션용)
    useEffect(() => {
        const fetchDocumentTypes = async () => {
            const { data, error } = await supabase
                .from('approval_forms')
                .select('title'); // 'type' -> 'title'로 변경

            if (error) {
                console.error('문서 종류 로드 오류:', error);
            } else {
                const uniqueTypes = [...new Set(data.map(form => form.title).filter(Boolean))]; 
                setDocumentTypes(uniqueTypes);
            }
        };
        fetchDocumentTypes();
    }, []);

    // fetchApprovals 함수: 모든 검색 조건에 따라 데이터를 가져오고 필터링
    const fetchApprovals = useCallback(async () => {
        if (!employee) return; 

        setLoading(true);
        setError(null);
        let currentDocuments = [];

        try {
            if (activeTab === 'all') {
                const { data: allDocs, error: allDocsError } = await supabase
                    .from('approval_documents')
                    .select(`*, author:profiles(full_name)`)
                    .order('created_at', { ascending: false });
                if (allDocsError) throw allDocsError;

                const { data: myApproverEntries } = await supabase
                    .from('approval_document_approvers')
                    .select('document_id')
                    .eq('approver_id', employee.id);
                const myApproverDocIds = myApproverEntries?.map(e => e.document_id) || [];

                const { data: myReferrerEntries } = await supabase
                    .from('approval_document_referrers')
                    .select('document_id')
                    .eq('referrer_id', employee.id);
                const myReferrerDocIds = myReferrerEntries?.map(e => e.document_id) || [];

                currentDocuments = allDocs.filter(doc => 
                    doc.author_id === employee.id ||
                    myApproverDocIds.includes(doc.id) ||
                    myReferrerDocIds.includes(doc.id)
                ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            } else if (activeTab === 'toReview') {
                const { data: approverEntries, error: entryError } = await supabase
                    .from('approval_document_approvers')
                    .select('document_id, status, processed_at')
                    .eq('approver_id', employee.id)
                    .eq('status', '대기');

                if (entryError) throw entryError;

                if (!approverEntries || approverEntries.length === 0) {
                    currentDocuments = [];
                } else {
                    const docIds = approverEntries.map(entry => entry.document_id);
                    const { data: docs, error: docError } = await supabase
                        .from('approval_documents')
                        .select(`*, author:profiles(full_name)`)
                        .in('id', docIds)
                        .order('created_at', { ascending: false });
                    
                    if (docError) throw docError;

                    currentDocuments = docs?.map(doc => {
                        const approverEntry = approverEntries.find(ae => ae.document_id === doc.id);
                        return {
                            ...doc,
                            approver_status: approverEntry?.status,
                            processed_at: approverEntry?.processed_at
                        };
                    }) || [];
                }
            } else if (activeTab === 'submitted') {
                const { data: docs, error: docError } = await supabase
                    .from('approval_documents')
                    .select(`*, author:profiles(full_name)`)
                    .eq('author_id', employee.id)
                    .order('created_at', { ascending: false });
                if (docError) throw docError;
                currentDocuments = docs || [];
            } else if (activeTab === 'completed') {
                const { data: docs, error: rpcError } = await supabase.rpc('get_my_completed_approvals', { p_employee_id: employee.id });
                if (rpcError) throw rpcError;
                currentDocuments = docs || [];
            } else if (activeTab === 'referred') {
                const { data: docs, error: rpcError } = await supabase.rpc('get_my_referred_documents', { p_employee_id: employee.id });
                if (rpcError) throw rpcError;
                currentDocuments = docs || [];
            }

            // 2. 클라이언트 측에서 검색 필터 적용 (통합 검색바 로직)
            let filteredDocuments = currentDocuments;

            // mainSearchQuery가 있을 때만 필터링 적용
            if (mainSearchQuery) {
                const queryLower = mainSearchQuery.toLowerCase();
                filteredDocuments = filteredDocuments.filter(doc => {
                    if (searchTarget === 'all') {
                        return (doc.title && doc.title.toLowerCase().includes(queryLower)) ||
                               (doc.author?.full_name && doc.author.full_name.toLowerCase().includes(queryLower)) ||
                               (doc.author_full_name && doc.author_full_name.toLowerCase().includes(queryLower)) ||
                               (doc.type && doc.type.toLowerCase().includes(queryLower)); 
                    } else if (searchTarget === 'title') {
                        return doc.title && doc.title.toLowerCase().includes(queryLower);
                    } else if (searchTarget === 'author') {
                        return (doc.author?.full_name && doc.author.full_name.toLowerCase().includes(queryLower)) ||
                               (doc.author_full_name && doc.author_full_name.toLowerCase().includes(queryLower));
                    } else if (searchTarget === 'type') {
                        return doc.type && doc.type.toLowerCase().includes(queryLower); 
                    } else if (searchTarget === 'createdDate') {
                        // 날짜 입력 필드 (type='date')를 사용하면 value는 'YYYY-MM-DD' 형식
                        // 따라서 이 문자열을 직접 Date 객체로 변환하여 비교합니다.
                        const searchDate = new Date(queryLower);
                        if (isNaN(searchDate.getTime())) return false; // 유효하지 않은 날짜면 필터링 안함

                        const docCreatedDate = new Date(doc.created_at);
                        return docCreatedDate.toDateString() === searchDate.toDateString(); // 날짜 부분만 비교
                    }
                    return true;
                });
            }

            // 결재 완료일 (별도 유지)
            if (searchCompletionDate && activeTab === 'completed') {
                filteredDocuments = filteredDocuments.filter(doc =>
                    doc.processed_at && new Date(doc.processed_at).toDateString() === new Date(searchCompletionDate).toDateString()
                );
            }

            setDocuments(filteredDocuments);

        } catch (err) {
            console.error('결재 목록 로드 또는 필터링 오류:', err);
            setError(err.message || '결재 목록을 불러오는데 실패했습니다.');
            setDocuments([]);
        } finally {
            setLoading(false);
        }
    }, [employee, activeTab, mainSearchQuery, searchTarget, searchCompletionDate]); // 의존성 배열 업데이트

    // 검색어 입력 변경 핸들러
    const handleSearchQueryChange = (e) => {
        const value = e.target.value;
        setMainSearchQuery(value); // 먼저 mainSearchQuery 상태를 업데이트

        // 디바운스 적용: 0.3초 동안 입력 없으면 검색 실행
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = setTimeout(() => {
            // 디바운스 이후에 fetchApprovals를 호출하여 검색을 실행
            // fetchApprovals는 mainSearchQuery 상태의 최신 값을 사용합니다.
            fetchApprovals(); 
        }, 300); // 300ms 디바운스
    };

    // 검색 대상 변경 핸들러
    const handleSearchTargetChange = (e) => {
        const newTarget = e.target.value;
        setSearchTarget(newTarget);
        // 검색 대상 변경 시, mainSearchQuery를 초기화 (필요시)
        setMainSearchQuery(''); // 어떤 검색 대상이든 변경되면 검색어 초기화 (새로운 검색 시작)
        
        // 검색 대상 변경 후 바로 검색 실행 (디바운스 없이)
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        fetchApprovals();
    };


    // 탭 또는 결재 완료일 필터 변경 시 데이터 다시 가져오기
    useEffect(() => {
        fetchApprovals();
    }, [fetchApprovals, activeTab, searchCompletionDate]); // searchCompletionDate도 의존성에 추가

    // 컴포넌트 언마운트 시 디바운스 타이머 클리어
    useEffect(() => {
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, []);


    if (loading || employeeLoading) {
        return <div className="p-8 text-center">결재 문서를 불러오는 중...</div>;
    }

    return (
        <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-50">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">전자 결재</h1>
                    <Link href="/approvals/new" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md shadow transition">
                        + 새 결재 상신
                    </Link>
                </header>

                {/* 검색 필터 섹션 */}
                <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
                    {/* 검색바를 폼 태그로 감싸고 onSubmit에서 preventDefault 호출 */}
                    <form onSubmit={(e) => e.preventDefault()} className="flex items-center space-x-2 mb-4 border border-gray-300 rounded-md shadow-sm focus-within:ring-blue-500 focus-within:border-blue-500">
                        {/* 검색 대상 선택 드롭다운 */}
                        <select
                            value={searchTarget}
                            onChange={handleSearchTargetChange} // 새로운 핸들러 사용
                            className="block w-auto border-r border-gray-300 rounded-l-md bg-gray-50 py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-0 focus:border-transparent"
                        >
                            <option value="all">전체</option>
                            <option value="title">제목</option>
                            <option value="author">작성자</option>
                            <option value="type">문서 종류</option>
                            <option value="createdDate">작성일</option>
                        </select>
                        {/* 메인 검색어 입력 필드 */}
                        <input
                            // key={searchTarget} // ★★★ key 프롭 제거 (이전 시도였으나 제거해야 함) ★★★
                            type={searchTarget === 'createdDate' ? 'date' : 'text'}
                            value={mainSearchQuery}
                            onChange={handleSearchQueryChange} // 새로운 핸들러 사용
                            placeholder={searchTarget === 'createdDate' ? 'YYYY-MM-DD' : '검색어를 입력하세요...'}
                            className="flex-grow p-2 text-gray-900 placeholder-gray-500 focus:outline-none bg-transparent border-none focus:ring-0"
                        />
                        {/* 검색 아이콘 */}
                        <button type="submit" className="p-2 text-gray-500 hover:text-gray-700">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </button>
                    </form>

                    {/* 결재 완료일 (완료된 결재 탭에서만 표시, 이제 별도 입력 필드) */}
                    {activeTab === 'completed' && (
                        <div className="mt-4">
                            <label htmlFor="searchCompletionDate" className="block text-sm font-medium text-gray-700">결재 완료일</label>
                            <input
                                // key="searchCompletionDate" // ★★★ key 프롭 제거 (불필요) ★★★
                                type="date"
                                id="searchCompletionDate"
                                value={searchCompletionDate}
                                onChange={(e) => setSearchCompletionDate(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    )}
                </div>

                {/* 결재 목록 탭 및 내용 */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="border-b border-gray-200 mb-6">
                        <nav className="-mb-px flex space-x-8">
                            {/* '전체 결재' 탭을 가장 먼저 배치 */}
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`py-4 px-1 border-b-2 font-medium text-base ${activeTab === 'all' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                전체 결재
                            </button>
                            <button
                                onClick={() => setActiveTab('toReview')}
                                className={`py-4 px-1 border-b-2 font-medium text-base ${activeTab === 'toReview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                받은 결재
                            </button>
                            <button
                                onClick={() => setActiveTab('submitted')}
                                className={`py-4 px-1 border-b-2 font-medium text-base ${activeTab === 'submitted' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                상신한 결재
                            </button>
                            <button
                                onClick={() => setActiveTab('completed')}
                                className={`py-4 px-1 border-b-2 font-medium text-base ${activeTab === 'completed' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                완료된 결재
                            </button>
                            <button
                                onClick={() => setActiveTab('referred')}
                                className={`py-4 px-1 border-b-2 font-medium text-base ${activeTab === 'referred' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                참조할 결재
                            </button>
                        </nav>
                    </div>

                    {loading ? (
                        <p className="text-center text-gray-500 py-10">결재 목록을 불러오는 중...</p>
                    ) : error ? (
                        <p className="text-center text-red-500 py-10">오류: {error}</p>
                    ) : (
                        <ApprovalList documents={documents} activeTab={activeTab} />
                    )}
                </div>
            </div>
        </div>
    );
}