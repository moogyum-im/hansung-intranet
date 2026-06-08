import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

// 경영지원 데이터 접근 가능 여부 (계약/기성/수익)
function canAccessManagementData(profile) {
    if (profile.role === 'admin') return true;
    if (profile.department === '관리부') return true;
    if (profile.department === '전략기획부' && profile.full_name === '임아름') return true;
    if (profile.role === 'management') return true;
    const ceoTitles = ['대표', '부대표', '이사', 'CEO', '대표이사', '전무', '상무'];
    if (ceoTitles.some(t => profile.position?.includes(t))) return true;
    return false;
}

async function callClaude(apiKey, { model, messages, system, maxTokens = 800 }) {
    const res = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
    });

    if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`Claude API 오류: ${res.status} ${errBody}`);
    }

    const data = await res.json();
    const textBlock = data.content?.find(b => b.type === 'text');
    return textBlock?.text || data.content?.[0]?.text || '';
}

// Step 1: 검색 영역 + 파라미터 추출
async function extractSearchPlan(apiKey, question) {
    const today = new Date().toISOString().slice(0, 10);

    const system = `인트라넷 검색 파라미터 추출기입니다. JSON만 출력하세요.

검색 가능한 영역(areas):
- site: 현장 정보, 공정률, 진행 중인 공사
- work_report: 작업일보, 일별 작업 내역
- labor: 인원, 노무비
- material: 수목 반입, 자재 물량
- approval: 결재 문서(연차/지출/출장 등) 목록 및 내용
- approval_pending: 미결재(결재 대기 중) 문서 건수
- notice: 공지사항
- employee: 직원 정보, 연락처, 부서, 직급, 조직도
- contract: 계약내역서, 계약금액 (권한 필요)
- billing: 기성청구, 기성금 수령 현황 (권한 필요)
- profit: 수익관리, 원가율, 이익 (권한 필요)
- tree: 수목반입 장부, 수목 재고

출력 형식:
{
  "areas": ["해당 영역들 (복수 가능)"],
  "siteName": "현장명 또는 null",
  "dateFrom": "YYYY-MM-DD 또는 null",
  "dateTo": "YYYY-MM-DD 또는 null",
  "employeeName": "직원명 또는 null",
  "keywords": ["추가 키워드"]
}

오늘: ${today}
"이번 달" → 이번달 1일~오늘, "지난 주" → 지난주 월~일, "최근" → 최근 2주
"몇 건", "건수", "얼마나" → approval_pending 포함 고려`;

    const text = await callClaude(apiKey, {
        model: 'claude-haiku-4-5-20251001',
        messages: [{ role: 'user', content: question }],
        system,
        maxTokens: 400,
    });

    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : { areas: ['work_report'], keywords: [] };
    } catch {
        return { areas: ['work_report'], keywords: [] };
    }
}

