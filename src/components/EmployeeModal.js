"use client";

import { useState, useEffect } from 'react';

const DEPARTMENTS = ['최고 경영진', '비서실', '전략기획부', '관리부', '공무부', '공사부', '시설부', '장비지원부'];
// ★★★ '부사장'이 제거되고, '상무'가 '이사'로 변경되었습니다. ★★★
const POSITIONS = ['회장', '대표', '이사', '부장', '차장', '과장', '대리', '주임', '사원'];
const STATUSES = ['업무중', '외근중', '회의중', '휴가중', '연차중', '오프라인'];

export default function EmployeeModal({ employeeToEdit, onClose, onSave, isSaving }) {
    const [formData, setFormData] = useState({});

    useEffect(() => {
        setFormData({
            email: employeeToEdit?.email || '', 
            full_name: employeeToEdit?.name || '', 
            department: employeeToEdit?.department || '전략기획부', 
            position: employeeToEdit?.position || '사원',
            phone: employeeToEdit?.phone || '',
            status: employeeToEdit?.status || '오프라인',
            role: employeeToEdit?.role || 'user'
        });
    }, [employeeToEdit]);
    
    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-6">직원 정보 수정</h2>
                <form key={employeeToEdit?.id} onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div><label className="font-semibold text-sm">이메일 (로그인 ID)</label><input type="email" name="email" value={formData.email || ''} readOnly disabled className="w-full p-2 border rounded mt-1 bg-gray-100 cursor-not-allowed"/></div>
                        <div><label className="font-semibold text-sm">이름</label><input name="full_name" value={formData.full_name || ''} onChange={handleChange} required className="w-full p-2 border rounded mt-1"/></div>
                        <div><label className="font-semibold text-sm">직급</label><select name="position" value={formData.position || ''} onChange={handleChange} className="w-full p-2 border rounded mt-1 bg-white">{POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                        <div><label className="font-semibold text-sm">부서</label><select name="department" value={formData.department || ''} onChange={handleChange} className="w-full p-2 border rounded mt-1 bg-white">{DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                        <div><label className="font-semibold text-sm">연락처</label><input name="phone" value={formData.phone || ''} onChange={handleChange} placeholder="010-1234-5678" className="w-full p-2 border rounded mt-1"/></div>
                        <div><label className="font-semibold text-sm">상태</label><select name="status" value={formData.status || ''} onChange={handleChange} className="w-full p-2 border rounded mt-1 bg-white">{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                        <div className="md:col-span-2"><label className="font-semibold text-sm">역할 (권한)</label><select name="role" value={formData.role || ''} onChange={handleChange} className="w-full p-2 border rounded mt-1 bg-white"><option value="user">User (일반 사용자)</option><option value="admin">Admin (관리자)</option></select></div>
                    </div>
                    <div className="flex justify-end gap-4 pt-6"><button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 rounded-md hover:bg-gray-300">취소</button><button type="submit" disabled={isSaving} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed">{isSaving ? '저장 중...' : '저장'}</button></div>
                </form>
            </div>
        </div>
    );
}