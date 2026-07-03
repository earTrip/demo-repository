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

/**
 * 순서대로 진입을 판정하는 지오펜스 트래커.
 * 지점 간 반경이 20~55m로 서로 근접해 OS 지오펜스로는 겹침/오탐이 발생하므로,
 * "다음 순서 지점만 판정"으로 좁혀 정밀도를 확보한다 (역행 없음, 1회성 진입).
 */
export function createGeofenceTracker(scenes) {
  const ordered = [...scenes].sort((a, b) => a.order - b.order);
  let nextIndex = 0;

  return {
    /** 현재 좌표를 넣으면 이번 호출에서 새로 진입한 씬들을 순서대로 반환 */
    update(lat, lng) {
      const entered = [];
      while (nextIndex < ordered.length) {
        const scene = ordered[nextIndex];
        if (distanceM(lat, lng, scene.lat, scene.lng) > scene.radiusM) break;
        entered.push(scene);
        nextIndex += 1;
      }
      return entered;
    },
  };
}
