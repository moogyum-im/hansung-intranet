'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { 
    Wallet, CalendarCheck, Save, Search, 
    Send, ChevronRight, Users, ShieldCheck, 
    FileSpreadsheet, Calculator
} from 'lucide-react';

export default function ManagementPage() {
    const { employee, loading: authLoading } = useEmployee();
    const router = useRouter();
    
    const [activeTab, setActiveTab] = useState('salary'); // salary or leave
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // 1. 보안 권한 체크 (관리부/admin 외 접근 차단)
    useEffect(() => {
        if (!authLoading) {
            if (!employee || (employee.role !== 'management' && employee.role !== 'admin')) {
                toast.error("관리부 전용 페이지입니다.");
                router.push('/');
            } else {
                fetchData();
            }
        }
    }, [employee, authLoading]);

    const fetchData = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('employment_status', '재직')
            .order('department', { ascending: true });
        
        if (!error) setEmployees(data);
        setLoading(false);
    };

    // 2. 연차 일괄 수정 로직
    const handleLeaveChange = (id, value) => {
        setEmployees(prev => prev.map(emp => 
            emp.id === id ? { ...emp, total_annual_leave: Number(value) } : emp
        ));
    };

    const saveLeaveData = async () => {
        try {
            for (const emp of employees) {
                await supabase
                    .from('profiles')
                    .update({ total_annual_leave: emp.total_annual_leave })
                    .eq('id', emp.id);
            }
            toast.success("연차 정보가 일괄 저장되었습니다.");
        } catch (e) { toast.error("저장 실패"); }
    };

    const filteredEmployees = employees.filter(e => e.full_name.includes(searchTerm));

    if (authLoading || loading) return <div className="p-20 text-center font-black animate-pulse">MANAGEMENT SYSTEM LOADING...</div>;

    return (
        <div className="min-h-screen bg-[#f8fafc] p-6 font-black text-black">
            <div className="max-w-[1400px] mx-auto">
                {/* 상단 헤더 */}
                <header className="flex justify-between items-center mb-8 bg-white border-2 border-black p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="bg-black p-3 text-white">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl uppercase tracking-tighter">관리부 전용</h1>
                            <p className="text-[10px] text-slate-400 font-sans">MANAGEMENT & ADMINISTRATION ONLY</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                            <input 
                                type="text" 
                                placeholder="직원 검색..." 
                                className="pl-9 pr-4 py-2 border-2 border-slate-200 focus:border-black outline-none text-[11px] w-64 transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-12 gap-6">
                    {/* 왼쪽 사이드 메뉴 */}
                    <aside className="col-span-12 lg:col-span-2 space-y-2">
                        <button 
                            onClick={() => setActiveTab('salary')}
                            className={`w-full flex items-center gap-3 px-4 py-4 border-2 transition-all ${activeTab === 'salary' ? 'bg-black text-white border-black' : 'bg-white text-slate-400 border-transparent hover:border-slate-200'}`}
                        >
                            <Wallet size={18} /> <span className="text-sm uppercase">급여 관리</span>
                        </button>
                        <button 
                            onClick={() => setActiveTab('leave')}
                            className={`w-full flex items-center gap-3 px-4 py-4 border-2 transition-all ${activeTab === 'leave' ? 'bg-black text-white border-black' : 'bg-white text-slate-400 border-transparent hover:border-slate-200'}`}
                        >
                            <CalendarCheck size={18} /> <span className="text-sm uppercase">연차 관리</span>
                        </button>
                    </aside>

                    {/* 메인 작업 영역 */}
                    <main className="col-span-12 lg:col-span-10">
                        <div className="bg-white border-2 border-black p-8 min-h-[600px]">
                            {activeTab === 'salary' ? (
                                <section className="space-y-6">
                                    <div className="flex justify-between items-end border-b-2 border-slate-100 pb-4">
                                        <h2 className="text-xl flex items-center gap-2"><Calculator size={20}/> 급여 명세서 일괄 처리</h2>
                                        <button className="bg-blue-600 text-white px-5 py-2 text-[11px] flex items-center gap-2 hover:bg-blue-700">
                                            <FileSpreadsheet size={14}/> 엑셀 양식 다운로드
                                        </button>
                                    </div>
                                    <div className="border-2 border-slate-100 p-20 text-center text-slate-300">
                                        <p className="text-sm uppercase mb-2 italic">Salary processing module is ready.</p>
                                        <p className="text-[10px]">데이터를 입력하거나 엑셀 파일을 업로드하여 급여를 정산하십시오.</p>
                                    </div>
                                </section>
                            ) : (
                                <section className="space-y-6">
                                    <div className="flex justify-between items-end border-b-2 border-slate-100 pb-4">
                                        <h2 className="text-xl flex items-center gap-2"><Users size={20}/> 전 직원 연차 일괄 관리</h2>
                                        <button onClick={saveLeaveData} className="bg-black text-white px-6 py-2 text-[11px] flex items-center gap-2 hover:bg-slate-800 transition-all">
                                            <Save size={14}/> 변경사항 일괄 저장
                                        </button>
                                    </div>
                                    
                                    <table className="w-full text-[12px] border-collapse">
                                        <thead className="bg-slate-50 border-b-2 border-black">
                                            <tr>
                                                <th className="p-4 text-left">부서</th>
                                                <th className="p-4 text-left">성명(직위)</th>
                                                <th className="p-4 text-center bg-blue-50/50 text-blue-700">총 연차 부여 (수정)</th>
                                                <th className="p-4 text-center text-rose-500">사용 연차</th>
                                                <th className="p-4 text-center">잔여 연차</th>
                                                <th className="p-4"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredEmployees.map((emp) => (
                                                <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                    <td className="p-4 text-slate-500">{emp.department}</td>
                                                    <td className="p-4 font-bold">{emp.full_name} {emp.position}</td>
                                                    <td className="p-2 bg-blue-50/20">
                                                        <input 
                                                            type="number" 
                                                            className="w-full bg-transparent text-center text-lg font-black text-blue-600 outline-none"
                                                            value={emp.total_annual_leave || 0}
                                                            onChange={(e) => handleLeaveChange(emp.id, e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="p-4 text-center text-rose-500">{emp.used_annual_leave || 0}</td>
                                                    <td className="p-4 text-center font-black text-lg">
                                                        {(emp.total_annual_leave || 0) - (emp.used_annual_leave || 0)}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <button onClick={() => router.push(`/mypage/${emp.id}`)} className="text-slate-300 hover:text-black transition-colors"><ChevronRight size={18}/></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </section>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}