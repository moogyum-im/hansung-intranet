// src/app/(main)/approvals/[id]/page.js

// 이전: import createServerClient from '@/lib/supabase/server';
// 변경: lib/supabase/server.js에서 createSupabaseServerClient가 명명된 export로 변경되었으므로,
// 중괄호를 사용하여 명명된 임포트를 사용합니다.
import { createSupabaseServerClient } from '@/lib/supabase/server'; 
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ApprovalActions from './ApprovalActions'; // 바로 이 컴포넌트를 import 합니다.

// --- Helper Components (서버 컴포넌트 내부에 정의해도 무방합니다) ---
const getStatusStyle = (status) => {
    switch (status) {
        case '승인': return 'bg-blue-100 text-blue-800';
        case '반려': return 'bg-red-100 text-red-800';
        case '대기': return 'bg-yellow-100 text-yellow-800';
        case '진행중': return 'bg-green-100 text-green-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

const StatusIndicator = ({ status }) => (
    <span className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-3.5 ring-4 ring-white ${status === '승인' ? 'bg-blue-500' : status === '반려' ? 'bg-red-500' : status === '대기' ? 'bg-yellow-400' : 'bg-gray-400'}`}></span>
);

const DynamicFieldRenderer = ({ field, data }) => {
    const value = data?.[field.name];

    if (value === null || typeof value === 'undefined' || value === '') {
        return <p className="p-3 bg-gray-100 rounded-md mt-1 text-gray-500">내용 없음</p>;
    }
    switch (field.type) {
        case 'daterange':
            if (typeof value === 'object' && value.start && value.end) {
                return <p className="p-3 bg-gray-100 rounded-md mt-1">{`${value.start} ~ ${value.end}`}</p>;
            }
            return <p className="p-3 bg-gray-100 rounded-md mt-1 text-red-500">잘못된 기간 형식</p>;
        case 'checkbox':
            return <p className="p-3 bg-gray-100 rounded-md mt-1">{value ? '예' : '아니오'}</p>;
        default:
            return <p className="p-3 bg-gray-100 rounded-md mt-1 whitespace-pre-wrap">{String(value)}</p>;
    }
};

const ApprovalAttachments = ({ attachments }) => {
    if (!attachments || attachments.length === 0) { return null; }
    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-bold border-b pb-3 mb-4">첨부 파일</h2>
            <p className="text-sm text-gray-500">첨부파일 기능은 구현 예정입니다.</p>
        </div>
    );
};


// 이 페이지는 서버 컴포넌트입니다. ('use client' 없음)
export default async function ApprovalDetailPage({ params }) {
    // 이전: const supabase = createServerClient();
    // 변경: 명명된 임포트로 가져온 createSupabaseServerClient 함수를 호출합니다.
    const supabase = createSupabaseServerClient(); 
    const documentId = params.id;
    const { data: { user } } = await supabase.auth.getUser();

    const { data: document, error: docError } = await supabase
        .from('approval_documents')
        .select(`*, author: author_id ( full_name, department )`)
        .eq('id', documentId)
        .single();
    
    if (docError || !document) {
        notFound();
    }
    
    const { data: approvers, error: approversError } = await supabase
        .from('approval_document_approvers')
        .select(`*, approver: approver_id ( full_name, department )`)
        .eq('document_id', documentId)
        .order('step');

    if (approversError) {
        return <div>결재선 정보를 불러오는데 실패했습니다.</div>;
    }

    return (
        <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-50">
            <div className="max-w-4xl mx-auto space-y-6">
                <header className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex justify-between items-center mb-4">
                        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${getStatusStyle(document.status)}`}>
                            {document.type || '일반 문서'}
                        </span>
                        <Link href="/approvals" className="text-sm font-medium text-gray-600 hover:text-blue-600">← 목록으로 돌아가기</Link>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">{document.title}</h1>
                    <p className="text-sm text-gray-500 mt-2">
                        작성자: {document.author?.full_name || 'N/A'} | 상신일: {new Date(document.created_at).toLocaleDateString()}
                    </p>
                </header>

                <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
                    <h2 className="text-xl font-bold border-b pb-3 mb-4">결재 내용</h2>
                    <dl className="space-y-4">
                        {(document.form_fields && document.form_fields.length > 0) ? (
                            document.form_fields.map(field => (
                                <div key={field.name} className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                    <dt className="text-sm font-medium text-gray-500 md:col-span-1">{field.name}</dt>
                                    <dd className="md:col-span-3">
                                        <DynamicFieldRenderer field={field} data={document.form_data} />
                                    </dd>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500">작성된 결재 내용이 없습니다. (자유 양식)</p>
                        )}
                    </dl>
                </div>
                
                <ApprovalAttachments attachments={document.attachments} />
                
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h2 className="text-xl font-bold border-b pb-3 mb-4">결재선</h2>
                    <ol className="relative border-l-2 border-gray-200 ml-3">
                        {approvers.map((a, index) => (
                            <li key={a.id} className={`mb-8 ml-8 ${index === approvers.length - 1 ? 'mb-0' : ''}`}>
                                <StatusIndicator status={a.status} />
                                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                    <h3 className="font-semibold text-gray-900">{a.approver?.full_name} <span className="font-normal text-gray-500">({a.approver?.department})</span></h3>
                                    <time className="block mb-2 text-sm font-normal leading-none text-gray-500">{a.status} {a.processed_at && `(${new Date(a.processed_at).toLocaleString()})`}</time>
                                    {a.comment && <p className="p-2 mt-2 text-sm bg-white rounded-md border whitespace-pre-wrap">{a.comment}</p>}
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>
                
                {/* 상호작용이 필요한 부분만 클라이언트 컴포넌트로 렌더링합니다. */}
                {user && (
                    <ApprovalActions
                        document={document}
                        approvers={approvers}
                        currentUserId={user.id}
                    />
                )}
            </div>
        </div>
    );
}