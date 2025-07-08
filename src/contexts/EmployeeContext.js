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
      // ★★★★★ 'profiles' 대신 'employee_leave_status' 뷰를 조회 ★★★★★
      // 이 뷰에는 연차 정보(total_leaves 등)가 모두 포함되어 있습니다.
      const { data, error } = await supabase
        .from('employee_leave_status') // 테이블 대신 뷰(view)를 조회
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
    try {
      // 상태 업데이트는 'profiles' 원본 테이블에 직접 수행합니다.
      const { data, error } = await supabase
        .from('profiles')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (error) { throw error; }
      
      if (data) {
        // 상태가 변경되었으므로, 연차 정보가 포함된 최신 뷰를 다시 불러옵니다.
        fetchEmployeeProfile({ id: userId });
      }
    } catch (error) {
      console.error("상태 업데이트 실패:", error.message);
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