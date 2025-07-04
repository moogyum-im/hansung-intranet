// 파일 경로: src/contexts/EmployeeContext.js
'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

const EmployeeContext = createContext(null);

// "export" 키워드가 함수 선언 앞에 있는지 확인!
export function EmployeeProvider({ children }) {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchEmployeeProfile = useCallback(async (user) => {
    if (!user) {
      setEmployee(null);
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('프로필 정보를 가져오는데 실패했습니다:', error.message);
        setEmployee(null);
      } else {
        setEmployee(data);
      }
    } catch (e) {
      console.error('프로필 정보 fetch 중 예외 발생:', e);
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const getSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        fetchEmployeeProfile(session?.user ?? null);
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchEmployeeProfile(session?.user ?? null);
    });

    const handleProfileUpdate = () => {
        getSession();
    };
    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      authListener?.subscription?.unsubscribe();
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [fetchEmployeeProfile]);

  const value = { employee, loading };

  return (
    <EmployeeContext.Provider value={value}>
      {children}
    </EmployeeContext.Provider>
  );
}

// "export" 키워드가 함수 선언 앞에 있는지 확인!
export function useEmployee() {
  const context = useContext(EmployeeContext);
  if (context === null) {
    throw new Error('useEmployee must be used within a EmployeeProvider');
  }
  return context;
}