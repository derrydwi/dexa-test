import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { DataSource } from "typeorm";
import sharp from "sharp";
import "@wfh/common";
import { workDate } from "@wfh/contracts";
import { removeTestPhotos } from "./cleanup";

const base = process.env.TEST_WEB_URL || "http://localhost:5173";
const output = resolve("artifacts/browser");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors: string[] = [];
page.on("pageerror", (error) => errors.push(error.message));
const suffix = randomUUID().slice(0, 8);
const email = `browser-${suffix}@wfh.test`;
const password = "BrowserPass123!";
let createdId: string | undefined;
const photo = await sharp({
  create: { width: 640, height: 480, channels: 3, background: "#147d70" },
})
  .png()
  .toBuffer();

async function screenshot(name: string) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo(0, 0);
  });
  await page.screenshot({
    path: resolve(output, `${name}.png`),
    fullPage: true,
  });
}

async function visible(text: string) {
  await page
    .getByText(text, { exact: true })
    .filter({ visible: true })
    .first()
    .waitFor({ state: "visible" });
}

async function signIn(account: string, secret: string) {
  await page.getByLabel("Email address", { exact: true }).fill(account);
  await page.getByLabel("Password", { exact: true }).fill(secret);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

async function widthCheck() {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "Page must not overflow horizontally.",
  );
}

async function selectOption(label: string, option: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

async function accessibility() {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    result.violations.map((item) => ({
      id: item.id,
      nodes: item.nodes.map((node) => ({
        target: node.target,
        summary: node.failureSummary,
      })),
    })),
    [],
    "No WCAG A/AA accessibility violations.",
  );
}

