import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("하단 탭으로 지도 화면으로 이동한다", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: "주요 메뉴" });
  await nav.getByRole("button", { name: "지도" }).click();

  await expect(page.locator("h1.brand")).toHaveText("EAR TRIP");
  await expect(page.getByPlaceholder("검색창")).toBeVisible();
  await expect(page.locator(".map-wrap .leaflet-container")).toBeVisible();
});

test("하단 탭으로 마이페이지 화면으로 이동한다", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: "주요 메뉴" });
  await nav.getByRole("button", { name: "마이페이지" }).click();

  await expect(page.getByText("마이페이지 — 준비 중")).toBeVisible();
});

test("다시 홈 탭을 누르면 홈 화면으로 돌아온다", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: "주요 메뉴" });
  await nav.getByRole("button", { name: "지도" }).click();
  await nav.getByRole("button", { name: "홈" }).click();

  await expect(page.getByText("장소 목록")).toBeVisible();
});
