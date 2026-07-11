/**
 * 백엔드 없이도 스캐폴딩(재생 코어 + 지오펜스 + 백그라운드)을 검증하기 위한 로컬 목 데이터.
 * audioUrl은 실제 서버가 서빙할 경로 컨벤션만 표기 — 지금은 App.js의 데모 화면이
 * 이 URL로 다운로드하지 않고 assets/audio의 번들 파일을 직접 재생해 배선만 검증한다.
 * 실제 코스 데이터는 로그인/결제 연동 후 GET /api/courses/{id}에서 받아온다.
 */
export const MOCK_COURSE = {
  id: 1,
  title: '새벽, 자갈치',
  region: '자갈치',
  // triggerType/dwellSec/estimatedSec: 큐시트 B-1 트리거 설계 —
  // S3·S4는 59m 간격(S1↔S3 48m) 밀집 지역이라 3초 체류(dwell) 후 발동해 GPS 오탐을 막는다.
  scenes: [
    { sceneId: 1, order: 1, title: '자갈밭 위의 좌판', lat: 35.0972, lng: 129.0298, radiusM: 25, triggerType: 'enter', estimatedSec: 45, audioUrl: '/audio/s1.wav' },
    { sceneId: 2, order: 2, title: '삼경에 일어나는 사람들', lat: 35.0938, lng: 129.0272, radiusM: 30, triggerType: 'enter', estimatedSec: 60, audioUrl: '/audio/s2.wav' },
    { sceneId: 3, order: 3, title: '버려지던 것들', lat: 35.0968, lng: 129.0300, radiusM: 20, triggerType: 'dwell', dwellSec: 3, estimatedSec: 45, audioUrl: '/audio/s3.wav' },
    { sceneId: 4, order: 4, title: '오이소, 보이소', lat: 35.0966, lng: 129.0306, radiusM: 20, triggerType: 'dwell', dwellSec: 3, estimatedSec: 240, audioUrl: '/audio/s4.wav' },
    { sceneId: 5, order: 5, title: '다리가 열리던 시절', lat: 35.0975, lng: 129.0345, radiusM: 30, triggerType: 'enter', estimatedSec: 40, audioUrl: '/audio/s5.wav' },
  ],
};

/** sceneId -> 번들된 로컬 오디오 (require는 정적 경로만 허용되어 매핑 테이블로 나열) */
export const MOCK_LOCAL_AUDIO = {
  1: require('../../assets/audio/s1.wav'),
  2: require('../../assets/audio/s2.wav'),
  3: require('../../assets/audio/s3.wav'),
  4: require('../../assets/audio/s4.wav'),
  5: require('../../assets/audio/s5.wav'),
};
