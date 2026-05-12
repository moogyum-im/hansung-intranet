// src/app/(main)/chatrooms/page.js
'use client';

import { MessageSquare } from 'lucide-react';

export default function ChatRoomsPage() {
    return (
        <div className="h-full flex flex-col items-center justify-center bg-slate-50/30 text-slate-400 select-none">
            <div className="w-20 h-20 bg-white rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-center mb-5">
                <MessageSquare size={34} className="text-slate-300" />
            </div>
            <p className="text-[15px] font-black text-slate-600 tracking-tight">채팅방을 선택해주세요</p>
            <p className="text-[12px] font-medium text-slate-400 mt-1.5 text-center leading-relaxed">
                왼쪽 목록에서 대화를 선택하거나<br />새 채팅방을 만들어 보세요.
            </p>
        </div>
    );
}