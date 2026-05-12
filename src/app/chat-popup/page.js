// src/app/chat-popup/page.js
'use client';

import { MessageSquare } from 'lucide-react';

export default function ChatPopupHome() {
    return (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 select-none">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center mb-4">
                <MessageSquare size={28} className="text-slate-300" />
            </div>
            <p className="text-[14px] font-black text-slate-600">대화를 선택하세요</p>
            <p className="text-[12px] text-slate-400 mt-1">왼쪽에서 채팅방을 선택해주세요</p>
        </div>
    );
}