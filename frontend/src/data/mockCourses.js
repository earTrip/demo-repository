/**
 * 통합작업문서 7-2. 자갈치 5지점 설계 좌표 (재보정 전)
 * triggerType/dwellSec/estimatedSec: 큐시트 B-1 트리거 설계 —
 * S3·S4는 59m 간격(S1↔S3 48m) 밀집 지역이라 3초 체류(dwell) 후 발동해 GPS 오탐을 막는다.
 */
export const JAGALCHI_SCENES = [
  { sceneId: 1, order: 1, title: "자갈밭 위의 좌판",    lat: 35.0972, lng: 129.0298, radiusM: 25, triggerType: "enter",             estimatedSec: 45,  audioUrl: "/audio/ep01_s1.mp3" },
  { sceneId: 2, order: 2, title: "삼경에 일어나는 사람들", lat: 35.0938, lng: 129.0272, radiusM: 30, triggerType: "enter",             estimatedSec: 60,  audioUrl: "/audio/ep01_s2.mp3" },
  { sceneId: 3, order: 3, title: "버려지던 것들",       lat: 35.0968, lng: 129.0300, radiusM: 20, triggerType: "dwell", dwellSec: 3, estimatedSec: 45,  audioUrl: "/audio/ep01_s3.mp3" },
  { sceneId: 4, order: 4, title: "오이소, 보이소 ⭐",   lat: 35.0966, lng: 129.0306, radiusM: 20, triggerType: "dwell", dwellSec: 3, estimatedSec: 240, audioUrl: "/audio/ep01_s4.mp3" },
  { sceneId: 5, order: 5, title: "다리가 열리던 시절",   lat: 35.0975, lng: 129.0345, radiusM: 30, triggerType: "enter",             estimatedSec: 40,  audioUrl: "/audio/ep01_s5.mp3" },
];

// EP.02~04는 대본 v1 완성 단계(각 지역 대본 문서 참조) — 녹음·좌표 재보정 전이라 씬 데이터는 미배선.
export const MOCK_COURSES = [
  { id: 1, no: 1, title: "자갈치 시장",     subtitle: "새벽, 자갈치 · EP.01",        region: "자갈치", durationMin: 28, distanceKm: 1.1, sceneCount: 5, thumb: "market" },
  { id: 2, no: 2, title: "광안리 밤바다",   subtitle: "밤의 다리, 광안리 · EP.02(대본)", region: "광안리", durationMin: 30, distanceKm: 1.4, sceneCount: 5, thumb: "bridge" },
  { id: 3, no: 3, title: "흰여울 마을",     subtitle: "흰여울, 절벽 위의 방 · EP.03(대본)", region: "영도",  durationMin: 20, distanceKm: 0.5, sceneCount: 5, thumb: "beach"  },
  { id: 4, no: 4, title: "보수동 책방골목", subtitle: "헌책 냄새, 보수동 · EP.04(대본)",   region: "보수동", durationMin: 25, distanceKm: 0.5, sceneCount: 5, thumb: "market" },
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
