'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useEmployee } from '@/contexts/EmployeeContext';
import {
  FileText, Search, Upload, Star, Download, Pin, Clock,
  X, Plus, History, Trash2, Edit2, AlertTriangle,
  FolderOpen, Tag, Loader2, ClipboardList, Building2, ChevronDown
} from 'lucide-react';
import { ACCESS_LEVEL_LABELS } from '@/lib/formAccessLevel';
import toast, { Toaster } from 'react-hot-toast';

const DEPT_LIST = ['전략기획부', '공무부', '공사부', '관리부', '굴취팀'];

const ACCESS_LEVEL_COLORS = {
  5: { bg: '#eff6ff', text: '#3b82f6' },
  4: { bg: '#f0fdf4', text: '#22c55e' },
  3: { bg: '#fefce8', text: '#eab308' },
  2: { bg: '#fff7ed', text: '#f97316' },
  1: { bg: '#fef2f2', text: '#ef4444' },
};

// ──────────────────────── 업로드 / 수정 모달 ────────────────────────
function UploadModal({ labels, onClose, onSuccess, editForm = null, isAdmin = false }) {
  const isEdit = !!editForm;
  const [title, setTitle] = useState(editForm?.title || '');
  const [description, setDescription] = useState(editForm?.description || '');
  const [labelId, setLabelId] = useState(editForm?.label_id || '');
  const [accessLevel, setAccessLevel] = useState(editForm?.access_level ?? 5);
  const [allowedDepts, setAllowedDepts] = useState(editForm?.allowed_departments || []);
  const [isPinned, setIsPinned] = useState(editForm?.is_pinned || false);
  const [expiresAt, setExpiresAt] = useState(editForm?.expires_at || '');
  const [changeNote, setChangeNote] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggleDept = (dept) =>
    setAllowedDepts(prev => prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEdit && !file) return toast.error('파일을 선택해주세요');
    if (!title.trim()) return toast.error('서식 제목을 입력해주세요');
    setLoading(true);
    try {
      if (isEdit) {
        const res = await fetch(`/api/forms/${editForm.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title, description, label_id: labelId || null,
            access_level: accessLevel,
            allowed_departments: allowedDepts.length > 0 ? allowedDepts : null,
            is_pinned: isPinned,
            expires_at: expiresAt || null,
          }),
        });
        if (!res.ok) {
          let msg = '서식 수정에 실패했습니다';
          try { msg = (await res.json()).error || msg; } catch {}
          throw new Error(msg);
        }
        toast.success('서식이 수정되었습니다');
      } else {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('title', title);
        fd.append('description', description);
        if (labelId) fd.append('label_id', labelId);
        fd.append('access_level', accessLevel);
        if (allowedDepts.length > 0) fd.append('allowed_departments', JSON.stringify(allowedDepts));
        fd.append('is_pinned', isPinned);
        if (expiresAt) fd.append('expires_at', expiresAt);
        fd.append('change_note', changeNote || '최초 등록');
        const res = await fetch('/api/forms', { method: 'POST', body: fd });
        if (!res.ok) {
          let msg = '서식 등록에 실패했습니다';
          try { msg = (await res.json()).error || msg; } catch {}
          throw new Error(msg);
        }
        toast.success('서식이 등록되었습니다');
      }
      onSuccess();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-base font-black text-slate-800">{isEdit ? '서식 수정' : '새 서식 등록'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"><X size={18} /></button>
        </div>
        {!isEdit && (
          <div className="mx-6 mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
            <span className="font-black">서식 공개 등급 안내</span><br />
            서식을 등록하기 전 <span className="font-bold">소속 부서 장의 확인</span>을 받아 공개 등급을 설정해주세요.<br />
            잘못된 등급으로 등록될 경우 정보가 외부에 노출될 수 있습니다.
          </div>
        )}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {!isEdit && (
            <div>
              <label className="block text-xs font-black text-slate-400 mb-1.5">파일 선택 *</label>
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all">
                <Upload size={20} className="text-slate-300 mb-1.5" />
                <span className="text-xs font-bold text-slate-400">{file ? file.name : '클릭하여 파일 선택'}</span>
                <input type="file" className="hidden" onChange={e => setFile(e.target.files[0])} />
              </label>
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-slate-400 mb-1.5">서식 제목 *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              placeholder="예: 휴가 신청서" />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 mb-1.5">설명</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
              placeholder="서식에 대한 간략한 설명" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-400 mb-1.5">분류 라벨</label>
              <select value={labelId} onChange={e => setLabelId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white">
                <option value="">없음</option>
                {labels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 mb-1.5">유효기한</label>
              <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 mb-2">공개 등급</label>
            <div className="grid grid-cols-5 gap-2">
              {[5, 4, 3, 2, 1].map(level => {
                const col = ACCESS_LEVEL_COLORS[level];
                const active = accessLevel === level;
                return (
                  <button type="button" key={level} onClick={() => setAccessLevel(level)}
                    className="flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all"
                    style={active ? { backgroundColor: col.bg, borderColor: col.text, color: col.text } : { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', color: '#94a3b8' }}>
                    <span className="text-lg font-black leading-none">{level}</span>
                    <span className="text-[9px] font-black leading-tight text-center">{ACCESS_LEVEL_LABELS[level]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 mb-2">부서 한정 공개 <span className="font-medium text-slate-300">(미선택 시 전체)</span></label>
            <div className="flex flex-wrap gap-2">
              {DEPT_LIST.map(dept => (
                <button type="button" key={dept} onClick={() => toggleDept(dept)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black border-2 transition-all ${allowedDepts.includes(dept) ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                  {dept}
                </button>
              ))}
            </div>
          </div>

          {!isEdit && (
            <div>
              <label className="block text-xs font-black text-slate-400 mb-1.5">등록 메모</label>
              <input value={changeNote} onChange={e => setChangeNote(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                placeholder="예: 2026년 최초 등록" />
            </div>
          )}

          <label className="flex items-center gap-3 cursor-pointer p-3 bg-amber-50 rounded-xl border border-amber-100">
            <input type="checkbox" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} className="w-4 h-4 accent-amber-500 rounded" />
            <Pin size={14} className="text-amber-500" />
            <span className="text-sm font-black text-amber-700">필수 서식으로 상단 고정</span>
          </label>

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm">
            {loading ? '처리 중...' : isEdit ? '수정 완료' : '서식 등록'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ──────────────────────── 버전 모달 ────────────────────────
function VersionModal({ form, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [changeNote, setChangeNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('파일을 선택해주세요');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('change_note', changeNote);
      const res = await fetch(`/api/forms/${form.id}/versions`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('새 버전이 등록되었습니다');
      onSuccess();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const latestVer = form.versions?.[0]?.version_number || 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-800">버전 관리</h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">{form.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-5">
          {/* 버전 이력 */}
          <div>
            <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 text-xs font-black text-slate-500 hover:text-slate-800 mb-3">
              <History size={13} /> 버전 이력 ({form.versions?.length || 0}개)
              <ChevronDown size={13} className={`transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            </button>
            {showHistory && (
              <div className="bg-slate-50 rounded-xl p-3 space-y-2.5 max-h-44 overflow-y-auto">
                {form.versions?.map(v => (
                  <div key={v.id} className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-md text-[10px] font-black shrink-0">v{v.version_number}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">{v.file_name}</p>
                      <p className="text-[10px] text-slate-400">{v.change_note || '—'} · {new Date(v.created_at).toLocaleDateString('ko-KR')}</p>
                    </div>
                    <a href={`/api/forms/${form.id}/download?version_id=${v.id}`}
                      className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-300 hover:text-blue-600 transition-colors shrink-0">
                      <Download size={12} />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* 새 버전 업로드 */}
          <form onSubmit={handleSubmit} className="space-y-3 pt-2 border-t border-slate-100">
            <p className="text-xs font-black text-slate-500">새 버전 업로드 (v{latestVer} → v{latestVer + 1})</p>
            <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all">
              <Upload size={18} className="text-slate-300 mb-1" />
              <span className="text-xs font-bold text-slate-400">{file ? file.name : '파일 선택'}</span>
              <input type="file" className="hidden" onChange={e => setFile(e.target.files[0])} />
            </label>
            <input value={changeNote} onChange={e => setChangeNote(e.target.value)} placeholder="변경 내용 메모"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-black text-sm hover:bg-blue-700 transition-colors disabled:opacity-50">
              {loading ? '업로드 중...' : '새 버전 등록'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────── 라벨 관리 모달 ────────────────────────
function LabelManagerModal({ labels, onClose, onSuccess }) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/form-labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, color: newColor }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNewName('');
      toast.success('라벨이 추가되었습니다');
      onSuccess();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('이 라벨을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/form-labels?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('삭제되었습니다');
      onSuccess();
    } catch {
      toast.error('삭제 실패');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-black text-slate-800">라벨 관리</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {labels.map(l => (
              <div key={l.id} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                <span className="flex-1 text-sm font-bold text-slate-700">{l.name}</span>
                <button onClick={() => handleDelete(l.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
          <form onSubmit={handleAdd} className="flex gap-2 pt-2 border-t border-slate-100">
            <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
              className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 shrink-0" />
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="새 라벨명"
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            <button type="submit" disabled={loading || !newName.trim()}
              className="px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 transition-colors disabled:opacity-40 shrink-0">
              <Plus size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────── 서식 상세 모달 ────────────────────────
function FormDetailModal({ form, onClose, onFavorite }) {
  const now = new Date();
  const isExpired = form.expires_at && new Date(form.expires_at) < now;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* 헤더 */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {form.is_pinned && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 text-[11px] font-medium rounded-full border border-amber-100">
                    <Pin size={10} /> 필수 서식
                  </span>
                )}
                {form.label && (
                  <span className="px-2 py-0.5 text-[11px] font-medium rounded-full"
                    style={{ backgroundColor: form.label.color + '18', color: form.label.color }}>
                    {form.label.name}
                  </span>
                )}
                {isExpired && (
                  <span className="px-2 py-0.5 bg-red-50 text-red-400 text-[11px] rounded-full border border-red-100">만료됨</span>
                )}
              </div>
              <h2 className="text-lg font-bold text-slate-800">{form.title}</h2>
            </div>
            <button onClick={onClose} className="shrink-0 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 본문 */}
        <div className="px-6 pb-6 space-y-4">
          {/* 설명 */}
          {form.description ? (
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">설명</p>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{form.description}</p>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl p-4 text-center text-sm text-slate-400">설명 없음</div>
          )}

          {/* 메타 정보 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 mb-1">현재 버전</p>
              <p className="text-sm font-semibold text-slate-700">
                {form.latest_version ? `v${form.latest_version.version_number}` : 'v1'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 mb-1">누적 다운로드</p>
              <p className="text-sm font-semibold text-slate-700">{form.download_count || 0}회</p>
            </div>
            {form.allowed_departments?.length > 0 && (
              <div className="col-span-2 bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] text-slate-400 mb-1.5 flex items-center gap-1">
                  <Building2 size={10} /> 공개 부서
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {form.allowed_departments.map(d => (
                    <span key={d} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[11px] rounded-full border border-blue-100">{d}</span>
                  ))}
                </div>
              </div>
            )}
            {form.expires_at && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] text-slate-400 mb-1 flex items-center gap-1"><Clock size={10} /> 유효기한</p>
                <p className={`text-sm font-semibold ${isExpired ? 'text-red-500' : 'text-slate-700'}`}>
                  {new Date(form.expires_at).toLocaleDateString('ko-KR')}
                </p>
              </div>
            )}
          </div>

          {/* 액션 버튼 */}
          <div className="flex items-center gap-2 pt-1">
            <button onClick={() => onFavorite(form.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm transition-colors
                ${form.is_favorite
                  ? 'border-amber-200 bg-amber-50 text-amber-600'
                  : 'border-slate-200 text-slate-500 hover:border-amber-200 hover:bg-amber-50'}`}>
              <Star size={14} fill={form.is_favorite ? 'currentColor' : 'none'} />
              {form.is_favorite ? '즐겨찾기 해제' : '즐겨찾기'}
            </button>
            <a href={`/api/forms/${form.id}/download`}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
              <Download size={14} /> 다운로드
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────── 활동 이력 모달 ────────────────────────
function ActivityModal({ form, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/forms/${form.id}/activity`)
      .then(r => r.json())
      .then(d => setLogs(d.logs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [form.id]);

  const ACTION_META = {
    download:       { label: '다운로드',    color: 'text-blue-500',   bg: 'bg-blue-50',   Icon: Download },
    edit:           { label: '정보 수정',   color: 'text-indigo-500', bg: 'bg-indigo-50', Icon: Edit2 },
    version_upload: { label: '버전 업로드', color: 'text-green-600',  bg: 'bg-green-50',  Icon: Upload },
    delete:         { label: '삭제',        color: 'text-red-500',    bg: 'bg-red-50',    Icon: Trash2 },
    create:         { label: '최초 등록',   color: 'text-slate-500',  bg: 'bg-slate-50',  Icon: Plus },
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '방금 전';
    if (mins < 60) return `${mins}분 전`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}시간 전`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}일 전`;
    return new Date(dateStr).toLocaleDateString('ko-KR');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList size={16} className="text-slate-400" /> 활동 이력
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{form.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-blue-500" size={22} />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">아직 활동 이력이 없습니다</div>
          ) : (
            <div className="space-y-1">
              {logs.map(log => {
                const meta = ACTION_META[log.action] || ACTION_META.edit;
                const { Icon } = meta;
                return (
                  <div key={log.id} className="flex gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${meta.bg}`}>
                      <Icon size={13} className={meta.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">{log.actor_name}</span>
                        {' · '}
                        <span className={meta.color}>{meta.label}</span>
                        {log.action === 'download' && log.detail?.version_number && (
                          <span className="text-slate-400"> (v{log.detail.version_number})</span>
                        )}
                        {log.action === 'version_upload' && (
                          <span className="text-slate-400"> → v{log.detail?.version_number}
                            {log.detail?.change_note ? ` · ${log.detail.change_note}` : ''}
                          </span>
                        )}
                        {log.action === 'create' && log.detail?.department && (
                          <span className="text-slate-400"> · {log.detail.department}</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{timeAgo(log.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────── 서식 행 ────────────────────────
const ROW_COLS = '28px 1fr 90px 50px 50px 72px';

function FormRow({ form, isAdmin, onFavorite, onEdit, onVersion, onDelete, onDetail, onActivity }) {
  const now = new Date();
  const isExpired = form.expires_at && new Date(form.expires_at) < now;
  const isExpiringSoon = form.expires_at && !isExpired &&
    (new Date(form.expires_at) - now) < 1000 * 60 * 60 * 24 * 14;

  return (
    <div
      className={`group flex items-center gap-3 px-3 py-2 mx-2 rounded-lg hover:bg-[#f1f3f4] transition-colors cursor-default ${isExpired ? 'opacity-50' : ''}`}
    >
      {/* 아이콘 */}
      <div style={{ width: 28, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
        {form.is_pinned
          ? <Pin size={15} className="text-amber-400" />
          : <FileText size={17} className="text-blue-400" />}
      </div>

      {/* 이름 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onDetail(form)}
            className="text-sm text-slate-800 truncate hover:text-blue-600 hover:underline text-left transition-colors">
            {form.title}
          </button>
          {isExpired && (
            <span className="shrink-0 px-1.5 py-0.5 bg-red-50 text-red-400 text-[10px] rounded font-medium">만료</span>
          )}
          {isExpiringSoon && (
            <span className="shrink-0 px-1.5 py-0.5 bg-orange-50 text-orange-400 text-[10px] rounded font-medium">임박</span>
          )}
        </div>
        {form.description && (
          <button onClick={() => onDetail(form)} className="text-xs text-slate-400 truncate leading-tight text-left hover:text-slate-600 w-full block">
            {form.description}
          </button>
        )}
      </div>

      {/* 분류 */}
      <div style={{ width: 90, flexShrink: 0 }}>
        {form.label ? (
          <span className="px-2 py-0.5 text-[11px] rounded-full font-medium"
            style={{ backgroundColor: form.label.color + '18', color: form.label.color }}>
            {form.label.name}
          </span>
        ) : <span className="text-slate-300 text-xs">—</span>}
      </div>

      {/* 버전 */}
      <div style={{ width: 50, flexShrink: 0 }} className="text-center text-xs text-slate-500">
        {form.latest_version ? `v${form.latest_version.version_number}` : 'v1'}
      </div>

      {/* 다운로드 */}
      <div style={{ width: 50, flexShrink: 0 }} className="text-center text-xs text-slate-400">
        {form.download_count || 0}
      </div>

      {/* 유효기한 */}
      <div style={{ width: 72, flexShrink: 0 }} className="text-center text-xs text-slate-400">
        {form.expires_at
          ? new Date(form.expires_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
          : '—'}
      </div>

      {/* 액션 */}
      <div className="flex items-center gap-0.5" style={{ width: isAdmin ? 196 : 88, flexShrink: 0 }}>
        <button onClick={() => onFavorite(form.id)}
          className={`p-1.5 rounded-full transition-colors
            ${form.is_favorite
              ? 'text-amber-400'
              : 'text-slate-300 opacity-0 group-hover:opacity-100 hover:text-amber-400 hover:bg-amber-50'}`}>
          <Star size={13} fill={form.is_favorite ? 'currentColor' : 'none'} />
        </button>
        <a href={`/api/forms/${form.id}/download`}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-medium transition-colors opacity-0 group-hover:opacity-100">
          <Download size={11} /> 받기
        </a>
        {isAdmin && (
          <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onActivity(form)} title="활동 이력"
              className="p-1.5 rounded-full text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors">
              <ClipboardList size={13} />
            </button>
            <button onClick={() => onVersion(form)} title="버전 관리"
              className="p-1.5 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
              <History size={13} />
            </button>
            <button onClick={() => onEdit(form)} title="수정"
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
              <Edit2 size={13} />
            </button>
            <button onClick={() => onDelete(form.id)} title="삭제"
              className="p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────── 메인 컴포넌트 ────────────────────────
export default function FormsClient() {
  const { employee, loading: authLoading } = useEmployee();

  const [forms, setForms] = useState([]);
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = useMemo(
    () => employee?.role === 'admin' || employee?.department === '관리부',
    [employee]
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [activeLabel, setActiveLabel] = useState('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const [showUpload, setShowUpload] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [versionTarget, setVersionTarget] = useState(null);
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [detailTarget, setDetailTarget] = useState(null);
  const [activityTarget, setActivityTarget] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [formsRes, labelsRes] = await Promise.all([
        fetch('/api/forms'),
        fetch('/api/form-labels'),
      ]);
      if (!formsRes.ok || !labelsRes.ok) { toast.error('데이터를 불러오지 못했습니다'); return; }
      const formsData = await formsRes.json();
      const labelsData = await labelsRes.json();
      setForms(formsData.forms || []);
      setLabels(labelsData.labels || []);
    } catch {
      toast.error('서버 연결에 실패했습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) fetchAll();
  }, [authLoading, fetchAll]);

  const handleFavorite = async (formId) => {
    const res = await fetch(`/api/forms/${formId}/favorite`, { method: 'POST' });
    const { is_favorite } = await res.json();
    setForms(prev => prev.map(f => f.id === formId ? { ...f, is_favorite } : f));
  };

  const handleDelete = async (formId) => {
    if (!confirm('이 서식을 삭제하시겠습니까? 모든 버전 파일이 함께 삭제됩니다.')) return;
    const res = await fetch(`/api/forms/${formId}`, { method: 'DELETE' });
    if (res.ok) { toast.success('삭제되었습니다'); setForms(prev => prev.filter(f => f.id !== formId)); }
  };

  const handleModalSuccess = () => {
    setShowUpload(false); setEditTarget(null); setVersionTarget(null); setShowLabelManager(false);
    fetchAll();
  };

  const handleFavoriteInDetail = async (formId) => {
    const res = await fetch(`/api/forms/${formId}/favorite`, { method: 'POST' });
    const { is_favorite } = await res.json();
    setForms(prev => prev.map(f => f.id === formId ? { ...f, is_favorite } : f));
    setDetailTarget(prev => prev ? { ...prev, is_favorite } : null);
  };

  const pinnedForms = useMemo(() => forms.filter(f => f.is_pinned), [forms]);

  const filteredForms = useMemo(() => forms.filter(f => {
    if (showFavoritesOnly && !f.is_favorite) return false;
    if (activeLabel === 'pinned') return f.is_pinned;
    if (activeLabel !== 'all' && f.label_id !== activeLabel) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return f.title.toLowerCase().includes(q) || f.description?.toLowerCase().includes(q);
    }
    return true;
  }), [forms, searchTerm, activeLabel, showFavoritesOnly]);

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <Loader2 className="animate-spin text-blue-600" size={28} />
      </div>
    );
  }

  const showPinned = pinnedForms.length > 0 && activeLabel === 'all' && !showFavoritesOnly && !searchTerm;
  const normalForms = showPinned
    ? filteredForms.filter(f => !f.is_pinned)
    : filteredForms;

  // 현재 선택된 라벨 이름
  const activeLabelName = showFavoritesOnly
    ? '즐겨찾기'
    : activeLabel === 'pinned'
    ? '필수 서식'
    : activeLabel === 'all'
    ? '내 서식함'
    : labels.find(l => l.id === activeLabel)?.name || '';

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Toaster position="bottom-right" />

      {/* ── 좌측 사이드바 ── */}
      <aside className="w-56 shrink-0 flex flex-col py-4 border-r border-slate-100 bg-white">
        {/* 로고 */}
        <div className="px-4 mb-4 flex items-center gap-2.5">
          <FolderOpen size={20} className="text-blue-600" />
          <span className="font-bold text-base text-slate-800">서식함</span>
        </div>

        {/* 등록 버튼 */}
        <div className="px-3 mb-4">
          <button onClick={() => { setEditTarget(null); setShowUpload(true); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus size={16} /> 서식 등록
          </button>
        </div>

        {/* 내비게이션 */}
        <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {/* 전체 */}
          <button
            onClick={() => { setActiveLabel('all'); setShowFavoritesOnly(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left
              ${activeLabel === 'all' && !showFavoritesOnly ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}>
            <FileText size={16} className={activeLabel === 'all' && !showFavoritesOnly ? 'text-blue-600' : 'text-slate-400'} />
            <span className="flex-1">전체</span>
            <span className="text-xs text-slate-400">{forms.length}</span>
          </button>

          {/* 즐겨찾기 */}
          <button
            onClick={() => { setShowFavoritesOnly(true); setActiveLabel('all'); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left
              ${showFavoritesOnly ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}>
            <Star size={16} className={showFavoritesOnly ? 'text-amber-400' : 'text-slate-400'}
              fill={showFavoritesOnly ? 'currentColor' : 'none'} />
            <span className="flex-1">즐겨찾기</span>
            <span className="text-xs text-slate-400">{forms.filter(f => f.is_favorite).length}</span>
          </button>

          {/* 필수 서식 */}
          {pinnedForms.length > 0 && (
            <button
              onClick={() => { setActiveLabel('pinned'); setShowFavoritesOnly(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left
                ${activeLabel === 'pinned' ? 'bg-amber-50 text-amber-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}>
              <Pin size={16} className={activeLabel === 'pinned' ? 'text-amber-500' : 'text-slate-400'} />
              <span className="flex-1">필수 서식</span>
              <span className="text-xs text-slate-400">{pinnedForms.length}</span>
            </button>
          )}

          {/* 라벨 구분선 */}
          {labels.length > 0 && (
            <div className="pt-3 pb-1 px-3">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">분류</span>
            </div>
          )}

          {/* 라벨 목록 */}
          {labels.map(l => {
            const count = forms.filter(f => f.label_id === l.id).length;
            const active = activeLabel === l.id && !showFavoritesOnly;
            return (
              <button key={l.id}
                onClick={() => { setActiveLabel(l.id); setShowFavoritesOnly(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left
                  ${active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}>
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                <span className="flex-1 truncate">{l.name}</span>
                <span className="text-xs text-slate-400">{count}</span>
              </button>
            );
          })}
        </nav>

        {/* 하단: 라벨 관리 + 사용자 */}
        <div className="px-2 mt-2 pt-3 border-t border-slate-100 space-y-1">
          {isAdmin && (
            <button onClick={() => setShowLabelManager(true)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-100 transition-colors">
              <Tag size={15} className="text-slate-400" />
              라벨 관리
            </button>
          )}
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 text-xs font-bold shrink-0">
              {employee?.full_name?.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-700 truncate">{employee?.full_name}</p>
              <p className="text-[10px] text-slate-400">{employee?.position}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── 우측 콘텐츠 ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* 상단 검색바 */}
        <header className="h-14 px-6 flex items-center gap-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 bg-[#f1f3f4] hover:bg-[#e8eaed] px-4 py-2 rounded-full w-96 focus-within:bg-white focus-within:shadow-md focus-within:ring-1 focus-within:ring-slate-200 transition-all">
            <Search size={15} className="text-slate-400 shrink-0" />
            <input type="text" placeholder="서식 검색"
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-slate-700 w-full placeholder:text-slate-400" />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>
        </header>

        {/* 제목 + 관리자 안내 */}
        <div className="px-6 pt-5 pb-2 shrink-0">
          <h1 className="text-lg font-medium text-slate-800 mb-3">{activeLabelName}</h1>

          {isAdmin && (
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-3">
              <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-white text-[9px] font-bold">i</span>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-blue-700">
                <span><History size={10} className="inline mr-1 text-blue-500" /><strong>버전 관리</strong> — 개정 파일을 새 버전으로 등록. 다운로드는 항상 최신 버전.</span>
                <span><Edit2 size={10} className="inline mr-1 text-blue-500" /><strong>수정</strong> — 서식명·등급·라벨 등 정보를 수정.</span>
                <span><Trash2 size={10} className="inline mr-1 text-red-400" /><strong className="text-red-500">삭제</strong> — 모든 버전 영구 삭제. 복구 불가.</span>
              </div>
            </div>
          )}
        </div>

        {/* 컬럼 헤더 */}
        <div className="flex items-center gap-3 px-5 pb-1.5 shrink-0">
          <div style={{ width: 28, flexShrink: 0 }} />
          <div className="flex-1 text-[11px] font-medium text-slate-400">이름</div>
          <div style={{ width: 90, flexShrink: 0 }} className="text-[11px] font-medium text-slate-400">분류</div>
          <div style={{ width: 50, flexShrink: 0 }} className="text-[11px] font-medium text-slate-400 text-center">버전</div>
          <div style={{ width: 50, flexShrink: 0 }} className="text-[11px] font-medium text-slate-400 text-center">다운</div>
          <div style={{ width: 72, flexShrink: 0 }} className="text-[11px] font-medium text-slate-400 text-center">유효기한</div>
          <div style={{ width: isAdmin ? 196 : 88, flexShrink: 0 }} className="text-[11px] font-medium text-slate-400">즐겨찾기</div>
        </div>
        <div className="mx-5 border-b border-slate-100 mb-1 shrink-0" />

        {/* 파일 목록 */}
        <div className="flex-1 overflow-y-auto pb-6">
          {showPinned && (
            <>
              <div className="flex items-center gap-2 px-5 py-2">
                <Pin size={11} className="text-amber-400" />
                <span className="text-[11px] font-medium text-amber-600">필수 서식</span>
              </div>
              {pinnedForms.map(form => (
                <FormRow key={form.id} form={form} isAdmin={isAdmin}
                  onFavorite={handleFavorite}
                  onEdit={f => { setEditTarget(f); setShowUpload(true); }}
                  onVersion={setVersionTarget}
                  onDelete={handleDelete}
                  onDetail={setDetailTarget}
                  onActivity={setActivityTarget} />
              ))}
              {normalForms.length > 0 && <div className="mx-5 my-2 border-b border-slate-100" />}
            </>
          )}

          {normalForms.length > 0
            ? normalForms.map(form => (
                <FormRow key={form.id} form={form} isAdmin={isAdmin}
                  onFavorite={handleFavorite}
                  onEdit={f => { setEditTarget(f); setShowUpload(true); }}
                  onVersion={setVersionTarget}
                  onDelete={handleDelete}
                  onDetail={setDetailTarget}
                  onActivity={setActivityTarget} />
              ))
            : !showPinned && (
                <div className="flex flex-col items-center justify-center h-52 text-center">
                  <FolderOpen size={40} className="text-slate-200 mb-3" />
                  <p className="text-sm text-slate-400">서식이 없습니다</p>
                  <button onClick={() => { setEditTarget(null); setShowUpload(true); }}
                    className="mt-3 flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                    <Plus size={14} /> 첫 서식 등록하기
                  </button>
                </div>
              )}
        </div>

        {/* 상태바 */}
        <div className="px-6 py-2 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400">전체 {forms.length}개 · 즐겨찾기 {forms.filter(f => f.is_favorite).length}개</span>
          <span className="text-xs text-slate-300">외부 유출 금지</span>
        </div>
      </div>

      {/* ── 모달들 ── */}
      {detailTarget && (
        <FormDetailModal form={detailTarget} onClose={() => setDetailTarget(null)} onFavorite={handleFavoriteInDetail} />
      )}
      {activityTarget && (
        <ActivityModal form={activityTarget} onClose={() => setActivityTarget(null)} />
      )}
      {showUpload && (
        <UploadModal labels={labels} editForm={editTarget} isAdmin={isAdmin}
          onClose={() => { setShowUpload(false); setEditTarget(null); }}
          onSuccess={handleModalSuccess} />
      )}
      {versionTarget && (
        <VersionModal form={versionTarget} onClose={() => setVersionTarget(null)} onSuccess={handleModalSuccess} />
      )}
      {showLabelManager && (
        <LabelManagerModal labels={labels} onClose={() => setShowLabelManager(false)} onSuccess={handleModalSuccess} />
      )}
    </div>
  );
}