// Step 2: 영역별 DB 조회 (병렬)
async function fetchAllData(supabase, plan, userId) {
    const { areas = [], siteName, dateFrom, dateTo, employeeName, keywords } = plan;
    const results = {};
    const queries = [];

    // 현장 목록 (여러 영역에서 공통 사용)
    const needsSites = areas.some(a => ['site', 'work_report', 'labor', 'material', 'contract', 'billing', 'profit', 'tree'].includes(a));
    let siteMap = {};
    let matchedSiteIds = [];

    if (needsSites) {
        const { data: allSites } = await supabase.from('construction_sites').select('id, name, location, status, progress_plant, progress_facility, start_date, end_date, budget');
        const sites = allSites || [];
        siteMap = Object.fromEntries(sites.map(s => [s.id, s]));

        if (siteName) {
            matchedSiteIds = sites.filter(s => s.name?.includes(siteName)).map(s => s.id);
            if (areas.includes('site')) results.sites = sites.filter(s => s.name?.includes(siteName));
        } else {
            if (areas.includes('site')) results.sites = sites.slice(0, 10);
            matchedSiteIds = sites.map(s => s.id);
        }
    }

    // 작업일보 / 인원 / 수목자재
    if (areas.some(a => ['work_report', 'labor', 'material'].includes(a))) {
        queries.push((async () => {
            let q = supabase
                .from('daily_site_reports')
                .select('id, site_id, report_date, notes')
                .order('report_date', { ascending: false });

            if (matchedSiteIds.length > 0) q = q.in('site_id', matchedSiteIds);
            if (dateFrom) q = q.gte('report_date', dateFrom);
            if (dateTo) q = q.lte('report_date', dateTo);
            if (!dateFrom && !dateTo) q = q.limit(15);
            else q = q.limit(50);

            const { data: reports } = await q;
            results.reports = (reports || []).map(r => {
                const notes = typeof r.notes === 'string' ? tryParse(r.notes) : (r.notes || {});
                return {
                    report_date: r.report_date,
                    site_name: siteMap[r.site_id]?.name || r.site_id,
                    today_work: notes.today_work,
                    weather: notes.weather,
                    workers_count: notes.workers_count,
                    labor_costs: (notes.labor_costs || []).slice(0, 10),
                    manual_ledger: (notes.manual_ledger || []).slice(0, 15),
                    tree_costs: (notes.tree_costs || []).slice(0, 10),
                };
            }).filter(r => r.today_work || r.labor_costs?.length || r.manual_ledger?.length);
        })());
    }

    // 결재 문서 목록
    if (areas.includes('approval')) {
        queries.push((async () => {
            const { data } = await supabase
                .from('approval_documents')
                .select('id, title, document_type, status, created_at, profiles!approval_documents_requester_id_fkey(full_name)')
                .order('created_at', { ascending: false })
                .limit(20);

            let docs = data || [];
            if (employeeName) docs = docs.filter(d => d.profiles?.full_name?.includes(employeeName));
            if (dateFrom) docs = docs.filter(d => d.created_at >= dateFrom);
            results.approvals = docs.map(d => ({
                title: d.title,
                type: d.document_type,
                status: d.status,
                requester: d.profiles?.full_name,
                date: d.created_at?.slice(0, 10),
            }));
        })());
    }

    // 미결재 건수 (본인 기준)
    if (areas.includes('approval_pending')) {
        queries.push((async () => {
            const { data: myApprovals } = await supabase.rpc('get_my_approvals', { p_user_id: userId });
            const pending = (myApprovals || []).filter(d =>
                d.category === 'to_review' && d.my_approval_status !== '미결'
            );
            results.approval_pending = {
                count: pending.length,
                items: pending.slice(0, 5).map(d => ({ title: d.title, type: d.document_type })),
            };
        })());
    }

    // 공지사항
    if (areas.includes('notice')) {
        queries.push((async () => {
            const { data } = await supabase
                .from('notices')
                .select('id, title, created_at')
                .order('created_at', { ascending: false })
                .limit(10);
            results.notices = (data || []).map(n => ({
                title: n.title,
                date: n.created_at?.slice(0, 10),
            }));
        })());
    }

    // 직원 정보 + 연락처
    if (areas.includes('employee')) {
        queries.push((async () => {
            const { data } = await supabase
                .from('profiles')
                .select('full_name, department, position, phone, employment_status')
                .eq('employment_status', '재직')
                .neq('department', '시스템 관리팀');

            let emps = data || [];
            if (employeeName) {
                emps = emps.filter(e => e.full_name?.includes(employeeName));
            } else if (keywords?.length) {
                emps = emps.filter(e =>
                    keywords.some(kw => e.department?.includes(kw) || e.position?.includes(kw) || e.full_name?.includes(kw))
                );
            }
            results.employees = emps.slice(0, 20).map(e => ({
                name: e.full_name,
                department: e.department,
                position: e.position,
                phone: e.phone || '미등록',
            }));
        })());
    }

    // 계약내역서
    if (areas.includes('contract')) {
        queries.push((async () => {
            let q = supabase
                .from('contract_estimates')
                .select('site_id, version, meta, contract_estimate_items(item_name, unit, quantity, unit_price, amount)');
            const { data } = await q;
            let estimates = data || [];
            if (matchedSiteIds.length > 0 && siteName) {
                estimates = estimates.filter(e => matchedSiteIds.includes(e.site_id));
            }
            results.contracts = estimates.slice(0, 5).map(e => ({
                site: siteMap[e.site_id]?.name,
                version: e.version,
                meta: e.meta,
                items: (e.contract_estimate_items || []).slice(0, 15),
            }));
        })());
    }

    // 기성청구
    if (areas.includes('billing')) {
        queries.push((async () => {
            const { data } = await supabase
                .from('progress_billings')
                .select('site_id, billing_round, meta, progress_billing_receipts(received_date, amount)');
            let billings = data || [];
            if (matchedSiteIds.length > 0 && siteName) {
                billings = billings.filter(b => matchedSiteIds.includes(b.site_id));
            }
            results.billings = billings.slice(0, 5).map(b => ({
                site: siteMap[b.site_id]?.name,
                round: b.billing_round,
                meta: b.meta,
                receipts: b.progress_billing_receipts || [],
            }));
        })());
    }

    // 수익관리
    if (areas.includes('profit')) {
        queries.push((async () => {
            const { data: sites } = await supabase.from('construction_sites').select('id, name, budget');
            const { data: plans } = await supabase.from('contract_profit_plans').select('*');
            const planMap = Object.fromEntries((plans || []).map(p => [p.site_id, p]));
            let list = (sites || []).map(s => ({ name: s.name, budget: s.budget, profit_plan: planMap[s.id] || null }));
            if (siteName) list = list.filter(s => s.name?.includes(siteName));
            results.profit = list.slice(0, 10);
        })());
    }

    // 수목반입 장부
    if (areas.includes('tree')) {
        queries.push((async () => {
            let q = supabase
                .from('tree_sales_info')
                .select('species, quantity, unit_price, total_price, delivery_date, site_id, supplier_name')
                .order('delivery_date', { ascending: false });
            if (dateFrom) q = q.gte('delivery_date', dateFrom);
            const { data } = await q.limit(50);
            let trees = (data || []).map(t => ({ ...t, site_name: siteMap[t.site_id]?.name }));
            if (siteName) trees = trees.filter(t => t.site_name?.includes(siteName));
            results.trees = trees.slice(0, 30);
        })());
    }

    await Promise.allSettled(queries);
    return results;
}

