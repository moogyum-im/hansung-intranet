"use client";
import { useState } from 'react';

const DEPARTMENTS = ['최고 경영진', '비서실', '전략기획부', '관리부', '공무부', '공사부', '시설부', '장비지원부'];
// ★★★ '부사장'이 제거되고, '상무'가 '이사'로 변경되었습니다. ★★★
const POSITIONS = ['회장', '대표', '이사', '부장', '차장', '과장', '대리', '주임', '사원'];
const STATUSES = ['업무중', '외근중', '회의중', '휴가중', '연차중', '오프라인'];

export default function UserModal({ userToEdit, onClose, onSave }) {
    const isEditMode = Boolean(userToEdit);
    const [formData, setFormData] = useState({
        email: userToEdit?.email || '',
        password: '',
        full_name: userToEdit?.name || '',
        department: userToEdit?.department || '전략기획부',
        position: userToEdit?.position || '사원',
        phone: userToEdit?.phone || '',
        status: userToEdit?.status || '업무중',
        role: userToEdit?.role || 'user',
    });
    
    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-2xl">
                <h2 className="text-2xl font-bold mb-6">{isEditMode ? '직원 정보 수정' : '신규 직원 추가'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label>이메일 (로그인 ID)</label><input type="email" name="email" value={formData.email} onChange={handleChange} required disabled={isEditMode} className="w-full p-2 border rounded mt-1 disabled:bg-gray-100 disabled:cursor-not-allowed"/></div>
                        {!isEditMode && <div><label>초기 비밀번호</label><input type="password" name="password" value={formData.password} onChange={handleChange} required className="w-full p-2 border rounded mt-1"/></div>}
                        <div><label>이름</label><input name="full_name" value={formData.full_name} onChange={handleChange} required className="w-full p-2 border rounded mt-1"/></div>
                        <div><label>부서</label><select name="department" value={formData.department} onChange={handleChange} className="w-full p-2 border rounded mt-1 bg-white">{DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                        <div><label>직급</label><select name="position" value={formData.position} onChange={handleChange} className="w-full p-2 border rounded mt-1 bg-white">{POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                        <div><label>연락처</label><input name="phone" value={formData.phone} onChange={handleChange} className="w-full p-2 border rounded mt-1"/></div>
                        <div><label>활동 상태</label><select name="status" value={formData.status} onChange={handleChange} className="w-full p-2 border rounded mt-1 bg-white">{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                        <div><label>역할 (Role)</label><select name="role" value={formData.role} onChange={handleChange} className="w-full p-2 border rounded mt-1 bg-white"><option value="user">User</option><option value="admin">Admin</option></select></div>
                    </div>
                    <div className="flex justify-end gap-4 pt-6"><button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 rounded-md">취소</button><button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-md">{isEditMode ? '수정사항 저장' : '직원 추가'}</button></div>
                </form>
            </div>
        </div>
    );
}