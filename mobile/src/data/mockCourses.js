/** 백엔드 미기동/미인증 시 홈 목록 폴백 (웹 data/mockCourses.js와 동일 데이터) */
// EP.02~04는 대본 v1 완성 단계(각 지역 대본 문서 참조) — 녹음·좌표 재보정 전이라 씬 데이터는 미배선.
export const MOCK_COURSES = [
  { id: 1, no: 1, title: '자갈치 시장', subtitle: '새벽, 자갈치 · EP.01', region: '자갈치', durationMin: 28, distanceKm: 1.1, sceneCount: 5, thumb: 'market' },
  { id: 2, no: 2, title: '광안리 밤바다', subtitle: '밤의 다리, 광안리 · EP.02(대본)', region: '광안리', durationMin: 30, distanceKm: 1.4, sceneCount: 5, thumb: 'bridge' },
  { id: 3, no: 3, title: '흰여울 마을', subtitle: '흰여울, 절벽 위의 방 · EP.03(대본)', region: '영도', durationMin: 20, distanceKm: 0.5, sceneCount: 5, thumb: 'beach' },
  { id: 4, no: 4, title: '보수동 책방골목', subtitle: '헌책 냄새, 보수동 · EP.04(대본)', region: '보수동', durationMin: 25, distanceKm: 0.5, sceneCount: 5, thumb: 'market' },
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
