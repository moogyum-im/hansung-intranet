// src/app/work/[department]/calendar/page.js
import WorkCalendar from './WorkCalendar';
// 👇 여기가 @supabase/auth-helpers-nextjs로 변경되어야 합니다!
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'; 
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function WorkCalendarPage({ params }) {
    const pageDepartment = decodeURIComponent(params.department);
    
    const cookieStore = cookies();
    // 👇 여기도 @supabase/auth-helpers-nextjs 방식으로 클라이언트 초기화!
    const supabase = createServerComponentClient({
        cookies: () => cookieStore, // 함수 형태로 전달
    });

    // 👇 getSession()을 사용하고, user는 session.user로 가져옵니다.
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    const user = session?.user;

    if (authError || !user) {
        console.error("인증 오류 또는 사용자 없음 (WorkCalendarPage - auth-helpers):", authError?.message);
        // 이 페이지가 아니라 로그인 페이지로 보내는 것이 맞습니다.
        return redirect(`/login?message=업무 캘린더를 보려면 로그인이 필요합니다.&redirectTo=/work/${encodeURIComponent(pageDepartment)}/calendar`);
    }

    let currentUserActualDepartment = null;
    let userRole = null;
    let currentUserName = null;

    if (user) { // user 객체가 있을 때만 프로필 조회
        const PROFILES_TABLE_NAME = 'profiles'; 
        const { data: profile, error: profileError } = await supabase
            .from(PROFILES_TABLE_NAME)
            .select('department, role, full_name')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error("사용자 프로필 조회 오류 (WorkCalendarPage):", profileError.message);
        }
        if (profile) {
            currentUserActualDepartment = profile.department;
            userRole = profile.role;
            currentUserName = profile.full_name;
        } else {
            console.warn(`사용자 ID '${user.id}'에 해당하는 프로필을 찾을 수 없습니다 (WorkCalendarPage).`);
        }
    }
    const isAdmin = userRole === 'admin';

    const TASKS_TABLE_NAME = 'tasks';
    const PROJECTS_TABLE_NAME = 'projects';

    // user가 확실히 있을 때만 tasks와 projects를 가져오도록 순서를 조정하거나,
    // tasks/projects 가져오기는 WorkCalendar 내부(클라이언트 컴포넌트)에서 SWR 등으로 처리하는 것도 방법입니다.
    // 여기서는 일단 그대로 둡니다.
    const [tasksResponse, projectsResponse] = await Promise.all([
        supabase
            .from(TASKS_TABLE_NAME)
            .select('id, title, start_date, end_date, project_id, status, department, user_id, description')
            .eq('department', pageDepartment)
            .order('start_date', { ascending: true }),
        supabase
            .from(PROJECTS_TABLE_NAME)
            .select('id, name, color') // color 컬럼이 projects 테이블에 있다고 가정
    ]);
    
    if (tasksResponse.error) {
        console.error(`[Page.js] '${pageDepartment}' 부서 업무 데이터 로딩 에러:`, tasksResponse.error.message);
    }
    if (projectsResponse.error) {
        // 프로젝트 목록 로딩 에러가 페이지 전체를 막을 필요는 없을 수 있으므로, console.error만 남길 수 있음
        console.error(`[Page.js] 프로젝트 목록 로딩 에러:`, projectsResponse.error.message);
    }

    return (
      <div className="flex flex-col h-[calc(100vh-theme(space.16))] p-4 sm:p-6 bg-gray-100 dark:bg-gray-900">
        <header className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
                 <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">{pageDepartment} - 업무 캘린더</h1>
                 <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">부서의 전체 업무 일정을 확인하고 관리합니다.</p>
            </div>
        </header>
        
        <main className="flex-grow min-h-0 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <WorkCalendar
                initialTasks={tasksResponse.data || []} 
                initialGroups={projectsResponse.data || []}
                isAdmin={isAdmin}
                pageDepartment={pageDepartment}
                currentUserDepartment={currentUserActualDepartment}
                currentUserId={user?.id} // user가 null일 수 있으므로 옵셔널 체이닝 유지
                currentUserName={currentUserName}
            />
        </main>
      </div>
    );
}