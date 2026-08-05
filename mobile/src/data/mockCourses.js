/**
 * 코스 hero 키 → 번들 실사진 (require는 정적 경로만 허용되어 매핑 테이블로 나열).
 * 저작권 프리 사진만 등재. 홈 카드 썸네일과 상세 화면 히어로가 공유한다.
 */
export const HERO_IMAGES = {
  haeundae: require('../../assets/images/haeundae.jpg'),
  jagalchi: require('../../assets/images/jagalchi.jpg'),
  gwangalli: require('../../assets/images/gwangalli.jpg'),
  huinyeoul: require('../../assets/images/huinyeoul.jpg'),
  bosudong: require('../../assets/images/bosudong.jpg'),
  seomyeon: require('../../assets/images/seomyeon.jpg'),
};

/** 백엔드 미기동/미인증 시 홈 목록 폴백 (웹 data/mockCourses.js와 동일 데이터) */
// EP.02~04는 대본 v1 완성 단계(각 지역 대본 문서 참조) — 녹음·좌표 재보정 전이라 씬 데이터는 미배선.
// tags/description: 코스 상세 화면(해운대.png 스타일)용 소개 텍스트. 실제 카피가 생기면 대체.
export const MOCK_COURSES = [
  { id: 1, no: 1, title: '자갈치 시장', subtitle: '새벽, 자갈치 · EP.01', region: '자갈치', durationMin: 28, distanceKm: 1.1, sceneCount: 5, thumb: 'market', hero: 'jagalchi',
    tags: ['부산', '중구', '자갈치', '자갈치시장', '수산시장'],
    description: '부산에서 시장이라고 하면 가장 먼저 떠오르는 이름, 바로 자갈치 시장입니다. 새벽 세 시, 남들이 가장 깊이 잠든 시간에 하루를 여는 사람들의 이야기를 따라 걷습니다.\n\n파도에 닳아 동글동글해진 자갈이 깔려 있던 자리에 좌판을 펴면서 시작된 이름 "자갈치". 다섯 개의 지점을 지나며 시장의 백 년을 귀로 듣는 코스입니다.' },
  { id: 2, no: 2, title: '광안리 밤바다', subtitle: '밤의 다리, 광안리 · EP.02(대본)', region: '광안리', durationMin: 30, distanceKm: 1.4, sceneCount: 5, thumb: 'bridge', hero: 'gwangalli',
    tags: ['부산', '수영구', '광안리', '광안대교', '밤바다'],
    description: '광안대교의 불빛이 바다 위로 부서지는 밤, 광안리를 걷습니다. 다리가 놓이기 전과 후, 이 바다가 품어 온 이야기를 들려드립니다.\n\n(대본 v1 완성 · 녹음 및 좌표 재보정 준비 중)' },
  { id: 3, no: 3, title: '흰여울 마을', subtitle: '흰여울, 절벽 위의 방 · EP.03(대본)', region: '영도', durationMin: 20, distanceKm: 0.5, sceneCount: 5, thumb: 'beach', hero: 'huinyeoul',
    tags: ['부산', '영도구', '흰여울', '흰여울문화마을', '절영해안'],
    description: '절벽 위에 아슬아슬하게 붙은 방들, 흰여울 마을. 피란의 시절부터 이어져 온 삶의 결을 좁은 골목을 따라 더듬어 갑니다.\n\n(대본 v1 완성 · 녹음 및 좌표 재보정 준비 중)' },
  { id: 4, no: 4, title: '보수동 책방골목', subtitle: '헌책 냄새, 보수동 · EP.04(대본)', region: '보수동', durationMin: 25, distanceKm: 0.5, sceneCount: 5, thumb: 'market', hero: 'bosudong',
    tags: ['부산', '중구', '보수동', '책방골목', '헌책방'],
    description: '헌책 냄새가 골목을 가득 채우는 보수동 책방골목. 한 권의 책이 여러 사람의 손을 거쳐 온 시간을, 책방 주인들의 목소리로 만납니다.\n\n(대본 v1 완성 · 녹음 및 좌표 재보정 준비 중)' },
  { id: 5, no: 5, title: '해운대 해수욕장', subtitle: '여름, 해운대 · 준비 중', region: '해운대', durationMin: 26, distanceKm: 1.2, sceneCount: 5, thumb: 'beach', hero: 'haeundae',
    tags: ['부산', '부산광역시', '해운대구', '해운대', '해운대해수욕장'],
    description: '부산에서 해수욕장이라고 하면 가장 먼저 떠오르는 이름, 해운대입니다. 파라솔이 끝없이 늘어선 백사장과 뒤로 솟은 마천루가 한 장면에 담기는 곳이죠.\n\n너른 모래밭을 걸으며 파도 소리에 실린 이야기를 듣는 코스로 준비하고 있습니다.\n\n(대본 준비 중 · 녹음 및 좌표 배선 전)' },
  { id: 6, no: 6, title: '서면 번화가', subtitle: '골목마다 불빛, 서면 · 준비 중', region: '서면', durationMin: 24, distanceKm: 1.0, sceneCount: 5, thumb: 'market', hero: 'seomyeon',
    tags: ['부산', '부산진구', '서면', '서면번화가', '먹자골목'],
    description: '간판 불빛이 골목을 가득 메우는 부산의 한복판, 서면입니다. 낮과 밤의 표정이 가장 다른 동네죠.\n\n먹자골목과 지하상가, 사람 물결을 따라 걸으며 도시의 리듬을 듣는 코스로 준비하고 있습니다.\n\n(대본 준비 중 · 녹음 및 좌표 배선 전)' },
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
