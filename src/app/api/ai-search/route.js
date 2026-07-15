import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

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

// Step 1: 검색 영역 + 키워드 추출 — 실제 현장 목록을 제공해서 정확히 매칭
async function extractSearchPlan(apiKey, question, siteNames = []) {
    const today = new Date().toISOString().slice(0, 10);
    const siteListText = siteNames.length > 0
        ? `\n\n현재 등록된 현장 목록 (전체):\n${siteNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}\n\n사용자가 언급한 현장이 위 목록 중 어느 현장인지 찾아 siteName에 그 현장의 정확한 이름을 넣으세요. 사용자가 별명/약칭/일부만 말해도(예: "부산 식재", "에코델타", "평택 아파트") 가장 가능성 높은 현장으로 매칭하세요. 현장을 특정할 수 없으면 null.`
        : '';

    const system = `인트라넷 딥 검색 파라미터 추출기입니다. JSON만 출력하세요.

검색 가능한 영역(areas):
- site: 현장 정보, 공정률, 진행 중인 공사
- work_report: 작업일보, 일별 작업 내역, 특정 작업 키워드 검색
- labor: 인원, 노무비, 직종별 공수
- material: 수목 반입, 자재 물량
- approval: 결재 문서(연차/지출/출장 등) 제목·내용 검색
- approval_pending: 미결재(결재 대기 중) 문서 건수
- notice: 공지사항 제목·내용 검색
- employee: 직원 정보, 연락처, 부서, 직급, 조직도
- contract: 계약내역서, 계약금액 (권한 필요)
- billing: 기성청구, 기성금 수령 현황 (권한 필요)
- profit: 수익관리, 원가율, 이익 (권한 필요)
- tree: 수목반입 장부, 수목 재고, 수종 검색

출력 형식:
{
  "areas": ["해당 영역들 (복수 가능, 의심스러우면 포함)"],
  "siteName": "현장명 정확한 풀네임 또는 null",
  "dateFrom": "YYYY-MM-DD 또는 null",
  "dateTo": "YYYY-MM-DD 또는 null",
  "employeeName": "직원명 또는 null",
  "keywords": ["검색 핵심 키워드 최대 5개, 짧은 명사/동사만"],
  "laborTypes": ["찾을 직종명 (예: 잔디남, 잔디여, 식재공, 관목식재공) 또는 빈 배열"]
}

키워드 추출 규칙:
- 질문에서 DB 검색에 유용한 명사/동사를 최대 5개 추출 (짧게)
- 현장명, 직원명은 keywords 아닌 siteName/employeeName으로 분리
- "잔디 공수", "잔디 인원" → laborTypes: ["잔디남", "잔디여", "잔디식재"]
- "식재 인원", "식재공" → laborTypes: ["식재공", "관목식재공", "조경공"]
- "전체 인원", "총 인원" → laborTypes: []
- "몇 건", "건수", "얼마나" → approval_pending 포함 고려
- "공수" = 인원(명 수) 의미

오늘: ${today}
"이번 달" → 이번달 1일~오늘, "지난 주" → 지난주 월~일, "최근" → 최근 2주${siteListText}`;

    const text = await callClaude(apiKey, {
        model: 'claude-haiku-4-5-20251001',
        messages: [{ role: 'user', content: question }],
        system,
        maxTokens: 500,
    });

    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : { areas: ['work_report'], keywords: [], laborTypes: [] };
    } catch {
        return { areas: ['work_report'], keywords: [], laborTypes: [] };
    }
}

function safeInt(v) {
    const n = parseInt(String(v ?? '0').replace(/,/g, '').replace(/^-$/, '0'));
    return isNaN(n) || n < 0 ? 0 : n;
}

// labor_costs 배열 → 직종별 합산 + 필요 직종 추출
function parseLaborSummary(laborCosts = [], filterTypes = []) {
    const byType = {};
    for (const lc of laborCosts) {
        if (!lc.type) continue;
        byType[lc.type] = (byType[lc.type] || 0) + safeInt(lc.count);
    }

    const summary = Object.entries(byType)
        .filter(([, cnt]) => cnt > 0)
        .map(([type, count]) => ({ type, count }));

    // 특정 직종 필터 결과
    let filtered = null;
    if (filterTypes.length > 0) {
        const matched = summary.filter(s => filterTypes.some(ft => s.type.includes(ft) || ft.includes(s.type)));
        filtered = matched.length > 0 ? matched : [];
    }

    return { summary, filtered, total: summary.reduce((s, v) => s + v.count, 0) };
}

