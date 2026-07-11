import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("홈 화면에 브랜드와 검색창이 보인다", async ({ page }) => {
  await expect(page.locator("h1.brand")).toHaveText("EAR TRIP");
  await expect(page.getByPlaceholder("검색창")).toBeVisible();
});

test("지역 칩과 장소 목록이 렌더링된다", async ({ page }) => {
  const regionRow = page.getByRole("tablist", { name: "지역 선택" });
  await expect(regionRow.getByRole("tab")).toHaveCount(5);
  await expect(page.getByRole("tab", { name: "부산" })).toHaveAttribute("aria-selected", "true");

  await expect(page.getByText("자갈치 시장")).toBeVisible();
  await expect(page.getByText("광안대교")).toBeVisible();
});

test("검색어로 장소 목록이 필터링된다", async ({ page }) => {
  const search = page.getByPlaceholder("검색창");
  await search.fill("광안대교");

  await expect(page.getByText("자갈치 시장")).toBeHidden();
  await expect(page.getByText("광안대교")).toBeVisible();

  await search.fill("존재하지않는장소");
  await expect(page.locator(".place-card")).toHaveCount(0);
});

test("지역 칩을 누르면 해당 지역 장소만 남는다", async ({ page }) => {
  await page.getByRole("tab", { name: "광안리" }).click();

  await expect(page.getByText("자갈치 시장")).toBeHidden();
  await expect(page.getByText("광안대교")).toBeVisible();
  await expect(page.getByText("광안리 해변")).toBeVisible();
});

test("장소 카드를 누르면 플레이어(씬 목록) 화면으로 이동한다", async ({ page }) => {
  await page.getByText("자갈치 시장").click();

  await expect(page.getByRole("heading", { name: "씬 목록" })).toBeVisible();
  await expect(page.getByText("자갈밭 위의 좌판")).toBeVisible();
});

test("하단 탭은 홈/지도/마이페이지 3개만 존재한다(탐색·저장함 없음)", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: "주요 메뉴" });
  await expect(nav.getByRole("button")).toHaveCount(3);
  await expect(nav.getByRole("button", { name: "홈" })).toBeVisible();
  await expect(nav.getByRole("button", { name: "지도" })).toBeVisible();
  await expect(nav.getByRole("button", { name: "마이페이지" })).toBeVisible();
  await expect(nav.getByRole("button", { name: "탐색" })).toHaveCount(0);
  await expect(nav.getByRole("button", { name: "저장함" })).toHaveCount(0);
});
