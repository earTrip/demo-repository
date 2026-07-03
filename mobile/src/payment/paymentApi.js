import { useAuthSession } from '../auth/useAuthSession';

const BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8080';

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

/** 주문 생성 → { orderId, orderName, amount } */
export const checkout = (productCode) =>
  api('/api/checkout', { method: 'POST', body: JSON.stringify({ productCode }) });

/** successUrl 콜백 → 서버 승인 */
export const confirmPayment = (paymentKey, orderId, amount) =>
  api('/api/payments/confirm', {
    method: 'POST',
    body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
  });

/** 코스 접근 판정 → { hasAccess, freeSceneOrders } */
export const fetchAccess = (courseId) => api(`/api/courses/${courseId}/access`);

export const fetchMyCourses = () => api('/api/me/courses');
