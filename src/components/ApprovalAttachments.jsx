// 파일 경로: src/components/ApprovalAttachments.jsx
'use client'; // 이 컴포넌트는 클라이언트 전용입니다.

import { supabase } from '../lib/supabase/client';

export default function ApprovalAttachments({ attachments }) {


    const handleDownload = async (filePath, fileName) => {
        try {
            const { data, error } = await supabase.storage.from('approval-documents').download(filePath);
            if (error) throw error;

            // 이제 이 코드는 'use client'가 명시된 컴포넌트 안에서만 실행됩니다.
            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            alert('파일 다운로드에 실패했습니다: ' + error.message);
        }
    };

    if (!attachments || attachments.length === 0) {
        return null; // 첨부 파일이 없으면 아무것도 렌더링하지 않음
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold border-b pb-2 mb-4">첨부 파일</h2>
            <ul className="space-y-2">
                {attachments.map((file, i) => (
                    <li key={i} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-gray-50">
                        <span className="truncate">{file.name}</span>
                        <button onClick={() => handleDownload(file.path, file.name)} className="text-blue-600 hover:underline ml-4 flex-shrink-0">
                            다운로드
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}