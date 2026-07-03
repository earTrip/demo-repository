import { MOCK_COURSES, MOCK_COURSE_DETAIL } from "../data/mockCourses";
import { deviceId } from "../payment/paymentApi";

const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";
const FREE_ORDERS = [1, 2];

async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, {
      ...options,
      headers: { "X-Device-Id": deviceId(), ...options.headers },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn(`[courseApi] ${url} 실패 → mock 사용`, e.message);
    return null;
  }
}

export async function fetchCourses() {
  return (await safeFetch(`${BASE}/api/courses`)) ?? MOCK_COURSES;
}

/** 백엔드 미기동 시: 무료 씬 정책을 mock에도 동일 적용 */
export async function fetchCourse(id) {
  const server = await safeFetch(`${BASE}/api/courses/${id}`);
  if (server) return server;
  return {
    ...MOCK_COURSE_DETAIL,
    owned: false,
    scenes: MOCK_COURSE_DETAIL.scenes.map((s) => ({
      ...s,
      locked: !FREE_ORDERS.includes(s.order),
      audioUrl: FREE_ORDERS.includes(s.order) ? s.audioUrl : null,
    })),
  };
}

export async function postEvent(courseId, type, sceneId = null) {
  return safeFetch(`${BASE}/api/courses/${courseId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, sceneId, occurredAt: new Date().toISOString() }),
  });
}
