import { useEffect, useRef, useState, useCallback } from "react";
import { distanceM } from "../utils/geo";

/** 검증 게이트 (문서 7-1) */
export const GATE = { MAX_ERROR_M: 30, MAX_DELAY_S: 5 };

/**
 * 현장 보행 QA 세션.
 * - 진입 반경 도달 시 arrivalTs 자동 기록
 * - [재보정] → 설계좌표 vs 현재좌표 오차 자동 기록
 * - [오디오 시작됨] → 도착→재생 딜레이 자동 계산
 */
export function useQaSession(scenes) {
  const [active, setActive] = useState(false);
  const [pos, setPos] = useState(null); // { lat, lng, accuracy }
  const [records, setRecords] = useState({});
  const watchIdRef = useRef(null);
  const posRef = useRef(null);

  const patch = useCallback((sceneId, delta) => {
    setRecords((r) => ({ ...r, [sceneId]: { ...r[sceneId], ...delta } }));
  }, []);

  // 위치 구독 + 진입 시 arrivalTs 자동 기록
  useEffect(() => {
    if (!active) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (p) => {
        const cur = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy };
        posRef.current = cur;
        setPos(cur);
        setRecords((r) => {
          let changed = false;
          const next = { ...r };
          for (const s of scenes) {
            if (next[s.sceneId]?.arrivalTs) continue;
            if (distanceM(cur.lat, cur.lng, s.lat, s.lng) <= s.radiusM) {
              next[s.sceneId] = { ...next[s.sceneId], arrivalTs: Date.now() };
              changed = true;
            }
          }
          return changed ? next : r;
        });
      },
      (e) => console.warn("[QA] 위치 오류", e.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchIdRef.current);
  }, [active, scenes]);

  const start = () => { setRecords({}); setActive(true); };
  const stop = () => setActive(false);

  /** 📍 지금 위치로 재보정 → 오차 자동 기록 */
  const recalibrate = (scene) => {
    const cur = posRef.current;
    if (!cur) return;
    patch(scene.sceneId, {
      measuredLat: cur.lat,
      measuredLng: cur.lng,
      gpsAccuracy: Math.round(cur.accuracy),
      errorM: Math.round(distanceM(cur.lat, cur.lng, scene.lat, scene.lng)),
      arrivalTs: records[scene.sceneId]?.arrivalTs ?? Date.now(),
    });
  };

  /** 🔊 오디오 시작됨 → 딜레이 자동 기록 */
  const markAudioStarted = (sceneId) => {
    const arrival = records[sceneId]?.arrivalTs ?? Date.now();
    patch(sceneId, { audioStartTs: Date.now(), delayS: +((Date.now() - arrival) / 1000).toFixed(1) });
  };

  const setMemo = (sceneId, memo) => patch(sceneId, { memo });

  const isPass = (rec) =>
    rec?.errorM != null && rec?.delayS != null &&
    rec.errorM <= GATE.MAX_ERROR_M && rec.delayS <= GATE.MAX_DELAY_S;

  const passCount = scenes.filter((s) => isPass(records[s.sceneId])).length;

  const buildReport = () => ({
    course: "EP.01 새벽, 자갈치",
    date: new Date().toISOString(),
    gate: { ...GATE, passed: `${passCount}/${scenes.length}`, allPass: passCount === scenes.length },
    scenes: scenes.map((s) => {
      const r = records[s.sceneId] ?? {};
      return {
        scene: `S${s.order}`,
        title: s.title,
        design: { lat: s.lat, lng: s.lng, radiusM: s.radiusM },
        measured: r.measuredLat ? { lat: r.measuredLat, lng: r.measuredLng, gpsAccuracy: r.gpsAccuracy } : null,
        errorM: r.errorM ?? null,
        delayS: r.delayS ?? null,
        pass: isPass(r),
        memo: r.memo ?? "",
      };
    }),
  });

  const copyReport = async () => {
    await navigator.clipboard.writeText(JSON.stringify(buildReport(), null, 2));
  };

  return { active, pos, records, passCount, start, stop, recalibrate, markAudioStarted, setMemo, isPass, copyReport };
}
