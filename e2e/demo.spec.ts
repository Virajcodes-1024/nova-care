import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  const response = await request.post("http://127.0.0.1:8017/api/demo/reset", {
    data: { confirmed: true },
  });
  expect(response.ok()).toBeTruthy();
});
test("main demo: plan, evidence, approval, persisted proof", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Scheduled today")).toBeVisible();
  await page
    .getByRole("link", { name: "Prepare the evening routine", exact: true })
    .click();
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(
    page.getByText("Your plan is ready.", { exact: false }),
  ).toBeVisible();
  await page.getByText("Explain this result").first().click();
  await page.getByRole("link", { name: "Task #4", exact: true }).click();
  await expect(page.locator("#task-4")).toContainText("Evening check-in");
  await page.goto("/actions");
  await page.getByRole("button", { name: "Review & approve" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Confirm approval" }).click();
  await expect(
    page.getByText("Verified local simulated inbox record", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Verified local simulated inbox record", { exact: false }),
  ).toBeVisible();
  await page.goto("/history");
  await expect(page.getByText("Approval: approved").first()).toBeVisible();
});
test("missing data and rejection never claim execution", async ({ page }) => {
  await page.goto("/assistant?demo=1");
  await page.getByLabel("Demo scenario").selectOption("missing");
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(
    page.getByText("No event records available for this period.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.goto("/actions");
  await page.getByRole("button", { name: "Reject", exact: true }).click();
  await expect(
    page.getByText("Rejected by user. No execution or delivery occurred."),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Rejected by user. No execution or delivery occurred."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Review & approve" }),
  ).toHaveCount(0);
});
test("unavailable tool is visible and mobile navigation fits", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/assistant?demo=1");
  await page.getByLabel("Demo scenario").selectOption("unavailable");
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(
    page
      .locator(".limitations")
      .getByText("Simulated event source unavailable.", { exact: false }),
  ).toBeVisible();
  await page.getByText("Actual tool execution", { exact: false }).click();
  await expect(page.getByText("failed", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Home Events" }).click();
  await expect(
    page.getByRole("heading", { name: "Around the home" }),
  ).toBeVisible();
});
