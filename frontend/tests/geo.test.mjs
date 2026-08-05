// 실행: node --test frontend/tests/  (별도 프레임워크 불필요)
import test from "node:test";
import assert from "node:assert/strict";
import { distanceM, createGeofenceTracker } from "../src/utils/geo.js";

// 자갈치 씬1 좌표 기준. 위도 1도 ≈ 111,320m → 1m ≈ 8.98e-6도
const S1 = { sceneId: 1, order: 1, lat: 35.0972, lng: 129.0298, radiusM: 25 };
const S4 = { sceneId: 4, order: 4, lat: 35.0966, lng: 129.0306, radiusM: 20 };
const mLat = (m) => m / 111_320;

test("distanceM: 자갈치 씬1↔씬4 ≈ 95m", () => {
  const d = distanceM(S1.lat, S1.lng, S4.lat, S4.lng);
  assert.ok(Math.abs(d - 95) < 20, `expected ~95m, got ${d}`);
});

test("진입 반경 안이면 1회 진입 이벤트", () => {
  const t = createGeofenceTracker([S1]);
  const entered = t.update(S1.lat + mLat(10), S1.lng); // 중심에서 10m
  assert.equal(entered.length, 1);
  assert.equal(entered[0].sceneId, 1);
  // 같은 위치 재호출 → 중복 진입 없음
  assert.equal(t.update(S1.lat + mLat(10), S1.lng).length, 0);
});

test("히스테리시스: 진입반경 밖·이탈반경 안에서는 이탈하지 않는다", () => {
  const t = createGeofenceTracker([S1]); // enter 25m, exit max(37.5, 35)=37.5m
  t.update(S1.lat, S1.lng);              // 진입
  t.update(S1.lat + mLat(30), S1.lng);   // 30m: 진입반경 밖이지만 이탈반경 안
  assert.ok(t.isInside(1), "30m에서 이탈하면 안 됨 (GPS 튐 방지)");
  t.update(S1.lat + mLat(40), S1.lng);   // 40m: 이탈 확정
  assert.ok(!t.isInside(1));
  // 재진입 허용
  assert.equal(t.update(S1.lat, S1.lng).length, 1);
});

test("accuracy 게이트: 부정확한 fix(>50m)는 무시", () => {
  const t = createGeofenceTracker([S1]);
  assert.equal(t.update(S1.lat, S1.lng, 80).length, 0);  // accuracy 80m → 무시
  assert.equal(t.update(S1.lat, S1.lng, 15).length, 1);  // 정상 fix → 진입
});

test("minHits: 연속 판정 요구 시 단발 튐으로 진입하지 않는다", () => {
  const t = createGeofenceTracker([S1], { minHits: 2 });
  assert.equal(t.update(S1.lat, S1.lng).length, 0);          // 1회째
  assert.equal(t.update(S1.lat + mLat(100), S1.lng).length, 0); // 이탈 → 카운트 리셋
  assert.equal(t.update(S1.lat, S1.lng).length, 0);          // 다시 1회째
  assert.equal(t.update(S1.lat, S1.lng).length, 1);          // 2연속 → 진입
});

test("동시 진입 시 order 오름차순 반환", () => {
  const A = { sceneId: 9, order: 3, lat: 35.1, lng: 129.0, radiusM: 500 };
  const B = { sceneId: 8, order: 1, lat: 35.1, lng: 129.0, radiusM: 500 };
  const t = createGeofenceTracker([A, B]);
  const entered = t.update(35.1, 129.0);
  assert.deepEqual(entered.map((s) => s.order), [1, 3]);
});

// --- 큐시트 B-1 dwell 트리거: 히스테리시스와 직교하게 유지되어야 함 ---

const D1 = { sceneId: 3, order: 3, lat: 35.0972, lng: 129.0298, radiusM: 25, triggerType: "dwell", dwellSec: 3 };

test("dwell: 체류 시간 미충족이면 반경 안이어도 발동하지 않는다", () => {
  const t = createGeofenceTracker([D1]);
  const t0 = 1_000_000;
  assert.equal(t.update(D1.lat, D1.lng, 10, t0).length, 0);
  assert.equal(t.update(D1.lat, D1.lng, 10, t0 + 2_999).length, 0);
  assert.equal(t.update(D1.lat, D1.lng, 10, t0 + 3_001).length, 1); // 3초 체류 충족
});

test("dwell: 체류 중 반경을 벗어나면 타이머가 리셋된다 (통과만 한 보행자는 발동 안 함)", () => {
  const t = createGeofenceTracker([D1]);
  const t0 = 1_000_000;
  t.update(D1.lat, D1.lng, 10, t0);
  t.update(D1.lat + mLat(100), D1.lng, 10, t0 + 1_000); // 이탈 → 리셋
  assert.equal(t.update(D1.lat, D1.lng, 10, t0 + 2_000).length, 0); // 재진입 = 체류 0초부터
  assert.equal(t.update(D1.lat, D1.lng, 10, t0 + 5_001).length, 1); // 재진입 후 3초 경과
});

test("pendingDwellMs: 체류 대기 중 남은 시간을 알려준다 (정지 상태 재판정용)", () => {
  const t = createGeofenceTracker([D1]);
  const t0 = 1_000_000;
  assert.equal(t.pendingDwellMs(t0), null); // 아직 반경 밖 — 대기 없음
  t.update(D1.lat, D1.lng, 10, t0);
  assert.equal(t.pendingDwellMs(t0 + 1_000), 2_000); // 3초 중 1초 경과
});

test("enter 트리거는 dwell 없이 즉시 발동한다", () => {
  const t = createGeofenceTracker([{ ...D1, triggerType: "enter" }]);
  assert.equal(t.update(D1.lat, D1.lng, 10, 1_000_000).length, 1);
});

// 트래커가 '순차 판정'을 버리고 전체 씬을 매번 평가하므로, 진입 반경이 서로 겹치면
// 스토리 순서를 앞질러 발동할 수 있다. EP01 실좌표는 S1-S3 여유가 3.1m뿐이라
// 반경/좌표를 조정할 때 이 불변식이 깨지기 쉽다 — 깨지면 여기서 잡는다.
test("EP01 실좌표: 씬 간 진입 반경이 겹치지 않는다 (비순차 판정의 전제)", () => {
  const EP01 = [
    { order: 1, lat: 35.0972, lng: 129.0298, radiusM: 25 },
    { order: 2, lat: 35.0938, lng: 129.0272, radiusM: 30 },
    { order: 3, lat: 35.0968, lng: 129.0300, radiusM: 20 },
    { order: 4, lat: 35.0966, lng: 129.0306, radiusM: 20 },
    { order: 5, lat: 35.0975, lng: 129.0345, radiusM: 30 },
  ];
  for (let i = 0; i < EP01.length; i++) {
    for (let j = i + 1; j < EP01.length; j++) {
      const a = EP01[i], b = EP01[j];
      const d = distanceM(a.lat, a.lng, b.lat, b.lng);
      assert.ok(
        d > a.radiusM + b.radiusM,
        `S${a.order}-S${b.order} 진입 반경 겹침: 거리 ${d.toFixed(1)}m ≤ 반경합 ${a.radiusM + b.radiusM}m`
      );
    }
  }
});