function tryParse(str) {
    try { return JSON.parse(str); } catch { return {}; }
}

export async function POST(request) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'AI 서비스 설정 오류' }, { status: 500 });

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

    const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, role, department, position')
        .eq('id', user.id)
        .single();

    if (!profile) return NextResponse.json({ error: '프로필 정보 없음' }, { status: 403 });

    let body;
    try { body = await request.json(); } catch {
        return NextResponse.json({ error: '요청 파싱 오류' }, { status: 400 });
    }

    const { question } = body;
    if (!question?.trim()) return NextResponse.json({ error: '질문을 입력해주세요.' }, { status: 400 });

    const isManagement = canAccessManagementData(profile);

    // Step 1: 검색 영역 추출
    let plan;
    try {
        plan = await extractSearchPlan(apiKey, question);
    } catch {
        plan = { areas: ['work_report'], keywords: [] };
    }

    // 경영지원 영역 권한 차단
    const managementAreas = ['contract', 'billing', 'profit'];
    if (!isManagement) {
        const blocked = plan.areas.filter(a => managementAreas.includes(a));
        if (blocked.length > 0 && plan.areas.every(a => managementAreas.includes(a))) {
            return NextResponse.json({
                answer: '죄송합니다. 해당 정보(계약/기성/수익)는 관리부, 전략기획부 담당자, 경영진만 조회할 수 있습니다.',
                restricted: true,
            });
        }
        plan.areas = plan.areas.filter(a => !managementAreas.includes(a));
    }

    // Step 2: DB 조회
    let dbData = {};
    try {
        dbData = await fetchAllData(supabase, plan, user.id);
    } catch (e) {
        console.error('DB 조회 오류:', e);
    }

    const hasData = Object.values(dbData).some(v => Array.isArray(v) ? v.length > 0 : (v && typeof v === 'object' ? Object.keys(v).length > 0 : !!v));

    const contextText = hasData
        ? `조회된 실제 데이터:\n${JSON.stringify(dbData, null, 2)}`
        : '해당 조건에 맞는 데이터가 없습니다.';

    // Step 3: 답변 생성
    const answerSystem = `당신은 한성조경 인트라넷 AI 어시스턴트입니다.

인트라넷 검색 가능 영역: 현장 현황, 작업일보, 인원/노무, 수목 반입, 결재 문서, 공지사항, 직원 연락처/조직도${isManagement ? ', 계약내역서, 기성청구, 수익관리' : ''}

답변 규칙:
1. 제공된 데이터만 기반으로 답변하세요. 없는 내용은 추측하지 마세요.
2. 데이터가 없으면 "조회된 데이터가 없습니다"라고 말하세요.
3. 표나 마크다운 없이 자연스러운 대화체로 답변하세요.
4. 금액은 한국식(만원, 억원)으로 표시하세요.
5. 2~4문장으로 핵심만 간결하게 답변하세요.
6. 현재 사용자: ${profile.full_name} (${profile.position || ''}, ${profile.department || ''})`;

    let answer;
    try {
        answer = await callClaude(apiKey, {
            model: 'claude-sonnet-4-6',
            messages: [{ role: 'user', content: `[DB 데이터]\n${contextText}\n\n[질문]\n${question}` }],
            system: answerSystem,
            maxTokens: 1024,
        });
    } catch (e) {
        console.error('AI 답변 오류:', e.message);
        return NextResponse.json({ error: `AI 오류: ${e.message}` }, { status: 500 });
    }

    return NextResponse.json({ answer, areasSearched: plan.areas, dataFound: hasData });
}
