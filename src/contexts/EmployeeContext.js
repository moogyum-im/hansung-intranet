// 파일 경로: src/contexts/EmployeeContext.js
'use client';

import { createContext, useState, useEffect, useContext, useCallback } from 'react';
// 수정 후 코드
import { supabase } from 'lib/supabase/client'; // (../../ 사라짐)

const EmployeeContext = createContext();

export function EmployeeProvider({ children }) {
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);


    const fetchEmployeeProfile = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            
            if (error) {
                console.error("프로필 조회 에러:", error);
                setEmployee(null);
            } else {
                setEmployee(profile);
                setIsAdmin(profile.role === 'admin');
            }
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchEmployeeProfile();

        // ★★★ 'profileUpdated' 이벤트를 수신하는 리스너 추가 ★★★
        const handleProfileUpdate = () => {
            console.log("프로필 업데이트 이벤트 수신! 데이터를 새로고침합니다.");
            fetchEmployeeProfile();
        };

        window.addEventListener('profileUpdated', handleProfileUpdate);

        // 컴포넌트가 언마운트될 때 리스너를 정리합니다.
        return () => {
            window.removeEventListener('profileUpdated', handleProfileUpdate);
        };
    }, [fetchEmployeeProfile]);

    return (
        <EmployeeContext.Provider value={{ employee, setEmployee, loading, isAdmin }}>
            {children}
        </EmployeeContext.Provider>
    );
}

export function useEmployee() {
    return useContext(EmployeeContext);
}