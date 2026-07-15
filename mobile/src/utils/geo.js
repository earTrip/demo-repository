/** Haversine 거리 (m) */
export function distanceM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const DEFAULT_DWELL_SEC = 3;

/**
 * 히스테리시스 지오펜스 트래커 (frontend/src/utils/geo.js와 동일 계약 — 함께 수정할 것).
 * - 진입 반경(radiusM)과 이탈 반경(exitM)을 분리해 GPS 튐(jitter)에 강함
 * - accuracy 게이트: 정확도가 나쁜 좌표(기본 50m 초과)는 판정에서 제외
 * - 연속 판정(minHits): 단발성 튐으로 인한 오진입 방지 (기본 1 = 즉시)
 *
 * triggerType별 조건 (큐시트 B-1 트리거 설계 — 히스테리시스와 직교):
 * - "enter"(기본): 반경 진입 즉시 발동.
 * - "dwell": 반경 안에서 dwellSec(기본 3초) 체류 후 발동 — 밀집 지역(S3·S4) GPS 오차 오탐 방지.
 *   정지 상태에선 위치 이벤트가 안 올 수 있으므로, 호출부는 pendingDwellMs()로 남은 시간을 받아
 *   타이머로 같은 좌표를 재판정해야 한다.
 *
 * 씬 데이터 계약: { sceneId, order, lat, lng, radiusM, triggerType?, dwellSec? }
 */
export function createGeofenceTracker(scenes, opts = {}) {
  const {
    exitFactor = 1.5, // 이탈 반경 = max(radiusM * 1.5, radiusM + minExitGapM)
    minExitGapM = 10,
    maxAccuracyM = 50, // 이보다 부정확한 fix는 무시
    minHits = 1, // 연속 N회 반경 내 판정 시 진입 확정
  } = opts;

  const inside = new Set(); // 진입 상태인 sceneId
  const hitCount = new Map(); // sceneId -> 연속 반경 내 횟수
  const dwellStart = new Map(); // sceneId -> 반경 내 최초 진입 시각

  const exitRadius = (s) => Math.max(s.radiusM * exitFactor, s.radiusM + minExitGapM);

  const dwellMsOf = (s) =>
    s.triggerType === 'dwell' ? (s.dwellSec ?? DEFAULT_DWELL_SEC) * 1000 : 0;

  const forget = (sceneId) => {
    hitCount.delete(sceneId);
    dwellStart.delete(sceneId);
  };

  return {
    /**
     * 위치 갱신. 새로 '진입 확정'된 씬 배열을 order 오름차순으로 반환.
     * @param {number} lat
     * @param {number} lng
     * @param {number} [accuracyM] 위치 fix의 정확도 (선택)
     * @param {number} [nowMs] dwell 판정 기준 시각
     */
    update(lat, lng, accuracyM, nowMs = Date.now()) {
      if (accuracyM != null && accuracyM > maxAccuracyM) return [];

      const entered = [];
      for (const s of scenes) {
        const d = distanceM(lat, lng, s.lat, s.lng);

        if (inside.has(s.sceneId)) {
          if (d > exitRadius(s)) {
            inside.delete(s.sceneId); // 이탈 → 재진입 허용
            forget(s.sceneId);
          }
          continue;
        }

        if (d > s.radiusM) {
          forget(s.sceneId); // 연속성 끊김 — 히트·체류 모두 리셋
          continue;
        }

        const hits = (hitCount.get(s.sceneId) ?? 0) + 1;
        hitCount.set(s.sceneId, hits);
        if (hits < minHits) continue;

        const dwellMs = dwellMsOf(s);
        if (dwellMs > 0) {
          if (!dwellStart.has(s.sceneId)) dwellStart.set(s.sceneId, nowMs);
          if (nowMs - dwellStart.get(s.sceneId) < dwellMs) continue; // 체류 미충족 — 대기
        }

        inside.add(s.sceneId);
        forget(s.sceneId);
        entered.push(s);
      }
      // 동시 진입 시 스토리 순서 보장
      return entered.sort((a, b) => a.order - b.order);
    },

    /** dwell 대기 중이면 트리거까지 남은 ms(가장 임박한 씬 기준), 아니면 null */
    pendingDwellMs(nowMs = Date.now()) {
      let min = null;
      for (const [sceneId, startedAt] of dwellStart) {
        const scene = scenes.find((s) => s.sceneId === sceneId);
        if (!scene) continue;
        const remain = Math.max(0, dwellMsOf(scene) - (nowMs - startedAt));
        if (min == null || remain < min) min = remain;
      }
      return min;
    },

    isInside(sceneId) {
      return inside.has(sceneId);
    },
  };
}
