'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import { 
  Loader2, User, FileText, History, Mail, Phone, MapPin, 
  Briefcase, Award, X, Download, Plus, Upload, Save, Edit2, Trash2
} from 'lucide-react';

// 🚀 근속 기간 자동 계산 (퇴사일이 있으면 퇴사일 기준으로 계산 정지)
const calculateTenure = (hireDateStr, resignDateStr) => {
    if (!hireDateStr) return '-';
    
    const hireDate = new Date(hireDateStr);
    hireDate.setHours(0, 0, 0, 0);
    
    const endDate = resignDateStr ? new Date(resignDateStr) : new Date();
    endDate.setHours(0, 0, 0, 0);
    
    const diffTime = endDate.getTime() - hireDate.getTime();
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (totalDays < 0) return '입사 예정';

    let years = endDate.getFullYear() - hireDate.getFullYear();
    let months = endDate.getMonth() - hireDate.getMonth();
    let days = endDate.getDate() - hireDate.getDate();

    if (days < 0) {
        months -= 1;
        const prevMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
        days += prevMonth.getDate();
    }
    if (months < 0) { 
        years -= 1; 
        months += 12; 
    }

    let result = '';
    if (years > 0) result += `${years}년 `;
    if (months > 0) result += `${months}개월 `;
    if (days > 0) result += `${days}일`;
    
    const baseString = result.trim() || '당일';
    const fractionalYears = (totalDays / 365).toFixed(1);

    return `${baseString} (${fractionalYears}년 / 총 ${totalDays}일)`;
};

