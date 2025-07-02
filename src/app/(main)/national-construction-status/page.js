// src/app/(main)/national-construction-status/page.js
'use client'; // 클라이언트 컴포넌트임을 명시

import React, { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import styles from './NationalConstructionStatusPage.module.css'; // 해당 CSS 모듈 파일
import ConstructionSiteModal from '@/components/ConstructionSiteModal'; // 경로 확인 필요
import ToastNotification from '@/components/ToastNotification';   // 경로 확인 필요

const API_URL = '/api/construction-status';

const fetcher = async (url) => {
    const res = await fetch(url);
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: '데이터 로딩 중 오류 발생' }));
        const error = new Error(errorData.message || '알 수 없는 오류가 발생했습니다.');
        error.status = res.status;
        throw error;
    }
    return res.json();
};

// 정렬 아이콘 컴포넌트
const SortIcon = ({ direction }) => {
    if (!direction) return <span className={styles.sortIconPlaceholder}>↕</span>;
    return direction === 'asc' ? <span className={styles.sortIcon}>▲</span> : <span className={styles.sortIcon}>▼</span>;
};

// 여기가 페이지 컴포넌트의 시작이며, export default로 내보내져야 합니다.
export default function NationalConstructionStatusPage() {
    const { data: constructionData, error: swrError, isLoading: isLoadingData, mutate: mutateSites } = useSWR(
        API_URL,
        fetcher,
        {
            refreshInterval: 30000,
        }
    );

    // 화면에 표시할 헤더 설정
    const displayHeadersConfig = [
        { key: 'company_name', label: '업체명', sortable: true },
        { key: 'brand_name', label: '브랜드명', sortable: true },
        { key: 'complex_name', label: '단지명', sortable: true },
        { key: 'location', label: '지역', sortable: true },
        { key: 'move_in_schedule', label: '입주예정', sortable: true, isDate: true }, // isDate 플래그는 날짜 정렬에 사용
        { key: 'remarks', label: '비고', sortable: false },
    ];

    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'brand_name', direction: 'asc' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSite, setEditingSite] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState({ message: '', type: '' });

    const handleRefresh = () => {
        mutateSites();
    };

    // 날짜 문자열을 Date 객체로 변환 (정렬용)
    const parseDateStringForSort = (dateStr) => {
        if (!dateStr || typeof dateStr !== 'string') return null;
        let parts = dateStr.match(/^(\d{4})[.\-/](\d{1,2})$/);
        if (parts && parts.length === 3) return new Date(parseInt(parts[1]), parseInt(parts[2]) - 1, 1);
        parts = dateStr.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
        if (parts && parts.length === 4) return new Date(parseInt(parts[1]), parseInt(parts[2]) - 1, parseInt(parts[3]));
        parts = dateStr.match(/(\d{4})년\s*(\d{1,2})월(?:\s*(\d{1,2})일)?/);
        if (parts && parts.length >= 3) {
            const day = parts[3] ? parseInt(parts[3]) : 1;
            return new Date(parseInt(parts[1]), parseInt(parts[2]) -1, day);
        }
        parts = dateStr.match(/^(\d{4})$/);
        if (parts && parts.length === 2) return new Date(parseInt(parts[1]), 0, 1);
        parts = dateStr.match(/(\d{4})년/);
        if (parts && parts.length === 2) return new Date(parseInt(parts[1]), 0, 1);
        return null;
    };

    const processedData = useMemo(() => {
        if (!constructionData) return [];
        let SsrCompatibleData = Array.isArray(constructionData) ? [...constructionData] : [];
        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            SsrCompatibleData = SsrCompatibleData.filter(site =>
                displayHeadersConfig.some(header =>
                    site[header.key] && String(site[header.key]).toLowerCase().includes(lowerSearchTerm)
                )
            );
        }
        if (sortConfig.key) {
            const sortHeaderConfig = displayHeadersConfig.find(h => h.key === sortConfig.key);
            SsrCompatibleData.sort((a, b) => {
                let valA = a[sortConfig.key];
                let valB = b[sortConfig.key];
                if (sortHeaderConfig?.isDate) {
                    const dateA = parseDateStringForSort(valA);
                    const dateB = parseDateStringForSort(valB);
                    if (dateA === null && dateB === null) return 0;
                    if (dateA === null) return sortConfig.direction === 'asc' ? 1 : -1;
                    if (dateB === null) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (dateA < dateB) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (dateA > dateB) return sortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                } else {
                    valA = valA === null || valA === undefined ? '' : String(valA).toLowerCase();
                    valB = valB === null || valB === undefined ? '' : String(valB).toLowerCase();
                    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                }
            });
        }
        return SsrCompatibleData;
    }, [constructionData, searchTerm, sortConfig]);

    const requestSort = (key) => { /* ... 이전과 동일 ... */ };
    const showToast = (message, type) => { /* ... 이전과 동일 ... */ };
    const handleOpenModal = (site = null) => { /* ... 이전과 동일 ... */ };
    const handleCloseModal = () => { /* ... 이전과 동일 ... */ };
    const handleSaveSite = async (formData, siteIdToUpdate = null) => { /* ... 이전과 동일 ... */ };
    const handleDeleteSite = async (siteId, siteComplexName) => { /* ... 이전과 동일 ... */ };


    // 로딩, 에러, 데이터 없음 UI
    if (isLoadingData && (!processedData || processedData.length === 0) && !swrError) {
        return ( <div className={styles.container}><h1 className={styles.title}>전국공사현황</h1><div className={styles.loadingMessage}><div className={styles.spinner}></div>데이터를 불러오는 중입니다...</div></div> );
    }
    if (swrError) {
        return ( <div className={styles.container}><h1 className={styles.title}>전국공사현황</h1><p className={styles.errorMessage}>데이터를 가져오는 중 오류가 발생했습니다: {swrError.message}</p><button onClick={handleRefresh} className={`${styles.actionButton} ${styles.refreshButton}`}>다시 시도</button></div> );
    }

    // 메인 UI 렌더링
    return (
        <div className={styles.container}>
            <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: '' })} />
            <header className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>전국 공사현황</h1>
                <div className={styles.headerControls}>
                    <input type="text" placeholder="전체 내용에서 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={styles.searchInput} disabled={isSubmitting}/>
                    <button onClick={handleRefresh} className={`${styles.actionButton} ${styles.refreshButton}`} disabled={isLoadingData || isSubmitting}>{isLoadingData ? '로딩중...' : (isSubmitting ? '처리중...' : '새로고침')}</button>
                    <button onClick={() => handleOpenModal()} className={`${styles.actionButton} ${styles.addButton}`} disabled={isSubmitting}>내역 추가</button>
                </div>
            </header>
            {isModalOpen && (<ConstructionSiteModal siteToEdit={editingSite} onClose={handleCloseModal} onSave={handleSaveSite} isLoading={isSubmitting}/>)}
            
            {(!processedData || processedData.length === 0) && !isLoadingData ? (
                 <div className={styles.infoMessageContainer}><p className={styles.infoMessage}>{searchTerm ? `'${searchTerm}'에 대한 검색 결과가 없습니다.` : "표시할 공사 현황 데이터가 없습니다."}</p></div>
            ) : (
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                {displayHeadersConfig.map((header) => (
                                    <th key={header.key} className={`${styles.th} ${header.sortable ? styles.sortableHeader : ''}`} onClick={() => header.sortable && requestSort(header.key)}>
                                        {header.label}
                                        {header.sortable && <SortIcon direction={sortConfig.key === header.key ? sortConfig.direction : null} />}
                                    </th>
                                ))}
                                <th className={styles.th}>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedData.map((item) => (
                                <tr key={item.id}>
                                    {displayHeadersConfig.map((header) => (
                                        <td key={`${header.key}-${item.id}`} className={styles.td}>
                                            {header.key === 'remarks' && typeof item[header.key] === 'string' && (item[header.key].startsWith('http://') || item[header.key].startsWith('https://')) ? (
                                                <a href={item[header.key]} target="_blank" rel="noopener noreferrer" className={styles.link}>
                                                    링크 보기
                                                </a>
                                            ) : (
                                                item[header.key]
                                            )}
                                        </td>
                                    ))}
                                    <td className={`${styles.td} ${styles.actionsCell}`}>
                                        <button className={styles.actionButtonSmall} onClick={() => handleOpenModal(item)} disabled={isSubmitting}>수정</button>
                                        <button className={`${styles.actionButtonSmall} ${styles.deleteButton}`} onClick={() => handleDeleteSite(item.id, item.complex_name)} disabled={isSubmitting}>삭제</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}