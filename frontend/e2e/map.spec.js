import { test, expect } from "@playwright/test";

// 지도의 '코스 시작' 버튼은 제거됐다 — 코스 시작은 플레이어 화면이 담당한다(player.spec).
// 지도는 경로·반경·트리거를 눈으로 확인하는 화면이다.

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("button", { name: "지도" }).click();
});

test("지도와 경로 범례가 보인다", async ({ page }) => {
  await expect(page.locator(".map-wrap .leaflet-container")).toBeVisible();
  await expect(page.getByText("Route Legend")).toBeVisible();
});

test("씬마다 번호 마커를 그린다", async ({ page }) => {
  await expect(page.locator(".leaflet-marker-icon")).toHaveCount(5); // EP.01 = 5지점
});

test("dwell 씬 반경은 주황으로 구분한다 (밀집 지역 오탐 방지 반경)", async ({ page }) => {
  // S3·S4가 dwell (큐시트 B-1) → 주황 원 2개
  await expect(page.locator('.leaflet-overlay-pane path[stroke="#e8873a"]')).toHaveCount(2);
});
