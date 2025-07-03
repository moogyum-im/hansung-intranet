// 파일 경로: src/app/(main)/mypage/page.js
'use client'; 

import { useState, useEffect, useCallback } from 'react';
import { useEmployee } from 'contexts/EmployeeContext';
import { supabase } from 'lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; 

// 외부 컴포넌트 import
import MyAttendanceWidget from '@/components/MyAttendanceWidget';
import ApprovalItem from '../../../components/ApprovalItem'; 
import LeaveCalendar from './LeaveCalendar';
import ClientSideOnlyWrapper from '@/components/ClientSideOnlyWrapper'; 


// WorkLogModal 컴포넌트 (마이페이지 내부에서 사용)
function WorkLogModal({ isOpen, onClose, onSave, logToEdit, department, allEmployees, isAdmin, employee }) {
    const [formData, setFormData] = useState({ report_date: '', today_summary: '', tomorrow_plan: '', notes: '' });
    const [selectedTargetUserId, setSelectedTargetUserId] = useState(''); 

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        setFormData({
            report_date: logToEdit?.report_date || today,
            today_summary: logToEdit?.today_summary || '',
            tomorrow_plan: logToEdit?.tomorrow_plan || '',
            notes: logToEdit?.notes || '',
        });
        if (logToEdit) {
            setSelectedTargetUserId(logToEdit.user_id);
        } else {
            setSelectedTargetUserId(employee?.id || ''); 
        }
    }, [logToEdit, employee]);

    const handleChange = (e) => { setFormData({ ...formData, [e.target.name]: e.target.value }); };
    const handleSubmit = () => { 
        if (!formData.report_date) return alert("보고 날짜를 선택해주세요.");
        if (!selectedTargetUserId) { alert("업무일지 대상자를 선택해주세요."); return; } 
        onSave(formData, logToEdit?.id, selectedTargetUserId);
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
                <div className="p-4 border-b"><h2 className="text-xl font-bold">{logToEdit ? "업무일지 수정" : `업무일지 작성`}</h2></div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div><label className="block font-medium">보고 날짜</label><input type="date" name="report_date" value={formData.report_date} onChange={handleChange} className="w-full p-2 border rounded" /></div>
                    
                    <div>
                        <label className="block font-medium">대상 직원</label>
                        <select 
                            value={selectedTargetUserId} 
                            onChange={(e) => setSelectedTargetUserId(e.target.value)} 
                            className="w-full p-2 border rounded mt-1"
                            disabled={!isAdmin && allEmployees.length > 0 && selectedTargetUserId !== (employee?.id || '')}
                        >
                            <option value="">--- 직원 선택 ---</option>
                            {allEmployees.map(emp => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.full_name} ({emp.department})
                                    {emp.id === employee?.id && " (나)"} 
                                </option>
                            ))}
                        </select>
                    </div>

                    <div><label className="block font-medium">금일 업무 요약</label><textarea name="today_summary" value={formData.today_summary} onChange={handleChange} rows="5" className="w-full p-2 border rounded" placeholder="오늘 수행한 주요 업무를 요약해주세요."></textarea></div>
                    <div><label className="block font-medium">명일 업무 계획:</label><textarea name="tomorrow_plan" value={formData.tomorrow_plan} onChange={handleChange} rows="5" className="w-full p-2 border rounded" placeholder="내일 진행할 업무 계획을 작성해주세요."></textarea></div>
                    <div><label className="block font-medium">특이사항 및 협조 요청:</label><textarea name="notes" value={formData.notes} onChange={handleChange} rows="3" className="w-full p-2 border rounded" placeholder="업무 중 발생한 특이사항이나 다른 팀/팀원의 협조가 필요한 내용을 기재합니다."></textarea></div>
                </div>
                <div className="px-6 py-4 flex justify-end gap-4 bg-gray-50 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">취소</button>
                    <button onClick={handleSubmit} className="px-4 py-2 bg-green-600 text-white rounded-lg">저장하기</button>
                </div>
            </div>
        </div>
    );
}

