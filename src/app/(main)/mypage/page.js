// 파일 경로: src/app/(main)/mypage/page.js
'use client'; 

import { useState, useEffect, useCallback } from 'react';
import { useEmployee } from 'contexts/EmployeeContext';
import { supabase } from 'lib/supabase/client';
import Link from 'next/link'; 

// 외부 컴포넌트 import
import MyAttendanceWidget from '@/components/MyAttendanceWidget';
import ApprovalItem from '@/components/ApprovalItem';
import LeaveCalendar from './LeaveCalendar';
import ClientSideOnlyWrapper from '@/components/ClientSideOnlyWrapper'; 

// WorkLogModal 컴포넌트 (UI 개선)
function WorkLogModal({ isOpen, onClose, onSave, logToEdit, allEmployees, isAdmin, employee }) {
    const [formData, setFormData] = useState({ report_date: '', today_summary: '', tomorrow_plan: '', notes: '' });
    const [selectedTargetUserId, setSelectedTargetUserId] = useState('');
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        setFormData({ report_date: logToEdit?.report_date || today, today_summary: logToEdit?.today_summary || '', tomorrow_plan: logToEdit?.tomorrow_plan || '', notes: logToEdit?.notes || '' });
        setSelectedTargetUserId(logToEdit ? logToEdit.user_id : employee?.id || '');
    }, [logToEdit, employee]);
    const handleChange = (e) => { setFormData({ ...formData, [e.target.name]: e.target.value }); };
    const handleSubmit = () => { if (!formData.report_date || !selectedTargetUserId) return alert("필수 항목을 모두 입력해주세요."); onSave(formData, logToEdit?.id, selectedTargetUserId); };
    if (!isOpen) return null;
    
    const BaseInputStyles = "block w-full mt-1 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500";
    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b"><h2 className="text-lg font-bold">{logToEdit ? "업무일지 수정" : "업무일지 작성"}</h2></div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div><label className="font-medium">보고 날짜</label><input type="date" name="report_date" value={formData.report_date} onChange={handleChange} className={BaseInputStyles} /></div>
                    <div><label className="font-medium">대상 직원</label><select value={selectedTargetUserId} onChange={(e) => setSelectedTargetUserId(e.target.value)} className={BaseInputStyles} disabled={!isAdmin}>{allEmployees.map(emp => (<option key={emp.id} value={emp.id}>{emp.full_name} ({emp.department})</option>))}</select></div>
                    <div><label className="font-medium">금일 업무 요약</label><textarea name="today_summary" value={formData.today_summary} onChange={handleChange} rows="5" className={BaseInputStyles} placeholder="오늘 수행한 주요 업무를 요약해주세요."></textarea></div>
                    <div><label className="font-medium">명일 업무 계획</label><textarea name="tomorrow_plan" value={formData.tomorrow_plan} onChange={handleChange} rows="5" className={BaseInputStyles} placeholder="내일 진행할 업무 계획을 작성해주세요."></textarea></div>
                    <div><label className="font-medium">특이사항 및 협조 요청</label><textarea name="notes" value={formData.notes} onChange={handleChange} rows="3" className={BaseInputStyles} placeholder="업무 중 발생한 특이사항이나 다른 팀/팀원의 협조가 필요한 내용을 기재합니다."></textarea></div>
                </div>
                <div className="px-6 py-4 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">취소</button>
                    <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">저장하기</button>
                </div>
            </div>
        </div>
    );
}

// WorkLogItem 컴포넌트 (UI 개선)
function WorkLogItem({ log, onEdit, onDelete, canManageThisLog, isExpanded, onToggleExpand }) {
    return (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
            <button onClick={onToggleExpand} className="w-full flex justify-between items-start text-left p-4 hover:bg-gray-50 transition-colors">
                <div className="flex-1 pr-4">
                    <p className="text-sm font-semibold text-gray-800">{log.report_date} 업무일지</p>
                    <p className="text-xs text-gray-600 mt-1">작성자: {log.creator?.full_name || '알 수 없음'} ({log.department})</p>
                    <p className="text-sm text-gray-700 mt-2 line-clamp-2">{log.today_summary || '-'}</p>
                </div>
                <div className="flex-shrink-0 pt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-400 transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </div>
            </button>
            {isExpanded && (
                <div className="p-4 border-t border-gray-200 space-y-3 text-sm text-gray-700 bg-gray-50/50">
                    <div><p className="font-semibold">금일 업무 요약:</p><p className="ml-1 mt-1 pl-2 border-l-2 whitespace-pre-wrap">{log.today_summary || '-'}</p></div>
                    <div><p className="font-semibold">명일 업무 계획:</p><p className="ml-1 mt-1 pl-2 border-l-2 whitespace-pre-wrap">{log.tomorrow_plan || '-'}</p></div>
                    <div><p className="font-semibold">특이사항 및 협조 요청:</p><p className="ml-1 mt-1 pl-2 border-l-2 whitespace-pre-wrap">{log.notes || '-'}</p></div>
                    {canManageThisLog && (<div className="flex justify-end gap-2 pt-3 mt-3 border-t"><button onClick={() => onEdit(log)} className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200">수정</button><button onClick={() => onDelete(log.id)} className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">삭제</button></div>)}
                </div>
            )}
        </div>
    );
}

