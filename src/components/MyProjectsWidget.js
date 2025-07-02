// 파일 경로: src/components/MyProjectsWidget.js
"use client";

// 필요한 아이콘
const ProjectIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-purple-800"><path d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg> );
const StatusBadge = ({ status }) => { const styles = { '진행중': 'bg-yellow-100 text-yellow-800', '완료': 'bg-green-100 text-green-800', '대기': 'bg-gray-100 text-gray-800' }; return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{status}</span> };

// 가짜 데이터 (나중에 DB에서 가져옵니다)
const sampleProjects = [
  { id: 1, title: "사내 인트라넷 신규 기능 개발", status: "진행중" },
  { id: 2, title: "고객 만족도 설문조사 분석", status: "대기" },
  { id: 3, title: "2분기 마케팅 분석 보고서", status: "완료" },
];

export default function MyProjectsWidget() {
  return (
    <section className="p-6 bg-white rounded-xl shadow-lg border border-gray-200">
      <div className="flex items-center gap-x-3 mb-5">
        <ProjectIcon />
        <h2 className="text-xl font-bold text-gray-900">내 프로젝트</h2>
      </div>
      <ul className="space-y-3">
        {sampleProjects.map(p => (
          <li key={p.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
            <span className='text-gray-700 truncate'>{p.title}</span>
            <StatusBadge status={p.status} />
          </li>
        ))}
      </ul>
    </section>
  );
}