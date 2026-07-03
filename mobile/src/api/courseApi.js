import { useAuthSession } from '../auth/useAuthSession';
import { MOCK_COURSES } from '../data/mockCourses';

const BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8080';

// 백엔드가 Supabase JWT를 요구함(SecurityConfig.java 참고). Supabase 프로젝트가 아직
// 없으면 useAuthSession.init()이 세션 없이 fail-open하므로 토큰 없이 호출 → 401.
async function api(path, options = {}) {
  const token = useAuthSession.getState().getAccessToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
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
