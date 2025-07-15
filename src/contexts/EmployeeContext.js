// 파일 경로: src/contexts/EmployeeContext.js
'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

const EmployeeContext = createContext(null);

export function EmployeeProvider({ children }) {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchEmployeeProfile = useCallback(async (user) => {
    if (!user) {
      setEmployee(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('employee_leave_status') // 뷰(view)를 조회
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('프로필 정보를 가져오는데 실패했습니다:', error.message);
        setEmployee(null);
        setIsAdmin(false);
      } else if (data) {
        setEmployee(data);
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
    const getInitialSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        fetchEmployeeProfile(session?.user ?? null);
    };
    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchEmployeeProfile(session?.user ?? null);
    });
    
    const handleProfileUpdate = () => {
        getInitialSession();
    };
    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      authListener?.subscription?.unsubscribe();
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [fetchEmployeeProfile]);

  const updateEmployeeStatus = async (userId, newStatus) => {
    if (!userId) {
      console.error("상태 업데이트 실패: 사용자 ID가 없습니다.");
      return;
    }

    // 낙관적 업데이트 시작
    const prevEmployee = employee; // 이전 employee 객체 저장

    // 현재 로그인한 사용자의 상태가 변경되는 경우에만 UI를 즉시 업데이트
    if (employee && employee.id === userId) {
        setEmployee(prev => ({ ...prev, status: newStatus }));
    }
    // 낙관적 업데이트 종료

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }
      
      if (data) {
        // 본인의 프로필이 업데이트된 경우, 'profileUpdated' 이벤트를 발송하여
        // 이 컨텍스트의 useEffect에서 fetchEmployeeProfile을 호출하게 합니다.
        window.dispatchEvent(new CustomEvent('profileUpdated'));
        return true; // 성공적으로 업데이트됨
      }
      return false;
    } catch (error) {
      console.error("상태 업데이트 실패:", error.message);
      // 낙관적 업데이트 롤백 (실패 시 이전 상태로 복구)
      if (prevEmployee && prevEmployee.id === userId) {
          setEmployee(prevEmployee); // 이전 employee 객체로 복구
      }
      throw error;
    }
  };

  const value = { 
    employee, 
    loading, 
    isAdmin,
    updateEmployeeStatus,
  };

  return (
    <EmployeeContext.Provider value={value}>
      {children}
    </EmployeeContext.Provider>
  );
}

export function useEmployee() {
  const context = useContext(EmployeeContext);
  if (context === null) {
    throw new Error('useEmployee must be used within a EmployeeProvider');
  }
  return context;
}