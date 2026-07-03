/** 백엔드 미기동/미인증 시 홈 목록 폴백 (웹 data/mockCourses.js와 동일 데이터) */
export const MOCK_COURSES = [
  { id: 1, no: 1, title: '자갈치 시장', subtitle: '새벽, 자갈치 · EP.01', region: '자갈치', durationMin: 28, distanceKm: 1.1, sceneCount: 5, thumb: 'market' },
  { id: 2, no: 2, title: '광안대교', subtitle: '광안리 · EP.02(예정)', region: '광안리', durationMin: 35, distanceKm: 1.4, sceneCount: 4, thumb: 'bridge' },
  { id: 3, no: 3, title: '광안리 해변', subtitle: '부산 · EP.03(예정)', region: '광안리', durationMin: 40, distanceKm: 2.0, sceneCount: 5, thumb: 'beach' },
];

export const MOCK_SCHEDULE = [
  { id: 1, time: '오전', title: '자갈치 시장', meta: '서면 · 1.8km', thumb: 'market' },
  { id: 2, time: '오후', title: '광안리', meta: '부산 · 3.4km', thumb: 'beach' },
  { id: 3, time: '저녁', title: '광안대교', meta: '광안 · 2.1km', thumb: 'bridge' },
];

export const REGIONS = [
  { key: 'busan', label: '부산', icon: '📍' },
  { key: 'seomyeon', label: '서면', icon: '🏢' },
  { key: 'jagalchi', label: '자갈치', icon: '🐟' },
  { key: 'gwangan', label: '광안리', icon: '🌉' },
  { key: 'more', label: '지역', icon: '🧭' },
];