// 현장명 퍼지 매칭: 토큰 기반 + 포함 검색
function matchSites(sites, siteName) {
    if (!siteName) return sites.map(s => s.id);

    // 정확 포함
    const exact = sites.filter(s => s.name?.includes(siteName));
    if (exact.length > 0) return exact.map(s => s.id);

    // 공백 제거 후 포함
    const normalized = siteName.replace(/\s/g, '');
    const noSpace = sites.filter(s => s.name?.replace(/\s/g, '').includes(normalized));
    if (noSpace.length > 0) return noSpace.map(s => s.id);

    // 토큰 분리 매칭: 단어 중 2개 이상 포함하는 현장
    const tokens = siteName.split(/[\s·,]+/).filter(t => t.length >= 2 && !['현장', '공사', '공동', '식재', '신축'].includes(t));
    if (tokens.length > 0) {
        const tokenMatched = sites
            .map(s => ({ ...s, score: tokens.filter(t => s.name?.includes(t)).length }))
            .filter(s => s.score > 0)
            .sort((a, b) => b.score - a.score);
        if (tokenMatched.length > 0) {
            const best = tokenMatched[0].score;
            return tokenMatched.filter(s => s.score === best).map(s => s.id);
        }
    }

    return [];
}

// Step 2: 영역별 DB 딥 조회
async function fetchAllData(supabase, plan, userId) {
    const { areas = [], siteName, dateFrom, dateTo, employeeName, keywords, laborTypes = [] } = plan;
    const results = {};
    const queries = [];
    const kws = (keywords || []).filter(k => k?.trim().length > 0);

    // 현장 목록 (공통)
    const needsSites = areas.some(a => ['site', 'work_report', 'labor', 'material', 'contract', 'billing', 'profit', 'tree'].includes(a));
    let siteMap = {};
    let matchedSiteIds = [];

    if (needsSites) {
        const { data: allSites } = await supabase
            .from('construction_sites')
            .select('id, name, location, status, progress_plant, progress_facility, start_date, end_date, budget');
        const sites = allSites || [];
        siteMap = Object.fromEntries(sites.map(s => [s.id, s]));

        if (siteName) {
            matchedSiteIds = matchSites(sites, siteName);
            if (areas.includes('site')) results.sites = sites.filter(s => matchedSiteIds.includes(s.id));
        } else {
            if (areas.includes('site')) results.sites = sites.slice(0, 10);
            matchedSiteIds = sites.map(s => s.id);
        }
    }

    // 작업일보 딥 검색
    if (areas.some(a => ['work_report', 'labor', 'material'].includes(a))) {
        queries.push((async () => {
            let q = supabase
                .from('daily_site_reports')
                .select('id, site_id, report_date, notes')
                .order('report_date', { ascending: false });

            if (matchedSiteIds.length > 0) q = q.in('site_id', matchedSiteIds);
            if (dateFrom) q = q.gte('report_date', dateFrom);
            if (dateTo) q = q.lte('report_date', dateTo);

            if (kws.length > 0) {
                const orConditions = kws.map(kw => `notes::text.ilike.%${kw}%`).join(',');
                q = q.or(orConditions);
                q = q.limit(100);
            } else if (!dateFrom && !dateTo) {
                q = q.limit(50);
            } else {
                q = q.limit(200);
            }

            const { data: reports } = await q;
            results.reports = (reports || []).map(r => {
                const notes = typeof r.notes === 'string' ? tryParse(r.notes) : (r.notes || {});
                const labor = parseLaborSummary(notes.labor_costs || [], laborTypes);

                return {
                    report_date: r.report_date,
                    site_name: siteMap[r.site_id]?.name || r.site_id,
                    today_work: notes.today_work,
                    weather: notes.weather,
                    // 직종별 인원 합산 (더 읽기 쉬운 형태)
                    labor_summary: labor.summary,       // [{type, count}] 전체 직종
                    labor_filtered: labor.filtered,     // [{type, count}] 질문에서 지정한 직종만 (null이면 미지정)
                    labor_total: labor.total,           // 총 인원
                    manual_ledger: (notes.manual_ledger || []).slice(0, 20),
                    tree_costs: (notes.tree_costs || []).slice(0, 10),
                };
            }).filter(r => r.today_work || r.labor_summary?.length || r.manual_ledger?.length);
        })());
    }

    // 결재 문서
    if (areas.includes('approval')) {
        queries.push((async () => {
            let q = supabase
                .from('approval_documents')
                .select('id, title, document_type, status, created_at, content, profiles!approval_documents_requester_id_fkey(full_name)')
                .order('created_at', { ascending: false });

            if (kws.length > 0) {
                const orConditions = kws.map(kw => `title.ilike.%${kw}%`).join(',');
                q = q.or(orConditions);
            }
            if (dateFrom) q = q.gte('created_at', dateFrom);
            if (dateTo) q = q.lte('created_at', dateTo);
            q = q.limit(50);

            const { data } = await q;
            let docs = data || [];
            if (employeeName) docs = docs.filter(d => d.profiles?.full_name?.includes(employeeName));

            results.approvals = docs.map(d => ({
                title: d.title,
                type: d.document_type,
                status: d.status,
                requester: d.profiles?.full_name,
                date: d.created_at?.slice(0, 10),
                content_preview: d.content
                    ? (typeof d.content === 'string' ? d.content.slice(0, 300) : JSON.stringify(d.content).slice(0, 300))
                    : null,
            }));
        })());
    }

    // 미결재 건수
    if (areas.includes('approval_pending')) {
        queries.push((async () => {
            const { data: myApprovals } = await supabase.rpc('get_my_approvals', { p_user_id: userId });
            const pending = (myApprovals || []).filter(d =>
                d.category === 'to_review' && d.my_approval_status !== '미결'
            );
            results.approval_pending = {
                count: pending.length,
                items: pending.slice(0, 10).map(d => ({ title: d.title, type: d.document_type })),
            };
        })());
    }

    // 공지사항
    if (areas.includes('notice')) {
        queries.push((async () => {
            let q = supabase
                .from('notices')
                .select('id, title, content, created_at')
                .order('created_at', { ascending: false });

            if (kws.length > 0) {
                const orConditions = kws.map(kw => `title.ilike.%${kw}%`).join(',');
                q = q.or(orConditions);
            }
            q = q.limit(30);

            const { data } = await q;
            results.notices = (data || []).map(n => ({
                title: n.title,
                date: n.created_at?.slice(0, 10),
                content_preview: n.content
                    ? (typeof n.content === 'string' ? n.content.slice(0, 300) : JSON.stringify(n.content).slice(0, 300))
                    : null,
            }));
        })());
    }

    // 직원 정보
    if (areas.includes('employee')) {
        queries.push((async () => {
            const { data } = await supabase
                .from('profiles')
                .select('full_name, department, position, phone, email, employment_status')
                .eq('employment_status', '재직')
                .neq('department', '시스템 관리팀');

            let emps = data || [];
            if (employeeName) {
                emps = emps.filter(e => e.full_name?.includes(employeeName));
            } else if (kws.length > 0) {
                emps = emps.filter(e =>
                    kws.some(kw => e.department?.includes(kw) || e.position?.includes(kw) || e.full_name?.includes(kw))
                );
            }
            results.employees = emps.map(e => ({
                name: e.full_name,
                department: e.department,
                position: e.position,
                phone: e.phone || '미등록',
                email: e.email,
            }));
        })());
    }

    // 계약내역서
    if (areas.includes('contract')) {
        queries.push((async () => {
            const { data } = await supabase
                .from('contract_estimates')
                .select('site_id, version, meta, contract_estimate_items(item_name, unit, quantity, unit_price, amount)');
            let estimates = data || [];
            if (matchedSiteIds.length > 0 && siteName) {
                estimates = estimates.filter(e => matchedSiteIds.includes(e.site_id));
            }
            results.contracts = estimates.slice(0, 10).map(e => ({
                site: siteMap[e.site_id]?.name,
                version: e.version,
                meta: e.meta,
                items: (e.contract_estimate_items || []).slice(0, 20),
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
            results.billings = billings.slice(0, 10).map(b => ({
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
            if (siteName) list = list.filter(s => matchedSiteIds.includes(s.id));
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

            if (kws.length > 0) {
                const orConditions = kws.flatMap(kw => [
                    `species.ilike.%${kw}%`,
                    `supplier_name.ilike.%${kw}%`,
                ]).join(',');
                q = q.or(orConditions);
            }

            const { data } = await q.limit(100);
            let trees = (data || []).map(t => ({ ...t, site_name: siteMap[t.site_id]?.name }));
            if (matchedSiteIds.length > 0 && siteName) trees = trees.filter(t => matchedSiteIds.includes(t.site_id));
            results.trees = trees.slice(0, 50);
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

    // 현장 목록 먼저 가져오기 (extractSearchPlan에 전달용)
    const { data: siteList } = await supabase
        .from('construction_sites')
        .select('name')
        .order('name');
    const siteNames = (siteList || []).map(s => s.name).filter(Boolean);

    // Step 1: 검색 영역 + 키워드 + 현장 퍼지 매칭
    let plan;
    try {
        plan = await extractSearchPlan(apiKey, question, siteNames);
    } catch {
        plan = { areas: ['work_report'], keywords: [], laborTypes: [] };
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

    // Step 2: DB 딥 조회
    let dbData = {};
    try {
        dbData = await fetchAllData(supabase, plan, user.id);
    } catch (e) {
        console.error('DB 조회 오류:', e);
    }

    const hasData = Object.values(dbData).some(v =>
        Array.isArray(v) ? v.length > 0 : (v && typeof v === 'object' ? Object.keys(v).length > 0 : !!v)
    );

    const contextText = hasData
        ? `조회된 실제 데이터:\n${JSON.stringify(dbData, null, 2)}`
        : '해당 조건에 맞는 데이터가 없습니다.';

    // 매칭된 현장명 안내 (디버그용)
    const matchedSite = plan.siteName || null;

    // Step 3: 딥 분석 답변 생성
    const answerSystem = `당신은 한성조경 인트라넷 AI 어시스턴트입니다.

인트라넷 검색 가능 영역: 현장 현황, 작업일보, 인원/노무, 수목 반입, 결재 문서, 공지사항, 직원 연락처/조직도${isManagement ? ', 계약내역서, 기성청구, 수익관리' : ''}

데이터 구조 설명:
- labor_summary: 해당 날짜의 직종별 투입 인원 [{type: "직종명", count: 명수}]
- labor_filtered: 질문에서 요청한 특정 직종만 필터된 결과 (null이면 전체 확인)
- labor_total: 당일 전체 인원 합계
- manual_ledger: 수목 반입/식재 장부 [{item, spec, incoming, planted, ...}]

답변 규칙:
1. 제공된 데이터만 기반으로 답변하세요. 없는 내용은 추측하지 마세요.
2. 데이터가 없으면 "조회된 데이터가 없습니다"라고 말하세요.
3. 자연스러운 대화체로 답변하세요. 필요 시 목록이나 번호로 정리해도 됩니다.
4. 금액은 한국식(만원, 억원)으로 표시하세요.
5. 인원/공수 질문: labor_filtered가 있으면 그것 기준으로, 없으면 labor_summary 전체를 보여주세요.
6. "공수" = 투입 인원 수(명). 예: "잔디 공수 5명" 형태로 답변.
7. 현재 사용자: ${profile.full_name} (${profile.position || ''}, ${profile.department || ''})`;

    let answer;
    try {
        const userContent = matchedSite
            ? `[검색 조건] 현장: ${matchedSite}${plan.dateFrom ? `, 기간: ${plan.dateFrom}~${plan.dateTo || '현재'}` : ''}\n\n[DB 데이터]\n${contextText}\n\n[질문]\n${question}`
            : `[DB 데이터]\n${contextText}\n\n[질문]\n${question}`;

        answer = await callClaude(apiKey, {
            model: 'claude-sonnet-4-6',
            messages: [{ role: 'user', content: userContent }],
            system: answerSystem,
            maxTokens: 2048,
        });
    } catch (e) {
        console.error('AI 답변 오류:', e.message);
        return NextResponse.json({ error: `AI 오류: ${e.message}` }, { status: 500 });
    }

    return NextResponse.json({
        answer,
        areasSearched: plan.areas,
        dataFound: hasData,
        matchedSite,
    });
}
