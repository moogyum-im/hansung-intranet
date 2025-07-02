// 파일 경로: src/components/StatusIndicator.js
"use client";

import { useMyStatus } from "@/contexts/MyStatusContext";
import { useState, useEffect } from "react";

const statusStyles = { '업무중': 'bg-green-500', '외근중': 'bg-blue-500', '휴가중': 'bg-orange-500', '연차중': 'bg-purple-500', '오프라인': 'bg-gray-400' };

// 이제 이 컴포넌트는 'person' 전체 정보를 props로 받습니다.
export default function StatusIndicator({ person }) {
    const { myStatus } = useMyStatus(); // 나의 전역 상태
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const userString = sessionStorage.getItem('user');
        if (userString) setCurrentUser(JSON.parse(userString));
    }, []);
    
    // 이 사람이 현재 로그인한 사용자인지 확인
    const isCurrentUser = currentUser?.name === person.name;
    
    // 보여줄 최종 상태 결정:
    // 이 사람이 로그인한 사용자라면 -> 전역 상태(myStatus)를 보여준다
    // 다른 사람이라면 -> 그 사람의 원래 상태(person.status)를 보여준다
    const displayStatus = isCurrentUser ? myStatus : person.status;
    
    const style = statusStyles[displayStatus] || statusStyles['오프라인'];

    return (
        <div className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${style.color}`}></div>
            <span className="text-sm font-medium text-gray-700">{displayStatus}</span>
        </div>
    );
}