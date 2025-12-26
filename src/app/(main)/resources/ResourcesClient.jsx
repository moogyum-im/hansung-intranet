"use client";

import { useState, useMemo } from 'react';
import { 
  Download, 
  Search, 
  FileText, 
  ShieldCheck, 
  Box,
  Info
} from 'lucide-react';

export default function ResourcesClient({ initialResources }) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredResources = useMemo(() => {
        if (!searchTerm) return initialResources;
        return initialResources.filter(resource =>
            resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            resource.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            resource.category?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, initialResources]);

    return (
        <div className="bg-[#f8fafc] min-h-screen pb-12">
            {/* --- 웅장한 블루 테마 헤더 (푸시 알림 테스트 제거) --- */}
            <header className="relative bg-[#1e293b] pt-14 pb-24 px-6 sm:px-12 overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-16 opacity-10 rotate-12 text-white">
                    <Box size={320} />
                </div>
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-blue-500/20 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/10 shadow-inner text-blue-400">
                            <FileText size={32} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-blue-400 font-black text-[10px] tracking-widest uppercase mb-1">
                                <ShieldCheck size={12} /> Hansung Assets Repository
                            </div>
                            <h1 className="text-4xl font-black text-white tracking-tighter">
                                자료실
                            </h1>
                            <p className="text-slate-400 font-medium text-[13px] mt-1 max-w-md">
                                업무에 필요한 로고, 서식, 템플릿 등 공인 자산입니다.
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 -mt-12 relative z-20">
                {/* --- 검색바 --- */}
                <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl border border-white/50 p-2.5 mb-8 flex items-center gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="자료명, 설명, 분류로 검색하세요..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50/50 border-none rounded-2xl py-4 pl-14 pr-4 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                        />
                    </div>
                </div>

                {/* --- 자료 카드 리스트 --- */}
                {filteredResources.length > 0 ? (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filteredResources.map(resource => (
                            <div key={resource.id} className="group bg-white rounded-[2rem] shadow-sm border border-slate-100 flex flex-col overflow-hidden transition-all hover:shadow-2xl hover:shadow-blue-900/10 hover:-translate-y-1">
                                <div className="p-7 flex-grow">
                                    <div className="flex items-start justify-between mb-4">
                                        <span className="px-3 py-1 text-[10px] font-black text-blue-600 bg-blue-50 rounded-lg border border-blue-100 uppercase tracking-tighter">
                                            {resource.category || '기타'}
                                        </span>
                                        <div className="text-slate-200 group-hover:text-blue-100 transition-colors">
                                            <FileText size={24} />
                                        </div>
                                    </div>
                                    
                                    <h3 className="text-lg font-black text-slate-800 group-hover:text-blue-600 transition-colors tracking-tight line-clamp-1 mb-2">
                                        {resource.name}
                                    </h3>
                                    <p className="text-[13px] text-slate-500 font-medium line-clamp-2 leading-relaxed">
                                        {resource.description || '상세 설명이 등록되지 않았습니다.'}
                                    </p>
                                </div>

                                <div className="px-7 pb-7">
                                    <a
                                        href={`/api/files/download?path=${encodeURIComponent(resource.file_path)}&name=${encodeURIComponent(resource.name)}&bucket=resources`}
                                        className="w-full flex items-center justify-center gap-2 bg-slate-900 group-hover:bg-blue-600 text-white px-5 py-3.5 rounded-2xl font-black text-xs shadow-lg transition-all active:scale-95"
                                    >
                                        <Download size={16} />
                                        자료 다운로드
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-[3rem] border border-slate-100 border-dashed py-24 px-6 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-200">
                            <Search size={40} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">검색 결과가 없습니다</h3>
                        <p className="mt-2 text-slate-400 text-sm font-medium">다른 검색어나 카테고리를 입력해보세요.</p>
                    </div>
                )}

                {/* 하단 정보 바 */}
                <div className="mt-10 px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                        Total Registered Resources: <span className="text-blue-600">{filteredResources.length}</span>
                    </p>
                    <div className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 rounded-full text-blue-600">
                        <Info size={14} />
                        <span className="text-[11px] font-black tracking-tight">보안을 위해 외부 유출을 엄격히 금지합니다.</span>
                    </div>
                </div>
            </main>
        </div>
    );
}