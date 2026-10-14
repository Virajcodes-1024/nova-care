import { mkdir, copyFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
const output = "demo/media";
await mkdir(`${output}/screenshots`, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: `${output}/raw`, size: { width: 1440, height: 900 } },
});
const page = await context.newPage();
const base = "http://127.0.0.1:5197";
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const chapters = [];
const started = Date.now();
async function caption(text) {
  chapters.push({ seconds: Math.round((Date.now() - started) / 1000), text });
  await page.evaluate((text) => {
    let box = globalThis.document.getElementById("demo-caption");
    if (!box) {
      box = globalThis.document.createElement("div");
      box.id = "demo-caption";
      globalThis.document.body.appendChild(box);
    }
    box.textContent = `DEMO WALKTHROUGH · ${text}`;
    box.style.cssText =
      "position:fixed;bottom:16px;left:260px;right:24px;z-index:99999;padding:16px 22px;border-radius:10px;background:#123f39;color:white;font:17px Arial,sans-serif;box-shadow:0 5px 25px #0003;border:1px solid #66aa97";
  }, text);
}
async function hold(seconds = 7) {
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}
async function snap(name) {
  await page.screenshot({
    path: `${output}/screenshots/${name}.png`,
    fullPage: true,
    style: "#demo-caption{visibility:hidden!important}",
  });
}
try {
  const reset = await context.request.post(
    "http://127.0.0.1:8027/api/demo/reset",
    { data: { confirmed: true } },
  );
  if (!reset.ok()) throw new Error("Recording fixture initialization failed");
  await page.goto(base);
  await page.getByText("Scheduled today").waitFor();
  await caption(
    "NOVA Care: fictional family data, local workflows, people in control.",
  );
  await snap("01-overview");
  await hold();
  await page
    .getByRole("link", { name: "Prepare the evening routine", exact: true })
    .click();
  await caption(
    "Start with a natural-language request to coordinate the evening routine.",
  );
  await hold(5);
  await page.getByRole("button", { name: "Send request" }).click();
  await page.getByText("Your plan is ready.", { exact: false }).waitFor();
  await caption(
    "PLAN: the backend retrieves records and prioritizes actual pending tasks.",
  );
  await snap("02-assistant-plan");
  await hold();
  await page.getByText("Explain this result").first().click();
  await caption(
    "VERIFY: inspect the rule and follow its supporting task record.",
  );
  await snap("03-evidence");
  await hold();
  await page.getByRole("link", { name: "Task #4", exact: true }).click();
  await caption(
    "The high-priority evening check-in remains pending in SQLite.",
  );
  await snap("04-routines");
  await hold(5);
  await page.goto(`${base}/events`);
  await page.getByRole("heading", { name: "Event timeline" }).waitFor();
  await caption(
    "Events are simulated. An unavailable sensor means unknown state, never proof of safety.",
  );
  await snap("05-home-events");
  await hold();
  await page.goto(`${base}/actions`);
  await page.getByRole("button", { name: "Review & approve" }).waitFor();
  await caption(
    "ASK: review the draft, evidence and effect. No delivery has occurred yet.",
  );
  await snap("06-action-review");
  await hold();
  await page.getByRole("button", { name: "Review & approve" }).click();
  await page.getByRole("dialog").waitFor();
  await caption(
    "Explicit approval allows one local simulated inbox delivery. No real message is sent.",
  );
  await snap("07-approval-dialog");
  await hold(5);
  await page.getByRole("button", { name: "Confirm approval" }).click();
  await page
    .getByText("Verified local simulated inbox record", { exact: false })
    .waitFor();
  await caption(
    "PROVE: the backend verifies a persisted inbox record before reporting completion.",
  );
  await snap("08-verified-result");
  await hold();
  await page.reload();
  await page
    .getByText("Verified local simulated inbox record", { exact: false })
    .waitFor();
  await caption(
    "Reloading preserves the result. Repeated approval cannot duplicate the delivery.",
  );
  await hold(5);
  await page.goto(`${base}/history`);
  await page.getByText("Approval: approved").first().waitFor();
  await caption(
    "The ledger records approved, executing and completed as separate outcomes.",
  );
  await snap("09-activity-history");
  await hold();
  await page.goto(`${base}/assistant?demo=1`);
  await page.getByLabel("Demo scenario").selectOption("missing");
  await page.getByRole("button", { name: "Send request" }).click();
  await page
    .locator(".limitations")
    .getByText("No event records available for this period.", { exact: false })
    .waitFor();
  await page.locator(".limitations").last().scrollIntoViewIfNeeded();
  await caption(
    "Missing-data scenario: NOVA states the limitation instead of claiming security.",
  );
  await snap("10-missing-data");
  await hold();
  await page.goto(`${base}/actions`);
  await page.getByRole("button", { name: "Reject", exact: true }).click();
  await page
    .getByText("Rejected by user. No execution or delivery occurred.")
    .waitFor();
  await caption(
    "Rejecting the second update prevents execution and persists the decision.",
  );
  await snap("11-rejected-action");
  await hold();
  await page.goto(`${base}/settings`);
  await page.getByRole("heading", { name: "Settings", exact: true }).waitFor();
  await caption(
    "Runs locally without AWS, paid APIs, hardware or an external language model.",
  );
  await snap("12-settings");
  await hold(6);
  await context.close();
  await copyFile(
    await page.video().path(),
    `${output}/nova-care-walkthrough.webm`,
  );
  await writeFile(
    `${output}/recording-notes.json`,
    JSON.stringify(
      {
        durationSeconds: Math.round((Date.now() - started) / 1000),
        chapters,
        browserErrors: errors,
        format: "WebM",
        audio: "No audio; explanatory captions are included.",
        data: "Separate recording.db; existing nova.db unchanged.",
      },
      null,
      2,
    ),
  );
  console.log(
    `Saved video and 12 screenshots to ${output}. Browser errors: ${errors.length}`,
  );
} finally {
  await browser.close();
}
