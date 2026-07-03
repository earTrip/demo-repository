/** 통합작업문서 7-2. 자갈치 5지점 설계 좌표 (재보정 전) */
export const JAGALCHI_SCENES = [
  { sceneId: 1, order: 1, title: "자갈밭 위의 좌판",    lat: 35.0972, lng: 129.0298, radiusM: 25, audioUrl: "/audio/ep01_s1.mp3" },
  { sceneId: 2, order: 2, title: "삼경에 일어나는 사람들", lat: 35.0938, lng: 129.0272, radiusM: 30, audioUrl: "/audio/ep01_s2.mp3" },
  { sceneId: 3, order: 3, title: "버려지던 것들",       lat: 35.0968, lng: 129.0300, radiusM: 20, audioUrl: "/audio/ep01_s3.mp3" },
  { sceneId: 4, order: 4, title: "오이소, 보이소 ⭐",   lat: 35.0966, lng: 129.0306, radiusM: 20, audioUrl: "/audio/ep01_s4.mp3" },
  { sceneId: 5, order: 5, title: "다리가 열리던 시절",   lat: 35.0975, lng: 129.0345, radiusM: 30, audioUrl: "/audio/ep01_s5.mp3" },
];

export const MOCK_COURSES = [
  { id: 1, no: 1, title: "자갈치 시장",  subtitle: "새벽, 자갈치 · EP.01", region: "자갈치", durationMin: 28, distanceKm: 1.1, sceneCount: 5, thumb: "market" },
  { id: 2, no: 2, title: "광안대교",    subtitle: "광안리 · EP.02(예정)",  region: "광안리", durationMin: 35, distanceKm: 1.4, sceneCount: 4, thumb: "bridge" },
  { id: 3, no: 3, title: "광안리 해변", subtitle: "부산 · EP.03(예정)",    region: "광안리", durationMin: 40, distanceKm: 2.0, sceneCount: 5, thumb: "beach"  },
];

export const MOCK_COURSE_DETAIL = {
  id: 1,
  title: "새벽, 자갈치",
  region: "자갈치",
  durationMin: 28,
  distanceKm: 1.1,
  scenes: JAGALCHI_SCENES,
};

export const MOCK_SCHEDULE = [
  { id: 1, time: "오전", title: "자갈치 시장", meta: "서면 · 1.8km", thumb: "market" },
  { id: 2, time: "오후", title: "광안리",     meta: "부산 · 3.4km", thumb: "beach"  },
  { id: 3, time: "저녁", title: "광안대교",   meta: "광안 · 2.1km", thumb: "bridge" },
];

export const REGIONS = [
  { key: "busan",    label: "부산",   icon: "pin" },
  { key: "seomyeon", label: "서면",   icon: "city" },
  { key: "jagalchi", label: "자갈치", icon: "fish" },
  { key: "gwangan",  label: "광안리", icon: "bridge" },
  { key: "more",     label: "지역",   icon: "dots" },
];
