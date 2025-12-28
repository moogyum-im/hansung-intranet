'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useEmployee } from '@/contexts/EmployeeContext';
import { supabase } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import FileUploadDnd from '@/components/FileUploadDnd';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

export default function WorkReportPage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const router = useRouter();

    const [allEmployees, setAllEmployees] = useState([]);
    const [approvers, setApprovers] = useState([]);
    const [referrers, setReferrers] = useState([]);

    const timeSlots = [
        '08:30 - 09:30', '09:30 - 10:30', '10:30 - 11:30', '11:30 - 12:00', 
        '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00', '16:00 - 17:30'
    ];

    const [visibleSections, setVisibleSections] = useState({
        hourlyTasks: true,
        todayPlan: true,
        achievements: true,
        issues: true,
        nextPlan: true
    });

    const [formData, setFormData] = useState({
        title: '업무 보고서',
        reportType: '일일보고',
        reportDate: new Date().toISOString().split('T')[0],
        achievements: '',
        todayPlan: '',
        issues: '',
        nextPlan: '',
        hourlyTasks: timeSlots.reduce((acc, time) => ({ ...acc, [time]: '' }), {}),
    });
    const [loading, setLoading] = useState(false);
    const [attachments, setAttachments] = useState([]);

    useEffect(() => {
        const fetchEmployees = async () => {
            const { data, error } = await supabase.from('profiles').select('id, full_name, department, position');
            if (error) console.error("직원 목록 로딩 실패:", error);
            else setAllEmployees(data || []);
        };
        if (!employeeLoading && employee) {
            fetchEmployees();
            if (employee?.team_leader_id && employee.id !== employee.team_leader_id) {
                setApprovers([{ id: employee.team_leader_id }]);
            }
        }
    }, [employee, employeeLoading]);

    const handleVisibilityChange = (section) => {
        setVisibleSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleHourlyChange = (time, value) => {
        setFormData(prev => ({
            ...prev,
            hourlyTasks: { ...prev.hourlyTasks, [time]: value }
        }));
    };

    const handleQuillChange = (value) => {
        setFormData(prev => ({ ...prev, achievements: value }));
    };
    
    const handleUploadComplete = (files) => {
        setAttachments(files);
    };

    const addApprover = () => {
        if (approvers.length < 5) setApprovers([...approvers, { id: '' }]);
        else toast.error('결재선은 최대 5명까지 추가할 수 있습니다.');
    };
    const handleApproverChange = (index, approverId) => {
        const newApprovers = [...approvers];
        newApprovers[index].id = approverId;
        setApprovers(newApprovers);
    };
    const removeApprover = (index) => {
        const newApprovers = approvers.filter((_, i) => i !== index);
        setApprovers(newApprovers);
    };

    const addReferrer = () => setReferrers([...referrers, { id: '' }]);
    const handleReferrerChange = (index, id) => {
        const newReferrers = [...referrers];
        newReferrers[index].id = id;
        setReferrers(newReferrers);
    };
    const removeReferrer = (index) => setReferrers(referrers.filter((_, i) => i !== index));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (!employee) {
            toast.error("사용자 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
            setLoading(false);
            return;
        }
        if (approvers.length === 0 || approvers.some(app => !app.id)) {
            toast.error("결재자를 모두 지정해주세요.");
            setLoading(false);
            return;
        }
        
        const submissionData = {
            title: `${formData.reportType} (${employee.full_name})`,
            content: JSON.stringify({
                ...formData,
                visibleSections,
                requesterName: employee.full_name,
                requesterDepartment: employee.department,
                requesterPosition: employee.position,
            }),
            document_type: 'work_report',
            approver_ids: approvers.map(app => {
                const emp = allEmployees.find(e => e.id === app.id);
                return { id: app.id, full_name: emp?.full_name || '알 수 없음', position: emp?.position || '알 수 없음' };
            }),
            referrer_ids: referrers.map(ref => {
                const emp = allEmployees.find(e => e.id === ref.id);
                return { id: ref.id, full_name: emp?.full_name || '알 수 없음', position: emp?.position || '알 수 없음' };
            }),
            attachments: attachments.length > 0 ? attachments : null,
            requester_id: employee.id,
            requester_name: employee.full_name,
            requester_department: employee.department,
            requester_position: employee.position,
        };

        try {
            const response = await fetch('/api/submit-approval', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData),
            });
            if (!response.ok) throw new Error('상신 실패');
            toast.success("업무보고서가 성공적으로 상신되었습니다.");
            router.push('/mypage');
        } catch (error) {
            toast.error(`상신 실패: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const quillModules = useMemo(() => ({
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['clean']
        ],
    }), []);

    if (employeeLoading) return <div className="flex justify-center items-center h-screen">로딩 중...</div>;

    return (
        /* 반응형 레이아웃 조절: flex-col (모바일) -> flex-row (PC) */
        <div className="flex flex-col lg:flex-row bg-gray-50 min-h-screen p-4 sm:p-8 lg:space-x-8 space-y-6 lg:space-y-0">
            <div className="flex-1 w-full">
                <div className="bg-white p-6 sm:p-10 rounded-xl shadow-lg border">
                    <h1 className="text-2xl font-bold text-center mb-8 text-slate-800">업무 보고서 작성</h1>

                    {/* 항목 설정: 모바일에서 줄바꿈(flex-wrap) 처리 */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <p className="text-[11px] font-black text-gray-400 mb-3 uppercase tracking-widest">보고서 구성 설정</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                            {['hourlyTasks', 'todayPlan', 'achievements', 'issues', 'nextPlan'].map((key) => (
                                <label key={key} className="flex items-center space-x-2 cursor-pointer group">
                                    <input type="checkbox" checked={visibleSections[key]} onChange={() => handleVisibilityChange(key)} className="w-4 h-4 text-blue-600 rounded" />
                                    <span className="text-sm text-gray-600 group-hover:text-blue-600">
                                        {key === 'hourlyTasks' ? '시간별' : key === 'todayPlan' ? '금일계획' : key === 'achievements' ? '실적' : key === 'issues' ? '특이사항' : '향후계획'}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                    
                    {/* 테이블 모바일 찌그러짐 방지 */}
                    <div className="mb-8 border border-gray-300 overflow-x-auto">
                        <table className="w-full text-sm border-collapse min-w-[500px]">
                            <tbody>
                                <tr>
                                    <th className="p-2 bg-gray-100 font-bold w-1/5 text-left border-r border-b">기안부서</th>
                                    <td className="p-2 w-2/5 border-b border-r">{employee?.department || '정보 없음'}</td>
                                    <th className="p-2 bg-gray-100 font-bold w-1/5 text-left border-r border-b">직 위</th>
                                    <td className="p-2 w-1/5 border-b">{employee?.position || '정보 없음'}</td>
                                </tr>
                                <tr>
                                    <th className="p-2 bg-gray-100 font-bold text-left border-r">기안자</th>
                                    <td className="p-2 border-r">{employee?.full_name || '정보 없음'}</td>
                                    <th className="p-2 bg-gray-100 font-bold text-left border-r">작성일</th>
                                    <td className="p-2">{new Date().toLocaleDateString('ko-KR')}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-700 font-bold mb-2 text-sm">보고서 유형</label>
                                <select name="reportType" value={formData.reportType} onChange={handleChange} className="w-full p-2 border rounded-md text-sm">
                                    <option value="일일보고">일일보고</option>
                                    <option value="주간보고">주간보고</option>
                                    <option value="월간보고">월간보고</option>
                                    <option value="기타">기타</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-gray-700 font-bold mb-2 text-sm">보고일자</label>
                                <input type="date" name="reportDate" value={formData.reportDate} onChange={handleChange} className="w-full p-2 border rounded-md text-sm" />
                            </div>
                        </div>

                        {/* 시간별 내역: 모바일 가로스크롤 보장 */}
                        {visibleSections.hourlyTasks && (
                            <div className="p-4 sm:p-6 bg-blue-50/50 rounded-xl border border-blue-100">
                                <h2 className="text-sm font-bold text-blue-800 mb-4 flex items-center gap-2">🕒 시간별 주요 업무 내역</h2>
                                <div className="space-y-3">
                                    {timeSlots.map(time => (
                                        <div key={time} className="flex flex-col sm:flex-row sm:items-center gap-2">
                                            <span className="w-32 text-xs font-bold text-gray-400 shrink-0">{time}</span>
                                            <input 
                                                type="text" 
                                                value={formData.hourlyTasks[time]} 
                                                onChange={(e) => handleHourlyChange(time, e.target.value)}
                                                className="flex-1 p-2 border-b border-blue-200 bg-transparent outline-none focus:border-blue-500 text-sm transition-all"
                                                placeholder="내용을 입력하세요"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {visibleSections.todayPlan && (
                            <div>
                                <label className="block text-gray-700 font-bold mb-2 text-sm">금일 업무 계획</label>
                                <textarea name="todayPlan" value={formData.todayPlan} onChange={handleChange} className="w-full p-3 border rounded-md h-24 resize-none text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="업무 계획을 입력하세요." />
                            </div>
                        )}

                        {visibleSections.achievements && (
                            <div>
                                <label className="block text-gray-700 font-bold mb-2 text-sm">상세 업무 진행 및 실적</label>
                                <div className="min-h-[200px] mb-14">
                                    <ReactQuill theme="snow" value={formData.achievements} onChange={handleQuillChange} modules={quillModules} className="h-40" />
                                </div>
                            </div>
                        )}

                        {visibleSections.issues && (
                            <div>
                                <label className="block text-red-600 font-bold mb-2 text-sm">특이사항 및 문제점</label>
                                <textarea name="issues" value={formData.issues} onChange={handleChange} className="w-full p-3 border border-red-100 rounded-md h-24 resize-none text-sm focus:ring-2 focus:ring-red-500 outline-none bg-red-50/20" placeholder="특이사항을 입력하세요." />
                            </div>
                        )}

                        {visibleSections.nextPlan && (
                            <div>
                                <label className="block text-gray-700 font-bold mb-2 text-sm">향후 업무 계획</label>
                                <textarea name="nextPlan" value={formData.nextPlan} onChange={handleChange} className="w-full p-3 border rounded-md h-24 resize-none text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="다음 업무 계획을 입력하세요." />
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* 결재선 설정 사이드바 (모바일 하단 배치) */}
            <div className="w-full lg:w-96 no-print">
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg border space-y-6 lg:sticky lg:top-8">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-slate-800">결재선</h2>
                            <button type="button" onClick={addApprover} className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full hover:bg-blue-700 transition-all">+ 추가</button>
                        </div>
                        <div className="space-y-3">
                            {approvers.map((approver, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-gray-400 shrink-0">{index + 1}차</span>
                                    <select value={approver.id} onChange={(e) => handleApproverChange(index, e.target.value)} className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none" required>
                                        <option value="">결재자 선택</option>
                                        {allEmployees.map(emp => (<option key={emp.id} value={emp.id}>{emp.full_name} ({emp.position})</option>))}
                                    </select>
                                    <button type="button" onClick={() => removeApprover(index)} className="text-red-500 font-bold px-2 text-xl">×</button>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <FileUploadDnd onUploadComplete={handleUploadComplete} />
                    
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:bg-gray-400 shadow-lg active:scale-95 transition-all"
                    >
                        {loading ? '상신 중...' : '보고서 결재 상신'}
                    </button>
                </form>
            </div>
        </div>
    );
}