"use client";

import { useState } from 'react';

// 이제 SalesModal은 독립적인 컴포넌트가 되었습니다.
export default function SalesModal({ saleToEdit, onClose, onSave }) {
    // saleToEdit이 바뀔 때마다 초기 상태를 다시 설정하도록 수정
    const [formData, setFormData] = useState({
        company: saleToEdit?.company || '',
        brand: saleToEdit?.brand || '',
        complex_name: saleToEdit?.complex_name || '',
        region: saleToEdit?.region || '',
        move_in_date: saleToEdit?.move_in_date || '',
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ id: saleToEdit?.id, ...formData });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg animate-fade-in-up">
                <h2 className="text-xl font-bold mb-4">{saleToEdit ? '현황 수정' : '신규 현황 추가'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                        <label className="font-semibold">업체명
                            <input name="company" value={formData.company} onChange={handleChange} required className="w-full p-2 border mt-1 rounded font-normal"/>
                        </label>
                        <label className="font-semibold">브랜드명
                            <input name="brand" value={formData.brand} onChange={handleChange} className="w-full p-2 border mt-1 rounded font-normal"/>
                        </label>
                    </div>
                    <label className="font-semibold">단지명
                        <input name="complex_name" value={formData.complex_name} onChange={handleChange} required className="w-full p-2 border mt-1 rounded font-normal"/>
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                        <label className="font-semibold">지역
                            <input name="region" value={formData.region} onChange={handleChange} className="w-full p-2 border mt-1 rounded font-normal"/>
                        </label>
                        <label className="font-semibold">입주예정일
                            <input name="move_in_date" type="date" value={formData.move_in_date} onChange={handleChange} className="w-full p-2 border mt-1 rounded font-normal"/>
                        </label>
                    </div>
                    <div className="flex justify-end gap-x-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">취소</button>
                        <button type="submit" className="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800">{saleToEdit ? '저장' : '추가'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}