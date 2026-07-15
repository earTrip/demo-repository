import { test, expect } from "@playwright/test";

// 백엔드 미기동 시 courseApi가 mock으로 폴백한다 (무료 씬 1~2, 나머지 잠금).
// 재생은 useGeofencePlayer 단독 경로 — 씬 탭이 GPS 진입을 시뮬레이트하고
// AudioQueue → playerStore → MiniPlayer로 흐른다.

// 플레이어는 하단 탭이 아니라 홈의 코스 카드로 진입한다 (App.jsx onStartCourse).
// "자갈치 시장"은 장소 카드와 '오늘 일정' 양쪽에 있어 getByText로는 모호하다 — 카드로 좁힌다.
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.locator(".place-card", { hasText: "자갈치 시장" }).click();
  await expect(page.getByRole("heading", { name: "씬 목록" })).toBeVisible();
});

test("씬 목록과 코스 시작 버튼이 보인다", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "씬 목록" })).toBeVisible();
  await expect(page.getByText("자갈밭 위의 좌판")).toBeVisible();
  await expect(page.getByRole("button", { name: /코스 시작/ })).toBeVisible();
});

test("씬 목록이 큐시트 B-1 트리거를 표시한다", async ({ page }) => {
  const s1 = page.locator(".scene-item").first();
  await expect(s1.getByText("진입 즉시")).toBeVisible();

  // S3는 밀집 지역이라 3초 체류
  const s3 = page.locator(".scene-item").nth(2);
  await expect(s3.getByText("3초 체류")).toBeVisible();
});

test("무료 씬을 누르면 코스가 시작되고 MiniPlayer에 해당 씬이 뜬다", async ({ page }) => {
  await page.getByText("자갈밭 위의 좌판").click();

  // MiniPlayer는 playerStore만 구독한다 — 여기 뜨면 훅 → 큐 → 스토어 배선이 살아 있다는 뜻
  const mini = page.locator(".mini-player");
  await expect(mini).toBeVisible();
  await expect(mini.getByText("자갈밭 위의 좌판")).toBeVisible();

  // 시작 버튼은 진행 상태 표시로 바뀐다
  await expect(page.getByText(/진행 중 · \d+\/\d+/)).toBeVisible();
});

test("잠금 씬을 누르면 재생 대신 페이월이 열린다", async ({ page }) => {
  await page.getByText("버려지던 것들").click(); // S3 = 잠금

  await expect(page.getByRole("dialog", { name: "구매" })).toBeVisible();
  // 잠금 씬은 재생 경로에 오르면 안 된다 (audioUrl 자체가 없음).
  // MiniPlayer는 홈에서 카드를 누른 시점에 이미 코스 제목으로 떠 있으므로,
  // '잠금 씬 제목이 올라오지 않았는지'로 확인한다.
  await expect(page.locator(".mini-player")).not.toContainText("버려지던 것들");
});

test("MiniPlayer 재생/일시정지 토글이 스토어 상태를 실제로 바꾼다", async ({ page }) => {
  await page.getByText("자갈밭 위의 좌판").click();

  const mini = page.locator(".mini-player");
  await expect(mini).toBeVisible();

  // --main이 재생/일시정지 버튼 ('재생 목록' 버튼과 구분)
  const toggle = mini.locator(".mini-player__ctrl--main");
  await expect(toggle).toHaveAttribute("aria-label", "일시정지"); // 시작 직후 재생 중
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-label", "재생");
});
