'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { KeyRound, Eye, EyeOff, ShieldCheck, X } from 'lucide-react';

export default function SecurityPopupPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [passwords, setPasswords] = useState({ new: '', confirm: '' });
    const [isChanging, setIsChanging] = useState(false);

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) return toast.error("새 비밀번호가 일치하지 않습니다.");
        if (passwords.new.length < 6) return toast.error("비밀번호는 최소 6자 이상이어야 합니다.");
        
        setIsChanging(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: passwords.new });
            if (error) throw error;
            
            toast.success("비밀번호가 성공적으로 변경되었습니다.");
            setTimeout(() => window.close(), 1500); // 1.5초 후 팝업 자동 닫기
        } catch (error) { 
            toast.error("변경 중 오류가 발생했습니다."); 
        } finally { 
            setIsChanging(false); 
        }
    };

    return (
        // 🚀 fixed inset-0 z-[9999] 로 부모 레이아웃(사이드바)을 완벽히 덮어버립니다.
        <div className="fixed inset-0 z-[9999] bg-[#f8fafc] flex flex-col font-sans antialiased overflow-y-auto">
            {/* 상단 헤더 */}
            <div className="bg-[#1e293b] p-6 text-white flex justify-between items-center shadow-md relative overflow-hidden shrink-0">
                <div className="absolute right-0 top-0 opacity-10 rotate-12 -mr-4 -mt-4"><ShieldCheck size={120} /></div>
                <div className="flex items-center gap-3 relative z-10">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 border border-white/10">
                        <KeyRound size={20} />
                    </div>
                    <div>
                        <h1 className="font-black tracking-tight">계정 보안 설정</h1>
                        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Security Center</p>
                    </div>
                </div>
                <button onClick={() => window.close()} className="text-slate-400 hover:text-white transition-colors relative z-10 p-2 rounded-full hover:bg-white/10">
                    <X size={24}/>
                </button>
            </div>

            {/* 메인 폼 */}
            <div className="flex-1 flex justify-center items-start pt-10 px-6">
                <div className="w-full max-w-sm bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8">
                    <form onSubmit={handlePasswordChange} className="space-y-6">
                        <div className="text-center mb-8">
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">비밀번호 변경</h2>
                            <p className="text-xs text-slate-500 font-medium mt-2">안전한 계정 사용을 위해 주기적인 변경을 권장합니다.</p>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="relative">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">새 비밀번호</label>
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    required 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-300" 
                                    placeholder="6자 이상 입력" 
                                    value={passwords.new} 
                                    onChange={e => setPasswords({...passwords, new: e.target.value})} 
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 bottom-4 text-slate-300 hover:text-slate-500">
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">비밀번호 확인</label>
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    required 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-300" 
                                    placeholder="다시 한번 입력해주세요" 
                                    value={passwords.confirm} 
                                    onChange={e => setPasswords({...passwords, confirm: e.target.value})} 
                                />
                            </div>
                        </div>
                        
                        <button type="submit" disabled={isChanging} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 mt-8">
                            {isChanging ? "보안 동기화 중..." : "비밀번호 업데이트"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}