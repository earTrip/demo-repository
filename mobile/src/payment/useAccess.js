import { useEffect, useState, useCallback } from 'react';
import { fetchAccess } from './paymentApi';
import { supabase } from '../auth/supabaseClient';

/**
 * 프리미엄 게이트. canPlayScene(order): 무료 씬(1~2) 또는 구매자만 true.
 * 익명→카카오 연동 완료 시점에도 자동 reload되어, 다른 기기에서 이미 산
 * 구매 내역을 즉시 반영한다 (계획서 3.2절 — Supabase Auth 도입의 실질적 이득).
 */
export function useAccess(courseId) {
  const [access, setAccess] = useState({ hasAccess: false, freeSceneOrders: [1, 2] });
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(() => {
    fetchAccess(courseId)
      .then(setAccess)
      .catch(() => {}) // 백엔드 미기동/미인증 시 무료 씬만 허용 (fail-open)
      .finally(() => setLoaded(true));
  }, [courseId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => reload());
    return () => sub.subscription.unsubscribe();
  }, [reload]);

  const canPlayScene = (sceneOrder) =>
    access.hasAccess || access.freeSceneOrders.includes(sceneOrder);

  return { ...access, loaded, canPlayScene, reload };
}
