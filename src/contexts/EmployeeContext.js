// 파일 경로: src/contexts/EmployeeContext.js
'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

const EmployeeContext = createContext(null);

export function EmployeeProvider({ children }) {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // isAdmin 상태를 추가하여 권한 관리를 용이하게 합니다.
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchEmployeeProfile = useCallback(async (user) => {
    if (!user) {
      setEmployee(null);
      setIsAdmin(false); // 로그아웃 시 false로 설정
      setLoading(false);
      return;
    }
    
    // setLoading(true)를 여기에 두어 사용자 변경 시 로딩 상태를 명확히 합니다.
    setLoading(true);
    
    try {
      // 역할(role) 정보도 함께 가져옵니다.
      const { data, error } = await supabase
        .from('profiles')
        .select('*, role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('프로필 정보를 가져오는데 실패했습니다:', error.message);
        setEmployee(null);
        setIsAdmin(false);
      } else if (data) {
        setEmployee(data);
        // role이 'admin'이면 isAdmin 상태를 true로 설정합니다.
        setIsAdmin(data.role === 'admin');
      }
    } catch (e) {
      console.error('프로필 정보 fetch 중 예외 발생:', e);
      setEmployee(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 최초 세션 확인
    const getInitialSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        fetchEmployeeProfile(session?.user ?? null);
    };
    getInitialSession();

    // 인증 상태 변경 리스너
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchEmployeeProfile(session?.user ?? null);
    });
    
    // 'profileUpdated' 이벤트 리스너 (기존 코드 유지)
    // 다른 곳에서 프로필이 업데이트되었을 때 상태를 다시 불러오는 유용한 기능입니다.
    const handleProfileUpdate = () => {
        getInitialSession();
    };
    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      authListener?.subscription?.unsubscribe();
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [fetchEmployeeProfile]);

  // ★★★ 상태 업데이트 함수 추가 ★★★
  const updateEmployeeStatus = async (userId, newStatus) => {
    if (!userId) {
      console.error("상태 업데이트 실패: 사용자 ID가 없습니다.");
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ status: newStatus, updated_at: new Date().toISOString() }) // updated_at 필드도 함께 갱신
        .eq('id', userId)
        .select() // 업데이트된 행을 다시 선택
        .single();

      if (error) {
        throw error;
      }
      
      if (data) {
        // ★★★ 함수형 업데이트로 안정성 확보 ★★★
        // setEmployee(data) 보다 이 방식이 리액트의 상태 업데이트를 더 확실히 보장합니다.
        setEmployee(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error("상태 업데이트 실패:", error.message);
    }
  };

  // Provider가 내려주는 값
  const value = { 
    employee, 
    loading, 
    isAdmin, // isAdmin 값 추가
    updateEmployeeStatus, // 상태 업데이트 함수 추가
  };

  return (
    <EmployeeContext.Provider value={value}>
      {children}
    </EmployeeContext.Provider>
  );
}

// useEmployee 훅 (기존 코드와 동일)
export function useEmployee() {
  const context = useContext(EmployeeContext);
  if (context === null) {
    throw new Error('useEmployee must be used within a EmployeeProvider');
  }
  return context;
}