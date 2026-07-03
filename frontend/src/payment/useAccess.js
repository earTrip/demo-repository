import { useEffect, useState, useCallback } from "react";
import { fetchAccess } from "./paymentApi";

/**
 * 프리미엄 게이트.
 * canPlayScene(order): 무료 씬(1~2) 또는 구매자만 true.
 * useGeofencePlayer에서 씬 진입 시 이 값으로 재생/페이월 분기.
 */
export function useAccess(courseId) {
  const [access, setAccess] = useState({ hasAccess: false, freeSceneOrders: [1, 2] });
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(() => {
    fetchAccess(courseId)
      .then(setAccess)
      .catch(() => {}) // 백엔드 미기동 시 무료 씬만 허용
      .finally(() => setLoaded(true));
  }, [courseId]);

  useEffect(() => { reload(); }, [reload]);

  const canPlayScene = (sceneOrder) =>
    access.hasAccess || access.freeSceneOrders.includes(sceneOrder);

  return { ...access, loaded, canPlayScene, reload };
}
