"use client";

import { useState, useEffect, useCallback } from 'react';
import { ko } from 'date-fns/locale';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    addDays, isSameDay, isSameMonth, addMonths, subMonths,
    parseISO, isWithinInterval, isBefore, isAfter
} from 'date-fns';
import './DashboardCalendar.css';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { supabase } from '@/lib/supabase/client';
import { useEmployee } from '@/contexts/EmployeeContext';
import { Cake, CalendarDays, Plus, X, Trash2, Globe, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';

const LEAVE_COLORS = {
    '연차': 'bg-emerald-500',
    '반차': 'bg-teal-400',
    '병가': 'bg-rose-400',
    '경조사': 'bg-purple-400',
    default: 'bg-blue-400',
};

const SCHEDULE_COLORS = [
    { value: '#3b82f6', label: '파랑' },
    { value: '#8b5cf6', label: '보라' },
    { value: '#f59e0b', label: '노랑' },
    { value: '#10b981', label: '초록' },
    { value: '#ef4444', label: '빨강' },
    { value: '#ec4899', label: '분홍' },
];

function getLeaveColor(leaveType) {
    for (const [key, val] of Object.entries(LEAVE_COLORS)) {
        if (leaveType?.includes(key)) return val;
    }
    return LEAVE_COLORS.default;
}

function toKSTDateStr(date) {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(date);
}

export default function DashboardCalendar() {
    const { employee } = useEmployee();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isClient, setIsClient] = useState(false);
    const [birthdays, setBirthdays] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tooltip, setTooltip] = useState(null);

    // 일정 추가 모달
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState({ title: '', memo: '', color: '#3b82f6', visibility: 'private', start_date: '', end_date: '' });
    const [saving, setSaving] = useState(false);

    // 일정 상세 모달
    const [detailModal, setDetailModal] = useState(null);

    useEffect(() => { setIsClient(true); }, []);

    const fetchCalendarData = useCallback(async () => {
        if (!employee) return;
        setLoading(true);
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const monthStr = format(currentDate, 'MM');
        const yearStr = format(currentDate, 'yyyy');

        // 생일
        const { data: empData } = await supabase
            .from('profiles')
            .select('id, full_name, birth_date, department, position')
            .eq('employment_status', '재직')
            .not('birth_date', 'is', null);

        const birthdayList = (empData || []).flatMap(emp => {
            if (!emp.birth_date) return [];
            const bDate = parseISO(emp.birth_date);
            if (format(bDate, 'MM') !== monthStr) return [];
            return [{ date: new Date(parseInt(yearStr), bDate.getMonth(), bDate.getDate()), name: emp.full_name, department: emp.department, position: emp.position }];
        });
        setBirthdays(birthdayList);

        // 승인된 연차
        const { data: leaveData } = await supabase
            .from('approval_documents')
            .select('id, requester_id, content, profiles!approval_documents_requester_id_fkey(full_name)')
            .in('status', ['승인', '완료'])
            .eq('document_type', 'leave_request');

        const leaveList = [];
        (leaveData || []).forEach(doc => {
            try {
                const content = typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content;
                if (!content.startDate) return;
                const start = parseISO(content.startDate);
                const end = content.endDate ? parseISO(content.endDate) : start;
                if (isBefore(end, monthStart) || isAfter(start, monthEnd)) return;
                leaveList.push({
                    name: doc.profiles?.full_name || '직원',
                    start, end,
                    leaveType: content.leaveType || '연차',
                });
            } catch { /* skip */ }
        });
        setLeaves(leaveList);

        // 내 일정 + 전사 공개 일정 (멀티데이 포함: 이달과 겹치는 일정 조회)
        const { data: schedData } = await supabase
            .from('personal_schedules')
            .select('*')
            .lte('schedule_date', format(monthEnd, 'yyyy-MM-dd'))
            .or(`end_date.gte.${format(monthStart, 'yyyy-MM-dd')},and(end_date.is.null,schedule_date.gte.${format(monthStart, 'yyyy-MM-dd')})`)
            .order('schedule_date', { ascending: true });

        setSchedules(schedData || []);
        setLoading(false);
    }, [currentDate, employee]);

    useEffect(() => {
        if (isClient && employee) fetchCalendarData();
    }, [isClient, fetchCalendarData]);

    const handleSaveSchedule = async () => {
        if (!form.title.trim() || !modal || !employee) return;
        setSaving(true);
        try {
            const startDateStr = form.start_date || toKSTDateStr(modal.date);
            const endDateStr = form.end_date && form.end_date >= startDateStr ? form.end_date : null;
            const { error } = await supabase.from('personal_schedules').insert({
                user_id: employee.id,
                title: form.title.trim(),
                memo: form.memo.trim() || null,
                color: form.color,
                schedule_date: startDateStr,
                end_date: endDateStr,
                visibility: form.visibility,
                employee_name: employee.full_name,
            });
            if (error) {
                toast.error('저장 실패: ' + error.message);
            } else {
                toast.success(form.visibility === 'public' ? '전사 공유 일정이 추가됐습니다.' : '개인 일정이 추가됐습니다.');
                setModal(null);
                setForm({ title: '', memo: '', color: '#3b82f6', visibility: 'private', start_date: '', end_date: '' });
                fetchCalendarData();
            }
        } catch (e) {
            toast.error('오류: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSchedule = async (id) => {
        if (!window.confirm('이 일정을 삭제하시겠습니까?')) return;
        await supabase.from('personal_schedules').delete().eq('id', id);
        toast.success('삭제됐습니다.');
        setDetailModal(null);
        fetchCalendarData();
    };

    if (!isClient) {
        return <div className="w-full bg-gray-200 rounded-lg animate-pulse min-h-[340px]" />;
    }

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const weeks = [];
    let day = calStart;
    while (day <= calEnd) {
        const week = [];
        for (let i = 0; i < 7; i++) {
            week.push(new Date(day));
            day = addDays(day, 1);
        }
        weeks.push(week);
    }

    function getDayEvents(date) {
        const bdays = birthdays.filter(b => isSameDay(b.date, date));
        const lvs = leaves.filter(l => isWithinInterval(date, { start: l.start, end: l.end }));
        const scheds = schedules.filter(s => {
            const start = parseISO(s.schedule_date);
            const end = s.end_date ? parseISO(s.end_date) : start;
            return isWithinInterval(date, { start, end });
        });
        return { bdays, lvs, scheds };
    }

    return (
        <div className="bg-white rounded-lg border shadow-sm overflow-visible relative">
            {/* 호버 툴팁 */}
            {tooltip && (
                <div
                    className="fixed z-50 bg-slate-800 text-white rounded-xl shadow-xl p-3 min-w-[160px] max-w-[220px] pointer-events-none"
                    style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -110%)' }}
                >
                    <p className="text-[11px] font-black text-slate-300 mb-2">{tooltip.dateLabel}</p>
                    {tooltip.bdays.map((b, i) => (
                        <div key={`tb-${i}`} className="mb-1.5">
                            <div className="flex items-center gap-1.5">
                                <Cake size={10} className="text-amber-400 shrink-0" />
                                <span className="text-[12px] font-bold">{b.name} 생일 🎂</span>
                            </div>
                            {(b.department || b.position) && (
                                <p className="text-[10px] text-slate-400 ml-4 mt-0.5">
                                    {[b.department, b.position].filter(Boolean).join(' · ')}
                                </p>
                            )}
                        </div>
                    ))}
                    {tooltip.lvs.map((l, i) => (
                        <div key={`tl-${i}`} className="flex items-center gap-1.5 mb-1">
                            <CalendarDays size={10} className="text-emerald-400 shrink-0" />
                            <span className="text-[12px] font-bold">{l.name}</span>
                            <span className="text-[10px] text-slate-400 ml-auto">{l.leaveType}</span>
                        </div>
                    ))}
                    {tooltip.scheds.map((s, i) => (
                        <div key={`ts-${i}`} className="flex items-center gap-1.5 mb-1">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                            <span className="text-[12px] font-bold truncate">{s.visibility === 'public' && s.user_id !== employee?.id ? `${s.employee_name} · ` : ''}{s.title}</span>
                            {s.visibility === 'public' ? <Globe size={8} className="text-blue-300 shrink-0 ml-auto" /> : <Lock size={8} className="text-slate-400 shrink-0 ml-auto" />}
                        </div>
                    ))}
                    <p className="text-[9px] text-slate-500 mt-1.5">클릭하여 일정 추가</p>
                </div>
            )}

            {/* 일정 추가 모달 */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setModal(null)}>
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl p-5 w-80 z-10" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-[10px] text-slate-400 font-medium">
                                    {format(modal.date, 'yyyy년 M월 d일 (eee)', { locale: ko })} (KST)
                                </p>
                                <h3 className="text-[14px] font-black text-slate-700">일정 추가</h3>
                            </div>
                            <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <input
                                autoFocus
                                type="text"
                                value={form.title}
                                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && handleSaveSchedule()}
                                placeholder="일정 제목 *"
                                className="w-full text-[13px] border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <p className="text-[10px] text-slate-400 font-bold mb-1.5">시작일</p>
                                    <input
                                        type="date"
                                        value={form.start_date}
                                        onChange={e => setForm(f => ({ ...f, start_date: e.target.value, end_date: f.end_date && f.end_date < e.target.value ? e.target.value : f.end_date }))}
                                        className="w-full text-[12px] border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400"
                                    />
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 font-bold mb-1.5">종료일</p>
                                    <input
                                        type="date"
                                        value={form.end_date}
                                        min={form.start_date}
                                        onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                                        className="w-full text-[12px] border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400"
                                    />
                                </div>
                            </div>
                            <textarea
                                value={form.memo}
                                onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
                                placeholder="메모 (선택)"
                                rows={2}
                                className="w-full text-[12px] border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 resize-none"
                            />
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold mb-1.5">색상</p>
                                <div className="flex gap-2">
                                    {SCHEDULE_COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            onClick={() => setForm(f => ({ ...f, color: c.value }))}
                                            className={`w-6 h-6 rounded-full transition-transform ${form.color === c.value ? 'scale-125 ring-2 ring-offset-1 ring-slate-400' : 'hover:scale-110'}`}
                                            style={{ background: c.value }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold mb-1.5">공개 범위</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setForm(f => ({ ...f, visibility: 'private' }))}
                                        className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-black border transition-all
                                            ${form.visibility === 'private' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                    >
                                        <Lock size={12} /> 나만 보기
                                    </button>
                                    <button
                                        onClick={() => setForm(f => ({ ...f, visibility: 'public' }))}
                                        className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-black border transition-all
                                            ${form.visibility === 'public' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                    >
                                        <Globe size={12} /> 전사 공유
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                            <button onClick={() => setModal(null)} className="flex-1 py-2 text-[12px] font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                                취소
                            </button>
                            <button
                                onClick={handleSaveSchedule}
                                disabled={!form.title.trim() || saving}
                                className="flex-1 py-2 text-[12px] font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors"
                            >
                                {saving ? '저장 중...' : '저장'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 일정 상세 모달 */}
            {detailModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setDetailModal(null)}>
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-2xl p-5 w-72 z-10" onClick={e => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: detailModal.color }} />
                                <h3 className="text-[14px] font-black text-slate-700 truncate">{detailModal.title}</h3>
                            </div>
                            <button onClick={() => setDetailModal(null)}><X size={14} className="text-slate-400 shrink-0 ml-2" /></button>
                        </div>
                        <p className="text-[11px] text-slate-400 mb-1">{detailModal.schedule_date}</p>
                        {detailModal.employee_name && detailModal.user_id !== employee?.id && (
                            <p className="text-[11px] text-slate-500 mb-2">{detailModal.employee_name}</p>
                        )}
                        <div className="mb-3">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${detailModal.visibility === 'public' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                {detailModal.visibility === 'public' ? <><Globe size={9} /> 전사 공유</> : <><Lock size={9} /> 나만 보기</>}
                            </span>
                        </div>
                        {detailModal.memo && <p className="text-[12px] text-slate-600 mb-3">{detailModal.memo}</p>}
                        {detailModal.user_id === employee?.id && (
                            <button
                                onClick={() => handleDeleteSchedule(detailModal.id)}
                                className="flex items-center gap-1.5 text-[11px] text-rose-500 hover:text-rose-700 font-bold"
                            >
                                <Trash2 size={12} /> 일정 삭제
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* 헤더 */}
            <div className="flex items-center justify-between px-3 py-2 border-b bg-slate-50">
                <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1 rounded-full hover:bg-gray-200">
                    <ChevronLeftIcon className="h-4 w-4 text-gray-600" />
                </button>
                <span className="text-sm font-bold text-gray-800">{format(currentDate, 'yyyy년 M월', { locale: ko })}</span>
                <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1 rounded-full hover:bg-gray-200">
                    <ChevronRightIcon className="h-4 w-4 text-gray-600" />
                </button>
            </div>

            {/* 요일 */}
            <div className="grid grid-cols-7 text-center border-b">
                {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                    <div key={d} className={`py-1.5 text-[10px] font-bold ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-600' : 'text-slate-500'}`}>
                        {d}
                    </div>
                ))}
            </div>

            {/* 날짜 그리드 */}
            {loading ? (
                <div className="animate-pulse p-4 space-y-2">
                    {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-slate-100 rounded" />)}
                </div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {weeks.map((week, wi) => (
                        <div key={wi} className="grid grid-cols-7 divide-x divide-slate-100">
                            {week.map((date, di) => {
                                const isToday = isSameDay(date, new Date());
                                const isCurrentMonth = isSameMonth(date, currentDate);
                                const isSun = date.getDay() === 0;
                                const isSat = date.getDay() === 6;
                                const { bdays, lvs, scheds } = getDayEvents(date);
                                const hasEvents = bdays.length > 0 || lvs.length > 0 || scheds.length > 0;

                                return (
                                    <div
                                        key={di}
                                        className={`min-h-[68px] p-1 flex flex-col cursor-pointer group ${!isCurrentMonth ? 'bg-slate-50/60' : ''} ${isCurrentMonth ? 'hover:bg-blue-50/40' : ''} transition-colors`}
                                        onClick={() => {
                                            if (!isCurrentMonth) return;
                                            const dateStr = toKSTDateStr(date);
                                            setForm({ title: '', memo: '', color: '#3b82f6', visibility: 'private', start_date: dateStr, end_date: '' });
                                            setModal({ date });
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!hasEvents && !isCurrentMonth) return;
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setTooltip({
                                                x: rect.left + rect.width / 2,
                                                y: rect.top + window.scrollY,
                                                bdays, lvs, scheds,
                                                dateLabel: format(date, 'M월 d일 (eee)', { locale: ko }),
                                            });
                                        }}
                                        onMouseLeave={() => setTooltip(null)}
                                    >
                                        <div className="flex justify-between items-start mb-0.5">
                                            <span className={`
                                                text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full
                                                ${isToday ? 'bg-blue-500 text-white' : ''}
                                                ${!isCurrentMonth ? 'text-slate-300' : isSun ? 'text-red-500' : isSat ? 'text-blue-600' : 'text-slate-700'}
                                            `}>
                                                {format(date, 'd')}
                                            </span>
                                            {isCurrentMonth && (
                                                <Plus size={9} className="text-slate-300 group-hover:text-blue-400 transition-colors mt-0.5 mr-0.5" />
                                            )}
                                        </div>

                                        <div className="space-y-0.5 flex-1 overflow-hidden">
                                            {bdays.slice(0, 1).map((b, idx) => (
                                                <div key={`b-${idx}`} className="flex items-center gap-0.5 bg-amber-50 border border-amber-200 rounded px-0.5 py-px">
                                                    <Cake size={8} className="text-amber-500 shrink-0" />
                                                    <span className="text-[9px] font-bold text-amber-700 truncate">{b.name}</span>
                                                </div>
                                            ))}
                                            {lvs.slice(0, 2).map((l, idx) => (
                                                <div key={`l-${idx}`} className={`flex items-center gap-0.5 ${getLeaveColor(l.leaveType)} rounded px-0.5 py-px`}>
                                                    <CalendarDays size={8} className="text-white shrink-0" />
                                                    <span className="text-[9px] font-bold text-white truncate">{l.name}</span>
                                                </div>
                                            ))}
                                            {scheds.slice(0, 2).map((s, idx) => (
                                                <div
                                                    key={`s-${idx}`}
                                                    className="flex items-center gap-0.5 rounded px-0.5 py-px cursor-pointer"
                                                    style={{ background: s.color + '22', border: `1px solid ${s.color}55` }}
                                                    onClick={e => { e.stopPropagation(); setDetailModal(s); }}
                                                >
                                                    {s.visibility === 'public'
                                                        ? <Globe size={7} className="shrink-0" style={{ color: s.color }} />
                                                        : <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.color }} />
                                                    }
                                                    <span className="text-[9px] font-bold truncate" style={{ color: s.color }}>
                                                        {s.visibility === 'public' && s.user_id !== employee?.id ? `${s.employee_name} ` : ''}{s.title}
                                                    </span>
                                                </div>
                                            ))}
                                            {(bdays.length + lvs.length + scheds.length) > 4 && (
                                                <div className="text-[8px] text-slate-400 font-bold pl-0.5">
                                                    +{bdays.length + lvs.length + scheds.length - 4}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            )}

            {/* 범례 */}
            <div className="px-3 py-2 border-t bg-slate-50 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 bg-amber-100 border border-amber-300 rounded-sm" />
                    <span className="text-[9px] font-bold text-slate-500">생일</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" />
                    <span className="text-[9px] font-bold text-slate-500">연차</span>
                </div>
                <div className="flex items-center gap-1">
                    <Globe size={9} className="text-blue-500" />
                    <span className="text-[9px] font-bold text-slate-500">전사 공유</span>
                </div>
                <div className="flex items-center gap-1">
                    <Lock size={9} className="text-slate-400" />
                    <span className="text-[9px] font-bold text-slate-500">나만 보기</span>
                </div>
                <span className="text-[9px] text-slate-400 ml-auto">날짜 클릭 → 일정 추가</span>
            </div>
        </div>
    );
}
