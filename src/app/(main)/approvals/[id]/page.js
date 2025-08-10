// 파일 경로: src/app/(main)/approvals/[id]/page.js
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import React from 'react';
import LeaveRequestView from './LeaveRequestView.jsx';
import ExpenseReportView from './ExpenseReportView.jsx';
import InternalApprovalView from './InternalApprovalView.jsx';
import WorkReportView from './WorkReportView.jsx';
import ResignationView from './ResignationView.jsx';
import ApologyView from './ApologyView.jsx'; // ★★★ 새로 만든 보기 화면 추가 ★★★

const renderDocumentView = (doc, profile, approvers, currentUserId) => {
    // ★★★ 문서 종류에 'apology' 추가 ★★★
    switch (doc.document_type) {
        case 'leave_request':
            return <LeaveRequestView doc={doc} profile={profile} approvers={approvers} currentUserId={currentUserId} />;
        case 'expense_report':
            return <ExpenseReportView doc={doc} profile={profile} approvers={approvers} currentUserId={currentUserId} />;
        case 'internal_approval':
            return <InternalApprovalView doc={doc} profile={profile} approvers={approvers} currentUserId={currentUserId} />;
        case 'work_report':
            return <WorkReportView doc={doc} profile={profile} approvers={approvers} currentUserId={currentUserId} />;
        case 'resignation':
            return <ResignationView doc={doc} profile={profile} approvers={approvers} currentUserId={currentUserId} />;
        case 'apology':
            return <ApologyView doc={doc} profile={profile} approvers={approvers} currentUserId={currentUserId} />;
        default:
            return <div className="p-8">지원하지 않는 문서 타입입니다: {doc.document_type}</div>;
    }
};

export default async function ApprovalDetailsPage({ params }) {
    const { id } = params;
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) notFound();
    const currentUserId = user.id;

    const { data: doc, error: docError } = await supabase
        .from('approval_documents').select('*').eq('id', id).single();
    if (docError || !doc) notFound();
    
    const creatorId = doc.created_by || doc.author_id;
    let creatorProfile = null;
    if (creatorId) {
        const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, department, position, total_leave_days, used_leave_days')
            .eq('id', creatorId)
            .single();
        creatorProfile = profileData;
    }

    const { data: approvers, error: approversError } = await supabase
        .from('approval_document_approvers')
        .select('*, approver:profiles(full_name, position)')
        .eq('document_id', id).order('sequence', { ascending: true });

    if (!creatorProfile || approversError) {
        return <div className="p-8">문서 데이터를 불러오는 중 오류가 발생했습니다.</div>;
    }

    return (
        <div className="bg-gray-50 min-h-screen">
            {renderDocumentView(doc, creatorProfile, approvers || [], currentUserId)}
        </div>
    );
}