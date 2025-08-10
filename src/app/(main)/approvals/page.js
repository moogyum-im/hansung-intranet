// 파일 경로: src/app/(main)/approvals/page.js
'use client';

import Link from 'next/link';
import { useEmployee } from '@/contexts/EmployeeContext';

const items = [
  
  {
    name: '휴가신청서',
    description: '연차, 반차 등 휴가 신청을 위한 서류입니다.',
    href: '/approvals/leave',
  },
  {
    name: '지출결의서',
    description: '비용 지출에 대한 결재를 요청합니다.',
    href: '/approvals/expense',
  },
  {
    name: '내부결재서',
    description: '내부 결재를 상신하기 위한 서류입니다.',
    href: '/approvals/internal',
  },
  {
    name: '업무 보고서 (일간/주간/월간)',
    description: '일일 업무 보고를 위한 서류입니다.',
    href: '/approvals/work-report',
  },
  { 
    name: '사직서', 
    description: '퇴사 의사를 결재자에게 상신합니다.', 
    href: '/approvals/resignation',
  },
  { 
    name: '시말서', 
    description: '사건 경위를 작성하여 결재자에게 상신합니다.', 
    href: '/approvals/apology',
  },
];

export default function ApprovalsHubPage() {
  const { employee } = useEmployee();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 text-gray-800">전자 결재</h1>
      <p className="text-gray-600 mb-8">
        결재를 상신할 서류를 선택하세요.
      </p>

      <ul className="space-y-4">
        {items.map((item) => (
          <li key={item.name} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
            <Link href={item.href} className="flex items-center p-6 space-x-6">
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-1 text-gray-800">{item.name}</h2>
                <p className="text-gray-500 text-sm">{item.description}</p>
              </div>
              <div className="flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}