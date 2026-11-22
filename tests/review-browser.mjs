import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const KEY = "second-opinion.case.v1";
const savedCase = bill => ({ version: 1, bill, setAside: [], letter: { sender: { name: "", address: "", phone: "", email: "" }, options: { requestItemized: true, requestHold: true, askFinancialAssistance: false }, excluded: [], draft: null, draftBasis: null }, updatedAt: "2026-10-29" });

export async function reviewBrowserChecks(browser, origin, audit) {
  const evidence = [];
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce", acceptDownloads: true });
  const page = await context.newPage();
  try {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const noOverflow = async label => {
      const result = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth, offenders: [...document.querySelectorAll("body *")].filter(el => el.getBoundingClientRect().right > innerWidth + 1).slice(0, 8).map(el => `${el.tagName}.${el.className}`) }));
      evidence.push({ label, ...result });
      await writeFile("artifacts/review-browser-evidence.json", JSON.stringify(evidence, null, 2));
      assert.ok(result.content <= result.viewport, `${label}: ${JSON.stringify(result)}`);
    };
    const shot = async label => page.screenshot({ path: `artifacts/verified-${label}.png`, fullPage: false });
    const ready = async () => page.locator('.check-status[data-state="ready"]').waitFor();
    await page.goto(origin + "/start");
    await page.evaluate(() => {
      const originalFetch = window.fetch;
      window.fetch = (input, init) => {
        if (String(input).endsWith("/api/samples/emergency-visit")) {
          init?.signal?.addEventListener("abort", () => { document.documentElement.dataset.startRequestAborted = "true"; }, { once: true });
        }
        return originalFetch(input, init);
      };
    });
    const fixture = (await (await fetch(origin + "/api/samples/emergency-visit")).json()).bill;
    let heldRoute;
    let captured;
    const capture = new Promise(resolve => { captured = resolve; });
    await page.route("**/api/samples/emergency-visit", route => { heldRoute = route; captured(); });
    await page.getByRole("button", { name: "Open Emergency visit, one evening" }).click();
    await capture;
    assert.ok(await page.getByRole("button", { name: "Read this file" }).isDisabled(), "opening a sample cannot race an upload");
    assert.ok(await page.getByRole("button", { name: "Start a blank bill" }).isDisabled(), "opening a sample cannot race a blank bill");
    await page.getByRole("link", { name: "Second Opinion home" }).click();
    await page.waitForFunction(() => document.documentElement.dataset.startRequestAborted === "true");
    await heldRoute.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ bill: fixture }) }).catch(() => {});
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(new URL(page.url()).pathname, "/", "leaving cancels a pending start instead of navigating back to review");
    assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), null);
    await page.unroute("**/api/samples/emergency-visit");
    await page.goto(origin + "/start");
    await shot("start-390");
    await page.getByRole("button", { name: "Open Emergency visit, one evening" }).click();
    await ready();
    // An invalid optional amount must not block saving after its coverage option is changed.
    await page.getByRole("button", { name: "Edit bill details" }).click();
    await page.getByRole("dialog").getByLabel("Patient responsibility on your EOB").fill("abc");
    await page.getByRole("dialog").getByLabel("No, I'm uninsured or paying myself").check();
    await page.getByRole("dialog").getByRole("button", { name: "Save details" }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "Edit bill details" }).click();
    await page.getByRole("dialog").getByLabel("Yes, I have insurance").check();
    await page.getByRole("dialog").getByLabel("Patient responsibility on your EOB").fill("1250");
    await shot("bill-details-390");
    await page.getByRole("dialog").getByRole("button", { name: "Save details" }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await ready();
    await page.locator(".view-switch button").nth(1).click();
    await page.locator("#open-a13").focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    assert.equal(await page.locator(":focus").getAttribute("id"), "open-a13");
    await shot("keyboard-focus-390");
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    assert.equal(await dialog.evaluate(el => getComputedStyle(el).animationName), "none", "reduced motion removes the drawer animation");
    await dialog.getByLabel("Line total ($)").fill("999");
    await dialog.getByLabel("I'm not sure what this is").check();
    assert.equal(await dialog.getByLabel("Line total ($)").inputValue(), "999", "marking a line preserves a correction in progress");
    await dialog.getByLabel("Line total ($)").fill("105");
    await dialog.getByLabel("Quantity").fill("5");
    await dialog.getByLabel("Your note").fill("n".repeat(500));
    await dialog.getByRole("button", { name: "Save correction" }).click();
    await dialog.getByRole("status").filter({ hasText: "Correction saved" }).waitFor();
    assert.ok(await page.evaluate(() => document.querySelector("dialog[open]")?.contains(document.activeElement)), "focus stays inside the drawer after saving");
    await noOverflow("drawer with a long note");
    await audit(page, 390, "review-long-note");
    await shot("drawer-390");
    await page.keyboard.press("Escape");
    await ready();
    assert.equal(await page.locator(":focus").getAttribute("id"), "open-a13");

    // A failed re-check must remain visible on the letter route, and cannot be exported as current.
    await page.route("**/api/analyze", route => route.fulfill({ status: 503, contentType: "application/json", body: '{"error":{"message":"Review outage"}}' }));
    await page.locator("#open-a13").click();
    await dialog.getByLabel("Quantity").fill("4");
    await dialog.getByRole("button", { name: "Save correction" }).click();
    await page.keyboard.press("Escape");
    await page.locator(".notice.error").filter({ hasText: "these results are from before it" }).waitFor();
    await page.locator(".steps-nav").getByRole("link", { name: "Draft the letter" }).click();
    await page.locator(".notice.error").filter({ hasText: "check your latest bill" }).waitFor();
    assert.ok(await page.getByRole("button", { name: "Download .txt" }).isDisabled());
    assert.ok(await page.getByRole("button", { name: "Copy", exact: true }).isDisabled());
    await audit(page, 390, "stale-letter");
    await shot("stale-letter-390");
    await page.unroute("**/api/analyze");
    await page.getByRole("button", { name: "Try again" }).click();
    await page.getByRole("button", { name: "Download .txt" }).waitFor({ state: "visible" });
    await page.waitForFunction(() => ![...document.querySelectorAll("button")].find(el => el.textContent === "Download .txt")?.disabled);

    // Editing and rebuilding an empty draft must work, and exports retain the specimen label.
    const letter = page.getByLabel("Letter text");
    await letter.fill("");
    await page.getByRole("button", { name: "Rebuild the letter…" }).click();
    await page.getByRole("button", { name: "Replace my edits" }).click();
    await page.waitForFunction(() => document.querySelector(".letter-text")?.value.length > 100);
    await letter.fill((await letter.inputValue()) + "\nMy edited ending.");
    const downloadEvent = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download .txt" }).click();
    const download = await downloadEvent;
    const exported = await readFile(await download.path(), "utf8");
    assert.match(exported, /^SYNTHETIC EXAMPLE/);
    assert.match(exported, /My edited ending/);
    await page.reload();
    await page.waitForFunction(() => document.querySelector(".letter-text")?.value.includes("My edited ending"));
    await page.waitForFunction(() => ![...document.querySelectorAll("button")].find(el => el.textContent === "Download .txt")?.disabled);
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin });
    await page.getByRole("button", { name: "Copy", exact: true }).click();
    assert.match(await page.evaluate(() => navigator.clipboard.readText()), /^SYNTHETIC EXAMPLE/);
    await shot("letter-390");
    await page.emulateMedia({ media: "print" });
    await page.evaluate(() => scrollTo(0, 0));
    assert.match(await page.locator(".print-letter").innerText(), /^SYNTHETIC EXAMPLE/);
    await shot("print-390");
    await page.pdf({ path: "artifacts/verified-letter.pdf", format: "A4" });
    await page.emulateMedia({ media: "screen" });
    const editedLetter = await letter.inputValue();
    await letter.fill("Please explain this charge. Thank you.");
    await page.waitForFunction(() => document.querySelector(".print-letter")?.textContent.includes("Please explain this charge. Thank you."));
    await page.emulateMedia({ media: "print" });
    const shortPdf = await page.pdf({ path: "artifacts/verified-short-letter.pdf", format: "A4" });
    assert.equal([...shortPdf.toString("latin1").matchAll(/\/Type \/Page\b/g)].length, 1, "a short letter prints one page without blank pages from hidden controls");
    await page.emulateMedia({ media: "screen" });
    await letter.fill(editedLetter);

    // All standalone actions meet the design's 44px touch target requirement.
    const smallTargets = await page.locator("button:not(:disabled), .button, .quiet").evaluateAll(els => els.filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== "hidden").map(el => ({ name: el.textContent.trim(), height: el.getBoundingClientRect().height })).filter(el => el.height < 44));
    assert.deepEqual(smallTargets, []);
    await page.getByRole("button", { name: "Clear saved bill…" }).click();
    await page.getByRole("dialog", { name: "Clear this saved bill?" }).getByRole("button", { name: "Keep it" }).click();
    assert.ok(await page.evaluate(key => !!localStorage.getItem(key), KEY));
    await page.getByRole("button", { name: "Clear saved bill…" }).click();
    await audit(page, 390, "clear-saved-bill");
    await page.getByRole("button", { name: "Clear bill and letter" }).click();
    await page.getByRole("heading", { name: "Start with a bill to draft a letter." }).waitFor();
    assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), null);
    await page.waitForFunction(() => document.activeElement?.id === "main");

    // Valid but difficult content at the maximum row count, with a line removed and replaced.
    const sample = fixture;
    const bill = { ...sample, id: "review-large", origin: "manual", sampleId: null, provider: "Hospital".repeat(15), accountNumber: "A".repeat(40), statedTotal: null, amountDue: null, eobResponsibility: null, lineItems: Array.from({ length: 500 }, (_, i) => ({ id: `long-${i}`, date: "2026-08-14", code: String(i).padStart(16, "0"), description: i === 0 ? "D".repeat(160) : `Specific service ${i}`, quantity: i === 0 ? 9999 : 1, unitPrice: i === 0 ? 10000 : 100000000, amount: i === 0 ? 99990000 : 100000000, mark: "none", note: "" })) };
    await page.goto(origin + "/review");
    await page.evaluate(({ key, current }) => localStorage.setItem(key, JSON.stringify(current)), { key: KEY, current: savedCase(bill) });
    await page.reload();
    await ready();
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 960 });
      await noOverflow(`500 lines and long content at ${width}`);
      assert.ok(await page.getByRole("button", { name: "+ Add a line", exact: true }).isDisabled());
      await shot(`large-review-${width}`);
      if (width <= 390) {
        await page.locator("#open-long-0").scrollIntoViewIfNeeded();
        await shot(`large-ledger-${width}`);
      }
      if (width === 390) await audit(page, width, "large-bill");
    }
    await page.locator("#open-long-0").click();
    await dialog.getByRole("button", { name: "Remove this line…" }).click();
    await dialog.getByRole("button", { name: "Remove line", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    await page.waitForFunction(() => document.activeElement?.id === "open-long-1");
    await page.getByRole("button", { name: "+ Add a line", exact: true }).click();
    await dialog.getByLabel("Description").fill("Replacement service");
    await dialog.getByLabel("Line total ($)").fill("100");
    await dialog.getByRole("button", { name: "Add line", exact: true }).click();
    await page.getByRole("dialog", { name: "Replacement service" }).waitFor();
    await page.waitForFunction(() => document.querySelector("dialog[open]")?.contains(document.activeElement));
    assert.ok(await page.evaluate(() => document.querySelector("dialog[open]")?.contains(document.activeElement)));
    await page.keyboard.press("Escape");
    await page.reload();
    await ready();
    assert.equal(await page.locator(".ledger tbody tr").count(), 500);

    await summaryReflowChecks(page);

    // Privacy recovery also explains a failed removal rather than claiming deletion.
    await page.evaluate(() => { Storage.prototype.removeItem = () => { throw new Error("Review blocked removal"); }; });
    await page.getByRole("button", { name: "Clear saved bill…" }).click();
    await page.getByRole("button", { name: "Clear bill and letter" }).click();
    await page.getByRole("status").filter({ hasText: "didn't allow the saved bill to be removed" }).waitFor();
    assert.ok(await page.evaluate(key => !!localStorage.getItem(key), KEY));

    // 320 CSS px is the reflow width of a 1280px viewport at 400% zoom.
    for (const route of ["/", "/start", "/method"]) {
      await page.goto(origin + route);
      await noOverflow(`${route} at 320`);
      const siteAction = page.locator(".site-nav .button");
      if (await siteAction.count()) assert.equal(await siteAction.evaluate(el => el.getBoundingClientRect().height), 44, "Start remains a single-line action at 320px");
      await shot(`${route.replaceAll("/", "") || "home"}-320`);
      await audit(page, 320, `reflow-${route}`);
    }
    await page.setViewportSize({ width: 720, height: 450 });
    await page.goto(origin + "/review");
    await ready();
    await noOverflow("review at 720x450, equivalent CSS viewport for 200% zoom");
    await shot("review-zoom-equivalent");
    const transition = await page.locator(".ledger tbody tr").first().evaluate(el => getComputedStyle(el).transitionDuration);
    assert.equal(transition, "0s", "reduced motion removes the row highlight transition");
    assert.deepEqual(errors, []);
    console.log("Independent regressions passed: correction preservation, stale letter, labeled exports, clipboard, print, clear/failure, 500-line editing, focus, 320px reflow, touch targets, zoom-equivalent layout, reduced motion");
  } catch (error) {
    await page.screenshot({ path: "artifacts/review-failure.png" });
    await writeFile("artifacts/review-failure.json", JSON.stringify(await page.evaluate(() => ({ url: location.href, focus: document.activeElement?.outerHTML, dialogs: [...document.querySelectorAll("dialog[open]")].map(el => el.outerHTML.slice(0, 2000)), text: document.body.innerText.slice(0, 3000) })), null, 2));
    throw error;
  } finally { await context.close(); }
}

