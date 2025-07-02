"use client";

import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import SalesModal from '@/components/SalesModal'; // 1단계에서 분리한 모달을 import 합니다.

// 이 컴포넌트는 서버에서 미리 받아온 initialSites를 props로 받습니다.
export default function ConstructionSitesClient({ initialSites }) {
    // 이제 초기 상태는 서버에서 받아온 데이터입니다. 더 이상 로딩이 필요없습니다.
    const [sites, setSites] = useState(initialSites || []);
    const [error, setError] = useState(null); // DB 조작 시 에러 처리를 위한 상태
    
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSale, setEditingSale] = useState(null);

    // useEffect를 사용한 데이터 로딩은 이제 필요 없습니다!
    
    const handleOpenModal = (sale = null) => {
        setEditingSale(sale);
        setIsModalOpen(true);
    };
    const handleCloseModal = () => {
        setEditingSale(null);
        setIsModalOpen(false);
    };
    
    const handleSaveSale = async (savedData) => {
        // Optimistic UI: UI를 먼저 업데이트합니다.
        if (savedData.id) {
            setSites(sites.map(s => s.id === savedData.id ? savedData : s));
        } else {
            // 임시 ID를 가진 새 데이터를 맨 위에 추가해서 즉각적으로 보이게 함
            const optimisticData = { ...savedData, id: Date.now(), isTemporary: true };
            setSites([optimisticData, ...sites]);
        }
        handleCloseModal();

        if (savedData.id) { // 수정 (UPDATE)
            const { error } = await supabase
                .from('construction_sites')
                .update({ company: savedData.company, brand: savedData.brand, complex_name: savedData.complex_name, region: savedData.region, move_in_date: savedData.move_in_date })
                .eq('id', savedData.id);
            
            if (error) {
                alert('수정에 실패했습니다: ' + error.message);
                setSites(sites); // 에러 발생 시 원래 상태로 롤백
            }
        } else { // 추가 (INSERT)
            const { data, error } = await supabase
                .from('construction_sites')
                .insert([{ company: savedData.company, brand: savedData.brand, complex_name: savedData.complex_name, region: savedData.region, move_in_date: savedData.move_in_date }])
                .select()
                .single(); // 단일 객체를 반환받음
            
            if (error) {
                alert('추가에 실패했습니다: ' + error.message);
                setSites(sites.filter(s => !s.isTemporary)); // 에러 발생 시 낙관적으로 추가했던 데이터 제거
            } else if (data) {
                // 서버로부터 받은 실제 데이터로 교체
                setSites(sites.map(s => s.isTemporary ? data : s));
            }
        }
    };
    
    // 검색 필터링 로직 개선 (대소문자 구분 없이)
    const filteredSales = useMemo(() => {
        const lowercasedTerm = searchTerm.toLowerCase();
        if (!lowercasedTerm) return sites;
        return sites.filter(s => 
            s.company.toLowerCase().includes(lowercasedTerm) || 
            s.complex_name.toLowerCase().includes(lowercasedTerm)
        );
    }, [searchTerm, sites]);
    
    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {isModalOpen && <SalesModal saleToEdit={editingSale} onClose={handleCloseModal} onSave={handleSaveSale} />}
            
            <header className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold">전국 공사현황</h1>
                    <p className="mt-1 text-gray-500">DB와 연동된 실시간 현황입니다.</p>
                </div>
                <div className="flex items-center gap-x-2 w-full sm:w-auto">
                    <div className="relative flex-grow">
                        <input 
                            type="text" 
                            placeholder="업체명, 단지명으로 검색..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="w-full px-4 py-2 border rounded-lg"
                        />
                    </div>
                    <button onClick={() => handleOpenModal(null)} className="flex-shrink-0 bg-green-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-800 transition-colors">
                        내역 추가
                    </button>
                </div>
            </header>

            <main className="bg-white rounded-xl shadow-sm border overflow-x-auto">
                {error && <div className="text-center p-4 text-red-500 bg-red-50">{error}</div>}
                
                <table className="w-full text-sm min-w-[600px]">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-4 text-left font-semibold">업체명</th>
                            <th className="p-4 text-left font-semibold">브랜드명</th>
                            <th className="p-4 text-left font-semibold w-2/5">단지명</th>
                            <th className="p-4 text-left font-semibold">지역</th>
                            <th className="p-4 text-left font-semibold">입주예정일</th>
                            <th className="p-4 text-center font-semibold">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredSales.map(sale => (
                            <tr key={sale.id} className={`hover:bg-gray-50 group ${sale.isTemporary ? 'opacity-50' : ''}`}>
                                <td className="p-4 font-bold">{sale.company}</td>
                                <td className="p-4">{sale.brand}</td>
                                <td className="p-4">{sale.complex_name}</td>
                                <td className="p-4">{sale.region}</td>
                                <td className="p-4">{sale.move_in_date}</td>
                                <td className="p-4 w-16 text-center">
                                    <button onClick={() => handleOpenModal(sale)} className="text-gray-400 opacity-0 group-hover:opacity-100 hover:text-blue-600 font-medium">
                                        수정
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {filteredSales.length === 0 && (
                    <p className="text-center py-10 text-gray-500">
                        {searchTerm ? `'${searchTerm}'에 대한 검색 결과가 없습니다.` : "표시할 현황 내역이 없습니다. '내역 추가' 버튼으로 시작하세요."}
                    </p>
                )}
            </main>
        </div>
    );
}