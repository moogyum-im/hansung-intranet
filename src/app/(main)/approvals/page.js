'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { 
  FileText, CheckCircle2, Clock, ArrowRight, 
  Search, ChevronRight, AlertCircle, Share2, X, Search as SearchIcon, Users, 
  LayoutDashboard, CheckSquare, FileX2, FileClock, Loader2,
  FolderOpen, CornerDownRight, Inbox
} from 'lucide-react';

const formatNumber = (num) => {
    if (num === null || num === undefined || num === "" || isNaN(num) || Number(num.toString().replace(/,/g, '')) === 0) return "-";
    const n = Number(num.toString().replace(/,/g, ''));
    if (n % 1 !== 0) return n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 4 });
    return Math.round(n).toLocaleString();
};

// --- 문서 공유 모달 컴포넌트 ---
function ShareModal({ isOpen, onClose, doc, currentUser, allEmployees }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [loading, setLoading] = useState(false);

    const deptPriority = { '미지정': 0, '최고 경영진': 1, '공무부': 2, '관리부': 3, '전략기획부': 4 };

    const groupedEmployees = useMemo(() => {
        if (!allEmployees) return {};
        const filtered = allEmployees.filter(emp => 
            emp.id !== currentUser.id && 
            emp.employment_status === '재직' && 
            (emp.full_name?.includes(searchTerm) || emp.department?.includes(searchTerm))
        );

        const groups = filtered.reduce((acc, emp) => {
            const dept = emp.department || '미지정';
            if (!acc[dept]) acc[dept] = [];
            acc[dept].push(emp);
            return acc;
        }, {});

        const sortedDepts = Object.keys(groups).sort((a, b) => {
            return (deptPriority[a] ?? 99) - (deptPriority[b] ?? 99);
        });

        const result = {};
        sortedDepts.forEach(dept => {
            result[dept] = groups[dept].sort((a, b) => a.full_name.localeCompare(b.full_name));
        });

        return result;
    }, [allEmployees, searchTerm, currentUser.id]);

    const handleShare = async () => {
        if (!selectedEmp) return toast.error("공유할 직원을 선택하세요.");
        setLoading(true);
        try {
            const { error: refError } = await supabase.from('approval_document_referrers').insert({
                document_id: doc.id,
                referrer_id: selectedEmp.id,
                referrer_name: selectedEmp.full_name,
                referrer_position: selectedEmp.position
            });
            if (refError) throw refError;

            await supabase.from('approval_share_logs').insert({
                doc_id: doc.id,
                sender_id: currentUser.id,
                receiver_id: selectedEmp.id,
                reason: '문서 공유 전달'
            });

            await supabase.from('notifications').insert({
                recipient_id: selectedEmp.id,
                type: 'document_shared',
                content: `📢 [문서공유] ${currentUser.full_name}님이 '${doc.title}' 문서를 공유했습니다.`,
                link: `/approvals/${doc.id}`,
                is_read: false
            });

            toast.success(`${selectedEmp.full_name}님에게 공유되었습니다.`);
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("공유 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm font-bold">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in duration-200">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <Share2 size={20} className="text-blue-600"/> 문서 공유하기
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"><X size={20}/></button>
                </div>
                <div className="p-8 space-y-6">
                    <div className="relative">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" placeholder="이름 또는 부서 검색" 
                            className="w-full pl-12 pr-4 py-4 bg-slate-100 border-none rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                        {Object.keys(groupedEmployees).length > 0 ? Object.keys(groupedEmployees).map(dept => (
                            <div key={dept} className="mb-6 last:mb-0">
                                <div className="flex items-center gap-2 mb-2 px-1">
                                    <Users size={12} className="text-blue-500" />
                                    <span className="text-[11px] font-black text-blue-600 uppercase tracking-widest">
                                        {dept === '미지정' ? '부서 미지정 / 관리자' : dept}
                                    </span>
                                    <div className="flex-1 h-px bg-blue-50" />
                                </div>
                                <div className="space-y-1">
                                    {groupedEmployees[dept].map(emp => (
                                        <button 
                                            key={emp.id} 
                                            onClick={() => setSelectedEmp(emp)}
                                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${selectedEmp?.id === emp.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'hover:bg-slate-50 text-slate-700'}`}
                                        >
                                            <div className="text-left">
                                                <span className="text-[14px] font-black block">{emp.full_name} {emp.position}</span>
                                            </div>
                                            {selectedEmp?.id === emp.id && <CheckCircle2 size={18} />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )) : (
                            <div className="py-12 text-center text-slate-300 font-black">
                                <SearchIcon size={32} className="mx-auto mb-2 opacity-20" />
                                <p className="text-xs">재직 중인 직원이 없습니다.</p>
                            </div>
                        )}
                    </div>
                    
                    <button 
                        onClick={handleShare} disabled={loading || !selectedEmp}
                        className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm hover:bg-black transition-all disabled:opacity-30 shadow-xl active:scale-[0.98]"
                    >
                        {loading ? "전송 중..." : "선택한 직원에게 문서 공유"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// 🚀 최고 경영진 전용 1-Depth 위젯
function ExecutiveApprovalsWidget({ toReview, approved, rejected, currentUserFullName, allEmployees }) {
    const [activeTab, setActiveTab] = useState('pending');
    const [docSearchTerm, setDocSearchTerm] = useState('');

    // 🚀 [수정] 본인이 처리 완료한(승인/반려) 문서를 정확히 필터링하도록 교정
    const othersApproved = useMemo(() => approved.filter(doc => doc.creator_name !== currentUserFullName), [approved, currentUserFullName]);
    const othersRejected = useMemo(() => rejected.filter(doc => doc.creator_name !== currentUserFullName), [rejected, currentUserFullName]);

    const allUniqueDocs = useMemo(() => {
        const map = new Map();
        [...toReview, ...othersApproved, ...othersRejected].forEach(doc => {
            if (!map.has(doc.id)) map.set(doc.id, doc);
        });
        return Array.from(map.values());
    }, [toReview, othersApproved, othersRejected]);

    const filteredData = useMemo(() => {
        if (docSearchTerm.trim() !== '') {
            const lowerTerm = docSearchTerm.toLowerCase();
            return allUniqueDocs.filter(doc => 
                (doc.title && doc.title.toLowerCase().includes(lowerTerm)) || 
                (doc.creator_name && doc.creator_name.toLowerCase().includes(lowerTerm))
            );
        }

        if (activeTab === 'pending') return toReview;
        if (activeTab === 'completed') return othersApproved;
        if (activeTab === 'rejected') return othersRejected;
        return [];
    }, [activeTab, toReview, othersApproved, othersRejected, docSearchTerm, allUniqueDocs]);

    const tabs = [
        { key: 'pending', label: '결재 대기', count: toReview.length, icon: FileClock },
        { key: 'completed', label: '결재 완료', count: othersApproved.length, icon: CheckSquare },
        { key: 'rejected', label: '반려 내역', count: othersRejected.length, icon: FileX2 },
    ];

    const getStatusChip = (status) => {
        const statusMap = { 
            'pending': { text: '대기중', style: 'bg-amber-50 text-amber-700 ring-1 ring-amber-500/30' }, 
            '진행중': { text: '대기중', style: 'bg-amber-50 text-amber-700 ring-1 ring-amber-500/30' }, 
            '대기': { text: '대기중', style: 'bg-amber-50 text-amber-700 ring-1 ring-amber-500/30' }, 
            '승인': { text: '승인완료', style: 'bg-blue-50 text-blue-700 ring-1 ring-blue-500/30' }, 
            '반려': { text: '반려됨', style: 'bg-rose-50 text-rose-700 ring-1 ring-rose-500/30' },
            '완료': { text: '승인완료', style: 'bg-blue-50 text-blue-700 ring-1 ring-blue-500/30' },
        };
        const currentStatus = statusMap[status] || { text: status, style: 'bg-slate-50 text-slate-600 ring-1 ring-slate-500/30' };
        return <span className={`text-[11px] font-black px-2.5 py-1 rounded-full ${currentStatus.style}`}>{currentStatus.text}</span>;
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden font-bold relative flex flex-col h-[700px]">
            <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <nav className="flex space-x-3 overflow-x-auto custom-scrollbar shrink-0">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.key;
                        return (
                            <button 
                                key={tab.key} onClick={() => { setActiveTab(tab.key); setDocSearchTerm(''); }} 
                                className={`flex items-center gap-2 whitespace-nowrap py-2.5 px-5 rounded-xl font-black text-[15px] transition-all duration-200 ${active ? 'bg-slate-900 text-white shadow-md' : 'bg-transparent text-slate-500 hover:bg-slate-50 border border-transparent hover:border-slate-200'}`}
                            >
                                <Icon size={16} className={active ? 'text-blue-400' : 'text-slate-400'} />
                                {tab.label}
                                <span className={`ml-1.5 text-[12px] px-2.5 py-0.5 rounded-full font-black ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{tab.count}</span>
                            </button>
                        );
                    })}
                </nav>
                
                <div className="relative w-full sm:max-w-md shrink-0">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" placeholder="문서 제목 또는 기안자 검색" 
                        className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-slate-400"
                        value={docSearchTerm} onChange={(e) => setDocSearchTerm(e.target.value)}
                    />
                    {docSearchTerm && <button onClick={() => setDocSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={16} /></button>}
                </div>
            </div>

            {docSearchTerm.trim() !== '' && (
                <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
                    <SearchIcon size={14} className="text-blue-500" />
                    <span className="text-[13px] font-black text-blue-700">검색 결과 ({filteredData.length}건)</span>
                </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 bg-slate-50/30">
                {filteredData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400 font-bold">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            {docSearchTerm ? <SearchIcon size={32} className="text-slate-300" /> : <FileText size={32} className="text-slate-300" />}
                        </div>
                        {docSearchTerm ? '검색 결과가 없습니다.' : '해당하는 문서가 없습니다.'}
                    </div>
                ) : (
                    filteredData.map(doc => {
                        const safeCreatorName = doc.creator_name || '알수없음';
                        return (
                            <Link href={`/approvals/${doc.id}`} key={doc.id} className="group bg-white border border-slate-200/60 rounded-2xl p-5 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex items-center justify-between">
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-3 mb-2 font-bold">
                                        <p className="font-black text-[16px] text-slate-800 truncate group-hover:text-blue-600 transition-colors">{doc.title}</p>
                                    </div>
                                    <div className="flex items-center text-[13px] text-slate-500 gap-3 font-bold">
                                        <span className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-600 border border-slate-200">
                                                {safeCreatorName.charAt(0)}
                                            </div>
                                            기안자: {safeCreatorName}
                                        </span>
                                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                                        <span className="flex items-center gap-1.5"><Clock size={14} className="text-slate-400"/>상신일: {new Date(doc.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="shrink-0 flex items-center gap-4">
                                    {getStatusChip(doc.status)}
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                                        <ChevronRight size={20} />
                                    </div>
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>
        </div>
    );
}

// --- 일반 임직원용 기존 위젯 ---
function StandardApprovalsWidget({ toReview, submitted, approved, rejected, referred, currentUserId, currentUserFullName, allEmployees }) {
    const [activeMainTab, setActiveMainTab] = useState('submitted');
    const [activeSubTab, setActiveSubTab] = useState('progress');
    const [lastViewed, setLastViewed] = useState({});
    const [shareTarget, setShareTarget] = useState(null);
    const [docSearchTerm, setDocSearchTerm] = useState('');

    useEffect(() => {
        const savedTime = localStorage.getItem('HANSUNG_APPROV_VIEW_V6');
        if (savedTime) setLastViewed(JSON.parse(savedTime));
    }, []);

    const updateLastViewed = (key) => {
        const updatedTime = { ...lastViewed, [key]: new Date().toISOString() };
        setLastViewed(updatedTime);
        localStorage.setItem('HANSUNG_APPROV_VIEW_V6', JSON.stringify(updatedTime));
    };

    const handleMainTabClick = (key) => {
        setActiveMainTab(key);
        setDocSearchTerm(''); 
        if (key === 'received') {
            setActiveSubTab('pending');
            updateLastViewed('pending');
        } else if (key === 'submitted') {
            setActiveSubTab('progress');
            updateLastViewed('progress');
        } else {
            updateLastViewed(key);
        }
    };

    const handleSubTabClick = (key) => {
        setActiveSubTab(key);
        setDocSearchTerm(''); 
        updateLastViewed(key);
    };

    const allUniqueDocs = useMemo(() => {
        const map = new Map();
        [...toReview, ...submitted, ...approved, ...rejected, ...referred].forEach(doc => {
            if (!map.has(doc.id)) map.set(doc.id, doc);
        });
        return Array.from(map.values());
    }, [toReview, submitted, approved, rejected, referred]);

    // 🚀 [수정] 본인이 처리 완료한(승인/반려) 문서를 정확히 필터링하도록 교정
    const othersApproved = useMemo(() => approved.filter(doc => doc.creator_name !== currentUserFullName), [approved, currentUserFullName]);
    const othersRejected = useMemo(() => rejected.filter(doc => doc.creator_name !== currentUserFullName), [rejected, currentUserFullName]);
    
    const myApproved = useMemo(() => approved.filter(doc => doc.creator_name === currentUserFullName), [approved, currentUserFullName]);
    const myRejected = useMemo(() => rejected.filter(doc => doc.creator_name === currentUserFullName), [rejected, currentUserFullName]);
    
    const cleanReferred = useMemo(() => referred.filter(doc => doc.creator_name !== currentUserFullName), [referred, currentUserFullName]);

    const filteredData = useMemo(() => {
        if (docSearchTerm.trim() !== '') {
            const lowerTerm = docSearchTerm.toLowerCase();
            return allUniqueDocs.filter(doc => 
                (doc.title && doc.title.toLowerCase().includes(lowerTerm)) || 
                (doc.creator_name && doc.creator_name.toLowerCase().includes(lowerTerm))
            );
        }

        let currentData = [];
        if (activeMainTab === 'received') {
            if (activeSubTab === 'pending') currentData = toReview;
            if (activeSubTab === 'completed') currentData = othersApproved;
            if (activeSubTab === 'rejected') currentData = othersRejected;
        } else if (activeMainTab === 'submitted') {
            if (activeSubTab === 'progress') currentData = submitted;
            if (activeSubTab === 'completed') currentData = myApproved;
            if (activeSubTab === 'rejected') currentData = myRejected;
        } else if (activeMainTab === 'referred') {
            currentData = cleanReferred;
        }

        return currentData;
    }, [activeMainTab, activeSubTab, toReview, submitted, othersApproved, othersRejected, myApproved, myRejected, cleanReferred, docSearchTerm, allUniqueDocs]);

    const getStatusChip = (status) => {
        const statusMap = { 
            'pending': { text: '진행중', style: 'bg-amber-50 text-amber-700 ring-1 ring-amber-500/30' }, 
            '진행중': { text: '진행중', style: 'bg-amber-50 text-amber-700 ring-1 ring-amber-500/30' }, 
            '대기': { text: '대기중', style: 'bg-amber-50 text-amber-700 ring-1 ring-amber-500/30' }, 
            '승인': { text: '승인완료', style: 'bg-blue-50 text-blue-700 ring-1 ring-blue-500/30' }, 
            '반려': { text: '반려됨', style: 'bg-rose-50 text-rose-700 ring-1 ring-rose-500/30' },
            '완료': { text: '승인완료', style: 'bg-blue-50 text-blue-700 ring-1 ring-blue-500/30' },
        };
        const currentStatus = statusMap[status] || { text: status, style: 'bg-slate-50 text-slate-600 ring-1 ring-slate-500/30' };
        return <span className={`text-[11px] font-black px-2.5 py-1 rounded-full ${currentStatus.style}`}>{currentStatus.text}</span>;
    };

    const hasNewUpdate = (key, list) => {
        if (!list || list.length === 0) return false;
        const lastTime = lastViewed[key];
        if (!lastTime) return true;
        return list.some(doc => new Date(doc.created_at) > new Date(lastTime));
    };

    const mainTabs = [
        { 
            key: 'submitted', 
            label: '상신한 결재', 
            count: submitted.length + myApproved.length + myRejected.length, 
            icon: FolderOpen,
            hasUpdate: hasNewUpdate('progress', submitted) || hasNewUpdate('completed', myApproved) || hasNewUpdate('rejected', myRejected)
        },
        { 
            key: 'received', 
            label: '받은 결재', 
            count: toReview.length + othersApproved.length + othersRejected.length, 
            icon: Inbox, 
            hasUpdate: hasNewUpdate('pending', toReview) || hasNewUpdate('completed', othersApproved) || hasNewUpdate('rejected', othersRejected) 
        },
        { 
            key: 'referred', 
            label: '참조 결재', 
            count: cleanReferred.length, 
            icon: Share2, 
            hasUpdate: hasNewUpdate('referred', cleanReferred) 
        },
    ];

    let subTabs = [];
    if (activeMainTab === 'received') {
        subTabs = [
            { key: 'pending', label: '결재 대기', count: toReview.length, icon: FileClock, data: toReview },
            { key: 'completed', label: '완료한 결재', count: othersApproved.length, icon: CheckSquare, data: othersApproved },
            { key: 'rejected', label: '반려한 결재', count: othersRejected.length, icon: FileX2, data: othersRejected },
        ];
    } else if (activeMainTab === 'submitted') {
        subTabs = [
            { key: 'progress', label: '진행 중', count: submitted.length, icon: ArrowRight, data: submitted },
            { key: 'completed', label: '완료된 결재', count: myApproved.length, icon: CheckSquare, data: myApproved },
            { key: 'rejected', label: '반려된 결재', count: myRejected.length, icon: FileX2, data: myRejected },
        ];
    }

    return (
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden font-bold relative flex flex-col h-[600px]">
            <ShareModal 
                isOpen={!!shareTarget} onClose={() => setShareTarget(null)} 
                doc={shareTarget} currentUser={{id: currentUserId, full_name: currentUserFullName}}
                allEmployees={allEmployees}
            />

            <div className="p-3 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <nav className="flex space-x-2 overflow-x-auto custom-scrollbar shrink-0">
                    {mainTabs.map((tab) => {
                        const Icon = tab.icon;
                        const active = activeMainTab === tab.key;
                        return (
                            <button 
                                key={tab.key} onClick={() => handleMainTabClick(tab.key)} 
                                className={`relative flex items-center gap-2 whitespace-nowrap py-2 px-4 rounded-xl font-black text-[14px] transition-all duration-200 ${active ? 'bg-slate-900 text-white shadow-md' : 'bg-transparent text-slate-500 hover:bg-slate-50 border border-transparent hover:border-slate-200'}`}
                            >
                                {tab.hasUpdate && <span className="absolute top-0 right-0 -mt-0.5 -mr-0.5 w-2 h-2 bg-rose-500 border-2 border-white rounded-full" />}
                                <Icon size={14} className={active ? 'text-blue-400' : 'text-slate-400'} />
                                {tab.label}
                                <span className={`ml-1 text-[11px] px-2 py-0.5 rounded-full font-black ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{tab.count}</span>
                            </button>
                        );
                    })}
                </nav>
                
                <div className="relative w-full sm:max-w-xs shrink-0">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                        type="text" placeholder="전체 문서 제목 또는 기안자 검색" 
                        className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-slate-400"
                        value={docSearchTerm} onChange={(e) => setDocSearchTerm(e.target.value)}
                    />
                    {docSearchTerm && <button onClick={() => setDocSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
                </div>
            </div>

            {docSearchTerm.trim() !== '' ? (
                <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
                    <SearchIcon size={14} className="text-blue-500" />
                    <span className="text-[12px] font-black text-blue-700">전체 문서 통합 검색 결과 ({filteredData.length}건)</span>
                </div>
            ) : (
                (activeMainTab === 'received' || activeMainTab === 'submitted') && (
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-3 overflow-x-auto custom-scrollbar shrink-0">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><CornerDownRight size={12} className="text-slate-300"/> 폴더</span>
                        <div className="w-px h-3 bg-slate-300" />
                        {subTabs.map((tab) => {
                            const Icon = tab.icon;
                            const active = activeSubTab === tab.key;
                            return (
                                <button 
                                    key={tab.key} onClick={() => handleSubTabClick(tab.key)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-black transition-all ${active ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
                                >
                                    {hasNewUpdate(tab.key, tab.data) && <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />}
                                    <Icon size={12} className={active ? 'text-blue-500' : 'opacity-50'}/> 
                                    {tab.label} <span className="opacity-50 text-[10px]">({tab.count})</span>
                                </button>
                            );
                        })}
                    </div>
                )
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-slate-50/30">
                {filteredData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400 font-bold">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            {docSearchTerm ? <SearchIcon size={24} className="text-slate-300" /> : <FileText size={24} className="text-slate-300" />}
                        </div>
                        {docSearchTerm ? '검색 결과가 없습니다.' : '해당하는 문서가 없습니다.'}
                    </div>
                ) : (
                    filteredData.map(doc => {
                        const currentApprover = doc.current_approver_id ? allEmployees.find(e => e.id === doc.current_approver_id) : null;
                        const safeCreatorName = doc.creator_name || '알수없음';

                        return (
                            <div key={doc.id} className="group bg-white border border-slate-200/60 rounded-2xl p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex items-center justify-between">
                                <Link href={`/approvals/${doc.id}`} className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1.5 font-bold">
                                            <p className="font-black text-[15px] text-slate-800 truncate group-hover:text-blue-600 transition-colors">{doc.title}</p>
                                        </div>
                                        <div className="flex items-center text-[12px] text-slate-500 gap-3 font-bold">
                                            <span className="flex items-center gap-1.5">
                                                <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-600 border border-slate-200">
                                                    {safeCreatorName.charAt(0)}
                                                </div>
                                                {safeCreatorName === currentUserFullName ? '상신함' : '기안자'}: {safeCreatorName}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                                            <span className="flex items-center gap-1.5"><Clock size={12} className="text-slate-400"/>{new Date(doc.created_at).toLocaleDateString()}</span>
                                            
                                            {['진행중', 'pending', '대기'].includes(doc.status) && currentApprover && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                    <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 whitespace-nowrap">
                                                        현재 검토: {currentApprover.full_name} {currentApprover.position}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="shrink-0 flex items-center justify-start sm:justify-end mt-2 sm:mt-0">
                                        {getStatusChip(doc.status)}
                                    </div>
                                </Link>
                                
                                <div className="flex items-center gap-2 pl-4 ml-4 border-l border-slate-100">
                                    {activeMainTab === 'referred' && (
                                        <button 
                                            onClick={() => setShareTarget(doc)}
                                            className="p-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-all border border-slate-200 flex items-center gap-1.5 text-[11px] font-black"
                                        >
                                            <Share2 size={14} /> 공유
                                        </button>
                                    )}
                                    <Link href={`/approvals/${doc.id}`} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                                        <ChevronRight size={18} />
                                    </Link>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

// --- 메인 페이지 조립부 ---
export default function ApprovalsPage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const [approvalsData, setApprovalsData] = useState({ toReview: [], submitted: [], approved: [], rejected: [], referred: [] });
    const [allEmployees, setAllEmployees] = useState([]);
    const [loadingApprovals, setLoadingApprovals] = useState(true);

    const fetchData = useCallback(async (currentEmployee) => {
        if (!currentEmployee) return;
        setLoadingApprovals(true);
        try {
            // 🚀 [수정] DB에서 가져온 결재 목록 데이터 구조 개선
            const { data: appData } = await supabase.rpc('get_my_approvals', { p_user_id: currentEmployee.id });
            
            if (appData) {
                const pendingDocIds = appData.filter(d => ['진행중', 'pending', '대기'].includes(d.status)).map(d => d.id);
                
                if (pendingDocIds.length > 0) {
                    const { data: docData } = await supabase
                        .from('approval_documents')
                        .select('id, current_approver_id')
                        .in('id', pendingDocIds);
                    
                    if (docData) {
                        const approverMap = new Map(docData.map(d => [d.id, d.current_approver_id]));
                        appData.forEach(doc => {
                            if (approverMap.has(doc.id)) {
                                doc.current_approver_id = approverMap.get(doc.id);
                            }
                        });
                    }
                }

                const getUniqueDocs = (docs) => {
                    const uniqueMap = new Map();
                    docs.forEach(doc => uniqueMap.set(doc.id, doc));
                    return Array.from(uniqueMap.values());
                };

                // 🚀 [수정] 본인이 승인한 문서는 카테고리를 'approved'로 강제 분류하여 '완료된 결재' 탭으로 이동
                setApprovalsData({
                    toReview: getUniqueDocs(appData.filter(doc => doc.category === 'to_review' && doc.status !== '반려' && doc.my_approval_status !== '승인')),
                    submitted: getUniqueDocs(appData.filter(doc => doc.category === 'submitted' && doc.status !== '반려' && doc.status !== '승인' && doc.status !== '완료')),
                    
                    // 문서 전체가 완료되지 않았어도 내가 승인했으면 승인(완료) 탭에 표시
                    approved: getUniqueDocs(appData.filter(doc => 
                        (doc.status === '승인' || doc.status === '완료' || doc.my_approval_status === '승인') && doc.status !== '반려'
                    )),
                    
                    rejected: getUniqueDocs(appData.filter(doc => doc.status === '반려' || doc.my_approval_status === '반려')),
                    referred: getUniqueDocs(appData.filter(doc => doc.category === 'referred')),
                });
            }

            const { data: empData } = await supabase.from('profiles').select('id, full_name, department, position, role, status, employment_status');
            setAllEmployees(empData || []);

        } catch (error) { console.error(error); } finally { setLoadingApprovals(false); }
    }, []);

    useEffect(() => { if (employee) fetchData(employee); }, [employee, fetchData]);

    if (employeeLoading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-blue-600" size={32} />
                <span className="font-black text-slate-500 tracking-widest text-sm">LOADING WORKSPACE...</span>
            </div>
        </div>
    );

    const quickDrafts = [
        { title: '휴가 신청서', href: '/approvals/leave', icon: '🌴', color: 'bg-emerald-50 text-emerald-600' },
        { title: '출장 신청서', href: '/approvals/business-trip', icon: '✈️', color: 'bg-blue-50 text-blue-600' },
        { title: '출장 여비 정산서', href: '/approvals/expense-settlement', icon: '🧾', color: 'bg-indigo-50 text-indigo-600' },
        { title: '지출 결의서', href: '/approvals/expense', icon: '💳', color: 'bg-amber-50 text-amber-600' },
        { title: '내부 결재서', href: '/approvals/internal', icon: '📑', color: 'bg-purple-50 text-purple-600' },
        { title: '업무 보고서', href: '/approvals/work-report', icon: '📈', color: 'bg-cyan-50 text-cyan-600' },
        { title: '시말서', href: '/approvals/apology', icon: '⚠️', color: 'bg-rose-50 text-rose-600' }
    ];

    const isExecutive = employee?.department === '최고 경영진';

    return (
        <div className="p-4 sm:p-8 bg-[#f8fafc] min-h-screen font-bold text-slate-800 selection:bg-blue-200">
            <header className="max-w-[1400px] mx-auto mb-8">
                <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl p-6 shadow-xl shadow-slate-950/20 relative overflow-hidden border border-slate-800">
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-5 rounded-full blur-3xl mix-blend-overlay"></div>
                    
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-6">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-blue-400 font-black text-[10px] tracking-[0.2em] uppercase opacity-90">
                                    <LayoutDashboard size={12} /> Smart Approval Portal
                                </div>
                                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                                    안녕하세요, <span className="text-blue-400">{employee?.full_name}</span>님!
                                </h1>
                                <p className="text-[10px] font-bold text-slate-400 opacity-80 mt-1">신속한 결재 처리를 도와드립니다.</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-inner">
                            <div className="flex items-center gap-2.5 px-3">
                                <span className="text-3xl font-black text-white">{approvalsData.toReview.length}</span>
                                <span className="text-[11px] font-black text-blue-200 whitespace-nowrap tracking-tighter">결재 대기</span>
                            </div>
                            <div className="w-px h-8 bg-white/10" />
                            <div className="flex items-center gap-2.5 px-3">
                                <span className="text-3xl font-black text-white">{approvalsData.submitted.length}</span>
                                <span className="text-[11px] font-black text-slate-300 whitespace-nowrap tracking-tighter">진행 중</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
            
            <main className="max-w-[1400px] mx-auto grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
                <section className={isExecutive ? "xl:col-span-3 space-y-4" : "xl:col-span-2 space-y-4"}>
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
                        <h2 className="text-xl font-black text-slate-800">결재 함 내역</h2>
                    </div>
                    
                    {!loadingApprovals ? (
                        isExecutive ? (
                            <ExecutiveApprovalsWidget 
                                {...approvalsData} 
                                currentUserFullName={employee?.full_name} 
                                allEmployees={allEmployees}
                            />
                        ) : (
                            <StandardApprovalsWidget 
                                {...approvalsData}
                                currentUserId={employee?.id} 
                                currentUserFullName={employee?.full_name}
                                allEmployees={allEmployees}
                            />
                        )
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-3xl h-[600px] flex items-center justify-center">
                            <div className="flex flex-col items-center gap-3 opacity-50">
                                <Loader2 className="animate-spin text-slate-400" size={32} />
                                <span className="font-black text-slate-400 text-sm">데이터 동기화 중...</span>
                            </div>
                        </div>
                    )}
                </section>

                {!isExecutive && (
                    <section className="space-y-4">
                        <div className="flex items-center gap-3 px-2">
                            <div className="w-2 h-6 bg-slate-800 rounded-full"></div>
                            <h2 className="text-xl font-black text-slate-800">빠른 기안 작성</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
                            {quickDrafts.map((form) => (
                                <Link 
                                    href={form.href} key={form.title} 
                                    className="group bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:border-blue-400 hover:shadow-md transition-all duration-200 flex items-center gap-4"
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-transform group-hover:scale-110 ${form.color}`}>
                                        {form.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-black text-slate-700 group-hover:text-blue-600 transition-colors text-[14px] mb-0.5">{form.title}</h3>
                                        <p className="text-[11px] font-bold text-slate-400">양식 작성하기</p>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <ArrowRight size={14} strokeWidth={3} />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}