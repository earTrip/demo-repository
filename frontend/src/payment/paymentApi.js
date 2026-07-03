const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";

/** MVP 사용자 식별: 기기 UUID (회원 도입 시 JWT로 교체) */
export function deviceId() {
  let id = localStorage.getItem("et.deviceId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("et.deviceId", id);
  }
  return id;
}

async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Device-Id": deviceId(),
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** 주문 생성 → { orderId, orderName, amount } */
export const checkout = (productCode) =>
  api("/api/checkout", { method: "POST", body: JSON.stringify({ productCode }) });

/** successUrl 콜백 → 서버 승인 */
export const confirmPayment = (paymentKey, orderId, amount) =>
  api("/api/payments/confirm", {
    method: "POST",
    body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
  });

/** 코스 접근 판정 → { hasAccess, freeSceneOrders } */
export const fetchAccess = (courseId) => api(`/api/courses/${courseId}/access`);

export const fetchMyCourses = () => api("/api/me/courses");