function HRProfileContent() {
  const searchParams = useSearchParams();
  const empId = searchParams.get('empId');

  const [activeTab, setActiveTab] = useState('info'); 
  const [employee, setEmployee] = useState(null);
  const [history, setHistory] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editedEmp, setEditedEmp] = useState({});

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  
  const [historyForm, setHistoryForm] = useState({ 
      type: '승진/직급', 
      change_from: '', 
      change_to: '', 
      change_details: '', 
      start_date: '', 
      reason: '' 
  });
  const [docForm, setDocForm] = useState({ title: '', file: null });

  const fetchAllData = useCallback(async () => {
    if (!empId) return;
    setLoading(true);
    try {
      const { data: empData } = await supabase.from('profiles').select('*').eq('id', empId).single();
      setEmployee(empData);
      setEditedEmp(empData);

      const { data: hData } = await supabase
        .from('hr_history')
        .select('*')
        .eq('profile_id', empId)
        .order('start_date', { ascending: false });
      setHistory(hData || []);

      const { data: dData } = await supabase
        .from('hr_documents')
        .select('*')
        .eq('profile_id', empId)
        .order('uploaded_at', { ascending: false });
      setDocuments(dData || []);

    } catch (error) { 
      console.error(error); 
    } finally { 
      setLoading(false); 
    }
  }, [empId]);

  useEffect(() => { 
    fetchAllData(); 
  }, [fetchAllData]);

  // 🚀 인사 정보 및 연차 수동 저장 로직 업데이트
  const handleSaveInfo = async () => {
    try {
        const totalLeave = Number(editedEmp.total_leave_days || 0);
        const usedLeave = Number(editedEmp.used_leave_days || 0);
        const unusedLeave = Math.max(totalLeave - usedLeave, 0);

        const payload = {
            hire_date: editedEmp.hire_date || null,
            resignation_date: editedEmp.resignation_date || null,
            birth_date: editedEmp.birth_date || null,
            address: editedEmp.address || null,
            phone: editedEmp.phone || null,
            email: editedEmp.email || null,
            total_leave_days: totalLeave,
            used_leave_days: usedLeave,
            unused_leave_days: unusedLeave
        };

        const { error } = await supabase.from('profiles').update(payload).eq('id', empId);

        if (error) throw error;
        toast.success("인적 정보 및 연차 기록이 업데이트되었습니다.");
        setEmployee({...editedEmp, unused_leave_days: unusedLeave});
        setIsEditingInfo(false);
        fetchAllData();
    } catch (e) {
        console.error(e);
        toast.error("정보 수정 실패");
    }
  };

  const handleAddHistory = async () => {
    const isStatusChange = historyForm.type === '상태변동';
    const finalDetails = isStatusChange 
        ? historyForm.change_details 
        : `${historyForm.change_from} → ${historyForm.change_to}`;

    if (!finalDetails || !historyForm.start_date || (!isStatusChange && (!historyForm.change_from || !historyForm.change_to))) {
        return toast.error("필수 항목을 모두 입력하세요.");
    }

    try {
      const { error } = await supabase.from('hr_history').insert([{ 
          profile_id: empId,
          type: historyForm.type,
          change_details: finalDetails,
          start_date: historyForm.start_date,
          reason: historyForm.reason
      }]);
      if (error) throw error;
      toast.success("이력이 추가되었습니다.");
      setIsHistoryModalOpen(false);
      setHistoryForm({ type: '승진/직급', change_from: '', change_to: '', change_details: '', start_date: '', reason: '' });
      fetchAllData();
    } catch (e) { 
      toast.error("저장 실패"); 
    }
  };

  const handleUploadDoc = async () => {
    if (!docForm.title || !docForm.file) return toast.error("문서명과 파일을 선택하세요.");
    try {
      const file = docForm.file;
      const fileExt = file.name.split('.').pop();
      const fileName = `${empId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('hr-documents').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('hr_documents').insert([{ 
        profile_id: empId, 
        title: docForm.title, 
        file_url: fileName, 
        file_type: fileExt 
      }]);
      
      if (dbError) throw dbError;
      toast.success("문서가 업로드되었습니다.");
      setIsDocModalOpen(false);
      setDocForm({ title: '', file: null });
      fetchAllData();
    } catch (e) { 
      toast.error("업로드 실패. 버킷 설정을 확인하세요."); 
    }
  };

  const handleDownloadDoc = async (filePath) => {
    try {
      if (filePath.startsWith('http')) {
        return toast.error("이전 방식으로 업로드된 파일입니다. 삭제 후 재업로드 해주세요.");
      }
      const { data, error } = await supabase.storage.from('hr-documents').createSignedUrl(filePath, 60);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (e) {
      console.error(e);
      toast.error("다운로드 실패: 파일 접근 권한이 없습니다.");
    }
  };

  const handleDeleteDoc = async (docId, filePath) => {
    if (!confirm("정말 이 문서를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.")) return;
    
    try {
      if (!filePath.startsWith('http')) {
        const { error: storageError } = await supabase.storage.from('hr-documents').remove([filePath]);
        if (storageError) throw storageError;
      }
      const { error: dbError } = await supabase.from('hr_documents').delete().eq('id', docId);
      if (dbError) throw dbError;

      toast.success("문서가 안전하게 삭제되었습니다.");
      fetchAllData();
    } catch (error) {
      console.error(error);
      toast.error("문서 삭제 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white text-slate-500 font-bold">
        직원 정보를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-50 overflow-y-auto font-sans text-slate-900 antialiased flex flex-col">
      <Toaster position="top-right" />
      
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm shrink-0">
        <div className="h-16 px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-sm">H</div>
            <span className="font-black text-lg tracking-tight">경영지원 포털 | 인사 관리 시스템</span>
          </div>
          <button 
            onClick={() => window.close()} 
            className="px-5 py-2.5 bg-slate-900 text-white text-xs font-black rounded-xl hover:bg-black transition-all"
          >
            창 닫기
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-8 space-y-8 w-full">
        {/* 상단 프로필 요약 */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl flex flex-col md:flex-row items-center gap-8">
          <div className="w-32 h-32 bg-slate-100 rounded-[2rem] flex items-center justify-center text-5xl font-black text-slate-600 shadow-inner">
            {employee.full_name.charAt(0)}
          </div>
          <div className="text-center md:text-left flex-1 min-w-0">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
              <h1 className="text-4xl font-black tracking-tight">{employee.full_name} {employee.position}</h1>
              <span className={`text-[11px] font-black px-3 py-1 rounded-full uppercase shadow-sm ${employee.employment_status === '재직' ? 'bg-blue-500 text-white' : 'bg-rose-500 text-white'}`}>
                {employee.employment_status}
              </span>
            </div>
            <p className="text-slate-500 font-bold text-lg">{employee.department}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4 text-sm font-bold text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Phone size={14} className="text-slate-400"/> {employee.phone || '-'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail size={14} className="text-slate-400"/> {employee.email || '-'}
                </span>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 및 콘텐츠 영역 */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <nav className="flex border-b border-slate-100 bg-slate-50/50 p-2 gap-2 shrink-0 sticky top-0 z-20">
                {[
                  { id: 'info', name: '기본 인사 정보', icon: User }, 
                  { id: 'history', name: '발령 및 변동 이력', icon: History }, 
                  { id: 'docs', name: '전자 문서 보관함', icon: FileText }
                ].map(tab => (
                  <button 
                    key={tab.id} 
                    onClick={() => setActiveTab(tab.id)} 
                    className={`flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-sm font-black transition-colors flex-1 md:flex-none ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    <tab.icon size={16} /> {tab.name}
                  </button>
                ))}
            </nav>

            <div className="p-10 flex-1 min-h-[400px]">
                {/* 탭 1: 기본 정보 */}
                {activeTab === 'info' && (
                    <div className="animate-in fade-in duration-300 relative">
                        <div className="absolute top-0 right-0">
                            {isEditingInfo ? (
                                <div className="flex gap-2">
                                    <button 
                                      onClick={() => { setIsEditingInfo(false); setEditedEmp(employee); }} 
                                      className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-black hover:bg-slate-200"
                                    >
                                      취소
                                    </button>
                                    <button 
                                      onClick={handleSaveInfo} 
                                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-black hover:bg-blue-700 flex items-center gap-1.5"
                                    >
                                      <Save size={14}/> 저장
                                    </button>
                                </div>
                            ) : (
                                <button 
                                  onClick={() => setIsEditingInfo(true)} 
                                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-black hover:bg-slate-200 flex items-center gap-1.5"
                                >
                                  <Edit2 size={14}/> 정보 수정
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-12">
                            <div className="space-y-8">
                                <section>
                                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Briefcase size={14}/> 직무 및 연차 정보</h3>
                                    <div className="space-y-4">
                                        {isEditingInfo ? (
                                            <>
                                                <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                                                    <span className="text-xs font-bold text-slate-400">입사 일자</span>
                                                    <input 
                                                      type="date" 
                                                      value={editedEmp.hire_date || ''} 
                                                      onChange={(e) => setEditedEmp({...editedEmp, hire_date: e.target.value})} 
                                                      className="border rounded px-2 py-1 text-sm font-bold outline-none focus:border-blue-500 text-right"
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                                                    <span className="text-xs font-bold text-slate-400">퇴사 일자</span>
                                                    <input 
                                                      type="date" 
                                                      value={editedEmp.resignation_date || ''} 
                                                      onChange={(e) => setEditedEmp({...editedEmp, resignation_date: e.target.value})} 
                                                      className="border rounded px-2 py-1 text-sm font-bold outline-none focus:border-rose-500 text-right text-rose-600"
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <InfoRow label="입사 일자" value={employee.hire_date || '-'} />
                                                {employee.resignation_date && <InfoRow label="퇴사 일자" value={<span className="text-rose-600">{employee.resignation_date}</span>} />}
                                            </>
                                        )}
                                        
                                        <InfoRow label="근속 기간" value={calculateTenure(isEditingInfo ? editedEmp.hire_date : employee.hire_date, isEditingInfo ? editedEmp.resignation_date : employee.resignation_date)} />
                                        
                                        {/* 🚀 연차 현황 편집/표기 UI 추가 */}
                                        {isEditingInfo ? (
                                            <>
                                                <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                                                    <span className="text-xs font-bold text-slate-400">총 부여 연차</span>
                                                    <div className="flex items-center gap-1">
                                                        <input 
                                                            type="number" step="0.5" min="0" 
                                                            value={editedEmp.total_leave_days || 0} 
                                                            onChange={(e) => setEditedEmp({...editedEmp, total_leave_days: e.target.value})} 
                                                            className="border rounded px-2 py-1 text-sm font-bold outline-none focus:border-blue-500 text-right w-20"
                                                        />
                                                        <span className="text-xs text-slate-500">일</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                                                    <span className="text-xs font-bold text-slate-400">기사용 연차</span>
                                                    <div className="flex items-center gap-1">
                                                        <input 
                                                            type="number" step="0.5" min="0" 
                                                            value={editedEmp.used_leave_days || 0} 
                                                            onChange={(e) => setEditedEmp({...editedEmp, used_leave_days: e.target.value})} 
                                                            className="border rounded px-2 py-1 text-sm font-bold outline-none focus:border-rose-500 text-right w-20 text-rose-600"
                                                        />
                                                        <span className="text-xs text-slate-500">일</span>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex items-center justify-between border-b border-slate-50 pb-3 hover:bg-slate-50 px-2 rounded-lg transition-colors">
                                                <span className="text-xs font-bold text-slate-400">연차 현황</span>
                                                <span className="text-sm font-black text-slate-800">
                                                    총 {employee.total_leave_days || 0}일 / 사용 {employee.used_leave_days || 0}일 <span className="text-blue-500 ml-1">(잔여 {Math.max((employee.total_leave_days || 0) - (employee.used_leave_days || 0), 0)}일)</span>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </section>
                                <section>
                                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><MapPin size={14}/> 주소지 정보</h3>
                                    {isEditingInfo ? (
                                        <textarea 
                                          value={editedEmp.address || ''} 
                                          onChange={(e) => setEditedEmp({...editedEmp, address: e.target.value})} 
                                          className="w-full text-sm font-bold text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200 outline-none focus:border-blue-500 h-24" 
                                          placeholder="주소 입력"
                                        />
                                    ) : (
                                        <p className="text-sm font-bold text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                          {employee.address || '주소 정보 없음'}
                                        </p>
                                    )}
                                </section>
                            </div>
                            <div className="space-y-8">
                                <section>
                                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Award size={14}/> 인적 사항</h3>
                                    <div className="space-y-4">
                                        {isEditingInfo ? (
                                            <>
                                                <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                                                    <span className="text-xs font-bold text-slate-400">생년월일</span>
                                                    <input 
                                                      type="date" 
                                                      value={editedEmp.birth_date || ''} 
                                                      onChange={(e) => setEditedEmp({...editedEmp, birth_date: e.target.value})} 
                                                      className="border rounded px-2 py-1 text-sm font-bold outline-none focus:border-blue-500 text-right"
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                                                    <span className="text-xs font-bold text-slate-400">연락처</span>
                                                    <input 
                                                      type="text" 
                                                      value={editedEmp.phone || ''} 
                                                      onChange={(e) => setEditedEmp({...editedEmp, phone: e.target.value})} 
                                                      className="border rounded px-2 py-1 text-sm font-bold outline-none focus:border-blue-500 text-right" 
                                                      placeholder="010-0000-0000"
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                                                    <span className="text-xs font-bold text-slate-400">이메일</span>
                                                    <input 
                                                      type="email" 
                                                      value={editedEmp.email || ''} 
                                                      onChange={(e) => setEditedEmp({...editedEmp, email: e.target.value})} 
                                                      className="border rounded px-2 py-1 text-sm font-bold outline-none focus:border-blue-500 text-right" 
                                                      placeholder="email@example.com"
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <InfoRow label="생년월일" value={employee.birth_date || '-'} />
                                                <InfoRow label="연락처" value={employee.phone || '-'} />
                                                <InfoRow label="이메일" value={employee.email || '-'} />
                                            </>
                                        )}
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                )}

                {/* 탭 2: 발령 이력 */}
                {activeTab === 'history' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-black">변동 히스토리</h3>
                          <button 
                            onClick={() => setIsHistoryModalOpen(true)} 
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-black hover:bg-blue-700 transition-all"
                          >
                            <Plus size={14}/> 이력 추가
                          </button>
                        </div>
                        {history.length === 0 ? (
                          <div className="py-20 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400 font-bold">
                            기록된 변동 이력이 없습니다.
                          </div>
                        ) : (
                            <div className="relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 space-y-8">
                                {history.map((item) => (
                                    <div key={item.id} className="relative pl-10">
                                      <div className="absolute left-0 top-1.5 w-6 h-6 bg-white border-4 border-blue-200 rounded-full z-10" />
                                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                          <div className="flex justify-between mb-2">
                                            <span className="text-[10px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-600">{item.type}</span>
                                            <span className="text-xs font-mono font-bold text-slate-400">{item.start_date}</span>
                                          </div>
                                          <p className="text-base font-black text-slate-800">{item.change_details}</p>
                                          {item.reason && <p className="text-xs text-slate-500 mt-2 italic pl-2 border-l-2">사유: {item.reason}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 탭 3: 전자 문서 */}
                {activeTab === 'docs' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-black">보관 문서</h3>
                          <button 
                            onClick={() => setIsDocModalOpen(true)} 
                            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-black hover:bg-black transition-all"
                          >
                            <Upload size={14}/> 문서 업로드
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {documents.length === 0 ? (
                              <div className="col-span-2 py-20 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400 font-bold">
                                보관된 문서가 없습니다.
                              </div>
                            ) : documents.map(doc => (
                                <div key={doc.id} className="p-4 border border-slate-100 bg-white rounded-2xl flex items-center justify-between group hover:border-blue-300 transition-all">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center"><FileText size={20}/></div>
                                    <div>
                                      <p className="text-sm font-black text-slate-800">{doc.title}</p>
                                      <p className="text-[10px] text-slate-400 font-bold">{new Date(doc.uploaded_at).toLocaleDateString()}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button 
                                      onClick={() => handleDownloadDoc(doc.file_url)} 
                                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm border border-slate-100 rounded-lg"
                                      title="문서 열람"
                                    >
                                      <Download size={18}/>
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteDoc(doc.id, doc.file_url)} 
                                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all shadow-sm border border-slate-100 rounded-lg"
                                      title="문서 삭제"
                                    >
                                      <Trash2 size={18}/>
                                    </button>
                                  </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </main>

      {/* 이력 추가 모달 */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-black">인사 변동 이력 등록</h3>
                  <button onClick={() => setIsHistoryModalOpen(false)}><X/></button>
                </div>
                <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-400">변동 유형</label>
                        <select 
                          value={historyForm.type} 
                          onChange={(e) => setHistoryForm({...historyForm, type: e.target.value})} 
                          className="w-full p-3 bg-slate-50 border rounded-xl font-bold outline-none focus:border-blue-500"
                        >
                            <option>승진/직급</option>
                            <option>부서이동</option>
                            <option>상태변동</option>
                        </select>
                    </div>

                    {historyForm.type === '상태변동' ? (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-400">변동 내용</label>
                            <input 
                              type="text" 
                              value={historyForm.change_details} 
                              onChange={(e) => setHistoryForm({...historyForm, change_details: e.target.value})} 
                              className="w-full p-3 bg-slate-50 border rounded-xl font-bold outline-none" 
                              placeholder="예: 육아휴직 시작"
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-400">변동 내용 (이전 → 이후)</label>
                            <div className="flex items-center gap-2">
                                <input 
                                  type="text" 
                                  value={historyForm.change_from} 
                                  onChange={(e) => setHistoryForm({...historyForm, change_from: e.target.value})} 
                                  className="w-full p-3 bg-slate-50 border rounded-xl font-bold outline-none text-center" 
                                  placeholder={historyForm.type === '승진/직급' ? "변경 전 직급" : "이전 부서"}
                                />
                                <span className="text-slate-400 font-bold">→</span>
                                <input 
                                  type="text" 
                                  value={historyForm.change_to} 
                                  onChange={(e) => setHistoryForm({...historyForm, change_to: e.target.value})} 
                                  className="w-full p-3 bg-slate-50 border rounded-xl font-bold outline-none text-center" 
                                  placeholder={historyForm.type === '승진/직급' ? "변경 후 직급" : "이동 부서"}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-400">발령 일자</label>
                        <input 
                          type="date" 
                          value={historyForm.start_date} 
                          onChange={(e) => setHistoryForm({...historyForm, start_date: e.target.value})} 
                          className="w-full p-3 bg-slate-50 border rounded-xl font-bold outline-none"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-400">상세 사유</label>
                        <textarea 
                          value={historyForm.reason} 
                          onChange={(e) => setHistoryForm({...historyForm, reason: e.target.value})} 
                          className="w-full p-3 bg-slate-50 border rounded-xl font-bold outline-none h-24" 
                          placeholder="사유 입력 (선택사항)"
                        />
                    </div>
                </div>
                <button 
                  onClick={handleAddHistory} 
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-black shadow-lg hover:bg-blue-700 transition-all"
                >
                  내역 저장하기
                </button>
            </div>
        </div>
      )}

      {/* 문서 업로드 모달 */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-black">전자 문서 업로드</h3>
                  <button onClick={() => setIsDocModalOpen(false)}><X/></button>
                </div>
                <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-400">문서 명칭</label>
                        <input 
                          type="text" 
                          value={docForm.title} 
                          onChange={(e) => setDocForm({...docForm, title: e.target.value})} 
                          className="w-full p-3 bg-slate-50 border rounded-xl font-bold outline-none" 
                          placeholder="예: 2026년 근로계약서"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-400">파일 선택</label>
                        <input 
                          type="file" 
                          onChange={(e) => setDocForm({...docForm, file: e.target.files[0]})} 
                          className="w-full p-3 bg-slate-50 border border-dashed rounded-xl font-bold outline-none"
                        />
                    </div>
                </div>
                <button 
                  onClick={handleUploadDoc} 
                  className="w-full py-4 bg-slate-900 text-white rounded-xl font-black shadow-lg hover:bg-black transition-all"
                >
                  문서 업로드 완료
                </button>
            </div>
        </div>
      )}
    </div>
  );
}

const InfoRow = ({ label, value }) => (
  <div className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0 hover:bg-slate-50 px-2 rounded-lg transition-colors">
    <span className="text-xs font-bold text-slate-400">{label}</span>
    <span className="text-sm font-black text-slate-800">{value}</span>
  </div>
);

export default function HRProfilePage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    }>
      <HRProfileContent />
    </Suspense>
  );
}