// MyPageContent 컴포넌트
function MyPageContent() { 
    const { employee, loading: employeeLoading, isAdmin } = useEmployee();
    const [workLogs, setWorkLogs] = useState([]);
    const [loadingWorkLogs, setLoadingWorkLogs] = useState(true);
    const [isWorkLogModalOpen, setIsWorkLogModalOpen] = useState(false);
    const [editingWorkLog, setEditingWorkLog] = useState(null);
    const [allEmployees, setAllEmployees] = useState([]); 
    const [expandedWorkLogId, setExpandedWorkLogId] = useState(null);
    const [myRequestedApprovals, setMyRequestedApprovals] = useState([]); 
    const [myReceivedApprovals, setMyReceivedApprovals] = useState([]);   
    const [loadingApprovals, setLoadingApprovals] = useState(true);
    const [isApprovalDetailModalOpen, setIsApprovalDetailModalOpen] = useState(false); 
    const [selectedApproval, setSelectedApproval] = useState(null); 

    const fetchWorkLogsAndEmployees = useCallback(async () => { if (!employee?.id) { setLoadingWorkLogs(false); return; } setLoadingWorkLogs(true); const { data: employeesData } = await supabase.from('profiles').select('id, full_name, department').order('full_name'); setAllEmployees(employeesData || []); let query = supabase.from('work_logs').select(`*, creator:user_id(full_name, department)`); if (!isAdmin) query = query.eq('user_id', employee.id); const { data: logsData } = await query.order('report_date', { ascending: false }); setWorkLogs(logsData || []); setLoadingWorkLogs(false); }, [employee?.id, isAdmin]);
    useEffect(() => { fetchWorkLogsAndEmployees(); }, [fetchWorkLogsAndEmployees]);
    const handleSaveWorkLog = async (formData, logId, targetUserId) => { const logData = { ...formData, user_id: targetUserId }; const { error } = logId ? await supabase.from('work_logs').update(logData).eq('id', logId) : await supabase.from('work_logs').insert(logData); if (error) { alert(`작업 실패: ${error.message}`); } else { alert('성공적으로 저장되었습니다.'); setIsWorkLogModalOpen(false); setEditingWorkLog(null); fetchWorkLogsAndEmployees(); } };
    const handleDeleteWorkLog = async (logId) => { if (confirm('정말로 삭제하시겠습니까?')) { const { error } = await supabase.from('work_logs').delete().eq('id', logId); if (error) { alert('삭제 실패: ' + error.message); } else { alert('삭제되었습니다.'); fetchWorkLogsAndEmployees(); } } };
    const fetchMyApprovals = useCallback(async () => { if (!employee?.id) { setLoadingApprovals(false); return; } setLoadingApprovals(true); const { data } = await supabase.from('approvals').select(`*, requested_user:requested_by(full_name), approving_user:approver_id(full_name)`).or(`requested_by.eq.${employee.id},approver_id.eq.${employee.id}`).order('requested_at', { ascending: false }); const all = data || []; setMyRequestedApprovals(all.filter(app => app.requested_by === employee.id)); setMyReceivedApprovals(all.filter(app => app.approver_id === employee.id)); setLoadingApprovals(false); }, [employee?.id]);
    useEffect(() => { fetchMyApprovals(); }, [fetchMyApprovals]);
    const handleApproveReject = async (approvalId, status, comment) => { const { error } = await supabase.from('approvals').update({ status: status, approved_at: new Date().toISOString(), approver_comment: comment }).eq('id', approvalId); if (error) { alert(`결재 처리 실패: ${error.message}`); } else { alert(`결재가 ${status === '승인' ? '승인' : '반려'}되었습니다.`); fetchMyApprovals(); setIsApprovalDetailModalOpen(false); setSelectedApproval(null); } };
    const handleCancelRequest = async (approvalId) => { if (confirm('정말로 이 결재 요청을 취소하시겠습니까?')) { const { error } = await supabase.from('approvals').update({ status: '취소', approved_at: new Date().toISOString(), approver_comment: '요청자가 취소함' }).eq('id', approvalId); if (error) { alert('결재 요청 취소 실패: ' + error.message); } else { alert('결재 요청이 취소되었습니다.'); fetchMyApprovals(); setIsApprovalDetailModalOpen(false); setSelectedApproval(null); } } };

    if (employeeLoading) { return <div className="p-8 text-center text-gray-500">사용자 정보 로딩 중...</div>; }
    if (!employee) { return <div className="p-8 text-center"><p className="text-red-500">로그인 정보가 없습니다.</p><Link href="/login" className="text-blue-500 hover:underline mt-2 inline-block">로그인 페이지로 이동</Link></div>; }
    
    return (
        <div className="bg-gray-50 min-h-full p-4 sm:p-6 lg:p-8"> 
            <header className="mb-8">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">내 정보 및 현황</h1>
                <p className="text-gray-600 mt-2">{employee?.full_name}님의 개인 정보를 관리하고 업무 현황을 확인합니다.</p>
            </header>
            
            <main className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <MyAttendanceWidget currentUser={employee} />
                    <ClientSideOnlyWrapper><LeaveCalendar currentUser={employee} /></ClientSideOnlyWrapper>
                </div>

                <div className="bg-white rounded-xl shadow-sm border">
                    <div className="flex justify-between items-center p-4 border-b">
                        <h2 className="text-lg font-bold text-gray-800">업무 일지</h2>
                        <button onClick={() => setIsWorkLogModalOpen(true)} className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg>
                            일지 작성
                        </button>
                    </div>
                    <div className="p-4">
                        {loadingWorkLogs ? <p className="text-center text-gray-500 py-4">로딩 중...</p> : workLogs.length === 0 ? <p className="text-center text-gray-500 py-4">작성된 업무일지가 없습니다.</p> : <div className="space-y-4">{workLogs.map(log => <WorkLogItem key={log.id} log={log} onEdit={() => {setEditingWorkLog(log); setIsWorkLogModalOpen(true);}} onDelete={handleDeleteWorkLog} canManageThisLog={log.user_id === employee.id || isAdmin} isExpanded={expandedWorkLogId === log.id} onToggleExpand={() => setExpandedWorkLogId(expandedWorkLogId === log.id ? null : log.id)} />)}</div>}
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border">
                    <div className="flex justify-between items-center p-4 border-b">
                        <h2 className="text-lg font-bold text-gray-800">내 결재 문서</h2>
                        <Link href="/approvals/new" className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg>
                            결재 작성
                        </Link>
                    </div>
                    <div className="p-4 space-y-6">
                        {loadingApprovals ? <p className="text-center text-gray-500 py-4">로딩 중...</p> : (
                            <>
                                <div><h3 className="text-base font-semibold text-gray-700 mb-3">나에게 온 결재 ({myReceivedApprovals.length}건)</h3>{myReceivedApprovals.length === 0 ? <p className="text-center text-gray-500 py-4 text-sm">결재할 문서가 없습니다.</p> : <div className="space-y-3">{myReceivedApprovals.map(approval => <ApprovalItem key={approval.id} approval={approval} onToggleExpand={() => {setSelectedApproval(approval); setIsApprovalDetailModalOpen(true);}} employee={employee} onApproveReject={handleApproveReject} onCancelRequest={handleCancelRequest} approvalListType="received" />)}</div>}</div>
                                <div><h3 className="text-base font-semibold text-gray-700 mb-3">내가 요청한 결재 ({myRequestedApprovals.length}건)</h3>{myRequestedApprovals.length === 0 ? <p className="text-center text-gray-500 py-4 text-sm">요청한 결재 문서가 없습니다.</p> : <div className="space-y-3">{myRequestedApprovals.map(approval => <ApprovalItem key={approval.id} approval={approval} onToggleExpand={() => {setSelectedApproval(approval); setIsApprovalDetailModalOpen(true);}} employee={employee} onApproveReject={handleApproveReject} onCancelRequest={handleCancelRequest} approvalListType="requested" />)}</div>}</div>
                            </>
                        )}
                    </div>
                </div>
            </main>

            <WorkLogModal isOpen={isWorkLogModalOpen} onClose={() => setIsWorkLogModalOpen(false)} onSave={handleSaveWorkLog} logToEdit={editingWorkLog} allEmployees={allEmployees} isAdmin={isAdmin} employee={employee} />
            {isApprovalDetailModalOpen && selectedApproval && (<ApprovalItem isOpen={isApprovalDetailModalOpen} onClose={() => setIsApprovalDetailModalOpen(false)} approval={selectedApproval} employee={employee} onApproveReject={handleApproveReject} onCancelRequest={handleCancelRequest} />)}
        </div>
    );
}

export default function MyPage(props) {
    return (
        <ClientSideOnlyWrapper>
            <MyPageContent {...props} />
        </ClientSideOnlyWrapper>
    );
}