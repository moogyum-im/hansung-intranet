'use client'; 

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';

import ApprovalActions from './ApprovalActions';

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';


// --- Helper Components ---
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

// DynamicFieldRenderer: 파일 정보를 객체로 처리하도록 수정
const DynamicFieldRenderer = ({ field, data }) => {
    const value = data?.[field.name];

    if (!value) {
        return <p className="p-3 bg-gray-100 rounded-md mt-1 text-gray-500">내용 없음</p>;
    }
    switch (field.type) {
        case 'richtext':
            return <div className="p-3 bg-gray-100 rounded-md mt-1 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: value }} />;
        case 'daterange':
            return <p className="p-3 bg-gray-100 rounded-md mt-1">{`${value.start || ''} ~ ${value.end || ''}`}</p>;
        case 'checkbox':
            return <p className="p-3 bg-gray-100 rounded-md mt-1">{value ? '예' : '아니오'}</p>;
        case 'file':
            // ★★★ value가 {name, url} 형태의 객체이므로, 각 속성을 올바르게 사용합니다. ★★★
            if (typeof value === 'object' && value.url && value.name) {
                return (
                    <a href={value.url} target="_blank" rel="noopener noreferrer" className="p-3 bg-blue-100 text-blue-800 rounded-md mt-1 flex items-center hover:underline">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd"></path></svg>
                        {value.name} (클릭하여 다운로드)
                    </a>
                );
            }
            return <p className="p-3 bg-gray-100 rounded-md mt-1 text-gray-500">첨부 파일 없음</p>;
        default:
            return <p className="p-3 bg-gray-100 rounded-md mt-1 whitespace-pre-wrap">{String(value)}</p>;
    }
};

// ApprovalAttachments: 파일 정보를 객체로 처리하도록 수정
const ApprovalAttachments = ({ documentData }) => {
    // ★★★ fileInfo는 이제 {name, url} 형태의 객체입니다. ★★★
    const fileInfo = documentData?.form_data?.['첨부 파일'];

    if (!fileInfo || typeof fileInfo !== 'object' || !fileInfo.url) {
        return null;
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-bold border-b pb-3 mb-4">첨부 파일</h2>
            <div className="flex items-center text-blue-800 bg-blue-50 p-3 rounded-md">
                <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd"></path></svg>
                {/* ★★★ 객체의 url과 name 속성을 사용합니다. ★★★ */}
                <a href={fileInfo.url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                    {fileInfo.name || '파일 다운로드'}
                </a>
            </div>
        </div>
    );
};


export default function ApprovalDetailPage() {
    const { id: documentId } = useParams();
    const [document, setDocument] = useState(null);
    const [approvers, setApprovers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const contentRef = useRef(null);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const fetchUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);
        };
        fetchUserData();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!documentId) {
                setLoading(false);
                notFound();
                return;
            }

            setLoading(true);
            setError(null);

            const { data: docData, error: docError } = await supabase
                .from('approval_documents')
                .select(`*, author:author_id(full_name, department)`)
                .eq('id', documentId)
                .single();

            if (docError || !docData) {
                console.error('결재 문서 로드 오류:', docError);
                setError('결재 문서를 찾을 수 없습니다.');
                setLoading(false);
                notFound();
                return;
            }
            setDocument(docData);

            const { data: approversData, error: approversError } = await supabase
                .from('approval_document_approvers')
                .select(`*, approver:approver_id(full_name, department)`)
                .eq('document_id', documentId)
                .order('step');

            if (approversError) {
                console.error('결재선 정보 로드 오류:', approversError);
                setError('결재선 정보를 불러오는데 실패했습니다.');
                setLoading(false);
                return;
            }
            setApprovers(approversData);
            setLoading(false);
        };

        fetchData();
    }, [documentId]);

    const handleDownloadPdf = useCallback(async () => {
        if (contentRef.current) {
            const canvas = await html2canvas(contentRef.current, {
                scale: 2, useCORS: true, scrollX: 0, scrollY: 0,
                windowWidth: contentRef.current.scrollWidth,
                windowHeight: contentRef.current.scrollHeight,
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgWidth = 210;
            const pageHeight = 297;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            pdf.save(`결재문서_${documentId}.pdf`);
        }
    }, [documentId]);


    if (loading) return <div className="p-4 text-center">결재 문서를 로드 중입니다...</div>;
    if (error) return <div className="p-4 text-red-500 text-center">{error}</div>;
    if (!document) return notFound();

    return (
        <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-50">
            <div id="print-area" ref={contentRef} className="max-w-4xl mx-auto space-y-6">
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
                
                <ApprovalAttachments documentData={document} /> 
                
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
                
                <div className="flex gap-4 mt-6 print:hidden">
                    <button
                        onClick={handleDownloadPdf}
                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow"
                    >
                        PDF로 저장 / 인쇄
                    </button>
                </div>

                {currentUser && (
                    <ApprovalActions
                        document={document}
                        approvers={approvers}
                        currentUserId={currentUser.id}
                    />
                )}
            </div>
        </div>
    );
}