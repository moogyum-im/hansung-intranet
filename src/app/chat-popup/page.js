// src/app/chat-popup/page.js
'use client';

import { MessageSquare } from 'lucide-react';

export default function ChatPopupHome() {
    return (
        <div className="h-full flex flex-col items-center justify-center bg-white text-[#C7C7CC] select-none">
            <MessageSquare size={32} className="mb-3 opacity-30" />
            <p className="text-[14px] font-bold text-[#8E8E93]">대화를 선택하세요</p>
            <p className="text-[12px] text-[#C7C7CC] mt-1">왼쪽에서 채팅방을 선택해주세요</p>
        </div>
    );
}
