import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("button", { name: "지도" }).click();
});

test("지도 화면에 코스 시작 버튼과 경로 범례가 보인다", async ({ page }) => {
  await expect(page.getByRole("button", { name: "▶ 코스 시작" })).toBeVisible();
  await expect(page.getByText("Route Legend")).toBeVisible();
});

test("코스 시작을 누르면 상태 텍스트로 바뀐다", async ({ page }) => {
  await page.getByRole("button", { name: "▶ 코스 시작" }).click();
  await expect(page.getByRole("button", { name: "▶ 코스 시작" })).toHaveCount(0);
  await expect(page.locator(".course-start-status")).toBeVisible();
});
