// 파일 경로: src/contexts/EmployeeContext.js
'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const EmployeeContext = createContext(null);

export function EmployeeProvider({ children }) {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

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

  // ★★★ 실시간 업데이트를 위한 useEffect 훅 추가 ★★★
  useEffect(() => {
    if (!employee?.id) {
        return;
    }
    
    const channel = supabase
        .channel(`profiles-status-listener-${employee.id}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${employee.id}`
            },
            (payload) => {
                console.log('실시간 업데이트 수신:', payload.new);
                setEmployee(prev => ({ ...prev, ...payload.new }));
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, [employee?.id]);

  const updateEmployeeStatus = async (userId, newStatus) => {
    if (!userId) {
      console.error("상태 업데이트 실패: 사용자 ID가 없습니다.");
      return;
    }

    // 낙관적 업데이트 시작
    const prevEmployee = employee;

    if (employee && employee.id === userId) {
        setEmployee(prev => ({ ...prev, status: newStatus }));
    }

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
        window.dispatchEvent(new CustomEvent('profileUpdated'));
        return true;
      }
      return false;
    } catch (error) {
      console.error("상태 업데이트 실패:", error.message);
      if (prevEmployee && prevEmployee.id === userId) {
          setEmployee(prevEmployee);
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