// WorkLogItem 컴포넌트 (변경 없음)
function WorkLogItem({ log, onEdit, onDelete, canManageThisLog, isExpanded, onToggleExpand }) {
    return (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
            <button 
                onClick={onToggleExpand}
                className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
                <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-gray-800">{log.report_date} 업무일지</p>
                    <p className="text-xs text-gray-600 mt-1">작성자: {log.creator?.full_name || '알 수 없음'} ({log.department})</p>
                    <p className="text-sm text-gray-700 mt-2">{log.today_summary || '-'}</p>
                </div>
                <span className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </span>
            </button>
            {isExpanded && (
                <div className="p-4 border-t space-y-3 text-gray-700">
                    <div><p className="font-semibold">금일 업무 요약:</p><p className="ml-2 mt-1 whitespace-pre-wrap">{log.today_summary || '-'}</p></div>
                    <div><p className="font-semibold">명일 업무 계획:</p><p className="ml-2 mt-1 whitespace-pre-wrap">{log.tomorrow_plan || '-'}</p></div>
                    <div><p className="font-semibold">특이사항 및 협조 요청:</p><p className="ml-2 mt-1 whitespace-pre-wrap">{log.notes || '-'}</p></div>
                    {canManageThisLog && (
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => onEdit(log)} className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">수정</button>
                            <button onClick={() => onDelete(log.id)} className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200">삭제</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// 이 페이지 컴포넌트의 실제 내용을 정의하는 함수
function MyPageContent() { 
    const router = useRouter();
 
    const { employee, loading: employeeLoading, isAdmin } = useEmployee();

    // --- 업무일지 관련 상태 및 로직 ---
    const [workLogs, setWorkLogs] = useState([]);
    const [loadingWorkLogs, setLoadingWorkLogs] = useState(true);
    const [isWorkLogModalOpen, setIsWorkLogModalOpen] = useState(false);
    const [editingWorkLog, setEditingWorkLog] = useState(null);
    const [allEmployees, setAllEmployees] = useState([]); 
    const [expandedWorkLogId, setExpandedWorkLogId] = useState(null);

    const fetchWorkLogsAndEmployees = useCallback(async () => {
        if (!employee?.id) {
            setLoadingWorkLogs(false);
            return;
        }
        setLoadingWorkLogs(true);
        const { data: employeesData, error: employeesError } = await supabase
            .from('profiles') 
            .select('id, full_name, department')
            .order('full_name', { ascending: true });
        
        if (employeesError) {
            console.error("직원 정보 로딩 실패:", employeesError.message);
            setAllEmployees([]);
        } else {
            setAllEmployees(employeesData || []);
        }

        let workLogsQuery = supabase
            .from('work_logs')
            .select(`*, creator:user_id(full_name, department)`); 

        if (!isAdmin) {
            workLogsQuery = workLogsQuery.eq('user_id', employee.id); 
        }
        workLogsQuery = workLogsQuery.order('report_date', { ascending: false });

        const { data: logsData, error: logsError } = await workLogsQuery;

        if (logsError) {
            console.error("업무일지 로딩 실패:", error.message);
            setWorkLogs([]);
        } else {
            setWorkLogs(logsData || []);
        }
        setLoadingWorkLogs(false);
    }, [employee?.id, isAdmin, supabase]);

    useEffect(() => {
        fetchWorkLogsAndEmployees();
    }, [fetchWorkLogsAndEmployees]);

    const handleSaveWorkLog = async (formData, logId, targetUserId) => {
        const logData = { ...formData, user_id: targetUserId };
        let error;
        if (logId) {
            ({ error } = await supabase.from('work_logs').update(logData).eq('id', logId));
        } else {
            ({ error } = await supabase.from('work_logs').insert(logData));
        }

        if (error) {
            alert(`업무일지 ${logId ? '수정' : '작성'} 실패: ${error.message}`);
        } else {
            alert(`업무일지 ${logId ? '수정' : '작성'} 성공!`);
            setIsWorkLogModalOpen(false);
            setEditingWorkLog(null);
            fetchWorkLogsAndEmployees(); 
        }
    };

    const handleDeleteWorkLog = async (logId) => {
        if (confirm('정말로 이 업무일지를 삭제하시겠습니까?')) {
            const { error } = await supabase.from('work_logs').delete().eq('id', logId);
            if (error) {
                alert('업무일지 삭제 실패: ' + error.message);
            } else {
                alert('업무일지가 삭제되었습니다.');
                fetchWorkLogsAndEmployees(); 
            }
        }
    };

    const openWorkLogModalForNew = () => {
        setEditingWorkLog(null);
        setIsWorkLogModalOpen(true);
    };

    const openWorkLogModalForEdit = (log) => {
        setEditingWorkLog(log);
        setIsWorkLogModalOpen(true);
    };

    // --- 결재 문서 관련 상태 및 로직 ---
    const [myRequestedApprovals, setMyRequestedApprovals] = useState([]); 
    const [myReceivedApprovals, setMyReceivedApprovals] = useState([]);   
    const [loadingApprovals, setLoadingApprovals] = useState(true);
    const [isApprovalDetailModalOpen, setIsApprovalDetailModalOpen] = useState(false); 
    const [selectedApproval, setSelectedApproval] = useState(null); 

    const fetchMyApprovals = useCallback(async () => {
        if (!employee?.id) {
            setLoadingApprovals(false);
            return;
        }
        setLoadingApprovals(true);
        
        const { data, error } = await supabase
            .from('approvals')
            .select(`
                *,
                requested_user:requested_by(full_name),
                approving_user:approver_id(full_name)
            `)
            .or(`requested_by.eq.${employee.id},approver_id.eq.${employee.id}`) 
            .order('requested_at', { ascending: false });

        if (error) {
            console.error("내 결재 문서 로딩 실패:", error.message);
            setMyRequestedApprovals([]);
            setMyReceivedApprovals([]);
        } else {
            const allApprovals = data || [];
            const requested = allApprovals.filter(app => app.requested_by === employee.id);
            const received = allApprovals.filter(app => app.approver_id === employee.id);
            
            setMyRequestedApprovals(requested);
            setMyReceivedApprovals(received);
        }
        setLoadingApprovals(false);
    }, [employee?.id, supabase]);

    useEffect(() => {
        fetchMyApprovals();
    }, [fetchMyApprovals]);

    const handleApproveReject = async (approvalId, status, comment) => {
        const { error } = await supabase
            .from('approvals')
            .update({ status: status, approved_at: new Date().toISOString(), approver_comment: comment })
            .eq('id', approvalId);

        if (error) {
            alert(`결재 처리 실패: ${error.message}`);
        } else {
            alert(`결재가 ${status === '승인' ? '승인' : '반려'}되었습니다.`);
            fetchMyApprovals(); 
            setIsApprovalDetailModalOpen(false); 
            setSelectedApproval(null); 
        }
    };

    const handleCancelRequest = async (approvalId) => {
        if (confirm('정말로 이 결재 요청을 취소하시겠습니까?')) {
            const { error } = await supabase
                .from('approvals')
                .update({ status: '취소', approved_at: new Date().toISOString(), approver_comment: '요청자가 취소함' })
                .eq('id', approvalId);

            if (error) {
                alert('결재 요청 취소 실패: ' + error.message);
            } else {
                alert('결재 요청이 취소되었습니다.');
                fetchMyApprovals(); 
                setIsApprovalDetailModalOpen(false); 
                setSelectedApproval(null); 
            }
        }
    };

    const openApprovalDetailModal = (approval) => {
        setSelectedApproval(approval);
        setIsApprovalDetailModalOpen(true);
    };

    // 로딩 중이거나 직원 정보 없는 경우
    if (employeeLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-100"><p className="text-gray-600">사용자 정보 로딩 중...</p></div>;
    }
    if (!employee) {
        return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4"><p className="text-red-600 mb-4">로그인 정보가 없거나 유효하지 않습니다. 다시 로그인해주세요.</p><Link href="/login" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">로그인 페이지로</Link></div>;
    }

    return (
        // ★★★ 이 div에 overflow-y-auto와 패딩(p-6)을 추가합니다. ★★★
        <div className="h-full overflow-y-auto p-6"> 
            <h1 className="text-3xl font-extrabold text-gray-900 mb-8">내 정보 및 현황</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* 나의 출퇴근 위젯 */}
                <MyAttendanceWidget currentUser={employee} />

                {/* 나의 휴가/결재 현황 (LeaveCalendar) */}
                <ClientSideOnlyWrapper> 
                    <LeaveCalendar currentUser={employee} /> 
                </ClientSideOnlyWrapper>
            </div>

            {/* 업무 일지 섹션 */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">업무 일지</h2>
                    <button 
                        onClick={openWorkLogModalForNew}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        업무일지 작성
                    </button>
                </div>
                {loadingWorkLogs ? (
                    <p className="text-gray-500">업무일지 로딩 중...</p>
                ) : workLogs.length === 0 ? (
                    <p className="text-gray-500">작성된 업무일지가 없습니다.</p>
                ) : (
                    <div className="space-y-4">
                        {workLogs.map(log => (
                            <WorkLogItem
                                key={log.id}
                                log={log}
                                onEdit={openWorkLogModalForEdit}
                                onDelete={handleDeleteWorkLog}
                                canManageThisLog={log.user_id === employee.id || isAdmin}
                                isExpanded={expandedWorkLogId === log.id}
                                onToggleExpand={() => setExpandedWorkLogId(expandedWorkLogId === log.id ? null : log.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* 결재 문서 섹션 */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">내 결재 문서</h2>
                    <Link 
                        href="/approvals/new"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        결재 문서 작성
                    </Link>
                </div>
                {loadingApprovals ? (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-xl font-bold text-gray-700 mb-4">나에게 온 결재 (로딩 중...)</h3>
                            <p className="text-gray-500">결재 문서 로딩 중...</p>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-700 mb-4">내가 요청한 결재 (로딩 중...)</h3>
                            <p className="text-gray-500">결재 문서 로딩 중...</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8"> 
                        <div>
                            <h3 className="text-xl font-bold text-gray-700 mb-4">나에게 온 결재 ({myReceivedApprovals.length}건)</h3>
                            {myReceivedApprovals.length === 0 ? (
                                <p className="text-gray-500">나에게 온 결재 문서가 없습니다.</p>
                            ) : (
                                <div className="space-y-4">
                                    {myReceivedApprovals.map(approval => (
                                        <ApprovalItem
                                            key={approval.id}
                                            approval={approval}
                                            onToggleExpand={() => openApprovalDetailModal(approval)} 
                                            isExpanded={false}
                                            employee={employee}
                                            onApproveReject={handleApproveReject}
                                            onCancelRequest={handleCancelRequest}
                                            approvalListType="received" 
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-gray-700 mb-4">내가 요청한 결재 ({myRequestedApprovals.length}건)</h3>
                            {myRequestedApprovals.length === 0 ? (
                                <p className="text-gray-500">요청한 결재 문서가 없습니다.</p>
                            ) : (
                                <div className="space-y-4">
                                    {myRequestedApprovals.map(approval => (
                                        <ApprovalItem
                                            key={approval.id}
                                            approval={approval}
                                            onToggleExpand={() => openApprovalDetailModal(approval)} 
                                            isExpanded={false}
                                            employee={employee}
                                            onApproveReject={handleApproveReject}
                                            onCancelRequest={handleCancelRequest}
                                            approvalListType="requested" 
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <WorkLogModal 
                isOpen={isWorkLogModalOpen} 
                onClose={() => setIsWorkLogModalOpen(false)} 
                onSave={handleSaveWorkLog} 
                logToEdit={editingWorkLog} 
                department={employee?.department} 
                allEmployees={allEmployees} 
                isAdmin={isAdmin}
                employee={employee}
            />
            {isApprovalDetailModalOpen && selectedApproval && ( 
                <ApprovalItem 
                    isOpen={isApprovalDetailModalOpen}
                    onClose={() => setIsApprovalDetailModalOpen(false)}
                    approval={selectedApproval}
                    employee={employee}
                    onApproveReject={handleApproveReject}
                    onCancelRequest={handleCancelRequest}
                />
            )}
        </div>
    );
}

// 최종적으로 이 MyPageContent 컴포넌트를 ClientSideOnlyWrapper로 감싸서 export 합니다.
export default function MyPage(props) {
    return (
        <ClientSideOnlyWrapper>
            <MyPageContent {...props} />
        </ClientSideOnlyWrapper>
    );
}