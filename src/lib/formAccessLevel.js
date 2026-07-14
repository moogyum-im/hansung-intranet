// 직급 → 최소 접근 가능 등급 매핑
// 서식의 access_level >= 이 값이어야 열람 가능
export const POSITION_MIN_LEVEL = {
  '사원': 5,
  '주임': 4,
  '대리': 4,
  '과장': 3,
  '차장': 2,
  '부장': 2,
  '이사': 1,
  '대표': 1,
  '회장': 1,
};

export const ACCESS_LEVEL_LABELS = {
  1: '임원 전용',
  2: '부장 이상',
  3: '과장 이상',
  4: '주임 이상',
  5: '전직원',
};

export const ACCESS_LEVEL_COLORS = {
  1: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  2: { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' },
  3: { bg: '#fefce8', text: '#ca8a04', border: '#fef08a' },
  4: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  5: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
};

export function getUserMinLevel(profile) {
  if (!profile) return 5;
  if (profile.role === 'admin' || profile.department === '관리부') return 1;
  return POSITION_MIN_LEVEL[profile.position] || 5;
}

export function canAccessForm(form, profile) {
  const userMinLevel = getUserMinLevel(profile);
  if (form.access_level < userMinLevel) return false;
  if (form.allowed_departments && form.allowed_departments.length > 0) {
    return form.allowed_departments.includes(profile.department);
  }
  return true;
}

export function isAdmin(profile) {
  return profile?.role === 'admin' || profile?.department === '관리부';
}