// The summary's leaders must yield space to valid charges and credits, including cents.
// Page overflow alone misses amounts extending into the gutter; inspect each figure's bounds too.
export async function summaryReflowChecks(page) {
  const originalViewport = page.viewportSize();
  let originalAmount;
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const amount of ["1000000.00", "-1000000.00"]) {
      await page.getByRole("button", { name: "Edit bill details" }).click();
      const form = page.getByRole("dialog", { name: "Bill details" });
      const input = form.getByLabel("Amount due", { exact: true });
      originalAmount ??= await input.inputValue();
      await input.fill(amount);
      await form.getByRole("button", { name: "Save details" }).click();
      await form.waitFor({ state: "hidden" });
      await page.locator('.check-status[data-state="ready"]').waitFor();
      const geometry = await page.locator(".figures").evaluate(figures => {
        const box = figures.getBoundingClientRect();
        return {
          viewport: innerWidth, content: document.documentElement.scrollWidth,
          clipped: [...figures.querySelectorAll("dd")].some(el => {
            const r = el.getBoundingClientRect(); return r.left < box.left - 1 || r.right > box.right + 1;
          }),
          overlap: [...figures.querySelectorAll("dt")].some(term => {
            const range = document.createRange(); range.selectNodeContents(term);
            const t = range.getBoundingClientRect(), v = term.nextElementSibling.getBoundingClientRect();
            return t.right > v.left && t.top < v.bottom && t.bottom > v.top;
          }),
        };
      });
      assert.ok(geometry.content <= width && !geometry.clipped && !geometry.overlap, `full summary amount ${amount} at ${width}: ${JSON.stringify(geometry)}`);
      assert.equal(await page.locator(".figures > div").nth(1).locator("dd").textContent(), amount.startsWith("-") ? "-$1,000,000.00" : "$1,000,000.00");
      await page.screenshot({ path: `artifacts/verified-summary-${width}-${amount.startsWith("-") ? "credit" : "due"}.png` });
    }
  }
  await page.getByRole("button", { name: "Edit bill details" }).click();
  const form = page.getByRole("dialog", { name: "Bill details" });
  await form.getByLabel("Amount due", { exact: true }).fill(originalAmount);
  await form.getByRole("button", { name: "Save details" }).click();
  await form.waitFor({ state: "hidden" });
  await page.locator('.check-status[data-state="ready"]').waitFor();
  await page.setViewportSize(originalViewport);
}