try {
  await page.clock.install({ time: new Date() });
  await page.goto(base);
  await visible("Welcome back");
  await screenshot("login-desktop");
  await accessibility();
  await page.setViewportSize({ width: 390, height: 844 });
  await widthCheck();
  await screenshot("login-mobile");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn("hr@wfh.test", process.env.DEMO_PASSWORD || "DemoPass123!");
  await page.getByRole("heading", { name: "Employees", exact: true }).waitFor();
  await visible("Alex Morgan");
  await screenshot("desktop");
  await accessibility();
  await page.getByRole("button", { name: "Add employee", exact: true }).click();
  await page
    .getByRole("button", { name: "Create employee", exact: true })
    .click();
  await visible("Use at least 2 characters.");
  await page.waitForFunction(
    () => document.activeElement?.getAttribute("name") === "fullName",
  );
  await page
    .getByLabel("Full name", { exact: true })
    .fill("Demo Browser Employee");
  await page
    .getByLabel("Employee code", { exact: true })
    .fill(`BROWSER-${suffix}`);
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Department", { exact: true }).fill("Engineering");
  await page.getByLabel("Job title", { exact: true }).fill("QA Engineer");
  await page.getByLabel("Temporary password", { exact: true }).fill(password);
  await screenshot("employee-form-desktop");
  await accessibility();
  await page.route("**/api/employees", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Correct the highlighted fields.",
        fieldErrors: { email: ["This email is already registered."] },
      }),
    }),
  );
  await page
    .getByRole("button", { name: "Create employee", exact: true })
    .click();
  await visible("This email is already registered.");
  assert.equal(
    await page.getByLabel("Email address", { exact: true }).inputValue(),
    email,
  );
  assert.equal(
    await page
      .getByLabel("Email address", { exact: true })
      .getAttribute("aria-invalid"),
    "true",
  );
  await page.unroute("**/api/employees");
  await page.getByLabel("Email address", { exact: true }).fill("");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  const createResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/employees") &&
      response.request().method() === "POST",
  );
  const createGate = Promise.withResolvers<void>();
  await page.route("**/api/employees", async (route) => {
    if (route.request().method() === "POST") {
      await createGate.promise;
    }
    await route.continue();
  });
  await page
    .getByRole("button", { name: "Create employee", exact: true })
    .click();
  await page.getByRole("button", { name: "Saving…", exact: true }).waitFor();
  await page.keyboard.press("Escape");
  assert.equal(
    await page.getByRole("dialog").isVisible(),
    true,
    "Saving forms resist Escape dismissal.",
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Close dialog", exact: true })
      .isDisabled(),
    true,
  );
  await page.mouse.click(2, 2);
  assert.equal(
    await page.getByRole("dialog").isVisible(),
    true,
    "Pending forms resist outside clicks.",
  );
  createGate.resolve();
  const created = await (await createResponse).json();
  createdId = created.id;
  const createdCode = created.employeeCode;
  await page.unroute("**/api/employees");
  await visible("Employee created. Their account is ready to use.");
  await visible("Demo Browser Employee");
  await page
    .getByRole("button", { name: "Edit Demo Browser Employee", exact: true })
    .click();
  await page
    .getByLabel("Job title", { exact: true })
    .fill("Senior QA Engineer");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await visible("Employee details updated.");
  await page.setViewportSize({ width: 390, height: 844 });
  await widthCheck();
  await screenshot("mobile");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Open navigation" }).waitFor();
  await page.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") === "Open navigation",
  );
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("dialog", { name: "Workspace navigation" })
    .getByRole("link", { name: "Attendance", exact: true })
    .click();
  await visible("Attendance records");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("dialog", { name: "Workspace navigation" })
    .getByRole("link", { name: "Employees", exact: true })
    .click();
  await visible("Employee directory");
  await page.getByRole("button", { name: "Add employee", exact: true }).click();
  await page
    .getByLabel("Full name", { exact: true })
    .fill("Long employee name ".repeat(5));
  await widthCheck();
  await screenshot("employee-form-mobile");
  await accessibility();
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await visible("Welcome back");
  await signIn(email, password);
  await page.getByRole("heading", { name: "Today’s attendance" }).waitFor();
  await visible("Not started");
  await visible("Add your work photo");
  await visible("No attendance records");
  await screenshot("workday-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await widthCheck();
  await screenshot("workday-mobile");
  await accessibility();
  await page.getByLabel("Upload attendance photo").setInputFiles({
    name: "invalid.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("invalid"),
  });
  await visible("Choose a JPEG, PNG, or WebP photo up to 5 MB.");
  await page.getByLabel("Upload attendance photo").setInputFiles({
    name: "demo-evidence.png",
    mimeType: "image/png",
    buffer: photo,
  });
  await page.getByRole("button", { name: "Remove photo", exact: true }).click();
  assert.equal(
    await page
      .getByLabel("Upload attendance photo")
      .evaluate((node: HTMLInputElement) => node.files?.length),
    0,
  );
  await page.getByLabel("Upload attendance photo").setInputFiles({
    name: "demo-evidence.png",
    mimeType: "image/png",
    buffer: photo,
  });
  await page.getByRole("button", { name: "Check in", exact: true }).click();
  await page.getByRole("alertdialog").waitFor();
  await accessibility();
  // Crossing midnight clears the selected evidence and any pending confirmation.
  await page.clock.setSystemTime(new Date(`${workDate()}T16:59:59.000Z`));
  await page.clock.fastForward(15000);
  await page.waitForFunction(
    () => !document.querySelector('[role="alertdialog"]'),
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Check in", exact: true })
      .isDisabled(),
    true,
  );
  await page.clock.setSystemTime(new Date());
  await page.clock.fastForward(15000);
  await page.waitForFunction(
    (expected) =>
      document.querySelector(".date-chip")?.textContent === expected,
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date()),
  );
  await visible("Add your work photo");
  await page.getByLabel("Upload attendance photo").setInputFiles({
    name: "demo-evidence.png",
    mimeType: "image/png",
    buffer: photo,
  });
  await page.route("**/api/attendance/check-in", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Evidence validation failed.",
        fieldErrors: { photo: ["Choose a different evidence photo."] },
      }),
    }),
  );
  await page.getByRole("button", { name: "Check in", exact: true }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await visible("Choose a different evidence photo.");
  assert.equal(
    await page
      .getByLabel("Upload attendance photo")
      .getAttribute("aria-invalid"),
    "true",
  );
  assert.equal(
    await page
      .getByLabel("Upload attendance photo")
      .evaluate((node: HTMLInputElement) => node.files?.length),
    1,
  );
  await page.unroute("**/api/attendance/check-in");
  await page.getByRole("button", { name: "Check in", exact: true }).click();
  await page.getByRole("alertdialog").waitFor();
  const attendanceGate = Promise.withResolvers<void>();
  await page.route("**/api/attendance/check-in", async (route) => {
    await attendanceGate.promise;
    await route.continue();
  });
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await page.getByRole("button", { name: "Saving…", exact: true }).waitFor();
  await page.keyboard.press("Escape");
  assert.equal(
    await page.getByRole("alertdialog").isVisible(),
    true,
    "Pending attendance confirmation stays open.",
  );
  attendanceGate.resolve();
  await visible("Your check-in was recorded successfully.");
  await page.unroute("**/api/attendance/check-in");
  await visible("Working");
  assert.equal(
    await page
      .getByLabel("Upload attendance photo")
      .evaluate((node: HTMLInputElement) => node.files?.length),
    0,
    "Success resets the native file input.",
  );
  await page.getByLabel("Upload attendance photo").setInputFiles({
    name: "demo-evidence.png",
    mimeType: "image/png",
    buffer: photo,
  });
  await page.getByRole("button", { name: "Check out", exact: true }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await visible("Your workday is complete.");
  await screenshot("completed-mobile");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await screenshot("completed-desktop");
  await page
    .getByRole("button", { name: "Check-in photo", exact: true })
    .click();
  await page.locator("img.evidence-photo").waitFor();
  await page.waitForFunction(
    () =>
      (document.querySelector("img.evidence-photo") as HTMLImageElement)
        ?.naturalWidth > 0,
  );
  await page.keyboard.press("Escape");
  await page
    .getByRole("link", { name: "Attendance history", exact: true })
    .click();
  await visible("Attendance history");
  await visible("Completed");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await visible("Welcome back");
  await signIn("hr@wfh.test", process.env.DEMO_PASSWORD || "DemoPass123!");
  await visible("Employee directory");
  await page.getByRole("link", { name: "Attendance", exact: true }).click();
  await visible("Attendance records");
  await visible("Demo Browser Employee");
  const picker = page.getByRole("combobox", {
    name: "Filter by employee",
    exact: true,
  });
  await picker.click();
  await accessibility();
  await page
    .getByLabel("Find an employee for attendance filtering")
    .fill("Demo Browser Employee");
  await page
    .getByRole("option", {
      name: `Demo Browser Employee (${createdCode})`,
      exact: true,
    })
    .click();
  await visible("Demo Browser Employee");
  assert.match(await picker.innerText(), /Demo Browser Employee/);
  await picker.click();
  await page
    .getByLabel("Find an employee for attendance filtering")
    .fill("no-such-person");
  await visible("No matching employees.");
  assert.equal(
    await page
      .getByRole("option", {
        name: `Demo Browser Employee (${createdCode})`,
        exact: true,
      })
      .count(),
    0,
    "Unmatched selected employees are not search results.",
  );
  await page.keyboard.press("Escape");
  assert.match(
    await picker.innerText(),
    /Demo Browser Employee/,
    "Search cannot hide the selected employee.",
  );
  const selectedRequest = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/attendance?`) &&
      response.url().includes(`employeeId=${createdId}`),
  );
  await selectOption("Attendance status", "Completed");
  await selectedRequest;
  await visible("Demo Browser Employee");
  await picker.click();
  const delayed = Promise.withResolvers<void>();
  const started = Promise.withResolvers<void>();
  const finished = Promise.withResolvers<void>();
  await page.route("**/api/employees?**", async (route) => {
    const q = new URL(route.request().url()).searchParams.get("q");
    if (q !== "out-of-order") {
      await route.continue();

      return;
    }
    started.resolve();
    await delayed.promise;
    await route
      .fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [{ ...created, fullName: "Outdated search result" }],
          total: 1,
          page: 1,
          pageSize: 100,
        }),
      })
      .catch(() => undefined);
    finished.resolve();
  });
  await page
    .getByLabel("Find an employee for attendance filtering")
    .fill("out-of-order");
  await started.promise;
  await page
    .getByLabel("Find an employee for attendance filtering")
    .fill("no-such-person");
  await visible("No matching employees.");
  delayed.resolve();
  await finished.promise;
  assert.equal(await page.getByText("Outdated search result").count(), 0);
  await page.unroute("**/api/employees?**");
  await page.keyboard.press("Escape");
  await picker.click();
  await page.route("**/api/employees?**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Picker verification outage." }),
    }),
  );
  await page
    .getByLabel("Find an employee for attendance filtering")
    .fill("failed-search");
  await visible("Picker verification outage.");
  await page.unroute("**/api/employees?**");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await visible("No matching employees.");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Reset filters", exact: true })
    .click();
  await visible("Demo Browser Employee");
  await screenshot("attendance-desktop");
  await accessibility();
  await page.setViewportSize({ width: 390, height: 844 });
  await widthCheck();
  await screenshot("attendance-mobile");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("link", { name: "Employees", exact: true }).click();
  await visible("Employee directory");
  await page
    .getByRole("button", {
      name: "Deactivate Demo Browser Employee",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await visible("Demo Browser Employee has been deactivated.");
  await selectOption("Employee status", "Inactive employees");
  await visible("Demo Browser Employee");
  await page
    .getByRole("button", {
      name: "Reactivate Demo Browser Employee",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await visible("Demo Browser Employee has been reactivated.");
  await selectOption("Employee status", "Active employees");
  await page.route("**/api/employees?**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Temporary verification outage." }),
    }),
  );
  await page.reload();
  await visible("Temporary verification outage.");
  await page.unroute("**/api/employees?**");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await visible("Demo Browser Employee");
  await page
    .getByRole("button", { name: "Edit Demo Browser Employee", exact: true })
    .click();
  await page.getByLabel("New password (optional)").fill("ResetBrowserPass123!");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await visible("Employee details updated.");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await visible("Welcome back");
  await signIn(email, password);
  await visible("Email or password is incorrect, or the account is inactive.");
  await signIn(email, "ResetBrowserPass123!");
  await visible("Your workday is complete.");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await visible("Welcome back");
  assert.deepEqual(errors, [], "No uncaught browser errors.");
  console.log(
    "Browser checks passed: HR CRUD, employee check-in/out, photos, filters, deactivation/reactivation, failure recovery, mobile navigation, and desktop/mobile layouts.",
  );
  console.log(`Screenshots: ${output}`);
} finally {
  await browser.close();
  if (createdId) {
    const identityDb = new DataSource({
      type: "mysql",
      url:
        process.env.IDENTITY_DATABASE_URL ||
        "mysql://identity:identity_local@127.0.0.1:3307/identity_db",
    });
    const attendanceDb = new DataSource({
      type: "mysql",
      url:
        process.env.ATTENDANCE_DATABASE_URL ||
        "mysql://attendance:attendance_local@127.0.0.1:3307/attendance_db",
    });
    await identityDb.initialize();
    await attendanceDb.initialize();
    try {
      const rows = await attendanceDb.query(
        "SELECT checkInPhoto, checkOutPhoto FROM attendance WHERE employeeId = ?",
        [createdId],
      );
      await attendanceDb.query("DELETE FROM attendance WHERE employeeId = ?", [
        createdId,
      ]);
      await identityDb.query("DELETE FROM sessions WHERE employeeId = ?", [
        createdId,
      ]);
      await identityDb.query("DELETE FROM employees WHERE id = ?", [createdId]);
      await removeTestPhotos(
        rows.flatMap(
          (row: { checkInPhoto: string; checkOutPhoto: string | null }) => [
            row.checkInPhoto,
            row.checkOutPhoto,
          ],
        ),
      );
    } finally {
      await identityDb.destroy();
      await attendanceDb.destroy();
    }
  }
}
