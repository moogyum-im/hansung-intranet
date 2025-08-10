// 파일 경로: src/components/ApprovalForm.jsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useEmployee } from '@/contexts/EmployeeContext';
import { toast } from 'react-hot-toast';

export default function ApprovalForm({ documentType, formTitle, fields }) {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const { employee, loading: employeeLoading } = useEmployee();
  const router = useRouter();

  // 폼 데이터 변경 핸들러
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 폼 제출 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 결재 상신 로직 (여기서는 사직서 로직 예시를 사용)
    const submissionData = {
        title: formTitle,
        content: JSON.stringify(formData), // 폼 데이터를 JSON 문자열로 저장
        document_type: documentType,
        approver_id: employee?.team_leader_id, // 결재자 ID
    };

    try {
        const response = await fetch('/api/approvals/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submissionData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '상신 실패');
        }

        toast.success("결재가 성공적으로 상신되었습니다.");
        router.push('/approvals'); // 결재 현황 페이지로 이동
    } catch (error) {
        toast.error(`상신 실패: ${error.message}`);
    } finally {
        setLoading(false);
    }
  };

  // 로딩 중일 때 UI
  if (employeeLoading) {
      return <div className="text-center">사용자 정보 로딩 중...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
        {fields.map(field => (
            <div key={field.name}>
                <label className="block text-gray-700 font-bold mb-2 text-lg">{field.label}</label>
                {field.type === 'textarea' ? (
                    <textarea
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-lg h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required={field.required}
                    />
                ) : (
                    <input
                        type={field.type}
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required={field.required}
                    />
                )}
            </div>
        ))}
        
        {/* 파일 첨부 기능 (여기에 추가될 예정) */}
        {/* 결재선 지정 기능 (여기에 추가될 예정) */}

        <div className="flex justify-end pt-4">
            <button
                type="submit"
                disabled={loading || employeeLoading}
                className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 font-semibold transition-colors"
            >
                {loading ? '상신 중...' : '결재 상신'}
            </button>
        </div>
    </form>
  );
}