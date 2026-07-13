'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Building2, FileText, Monitor, Gift, CalendarDays,
  ChevronRight, Info, CheckCircle2, BookOpen, MapPin, AlertTriangle,
  Clock, Users, Landmark, CreditCard,
} from 'lucide-react';
import { useEmployee } from '@/contexts/EmployeeContext';

const SECTIONS = [
  { key: 'company', label: '회사 소개',    icon: Building2,    color: 'blue'    },
  { key: 'rules',   label: '사내 규정',    icon: FileText,     color: 'slate'   },
  { key: 'system',  label: '시스템 사용법', icon: Monitor,     color: 'violet'  },
  { key: 'welfare', label: '복지',         icon: Gift,         color: 'emerald' },
  { key: 'leave',   label: '연차',         icon: CalendarDays, color: 'amber'   },
];

const COLOR_MAP = {
  blue:    { tab: 'bg-blue-600 text-white',    badge: 'bg-blue-100 text-blue-700',       icon: 'text-blue-600',    border: 'border-blue-200',    header: 'from-blue-50 to-white'    },
  slate:   { tab: 'bg-slate-700 text-white',   badge: 'bg-slate-100 text-slate-700',     icon: 'text-slate-600',   border: 'border-slate-200',   header: 'from-slate-50 to-white'   },
  violet:  { tab: 'bg-violet-600 text-white',  badge: 'bg-violet-100 text-violet-700',   icon: 'text-violet-600',  border: 'border-violet-200',  header: 'from-violet-50 to-white'  },
  emerald: { tab: 'bg-emerald-600 text-white', badge: 'bg-emerald-100 text-emerald-700', icon: 'text-emerald-600', border: 'border-emerald-200', header: 'from-emerald-50 to-white' },
  amber:   { tab: 'bg-amber-500 text-white',   badge: 'bg-amber-100 text-amber-700',     icon: 'text-amber-500',   border: 'border-amber-200',   header: 'from-amber-50 to-white'   },
};

// ── 공통 UI ──

function BranchBadge({ branch }) {
  return branch === '서울' ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-black bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
      <MapPin size={9} /> 서울지사
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] font-black bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
      <MapPin size={9} /> 광주 본사
    </span>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-px bg-slate-200" />
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{children}</span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );
}

