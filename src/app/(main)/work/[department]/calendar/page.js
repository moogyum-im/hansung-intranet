// 파일 경로: src/app/(main)/work/[department]/calendar/page.js

import WorkCalendar from './WorkCalendar';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function WorkCalendarPage({ params }) {
    const pageDepartment = decodeURIComponent(params.department);
    
    const cookieStore = cookies();
    const supabase = createServerComponentClient({
        cookies: () => cookieStore,
    });

    const { data: { session }, error: authError } = await supabase.auth.getSession();
    const user = session?.user;

    if (authError || !user) {
        return redirect(`/login?message=업무 캘린더를 보려면 로그인이 필요합니다.&redirectTo=/work/${encodeURIComponent(pageDepartment)}/calendar`);
    }

    let currentUserActualDepartment = null;
    let userRole = null;
    let currentUserName = null;
    let allEmployees = [];

    if (user) {
        const PROFILES_TABLE_NAME = 'profiles'; 
        
        const [profileResponse, employeesResponse] = await Promise.all([
            supabase
                .from(PROFILES_TABLE_NAME)
                .select('department, role, full_name')
                .eq('id', user.id)
                .single(),
            supabase
                .from(PROFILES_TABLE_NAME)
                .select('id, full_name, department')
                .order('full_name')
        ]);

        const { data: profile, error: profileError } = profileResponse;
        if (profileError) console.error("사용자 프로필 조회 오류:", profileError.message);
        if (profile) {
            currentUserActualDepartment = profile.department;
            userRole = profile.role;
            currentUserName = profile.full_name;
        }

        const { data: employees, error: employeesError } = employeesResponse;
        if (employeesError) console.error("전체 직원 목록 조회 오류:", employeesError.message);
        else allEmployees = employees || [];
    }
    
    // 이 페이지에서는 userRole을 직접 사용하지 않으므로 isAdmin 변수는 참고용으로 남겨둡니다.
    const isAdmin = userRole === 'admin';

    const TASKS_TABLE_NAME = 'tasks';
    const PROJECTS_TABLE_NAME = 'projects';
    
    // ================== ★★★★★ 수정된 핵심 로직 ★★★★★ ==================
    
    // 1. 기본 쿼리를 생성합니다.
    let tasksQuery = supabase
        .from(TASKS_TABLE_NAME)
        .select('*, author:user_id(full_name)');

    // 2. **사용자 역할(관리자/일반)에 관계없이,
    //    무조건 현재 페이지의 부서로 업무 데이터를 필터링합니다.**
    // 'tasks' 테이블에 부서를 나타내는 'department' 컬럼이 있다고 가정합니다.
    tasksQuery = tasksQuery.eq('department', pageDepartment);

    // 3. 날짜순으로 정렬합니다.
    tasksQuery = tasksQuery.order('start_date', { ascending: true });

    // =====================================================================
    
    const [tasksResponse, projectsResponse] = await Promise.all([
        tasksQuery, 
        supabase.from(PROJECTS_TABLE_NAME).select('id, name, color')
    ]);
    
    if (tasksResponse.error) {
        console.error(`[Page.js] '${pageDepartment}' 부서 업무 데이터 로딩 에러:`, tasksResponse.error.message);
    }
    if (projectsResponse.error) {
        console.error(`[Page.js] 프로젝트 목록 로딩 에러:`, projectsResponse.error.message);
    }

    return (
      <div className="flex flex-col h-[calc(100vh-theme(space.16))] p-4 sm:p-6 bg-gray-100 dark:bg-gray-900">
        <header className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
                 <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">{pageDepartment} - 업무 캘린더</h1>
                 <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">해당 부서의 모든 업무 일정을 확인하고 관리합니다.</p>
            </div>
        </header>
        
        <main className="flex-grow min-h-0 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <WorkCalendar
                initialTasks={tasksResponse.data || []} 
                initialGroups={projectsResponse.data || []}
                isAdmin={isAdmin} // isAdmin prop은 다른 곳에서 사용할 수 있으므로 유지합니다.
                pageDepartment={pageDepartment}
                currentUserDepartment={currentUserActualDepartment}
                currentUserId={user?.id}
                currentUserName={currentUserName}
                allEmployees={allEmployees} 
            />
        </main>
      </div>
    );
}