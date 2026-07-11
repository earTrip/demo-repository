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
 * 순서대로 진입을 판정하는 지오펜스 트래커.
 * 지점 간 반경이 20~55m로 서로 근접해 OS 지오펜스로는 겹침/오탐이 발생하므로,
 * "다음 순서 지점만 판정"으로 좁혀 정밀도를 확보한다 (역행 없음, 1회성 진입).
 *
 * triggerType별 조건 (큐시트 B-1 트리거 설계):
 * - "enter"(기본): 반경 진입 즉시 발동.
 * - "dwell": 반경 안에서 dwellSec(기본 3초) 체류 후 발동 — 밀집 지역(S3·S4) GPS 오차 오탐 방지.
 *   정지 상태에선 위치 이벤트가 안 올 수 있으므로, 호출부는 pendingDwellMs()로 남은 시간을 받아
 *   타이머로 같은 좌표를 재판정해야 한다.
 */
export function createGeofenceTracker(scenes) {
  const ordered = [...scenes].sort((a, b) => a.order - b.order);
  let nextIndex = 0;
  let dwellStartMs = null; // 다음 씬(dwell형) 반경 내 최초 진입 시각

  const dwellMsOf = (scene) =>
    scene.triggerType === 'dwell' ? (scene.dwellSec ?? DEFAULT_DWELL_SEC) * 1000 : 0;

  return {
    /** 현재 좌표를 넣으면 이번 호출에서 새로 진입(트리거 충족)한 씬들을 순서대로 반환 */
    update(lat, lng, nowMs = Date.now()) {
      const entered = [];
      while (nextIndex < ordered.length) {
        const scene = ordered[nextIndex];
        if (distanceM(lat, lng, scene.lat, scene.lng) > scene.radiusM) {
          dwellStartMs = null; // 반경 이탈 → 체류 시간 리셋
          break;
        }
        const dwellMs = dwellMsOf(scene);
        if (dwellMs > 0) {
          if (dwellStartMs == null) dwellStartMs = nowMs;
          if (nowMs - dwellStartMs < dwellMs) break; // 체류 시간 미충족 — 아직 대기
        }
        entered.push(scene);
        nextIndex += 1;
        dwellStartMs = null;
      }
      return entered;
    },

    /** dwell 대기 중이면 트리거까지 남은 ms, 아니면 null — 정지 상태 재판정 타이머용 */
    pendingDwellMs(nowMs = Date.now()) {
      if (dwellStartMs == null || nextIndex >= ordered.length) return null;
      return Math.max(0, dwellMsOf(ordered[nextIndex]) - (nowMs - dwellStartMs));
    },
  };
}
