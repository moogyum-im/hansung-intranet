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

    // 시간대 정의
    const timeSlots = [
        '08:30 - 09:30', '09:30 - 10:30', '10:30 - 11:30', '11:30 - 12:00', 
        '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00', '16:00 - 17:30'
    ];

    // --- [추가] --- 각 항목의 노출 여부를 제어하는 상태
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

    // 체크박스 핸들러
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
        
        const approver_ids_with_details = approvers.map(app => {
            const emp = allEmployees.find(e => e.id === app.id);
            return { id: app.id, full_name: emp?.full_name || '알 수 없음', position: emp?.position || '알 수 없음' };
        });
        const referrer_ids_with_details = referrers.map(ref => {
            const emp = allEmployees.find(e => e.id === ref.id);
            return { id: ref.id, full_name: emp?.full_name || '알 수 없음', position: emp?.position || '알 수 없음' };
        });

        const submissionData = {
            title: `${formData.reportType} (${employee.full_name})`,
            content: JSON.stringify({
                ...formData,
                visibleSections, // 어떤 섹션이 포함되었는지 정보도 함께 저장
                requesterName: employee.full_name,
                requesterDepartment: employee.department,
                requesterPosition: employee.position,
            }),
            document_type: 'work_report',
            approver_ids: approver_ids_with_details,
            referrer_ids: referrer_ids_with_details,
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
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: '서버 응답 없음' }));
                throw new Error(errorData.error || '상신 실패');
            }
            toast.success("업무보고서가 성공적으로 상신되었습니다.");
            router.push('/mypage');
        } catch (error) {
            toast.error(`업무보고서 상신 실패: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const quillModules = useMemo(() => ({
        toolbar: [
            [{ 'header': '1' }, { 'header': '2' }, { 'font': [] }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'align': [] }],
            ['clean']
        ],
        clipboard: { matchVisual: false, },
    }), []);

    if (employeeLoading) return <div className="flex justify-center items-center h-screen">로딩 중...</div>;

    return (
        <div className="flex bg-gray-50 min-h-screen p-8 space-x-8">
            <div className="flex-1">
                <div className="bg-white p-10 rounded-xl shadow-lg border">
                    <h1 className="text-2xl font-bold text-center mb-8">업무 보고서 작성</h1>

                    {/* --- [추가] --- 항목 설정 체크박스 영역 */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">보고서 항목 구성 설정</p>
                        <div className="flex flex-wrap gap-4">
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <input type="checkbox" checked={visibleSections.hourlyTasks} onChange={() => handleVisibilityChange('hourlyTasks')} className="w-4 h-4 text-blue-600 rounded" />
                                <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors">시간별 내역</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <input type="checkbox" checked={visibleSections.todayPlan} onChange={() => handleVisibilityChange('todayPlan')} className="w-4 h-4 text-blue-600 rounded" />
                                <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors">금일 계획</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <input type="checkbox" checked={visibleSections.achievements} onChange={() => handleVisibilityChange('achievements')} className="w-4 h-4 text-blue-600 rounded" />
                                <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors">진행/실적</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <input type="checkbox" checked={visibleSections.issues} onChange={() => handleVisibilityChange('issues')} className="w-4 h-4 text-blue-600 rounded" />
                                <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors">특이사항</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <input type="checkbox" checked={visibleSections.nextPlan} onChange={() => handleVisibilityChange('nextPlan')} className="w-4 h-4 text-blue-600 rounded" />
                                <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors">향후 계획</span>
                            </label>
                        </div>
                    </div>
                    
                    <div className="mb-8 border border-gray-300">
                        <table className="w-full text-sm border-collapse">
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
                                    <th className="p-2 bg-gray-100 font-bold text-left border-r">기안일자</th>
                                    <td className="p-2">{new Date().toLocaleDateString('ko-KR')}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-4">
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

                        {/* 시간별 주요 업무 내역 (체크 시 노출) */}
                        {visibleSections.hourlyTasks && (
                            <div className="p-6 bg-blue-50 rounded-lg border border-blue-100 animate-in fade-in duration-300">
                                <h2 className="text-sm font-bold text-blue-800 mb-4 flex items-center">🕒 시간별 주요 업무 내역</h2>
                                <div className="grid grid-cols-1 gap-3">
                                    {timeSlots.map(time => (
                                        <div key={time} className="flex items-center space-x-3">
                                            <span className="w-32 text-xs font-semibold text-gray-500">{time}</span>
                                            <input 
                                                type="text" 
                                                value={formData.hourlyTasks[time]} 
                                                onChange={(e) => handleHourlyChange(time, e.target.value)}
                                                className="flex-1 p-2 border-b border-gray-300 bg-transparent outline-none focus:border-blue-500 text-sm transition-colors"
                                                placeholder="수행 내용을 입력하세요"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 금일 업무 계획 (체크 시 노출) */}
                        {visibleSections.todayPlan && (
                            <div className="animate-in fade-in duration-300">
                                <label className="block text-gray-700 font-bold mb-2 text-sm">금일 업무 계획 (또는 이번 주 계획)</label>
                                <textarea name="todayPlan" value={formData.todayPlan} onChange={handleChange} className="w-full p-3 border rounded-md h-24 resize-none text-sm" placeholder="업무 계획을 입력하세요." />
                            </div>
                        )}

                        {/* 상세 업무 진행 및 실적 (체크 시 노출) */}
                        {visibleSections.achievements && (
                            <div className="animate-in fade-in duration-300">
                                <label className="block text-gray-700 font-bold mb-2 text-sm">상세 업무 진행 및 실적</label>
                                <ReactQuill theme="snow" value={formData.achievements} onChange={handleQuillChange} modules={quillModules} className="h-48 mb-12" />
                            </div>
                        )}

                        {/* 특이사항 및 문제점 (체크 시 노출) */}
                        {visibleSections.issues && (
                            <div className="mt-12 animate-in fade-in duration-300">
                                <label className="block text-gray-700 font-bold mb-2 text-sm">특이사항 및 문제점</label>
                                <textarea name="issues" value={formData.issues} onChange={handleChange} className="w-full p-3 border rounded-md h-24 resize-none text-sm" placeholder="특이사항이나 문제점을 입력하세요." />
                            </div>
                        )}

                        {/* 향후 업무 계획 (체크 시 노출) */}
                        {visibleSections.nextPlan && (
                            <div className="animate-in fade-in duration-300">
                                <label className="block text-gray-700 font-bold mb-2 text-sm">향후 업무 계획</label>
                                <textarea name="nextPlan" value={formData.nextPlan} onChange={handleChange} className="w-full p-3 border rounded-md h-24 resize-none text-sm" placeholder="다음 업무 계획을 입력하세요." />
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="w-96 p-8">
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg border space-y-6 sticky top-8">
                    <div className="border-b pb-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">결재선</h2>
                            <button type="button" onClick={addApprover} className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full hover:bg-blue-200">추가 +</button>
                        </div>
                        <div className="space-y-3">
                            {approvers.map((approver, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                    <span className="font-semibold text-sm text-gray-600">{index + 1}차:</span>
                                    <select value={approver.id} onChange={(e) => handleApproverChange(index, e.target.value)} className="w-full p-2 border rounded-md text-sm" required>
                                        <option value="">결재자 선택</option>
                                        {allEmployees.map(emp => (<option key={emp.id} value={emp.id}>{emp.full_name} ({emp.position})</option>))}
                                    </select>
                                    <button type="button" onClick={() => removeApprover(index)} className="text-red-500 hover:text-red-700 text-lg font-bold">×</button>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <FileUploadDnd onUploadComplete={handleUploadComplete} />
                    
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors uppercase tracking-wider"
                    >
                        {loading ? '상신 중...' : '결재 상신'}
                    </button>
                </form>
            </div>
        </div>
    );
}