import { firefox, webkit } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import sharp from "sharp";

const base = process.env.TEST_WEB_URL || "http://localhost:5173";
const photo = await sharp({
  create: { width: 32, height: 32, channels: 3, background: "#147d70" },
})
  .png()
  .toBuffer();
for (const engine of [firefox, webkit]) {
  const browser = await engine.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  async function visible(text: string) {
    await page
      .getByText(text, { exact: true })
      .filter({ visible: true })
      .first()
      .waitFor();
  }

  async function audit() {
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
    );
  }

  async function signIn(email: string) {
    await page.getByLabel("Email address", { exact: true }).fill(email);
    await page
      .getByLabel("Password", { exact: true })
      .fill(process.env.DEMO_PASSWORD || "DemoPass123!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
  }

  try {
    await page.goto(base);
    await visible("Welcome back");
    await audit();
    await signIn("hr@wfh.test");
    await visible("Alex Morgan");
    for (const width of [1440, 684, 390]) {
      await page.setViewportSize({ width, height: 873 });
      const search = page.getByRole("searchbox", { name: "Search employees" });
      await search.focus();
      const focus = await search.evaluate((input) => {
        const field = input.parentElement!;
        const bounds = field.getBoundingClientRect();
        const child = input.getBoundingClientRect();

        return {
          inputShadow: getComputedStyle(input).boxShadow,
          inputOutline: getComputedStyle(input).outlineStyle,
          fieldShadow: getComputedStyle(field).boxShadow,
          fits:
            child.top >= bounds.top &&
            child.bottom <= bounds.bottom &&
            child.right <= bounds.right,
        };
      });
      assert.equal(focus.inputShadow, "none");
      assert.equal(focus.inputOutline, "none");
      assert.match(focus.fieldShadow, /inset/);
      assert.equal(focus.fits, true);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    const status = page.getByRole("combobox", {
      name: "Employee status",
      exact: true,
    });
    // Keyboard actions do not wait for layout stability after a viewport change.
    await status.scrollIntoViewIfNeeded();
    await status.focus();
    await page.waitForFunction(
      () =>
        document.activeElement?.getAttribute("aria-label") ===
        "Employee status",
    );
    await page.keyboard.press("Space");
    await page.getByRole("listbox").waitFor();
    await audit();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    assert.match(await status.innerText(), /All employees/);
    await visible("Alex Morgan");
    await status.click();
    await page.keyboard.press("Escape");
    await page.waitForFunction(
      () =>
        document.activeElement?.getAttribute("aria-label") ===
        "Employee status",
    );
    await page
      .getByRole("button", { name: "Add employee", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Create employee", exact: true })
      .click();
    await visible("Use at least 2 characters.");
    await page.waitForFunction(
      () => document.activeElement?.getAttribute("name") === "fullName",
    );
    await page
      .getByLabel("Full name", { exact: true })
      .fill("Long employee name ".repeat(5));
    for (const width of [768, 390]) {
      await page.setViewportSize({ width, height: 844 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      );
      await audit();
    }
    await page.keyboard.press("Escape");
    await page.waitForFunction(
      () => document.activeElement?.textContent?.trim() === "Add employee",
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole("link", { name: "Attendance", exact: true }).click();
    await visible("Attendance records");
    const picker = page.getByRole("combobox", {
      name: "Filter by employee",
      exact: true,
    });
    await picker.click();
    await page
      .getByLabel("Find an employee for attendance filtering")
      .fill("Sam Taylor");
    await page
      .getByRole("option", { name: "Sam Taylor (EMP-002)", exact: true })
      .waitFor();
    const searchFocus = await page
      .locator('[data-slot="command-input"]')
      .evaluate((input) => {
        const row = input.parentElement!;

        return {
          outline: getComputedStyle(input).outlineStyle,
          ring: getComputedStyle(row).boxShadow,
          fits:
            input.getBoundingClientRect().height <=
            row.getBoundingClientRect().height,
        };
      });
    assert.equal(searchFocus.outline, "none");
    assert.match(searchFocus.ring, /inset/);
    assert.equal(searchFocus.fits, true);
    await audit();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    assert.match(await picker.innerText(), /Sam Taylor/);
    await picker.click();
    await page
      .getByLabel("Find an employee for attendance filtering")
      .fill("no-such-person");
    await visible("No matching employees.");
    await page.keyboard.press("Escape");
    assert.match(await picker.innerText(), /Sam Taylor/);
    await page.waitForFunction(
      () =>
        document.activeElement?.getAttribute("aria-label") ===
        "Filter by employee",
    );
    await page
      .getByRole("combobox", { name: "Attendance status", exact: true })
      .click();
    await page.getByRole("option", { name: "Completed", exact: true }).click();
    await audit();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await visible("Welcome back");
    // UI smoke fixtures keep seeded employee attendance untouched; the Chromium suite tests real submissions.
    await page.route("**/api/attendance?**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], total: 0, page: 1, pageSize: 20 }),
      }),
    );
    await signIn("employee@wfh.test");
    await visible("Add your work photo");
    const input = page.getByLabel("Upload attendance photo");
    await input.setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: photo,
    });
    await page
      .getByRole("button", { name: "Remove photo", exact: true })
      .click();
    assert.equal(
      await input.evaluate((node: HTMLInputElement) => node.files?.length),
      0,
    );
    await input.setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: photo,
    });
    await page.getByRole("button", { name: "Check in", exact: true }).click();
    await page.getByRole("alertdialog").waitFor();
    await audit();
    await page.keyboard.press("Escape");
    await page.getByRole("alertdialog").waitFor({ state: "hidden" });
    await page.waitForFunction(
      () => document.activeElement?.textContent?.trim() === "Check in",
    );
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await visible("Welcome back");
    assert.deepEqual(errors, []);
    console.log(
      `${engine.name()}: keyboard selects/picker, validated forms, focus restoration, file reset, 1440/768/390px, and WCAG A/AA checks passed.`,
    );
  } finally {
    await browser.close();
  }
}
