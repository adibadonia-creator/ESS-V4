import { test, expect } from "@playwright/test";
test("production browser worker matches Node including active save, goods and frame-delayed replay", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/verify.html");
  await expect(page.locator("body")).toHaveAttribute("data-result", "passed", {
    timeout: 60000,
  });
  expect(errors).toEqual([]);
  await expect(page.locator("#results")).toContainText("ALL CHECKS PASSED");
});
test("Pixi WebGL app renders and UI observation/camera controls leave paused causality unchanged", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("#meta")).toContainText("conservation verified", {
    timeout: 30000,
  });
  await expect(page.locator("#map canvas")).toBeVisible();
  await expect(page.locator("#personal-lens")).toBeVisible();
  await expect(page.locator("#task-state")).toContainText(
    "DIAGNOSTIC SELECTED INTENTION",
  );
  const hash = await page.locator("#hash").textContent();
  await page.locator("#actor").selectOption({ label: "Shell 2" });
  await page.getByText("Measurement counters", { exact: true }).click();
  await page.locator("#map canvas").hover();
  await page.mouse.wheel(0, -250);
  await expect(page.locator("#hash")).toHaveText(hash!);
  await page.locator("#personal-lens summary").click();
  await page.locator("#personal-lens summary").click();
  await expect(page.locator("#hash")).toHaveText(hash!);
  const before = await page.locator("#clock").textContent();
  await page.getByRole("button", { name: "+0.01 SD", exact: true }).click();
  await expect(page.locator("#clock")).not.toHaveText(before!);
  await expect(page.locator("#hash")).not.toHaveText(hash!);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.screenshot({
    path: testInfo.outputPath("physical-spine.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
  await expect(page.locator("vite-error-overlay")).toHaveCount(0);
});

test("body execution fixture exposes an inert analyst card and personal body evidence", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.locator("#meta")).toContainText("conservation verified");
  await page.getByRole("button", { name: "Body fixture", exact: true }).click();
  await expect(page.locator("#inspect")).toContainText("Enjoyment");
  await expect(page.locator("#inspect")).toContainText("Mastery (analyst)");
  await expect(page.locator("#evidence-records")).toContainText(
    "body-experience",
  );
  const hash = await page.locator("#hash").textContent();
  await page.locator("#actor").selectOption({ label: "Shell 2" });
  await expect(page.locator("#hash")).toHaveText(hash!);
  await page.screenshot({
    path: testInfo.outputPath("body-fixture.png"),
    fullPage: true,
  });
});

test("autonomous adults expose personal decisions separately from analyst truth and inspection stays inert", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("#meta")).toContainText("conservation verified");
  await page
    .getByRole("button", { name: "Autonomous adults", exact: true })
    .click();
  await expect(page.locator("#fixture-label")).toContainText(
    "autonomous personal review",
  );
  await page.getByRole("button", { name: "+0.01 SD", exact: true }).click();
  await expect(page.locator("#task-state")).toContainText(
    "AUTONOMOUS INTENTION",
  );
  const hash = await page.locator("#hash").textContent();
  await page.locator("#decision-panel summary").click();
  await expect(page.locator("#decision-summary")).toContainText("/600 EU");
  await expect(page.locator("#decision-summary")).toContainText("severe risk");
  await expect(page.locator("#decision-summary")).not.toContainText(
    "capability",
  );
  await expect(page.locator("#hash")).toHaveText(hash!);
  await page.screenshot({
    path: testInfo.outputPath("autonomous-decision.png"),
    fullPage: true,
  });
  await page.locator("#decision-panel summary").click();
  await expect(page.locator("#hash")).toHaveText(hash!);
  expect(errors).toEqual([]);
});

test("exploration proof exposes an autonomous paid trial and provisional knowledge without observer effects", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("#meta")).toContainText("conservation verified");
  await page
    .getByRole("button", { name: "Exploration proof", exact: true })
    .click();
  await expect(page.locator("#fixture-label")).toContainText(
    "exploration proof",
  );
  for (let i = 0; i < 5; i++) {
    const before = await page.locator("#clock").textContent();
    await page.getByRole("button", { name: "+0.01 SD", exact: true }).click();
    await expect(page.locator("#clock")).not.toHaveText(before!);
  }
  await page.locator("#decision-panel summary").click();
  await expect(page.locator("#decision-summary")).toContainText("edge-flaking");
  await expect(page.locator("#decision-summary")).toContainText("0.4");
  const hash = await page.locator("#hash").textContent();
  await page.locator("#personal-lens summary").click();
  await page.locator("#decision-panel summary").click();
  await page.locator("#decision-panel summary").click();
  await expect(page.locator("#hash")).toHaveText(hash!);
  await page.screenshot({
    path: testInfo.outputPath("exploration-proof.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