function InfoCard({ title, items, color = 'blue' }) {
  const c = COLOR_MAP[color];
  return (
    <div className={`rounded-2xl border ${c.border} overflow-hidden`}>
      <div className={`bg-gradient-to-r ${c.header} px-5 py-3.5 border-b ${c.border}`}>
        <p className="text-sm font-black text-slate-800">{title}</p>
      </div>
      <ul className="divide-y divide-slate-100">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 px-5 py-3.5">
            <CheckCircle2 size={15} className={`${c.icon} shrink-0 mt-0.5`} />
            <span className="text-sm font-bold text-slate-700 leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BranchCard({ title, color = 'blue', rows }) {
  const c = COLOR_MAP[color];
  return (
    <div className={`rounded-2xl border ${c.border} overflow-hidden`}>
      <div className={`bg-gradient-to-r ${c.header} px-5 py-3.5 border-b ${c.border}`}>
        <p className="text-sm font-black text-slate-800">{title}</p>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((row, ri) => (
          <div key={ri} className="px-5 py-4">
            <div className="mb-2"><BranchBadge branch={row.branch} /></div>
            <ul className="space-y-2">
              {row.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 size={14} className={`${c.icon} shrink-0 mt-0.5`} />
                  <span className="text-sm font-bold text-slate-700 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function Note({ children, color = 'blue', warn = false }) {
  const c = COLOR_MAP[color];
  const Icon = warn ? AlertTriangle : Info;
  return (
    <div className={`flex gap-3 ${warn ? 'bg-rose-50 border-rose-200' : c.badge + ' border ' + c.border} rounded-xl px-4 py-3 border`}>
      <Icon size={15} className={`${warn ? 'text-rose-500' : c.icon} shrink-0 mt-0.5`} />
      <p className={`text-xs font-bold leading-relaxed ${warn ? 'text-rose-700' : ''}`}>{children}</p>
    </div>
  );
}

function TableCard({ title, color = 'blue', rows }) {
  const c = COLOR_MAP[color];
  return (
    <div className={`rounded-2xl border ${c.border} overflow-hidden`}>
      <div className={`bg-gradient-to-r ${c.header} px-5 py-3.5 border-b ${c.border}`}>
        <p className="text-sm font-black text-slate-800">{title}</p>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((row, i) => (
          <div key={i} className="flex px-5 py-3">
            <span className="w-44 shrink-0 text-xs font-black text-slate-500">{row.label}</span>
            <span className="text-sm font-bold text-slate-700 leading-relaxed">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatGrid({ stats, color = 'blue', cols = 3 }) {
  const c = COLOR_MAP[color];
  const colClass = cols === 2 ? 'grid-cols-2' : cols === 4 ? 'grid-cols-4' : 'grid-cols-3';
  return (
    <div className={`grid ${colClass} gap-3`}>
      {stats.map((s, i) => (
        <div key={i} className={`bg-gradient-to-br ${c.header} border ${c.border} rounded-2xl p-4 text-center`}>
          <p className={`text-3xl font-black ${c.icon}`}>{s.value}</p>
          <p className="text-xs font-bold text-slate-500 mt-1.5 leading-tight">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

function GridCard({ title, items, color = 'blue' }) {
  const c = COLOR_MAP[color];
  return (
    <div className={`rounded-2xl border ${c.border} overflow-hidden`}>
      <div className={`bg-gradient-to-r ${c.header} px-5 py-3.5 border-b ${c.border}`}>
        <p className="text-sm font-black text-slate-800">{title}</p>
      </div>
      <div className="p-4 grid grid-cols-2 gap-2.5">
        {items.map((item, i) => (
          <div key={i} className={`${c.badge} border ${c.border} rounded-xl px-4 py-3`}>
            <p className={`text-xs font-black ${c.icon}`}>{item.title}</p>
            {item.desc && <p className="text-xs font-bold text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 공통 UI (추가) ──

function WelcomeCard({ employee }) {
  const hireDate = employee?.hire_date
    ? new Date(employee.hire_date).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
    : '-';
  return (
    <div className="bg-white border border-blue-100 rounded-2xl px-8 py-8 text-center space-y-5 shadow-sm">
      <p className="text-2xl">🎉</p>
      <div className="space-y-2">
        <p className="text-2xl font-black text-slate-900">
          {employee?.full_name} <span className="text-slate-400 font-bold">님,</span>
        </p>
        <p className="text-lg font-bold text-slate-700">
          우리 회사의 새로운 시작을 진심으로 환영합니다.
        </p>
        <p className="text-xs font-bold text-slate-400 leading-relaxed">
          오늘부터 우리는 같은 목표를 향해 함께 나아가는 동료가 되었습니다.<br />
          여러분의 새로운 도전과 성장을 진심으로 응원합니다.
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 overflow-hidden text-left mx-auto max-w-xs">
        {[
          { label: '이름',  value: employee?.full_name },
          { label: '입사일', value: hireDate },
          { label: '소속',  value: `${employee?.department ?? ''} ${employee?.position ?? ''}`.trim() },
        ].map((row, i, arr) => (
          <div key={row.label} className={`flex ${i < arr.length - 1 ? 'border-b border-slate-100' : ''}`}>
            <span className="w-16 shrink-0 bg-blue-500 text-white text-xs font-black px-3 py-2.5 flex items-center">{row.label}</span>
            <span className="px-4 py-2.5 text-sm font-bold text-slate-700">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 섹션 콘텐츠 ──

function CompanySection() {
  const { employee } = useEmployee();
  return (
    <div className="space-y-5">
      <WelcomeCard employee={employee} />
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
        <p className="text-xs font-bold text-blue-200 mb-1">SINCE 1987 · WELCOME TO</p>
        <h2 className="text-2xl font-black mb-1">주식회사 한성종합조경</h2>
        <p className="text-sm text-blue-300 font-bold mb-3">&ldquo;자연과 사람을 잇다&rdquo;</p>
        <p className="text-sm text-blue-100 leading-relaxed">
          단순한 시공을 넘어, 지속 가능한 생태 환경과 인간의 삶이 공존하는<br />
          새로운 공간의 가치를 설계하는 조경 전문 기업입니다.
        </p>
      </div>

      <StatGrid
        color="blue"
        cols={3}
        stats={[
          { value: '1987', label: '창립연도' },
          { value: '40+', label: '년의 업력' },
          { value: '2곳', label: '서울·광주 지사' },
        ]}
      />

      <TableCard
        title="회사 기본 정보"
        color="blue"
        rows={[
          { label: '회사명',        value: '주식회사 한성종합조경' },
          { label: '대표이사',      value: '임철수' },
          { label: '설립연도',      value: '1987년' },
          { label: '사업자등록번호', value: '408-81-44744' },
          {
            label: '홈페이지',
            value: (
              <a
                href="https://han-sung.com"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline hover:text-blue-800 transition-colors"
              >
                han-sung.com
              </a>
            ),
          },
        ]}
      />

      <GridCard
        title="사업 분야"
        color="blue"
        items={[
          { title: '조경 공사',    desc: '공원·가로수·생태 복원 등 외부 공간 조성' },
          { title: '조경 식재',    desc: '수목·초화류 식재 및 녹지 조성' },
          { title: '조경 시설물',  desc: '휴게시설·안내판·조명 등 설치' },
          { title: '공원 조성',    desc: '도시 공원·생태 공원 설계·시공' },
          { title: '한성 수목원',  desc: '조경수 생산·공급' },
          { title: '에너지',       desc: '신재생에너지 관련 사업' },
        ]}
      />

      <BranchCard
        title="사무실 위치"
        color="blue"
        rows={[
          {
            branch: '서울',
            items: [
              '주소: 서울특별시 용산구 원효로 90길 11, 16층',
              '주요 부서: 전략기획부 경영전략팀 / 사업제안팀',
            ],
          },
          {
            branch: '광주',
            items: [
              '주소: 광주광역시 동구 천변우로 421, 4층',
              '주요 부서: 공무부 / 공사부 / 관리부',
              '대표 전화: 062)652-0137',
              '팩스: 062)673-8557',
            ],
          },
        ]}
      />

      <InfoCard
        title="수습 기간 안내 (제10조)"
        color="blue"
        items={[
          '신규 채용 후 최초 3개월을 수습기간으로 적용합니다.',
          '수습기간은 근속연수에 포함됩니다.',
          '수습기간 중 역량 부족·태도 불량 등의 경우 본채용이 취소될 수 있습니다.',
        ]}
      />

      <Note color="blue">
        회사 조직도는 인트라넷 사이드바 → 조직도 메뉴에서 확인할 수 있습니다.
      </Note>
    </div>
  );
}

function RulesSection() {
  return (
    <div className="space-y-5">
      {/* 근로시간 비주얼 배너 */}
      <div className="bg-slate-800 rounded-2xl px-6 py-5 flex items-center gap-6">
        <div className="text-center shrink-0">
          <p className="text-2xl font-black text-white tabular-nums">09:00</p>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5">출근</p>
        </div>
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 h-px bg-slate-600" />
          <span className="text-[11px] font-black text-slate-300 bg-slate-700 border border-slate-600 px-3 py-1.5 rounded-lg whitespace-nowrap">
            점심 12:00–13:00
          </span>
          <div className="flex-1 h-px bg-slate-600" />
        </div>
        <div className="text-center shrink-0">
          <p className="text-2xl font-black text-white tabular-nums">18:00</p>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5">퇴근</p>
        </div>
      </div>

      <TableCard
        title="근로시간 (제28·29조)"
        color="slate"
        rows={[
          { label: '근무일',    value: '월~금' },
          { label: '근로시간',  value: '1일 8시간 / 주 40시간' },
        ]}
      />

      <SectionLabel>복무 규정</SectionLabel>

      <InfoCard
        title="출근·결근 규정 (제26·27조)"
        color="slate"
        items={[
          '결근 시 사전에 결근계를 제출해야 합니다. 불가피한 경우 즉시 연락 후 사후 제출.',
          '지각·조퇴·외출은 부서장 사전 승인 필수이며, 해당 시간은 무급 처리됩니다.',
          '월 3회 이상 무단결근·지각·조퇴·외출 시 시말서 제출 대상이 됩니다.',
          '정당한 사유 없이 결근계를 미제출하거나 승인 없이 결근하면 급여에서 공제됩니다.',
        ]}
      />

      <InfoCard
        title="복무 의무 (제11조)"
        color="slate"
        items={[
          '맡은 직무를 충실히 수행하고 상사의 정당한 직무 지시에 따라야 합니다.',
          '회사의 모든 규정·규칙을 사업장 내외에서 항상 준수해야 합니다.',
          '안전하고 건강한 근무환경 유지를 위해 정리정돈을 깨끗이 합니다.',
          '회사의 이름·직위·직급을 개인 이익 목적으로 사용해서는 안 됩니다.',
        ]}
      />

      <InfoCard
        title="기밀 유지 의무 (제12조)"
        color="slate"
        items={[
          '재직 중 및 퇴직 후에도 회사·고객 관련 기밀 정보를 누설해서는 안 됩니다.',
          '업무와 관련된 문서, 자료, 도면 등은 회사의 재산입니다.',
          '고용관계 종료 시 업무 관련 자료 일체를 즉시 반납해야 합니다.',
        ]}
      />

      <InfoCard
        title="겸업 금지 및 금품 수령 금지 (제13·14조)"
        color="slate"
        items={[
          '회사의 사전 동의 없이 근무시간 중 또는 그 외 시간에 타인을 위한 영리행위 금지.',
          '고객이나 협력업체로부터 회사 승인 없이 개인적인 선물·혜택을 받아서는 안 됩니다.',
        ]}
      />

      <SectionLabel>시설 · 복장</SectionLabel>

      <BranchCard
        title="시설 안내"
        color="slate"
        rows={[
          {
            branch: '서울',
            items: ['주차: 정기 주차 불가, 방문자에 한해 1시간 가능'],
          },
          {
            branch: '광주',
            items: ['주차: 관리부에 주차번호 등록 요청 시 비용 없이 주차 가능'],
          },
        ]}
      />

      <InfoCard
        title="복장 규정"
        color="slate"
        items={[
          '사무직: 단정한 비즈니스 캐주얼 권장',
          '현장직: 안전복·안전화 착용 필수 (회사 지급)',
          '외부 미팅·발주처 방문 시 정장 착용 권장',
        ]}
      />

      <SectionLabel>회사 행사</SectionLabel>

      {/* 시무식 / 종무식 분할 카드 */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-slate-200">
          <div className="px-5 py-5 space-y-2">
            <span className="inline-block text-[11px] font-black bg-slate-700 text-white px-2.5 py-1 rounded-lg">시무식</span>
            <p className="text-sm font-black text-slate-700">매년 1월 첫 영업일</p>
            <p className="text-xs font-bold text-slate-400">전 직원 참석</p>
          </div>
          <div className="px-5 py-5 space-y-2">
            <span className="inline-block text-[11px] font-black bg-slate-700 text-white px-2.5 py-1 rounded-lg">종무식</span>
            <p className="text-sm font-black text-slate-700">연말 (날짜 별도 공지)</p>
            <p className="text-xs font-bold text-slate-400">전 직원 참석</p>
          </div>
        </div>
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">종무식 발표 항목</p>
          <div className="space-y-2.5">
            <div className="flex items-start gap-3">
              <span className="text-[10px] font-black bg-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full shrink-0 mt-0.5 whitespace-nowrap">전 부서원</span>
              <p className="text-sm font-bold text-slate-700">해당 연도 주요 업무 및 성과 PT 발표</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[10px] font-black bg-slate-700 text-white px-2.5 py-0.5 rounded-full shrink-0 mt-0.5 whitespace-nowrap">부서장</span>
              <p className="text-sm font-bold text-slate-700">다음 연도 부서 운영 계획 발표</p>
            </div>
          </div>
        </div>
      </div>

      <Note color="slate" warn>
        위반 시 경고·감봉·정직·해고 등의 징계가 부과될 수 있습니다 (제55·56조).
      </Note>
    </div>
  );
}

function SystemSection() {
  const menus = [
    { name: '대시보드',  desc: '공지사항·캘린더·미결재·AI 검색 한눈에 확인' },
    { name: '공지사항',  desc: '회사 전체 공지 열람 (중요 공지 반드시 확인)' },
    { name: '전자 결재', desc: '지출결의서·연차 신청 등 각종 문서 기안 및 결재' },
    { name: '사내 채팅', desc: '팀·개인 실시간 메시지, 파일 공유' },
    { name: '메일함',    desc: '하이웍스 업무 메일 (별도 로그인 후 이용)' },
    { name: '현장 관리', desc: '현장별 공사 현황, 작업 내역 관리 (공사·공무부)' },
    { name: '내 정보',   desc: '프로필·비밀번호 변경, 내 연차 현황 확인' },
  ];

  return (
    <div className="space-y-5">
      <Note color="violet">
        인트라넷 ID는 회사 이메일(id@han-sung.com), 초기 비밀번호는 관리부에서 개별 안내합니다. 첫 로그인 후 반드시 비밀번호를 변경하세요.
      </Note>

      <div className="rounded-2xl border border-violet-200 overflow-hidden">
        <div className="bg-gradient-to-r from-violet-50 to-white px-5 py-3.5 border-b border-violet-200">
          <p className="text-sm font-black text-slate-800">메뉴별 기능 안내</p>
        </div>
        <div className="divide-y divide-slate-100">
          {menus.map((m) => (
            <div key={m.name} className="flex items-center gap-4 px-5 py-3.5">
              <span className="text-xs font-black text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-lg whitespace-nowrap">{m.name}</span>
              <p className="text-sm font-bold text-slate-600">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-violet-200 overflow-hidden">
        <div className="bg-gradient-to-r from-violet-50 to-white px-5 py-3.5 border-b border-violet-200">
          <p className="text-sm font-black text-slate-800">전자 결재 사용 순서</p>
        </div>
        <div className="divide-y divide-slate-100">
          {[
            { step: '01', text: '사이드바 → 전자 결재 → 기안하기 클릭' },
            { step: '02', text: '양식 선택 (지출결의서 / 연차신청서 / 출장신청서 등)' },
            { step: '03', text: '내용 작성 후 결재자 지정 (부서장 → 상위 결재자 순)' },
            { step: '04', text: '관련 부서를 수신참조로 반드시 추가 — 예: 관리부(인사·급여 관련), 공무부(입찰·계약 관련) 등 해당 업무 담당 부서를 꼭 참조로 걸어주세요' },
            { step: '05', text: '제출 후 대시보드 → 미결재 카드 또는 전자결재 → 진행중 문서에서 현재 결재 단계를 실시간으로 확인할 수 있습니다' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-4 px-5 py-3.5">
              <span className="w-7 h-7 bg-violet-600 text-white text-[11px] font-black rounded-lg flex items-center justify-center shrink-0">{item.step}</span>
              <p className="text-sm font-bold text-slate-700 leading-relaxed pt-0.5">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <InfoCard
        title="비밀번호 변경 방법"
        color="violet"
        items={[
          '사이드바 → 내 정보 → 보안 설정에서 변경',
          '비밀번호 분실 시 관리부에 재설정 요청',
        ]}
      />
    </div>
  );
}

function WelfareSection() {
  return (
    <div className="space-y-5">
      <InfoCard
        title="4대보험 및 퇴직금"
        color="emerald"
        items={[
          '국민연금·건강보험·고용보험·산재보험 가입',
          '퇴직금: 1년 이상 근무 시 발생 (연간 평균 급여의 1/12)',
        ]}
      />

      <SectionLabel>경조사 휴가</SectionLabel>

      <TableCard
        title="경조사 휴가 (제39조)"
        color="emerald"
        rows={[
          { label: '본인 결혼',             value: '5일 유급' },
          { label: '배우자 출산',           value: '20일 유급' },
          { label: '부모·배우자 사망',      value: '5일 유급' },
          { label: '조부모·외조부모 사망',  value: '3일 유급' },
          { label: '자녀·자녀 배우자 사망', value: '3일 유급' },
          { label: '형제자매 사망',         value: '3일 유급' },
        ]}
      />

      <Note color="emerald">
        경조사 발생 즉시 관리부에 신고하세요. 경조사 휴가 기간에 공휴일·휴무일이 포함된 경우 해당 일수는 휴가 일수에 산입하지 않습니다.
      </Note>

      <SectionLabel>기타 지원</SectionLabel>

      {/* 출장비 단독 callout */}
      <div className="flex items-center gap-4 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4">
        <div className="w-10 h-10 bg-emerald-100 border border-emerald-200 rounded-xl flex items-center justify-center shrink-0">
          <MapPin size={18} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-black text-slate-800">출장비 지원 (제34조)</p>
          <p className="text-sm font-bold text-slate-500 mt-0.5">행선지별 여비·숙박비·현지교통비 실비 지급</p>
        </div>
      </div>

      <BranchCard
        title="식사 지원"
        color="emerald"
        rows={[
          { branch: '서울', items: ['중식 지원: (추가 예정)'] },
          { branch: '광주', items: ['중식 지원: (추가 예정)'] },
        ]}
      />

      {/* 명함 안내 callout */}
      <div className="flex items-start gap-4 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4">
        <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center shrink-0">
          <CreditCard size={18} className="text-slate-600" />
        </div>
        <div>
          <p className="text-sm font-black text-slate-800">명함</p>
          <p className="text-sm font-bold text-slate-500 mt-0.5 leading-relaxed">
            첫 명함은 입사 시 회사에서 제작합니다. 이후 재발급이 필요할 경우 마이페이지 → 명함 신청에서 요청하세요.
          </p>
        </div>
      </div>

      <Note color="emerald">
        복리후생 세부 사항은 변경될 수 있습니다. 최신 정보는 관리부 담당자에게 문의하세요.
      </Note>
    </div>
  );
}

function LeaveSection() {
  return (
    <div className="space-y-5">
      <StatGrid
        color="amber"
        cols={3}
        stats={[
          { value: '11일', label: '입사 첫 해 최대' },
          { value: '15일', label: '1년 이상 기본' },
          { value: '25일', label: '장기 근속 최대' },
        ]}
      />

      <TableCard
        title="연차 발생 기준 (제36조)"
        color="amber"
        rows={[
          { label: '1년 미만 또는 8할 미만 출근', value: '매월 개근 시 1일씩 발생 (최대 11일)' },
          { label: '1년 이상 (8할 이상 출근)',     value: '15일 유급휴가 부여' },
          { label: '3년 이상 근속',                value: '15일 + 매 2년마다 1일 추가 (최대 25일)' },
          { label: '이월 연차',                    value: '다음 해 1월 기준으로 반영' },
        ]}
      />

      <SectionLabel>연차 신청</SectionLabel>

      {/* 연차 신청 스텝 카드 */}
      <div className="rounded-2xl border border-amber-200 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-50 to-white px-5 py-3.5 border-b border-amber-200">
          <p className="text-sm font-black text-slate-800">연차 신청 방법 (제37조)</p>
        </div>
        <div className="divide-y divide-slate-100">
          {[
            { step: '01', text: '인트라넷 → 전자결재 → 기안하기 클릭' },
            { step: '02', text: '휴가신청서 선택 후 휴가 종류·기간·사유 입력' },
            { step: '03', text: '결재자 지정 후 제출 (참조인: 관리부 필수)' },
            { step: '04', text: '결재 승인 완료 시 대시보드 캘린더에 자동 반영' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-4 px-5 py-3.5">
              <span className="w-7 h-7 bg-amber-500 text-white text-[11px] font-black rounded-lg flex items-center justify-center shrink-0">{item.step}</span>
              <p className="text-sm font-bold text-slate-700 leading-relaxed pt-0.5">{item.text}</p>
            </div>
          ))}
        </div>
        <div className="bg-amber-50 border-t border-amber-100 px-5 py-3">
          <p className="text-xs font-bold text-amber-700">사용 예정일 7일 전까지 부서장 승인 필요</p>
        </div>
      </div>

      <SectionLabel>기타 휴가</SectionLabel>

      <InfoCard
        title="반차 / 특별 휴가"
        color="amber"
        items={[
          '반차(오전/오후): 0.5일 차감, 연차신청서에서 종류 선택',
          '경조사 휴가: 별도 신청 (연차 미차감, 복지 탭 참고)',
        ]}
      />

      <InfoCard
        title="병가 (제41조)"
        color="amber"
        items={[
          '업무 외 질병·부상의 경우 잔여 연차를 우선 사용합니다.',
          '연차 소진 후 연간 60일 이내에서 병가를 허용할 수 있습니다.',
          '연차 초과 병가 기간은 무급 처리됩니다.',
          '1주 이상 결근 시 의사 진단서 제출 필수 (미제출 시 무단결근 처리).',
        ]}
      />

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-sm font-black text-amber-800 mb-2">내 연차 현황 확인</p>
        <p className="text-xs font-bold text-amber-700 mb-3 leading-relaxed">
          내 정보 → 연차 현황에서 잔여 연차·사용 내역을 실시간으로 확인할 수 있습니다.
        </p>
        <Link href="/mypage" className="inline-flex items-center gap-1.5 text-xs font-black text-amber-700 hover:text-amber-900 transition-colors">
          내 정보 바로가기 <ChevronRight size={14} />
        </Link>
      </div>

      <Note color="amber">
        미사용 연차는 금전으로 보상하지 않습니다 (제37조 ④). 연도 내 적극적으로 사용하세요.
      </Note>

      <Note color="amber">
        연차 관련 문의는 관리부 담당자에게 연락하거나 사내 채팅으로 문의하세요.
      </Note>
    </div>
  );
}

const SECTION_CONTENT = {
  company: CompanySection,
  rules:   RulesSection,
  system:  SystemSection,
  welfare: WelfareSection,
  leave:   LeaveSection,
};

export default function OnboardingPage() {
  const [activeSection, setActiveSection] = useState('company');
  const activeConfig = SECTIONS.find(s => s.key === activeSection);
  const c = COLOR_MAP[activeConfig?.color || 'blue'];
  const Content = SECTION_CONTENT[activeSection];

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans antialiased overflow-hidden">
      <div className="shrink-0 bg-white border-b border-slate-200 px-8 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <BookOpen size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 leading-tight">입사 안내</h1>
              <p className="text-xs font-bold text-slate-400">한성종합조경에 오신 것을 환영합니다 · 꼭 읽어주세요</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BranchBadge branch="서울" />
            <BranchBadge branch="광주" />
            <span className="text-[11px] font-bold text-slate-400 ml-1">지사별 구분 표시</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-52 shrink-0 bg-white border-r border-slate-200 p-3 flex flex-col gap-1 overflow-y-auto">
          {SECTIONS.map((section) => {
            const isActive = activeSection === section.key;
            const sc = COLOR_MAP[section.color];
            const Icon = section.icon;
            return (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all
                  ${isActive ? `${sc.tab} shadow-sm` : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <Icon size={16} className={isActive ? 'text-white' : sc.icon} />
                <span className="text-sm font-black">{section.label}</span>
              </button>
            );
          })}
        </aside>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              {activeConfig && (
                <>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.badge}`}>
                    <activeConfig.icon size={16} className={c.icon} />
                  </div>
                  <h2 className="text-xl font-black text-slate-800">{activeConfig.label}</h2>
                </>
              )}
            </div>
            {Content && <Content />}
          </div>
        </main>
      </div>
    </div>
  );
}
