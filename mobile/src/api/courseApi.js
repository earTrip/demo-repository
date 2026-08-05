import { Platform } from 'react-native';

import { useAuthSession } from '../auth/useAuthSession';
import { MOCK_COURSES } from '../data/mockCourses';

/**
 * 개발용 기본 주소. 안드로이드 에뮬레이터에서 localhost는 '에뮬레이터 자신'이라
 * 호스트 PC의 백엔드에 절대 닿지 않는다 — 10.0.2.2가 에뮬레이터가 보는 호스트 루프백이다.
 * 웹·iOS 시뮬레이터는 호스트와 같은 네트워크 스택이라 localhost가 맞다.
 *
 * 실기기는 둘 다 틀리다(기기 자신을 가리킴). 같은 와이파이의 PC LAN IP를
 * EXPO_PUBLIC_API_BASE로 넘길 것 — 예: EXPO_PUBLIC_API_BASE=http://192.168.0.10:8080
 */
const DEV_BASE = Platform.select({
  android: 'http://10.0.2.2:8080',
  default: 'http://localhost:8080',
});

const BASE = process.env.EXPO_PUBLIC_API_BASE ?? DEV_BASE;

// 백엔드가 Supabase JWT를 요구함(SecurityConfig.java 참고). Supabase 프로젝트가 아직
// 없으면 useAuthSession.init()이 세션 없이 fail-open하므로 토큰 없이 호출 → 401.
/**
 * 폴백은 "실패했을 때"가 아니라 "제때 응답이 없을 때"도 돌아야 한다.
 * 닿을 수 없는 주소(예: 실기기에서의 10.0.2.2)는 연결 거부가 아니라 TCP 타임아웃까지
 * 매달리는데, 그동안 fetch는 reject하지 않는다 — 화면은 빈 목록인 채로 몇 분을 서 있고
 * 에러도 안 난다. 짧은 타임아웃을 걸어 폴백이 즉시 돌게 한다.
 */
const TIMEOUT_MS = 5000;

async function api(path, options = {}) {
  const token = useAuthSession.getState().getAccessToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** GET /api/courses는 공개 엔드포인트라 인증 없이도 뜨지만, 백엔드 자체가 안 뜬 경우 목 데이터로 폴백 */
export const fetchCourses = (region) =>
  api(`/api/courses${region ? `?region=${encodeURIComponent(region)}` : ''}`).catch(() => MOCK_COURSES);

export const fetchCourse = (id) => api(`/api/courses/${id}`);

export const postEvent = (courseId, payload) =>
  api(`/api/courses/${courseId}/events`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
