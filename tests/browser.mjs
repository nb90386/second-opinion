import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { reviewBrowserChecks } from "./review-browser.mjs";
import { redesignBrowserChecks } from "./redesign-browser.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.STUDIO_PLAYWRIGHT || "playwright");
const a11y = process.argv.includes("--a11y");
const port = Number(process.env.STUDIO_PORT || 3217);
assert.ok(Number.isInteger(port) && port > 1024 && port < 65536, "invalid STUDIO_PORT");
const origin = `http://127.0.0.1:${port}`;
const KEY = "second-opinion.case.v1";
// Always own the server: never attach to an unrelated process on the same port.
const server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], { stdio: ["ignore", "pipe", "pipe"] });
let logs = "";
let exited = false;
server.stdout.on("data", b => { logs = (logs + b).slice(-16000); });
server.stderr.on("data", b => { logs = (logs + b).slice(-16000); });
server.on("exit", () => { exited = true; });
const exit = new Promise(resolve => server.once("exit", resolve));
let browser;
await mkdir("artifacts", { recursive: true });
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (exited) throw new Error(`Server exited: ${logs}`);
    if (logs.includes("Ready in")) { ready = true; break; }
    await delay(200);
  }
  assert.ok(ready, `Server did not become ready: ${logs}`);
  browser = await chromium.launch();
  const errors = [];
  const results = [];
  async function audit(page, width, phase) {
    if (!a11y) return;
    if (!await page.evaluate(() => !!window.axe)) await page.addScriptTag({ path: require.resolve(process.env.STUDIO_AXE || "axe-core/axe.min.js") });
    const scan = await page.evaluate(async () => window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } }));
    results.push({ width, phase, violations: scan.violations });
    await writeFile("artifacts/accessibility.json", JSON.stringify(results, null, 2));
    assert.deepEqual(scan.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target.join(" ")) })), [], `accessibility violations: ${phase} @ ${width}`);
  }
  const noOverflow = async (page, where) => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `horizontal overflow: ${where}`);
  const activeQuestions = page => page.locator("ol.findings > li");
  const focusedId = page => page.evaluate(() => document.activeElement?.id ?? "");
  const wholeBill = async page => { await page.locator(".view-switch button").nth(1).click(); await page.waitForURL("**/review?view=bill"); };

  for (const width of [1440, 768, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 960 }, reducedMotion: "reduce", acceptDownloads: true });
    const page = await context.newPage();
    page.on("pageerror", e => errors.push(`${width}: ${e.message}`));
    let expectedServerError = false;
    page.on("console", m => {
      if (m.type() === "error" && !(expectedServerError && /status of (4\d\d|503)/.test(m.text()))) errors.push(`${width}: ${m.text()}`);
    });

    // Landing: one h1, skip link first, no overflow.
    await page.goto(origin);
    assert.equal(await page.getByRole("heading", { level: 1 }).count(), 1);
    await page.keyboard.press("Tab");
    assert.equal(await page.locator(":focus").textContent(), "Skip to content");
    await page.keyboard.press("Enter");
    assert.equal(await focusedId(page), "main");
    await noOverflow(page, `landing ${width}`);
    await page.screenshot({ path: `artifacts/landing-${width}${a11y ? "-a11y" : ""}.png`, fullPage: true });
    await audit(page, width, "landing");

    // Landing: the example's real questions, one at a time. Each decision moves on, focus follows the
    // new question, and the letter beside it changes.
    const demo = page.locator(".hero-demo");
    const demoLetter = demo.getByRole("region", { name: "Letter so far" });
    await demo.getByRole("heading", { level: 2, name: "You're asked to pay $640.00 more than your EOB says you owe" }).waitFor();
    assert.match(await demoLetter.innerText(), /^1\. Please reconcile this balance/m);
    await demo.getByRole("button", { name: "Set aside", exact: true }).click();
    assert.equal(await page.evaluate(() => document.activeElement?.textContent), "“ONDANSETRON 1 MG INJ” total doesn't match its price × quantity", "focus moves to the next question");
    assert.doesNotMatch(await demoLetter.innerText(), /reconcile this balance/, "a set-aside question leaves the letter");
    assert.match(await demoLetter.innerText(), /^1\. For “ONDANSETRON 1 MG INJ”/m, "the letter renumbers");
    await page.keyboard.press("ArrowLeft");
    await demo.getByRole("button", { name: "Ask about this after all" }).click();
    assert.match(await demoLetter.innerText(), /^1\. Please reconcile this balance/m);
    await demo.getByRole("button", { name: "Summary" }).click();
    await demo.getByRole("heading", { name: "That’s every question." }).waitFor();
    assert.match(await demo.locator(".qcard-summary").innerText(), /Your letter asks 6 questions\./);
    await noOverflow(page, `landing demo ${width}`);
    await audit(page, width, "landing-demo");

    // Start → example bill. The workspace has no bill yet.
    await page.getByRole("link", { name: "Open the example bill" }).click();
    await page.getByRole("heading", { name: "Put the bill in front of you." }).waitFor();
    await audit(page, width, "start");
    await page.getByRole("button", { name: "Open Emergency visit, one evening" }).click();
    await page.waitForURL("**/review");
    await page.getByRole("heading", { level: 1, name: "Cedar Hollow Regional Medical Center" }).waitFor();
    await page.getByText("Fictional hospital, account and prices.").waitFor();
    // One question at a time: keeping and setting aside write the saved case; the letter follows.
    const reviewLetter = page.getByRole("region", { name: "Letter so far" });
    await page.getByRole("heading", { level: 2, name: "You're asked to pay $640.00 more than your EOB says you owe" }).waitFor();
    await audit(page, width, "review-questions");
    await page.screenshot({ path: `artifacts/review-questions-${width}${a11y ? "-a11y" : ""}.png`, fullPage: false });
    await page.getByRole("button", { name: "Ask about this", exact: true }).click();
    await page.getByRole("button", { name: "Set aside", exact: true }).click();
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).setAside.length === 1, KEY);
    assert.doesNotMatch(await reviewLetter.innerText(), /ONDANSETRON/, "set aside on the card leaves the letter");
    await page.getByRole("button", { name: "Previous question" }).click();
    await page.getByRole("button", { name: "Ask about this after all" }).click();
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).setAside.length === 0, KEY);
    assert.match(await reviewLetter.innerText(), /ONDANSETRON/);
    // "See it on the bill" hands over to the whole bill with the lines marked.
    await page.getByRole("button", { name: "See it on the bill" }).click();
    await page.waitForURL("**/review?view=bill");
    await page.waitForFunction(() => document.activeElement?.id === "open-a04");
    await activeQuestions(page).nth(5).waitFor();
    assert.equal(await activeQuestions(page).count(), 6);
    assert.equal(await page.locator(".ledger tbody tr").count(), 17);
    await noOverflow(page, `review ${width}`);
    await page.screenshot({ path: `artifacts/review-${width}${a11y ? "-a11y" : ""}.png`, fullPage: true });
    await audit(page, width, "review");

    // Keyboard: open the arithmetic question, jump to its line, open it, correct it.
    const mathQuestion = activeQuestions(page).filter({ hasText: "total doesn't match its price × quantity" });
    await mathQuestion.locator("summary").focus();
    await page.keyboard.press("Enter");
    await mathQuestion.getByText("$21.00 × 4 is $84.00").waitFor();
    await mathQuestion.getByRole("button", { name: "Show on bill" }).click();
    assert.equal(await focusedId(page), "open-a13", "Show on bill moves focus to the line");
    // The highlighter marks the line as one piece: per cell on the desktop table, on the whole entry
    // once rows reflow (cells there have gaps, so per-cell marks read as broken stripes).
    const paint = await page.locator("#line-a13").evaluate(row => ({ row: getComputedStyle(row).backgroundImage, cell: getComputedStyle(row.cells[1]).backgroundImage }));
    if (width <= 720) assert.ok(paint.row.includes("gradient") && paint.cell === "none", `reflowed highlight is one mark at ${width}: ${JSON.stringify(paint)}`);
    else assert.ok(paint.cell.includes("gradient"), `table highlight sweeps cells at ${width}`);
    await page.keyboard.press("Enter");
    const line = page.getByRole("dialog", { name: "ONDANSETRON 1 MG INJ" });
    await line.waitFor();
    await line.getByText("Ondansetron, per 1 mg.").waitFor();
    await audit(page, width, "line-detail");
    await line.getByLabel("Line total ($)").fill("abc");
    await line.getByRole("button", { name: "Save correction" }).click();
    await line.getByText("Enter the line total, like 186.00.").waitFor();
    // The quantity came across wrong: 5 × $21.00 is the printed $105.00, so the arithmetic question resolves
    // without disturbing the bill total.
    await line.getByLabel("Line total ($)").fill("105.00");
    await line.getByLabel("Quantity").fill("5");
    await line.getByRole("button", { name: "Save correction" }).click();
    await line.getByRole("status").filter({ hasText: "Correction saved" }).waitFor();
    await page.waitForFunction(() => document.querySelectorAll("ol.findings > li").length === 5);
    await page.keyboard.press("Escape");
    await line.waitFor({ state: "hidden" });
    assert.equal(await focusedId(page), "open-a13", "focus returns to the line after closing");

    // Mark a line as not received, then set aside the duplicate question.
    await page.locator("#open-a07").click();
    const ecg = page.getByRole("dialog", { name: "ECG TRACING" });
    await ecg.getByLabel("I don't think I received this").check();
    await page.keyboard.press("Escape");
    await activeQuestions(page).filter({ hasText: "You don't recognize “ECG TRACING”" }).waitFor();
    const duplicate = activeQuestions(page).filter({ hasText: "appears 2 times" });
    await duplicate.locator("summary").click();
    await duplicate.getByRole("button", { name: /Set aside/ }).click();
    await page.getByText("Set aside (1)").waitFor();
    assert.equal(await activeQuestions(page).count(), 5);

    // Bill details: a missing EOB disables that check; restoring it brings the question back.
    await page.getByRole("button", { name: "Edit bill details" }).click();
    const details = page.getByRole("dialog", { name: "Bill details" });
    await audit(page, width, "bill-details");
    await details.getByLabel("Patient responsibility on your EOB").fill("");
    await details.getByLabel("Amount due").fill("1,890.00");
    await details.getByRole("button", { name: "Save details" }).click();
    await details.waitFor({ state: "hidden" });
    await page.waitForFunction(() => document.querySelectorAll("ol.findings > li").length === 4);
    await page.locator(".prompt-list").filter({ hasText: "your EOB's patient responsibility" }).waitFor();

    // Reload keeps every edit.
    await page.reload();
    await page.waitForFunction(() => document.querySelectorAll("ol.findings > li").length === 4);
    await page.getByText("Set aside (1)").waitFor();

    // Failed analysis keeps the last results, marked out of date, with retry.
    expectedServerError = true;
    await page.route("**/api/analyze", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { message: "Fixture outage." } }) }));
    await page.locator("#open-a02").click();
    await page.getByRole("dialog").getByLabel("I'm not sure what this is").check();
    await page.keyboard.press("Escape");
    await page.getByRole("alert").filter({ hasText: "these results are from before it" }).waitFor();
    assert.equal(await page.locator("ol.findings.is-stale").count(), 1);
    await page.unroute("**/api/analyze");
    await page.getByRole("button", { name: "Try again" }).click();
    await page.waitForFunction(() => document.querySelectorAll("ol.findings > li").length === 5 && !document.querySelector(".is-stale"));
    expectedServerError = false;

    // Letter: details, included questions, editing and download.
    await page.getByRole("link", { name: /Draft the letter/ }).first().click();
    await page.waitForURL("**/letter");
    const letter = page.getByLabel("Letter text");
    await page.getByLabel("Your name").fill("Jordan Avery");
    await page.waitForFunction(() => document.querySelector(".letter-text")?.value.includes("Jordan Avery"));
    const text = await letter.inputValue();
    assert.match(text, /Re: Questions about account SO-48213-ER/);
    assert.match(text, /I don't believe I received “ECG TRACING”/);
    assert.doesNotMatch(text, /VENIPUNCTURE/, "set-aside questions are not in the letter");
    await page.getByRole("checkbox", { name: /ECG TRACING/ }).uncheck();
    await page.waitForFunction(() => !document.querySelector(".letter-text")?.value.includes("ECG TRACING"));
    await audit(page, width, "letter");
    await page.screenshot({ path: `artifacts/letter-${width}${a11y ? "-a11y" : ""}.png`, fullPage: true });
    await letter.press("End");
    await letter.pressSequentially(" P.S. Account holder since 2019.");
    await page.getByText("Edited by you").waitFor();
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download .txt" }).click()]);
    assert.match(download.suggestedFilename(), /^cedar-hollow-regional-medical-center-inquiry-\d{4}-\d{2}-\d{2}\.txt$/);
    assert.match(await readFile(await download.path(), "utf8"), /P\.S\. Account holder since 2019\./);
    await page.getByRole("checkbox", { name: /Ask about financial assistance/ }).check();
    await page.getByText("Your questions or details changed after you started editing.").waitFor();
    await page.getByRole("button", { name: "Rebuild the letter…" }).click();
    await page.getByRole("button", { name: "Replace my edits" }).click();
    await page.waitForFunction(() => document.querySelector(".letter-text")?.value.includes("financial assistance policy"));
    assert.doesNotMatch(await letter.inputValue(), /P\.S\./);

    // Upload: unsupported files explain themselves and never replace the open bill.
    await page.goto(origin + "/start");
    const fileInput = page.getByLabel("CSV file of line items");
    expectedServerError = true;
    await fileInput.setInputFiles({ name: "bill.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7") });
    await page.getByRole("button", { name: "Read this file" }).click();
    await page.getByRole("alert").filter({ hasText: "PDF bills can't be read yet" }).waitFor();
    await fileInput.setInputFiles({ name: "bill.csv", mimeType: "text/csv", buffer: Buffer.from("when,what\n1,2") });
    await page.getByRole("button", { name: "Read this file" }).click();
    await page.getByRole("alert").filter({ hasText: "Missing: date, description, amount" }).waitFor();
    expectedServerError = false;
    await page.getByText("Cedar Hollow Regional Medical Center").first().waitFor();
    // A good file with one bad row asks before replacing, then reports the skipped row by line.
    await fileInput.setInputFiles({ name: "bill.csv", mimeType: "text/csv", buffer: Buffer.from("date,code,description,quantity,unit_price,amount\n2026-03-01,85025,CBC,1,186,186\n2026-03-01,85025,CBC,1,186,186\n03/02/2026,,MISC SUPPLIES,,,$40\nnot-a-date,x,y,1,,1\n") });
    await page.getByRole("button", { name: "Read this file" }).click();
    const replace = page.getByRole("dialog", { name: "Replace the bill in progress?" });
    await replace.waitFor();
    await audit(page, width, "replace-confirm");
    await replace.getByRole("button", { name: "Replace it" }).click();
    await page.getByText("Imported 3 lines.").waitFor();
    await page.getByText("Line 5: Skipped: date \"not-a-date\"").waitFor();
    await page.getByRole("link", { name: "Continue to review" }).click();
    await page.getByRole("heading", { level: 1, name: "Untitled bill" }).waitFor();
    await wholeBill(page);
    await page.waitForFunction(() => document.querySelectorAll("ol.findings > li").length === 2);
    assert.equal(await page.locator(".synthetic-band").count(), 0, "uploaded bills are not labeled synthetic");
    await page.locator(".prompt-list").filter({ hasText: "your visit dates" }).waitFor();

    // Blank bill: empty ledger, add the first line by keyboard.
    await page.goto(origin + "/start");
    await page.getByRole("button", { name: "Start a blank bill" }).click();
    await page.getByRole("dialog", { name: "Replace the bill in progress?" }).getByRole("button", { name: "Replace it" }).click();
    await page.getByRole("heading", { name: "No line items yet" }).waitFor();
    await page.getByRole("button", { name: "Add the first line" }).click();
    const add = page.getByRole("dialog", { name: "Add a line" });
    await add.getByLabel("Description").fill("Emergency room visit");
    await add.getByLabel("Date of service").fill("2026-09-01");
    // Tab can land on a date field's own calendar button; the field keeps its focus ring there.
    await add.getByLabel("Description").focus();
    const rings = [];
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
      rings.push(await add.getByLabel("Date of service").evaluate(el => el.matches(":focus-within") ? getComputedStyle(el).outlineStyle : null));
    }
    assert.ok(rings.some(Boolean) && rings.filter(Boolean).every(r => r === "solid"), `date field keeps a visible focus ring: ${JSON.stringify(rings)}`);
    await add.getByLabel("Line total ($)").fill("1200");
    await add.getByRole("button", { name: "Add line" }).click();
    await page.getByRole("dialog", { name: "Emergency room visit" }).waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Emergency room visit" }).waitFor();
    await page.getByText("No questions raised.").waitFor();
    await noOverflow(page, `blank ${width}`);

    // Corrupt storage is reported and left untouched; blocked storage explains the tab lifetime.
    await page.evaluate(key => localStorage.setItem(key, "{not json"), KEY);
    await page.reload();
    await page.getByRole("heading", { name: /There.s no bill to review/ }).waitFor();
    await page.getByRole("status").filter({ hasText: "couldn't be read" }).waitFor();
    assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), "{not json");
    await page.goto(origin + "/start");
    await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error("Storage blocked by fixture"); }; });
    await page.getByRole("button", { name: "Open Three-night hospital stay" }).click();
    await page.waitForURL("**/review");
    await page.getByRole("status").filter({ hasText: "isn't letting Second Opinion save" }).waitFor();
    await wholeBill(page);
    await page.waitForFunction(() => document.querySelectorAll("ol.findings > li").length === 6);
    await page.getByText("4 room days billed for a 3-night stay").waitFor();
    const wrappedCodes = await page.locator(".ledger .col-code .mono").evaluateAll(els => els.filter(el => el.getBoundingClientRect().height > 24).map(el => el.textContent));
    assert.deepEqual(wrappedCodes, [], "billing identifiers remain on one line");
    await page.screenshot({ path: `artifacts/review-stay-${width}${a11y ? "-a11y" : ""}.png`, fullPage: true });
    await context.close();
  }

  // With motion on, keeping a question sends its number chip into the letter, and the chip is gone
  // when it lands. A live switch to reduced motion stops a flight at once, and with reduced motion
  // there is no flight at all: the letter still changes.
  const moving = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
  const fly = await moving.newPage();
  fly.on("pageerror", e => errors.push(`motion: ${e.message}`));
  await fly.goto(origin);
  const flyDemo = fly.locator(".hero-demo");
  // Bring the control into view first, as a person scrolling to it does; the flight only runs to a letter on screen.
  const keep = flyDemo.getByRole("button", { name: "Ask about this", exact: true });
  await keep.scrollIntoViewIfNeeded();
  await keep.click();
  await fly.locator(".chip-flight").waitFor({ state: "attached", timeout: 400 });
  await fly.waitForFunction(() => !document.querySelector(".chip-flight"), null, { timeout: 2000 });
  assert.equal(await flyDemo.locator(".letter-preview p[data-current]").count(), 1, "the letter marks the question on the card");
  await flyDemo.getByRole("button", { name: "Set aside", exact: true }).click();
  await flyDemo.getByRole("button", { name: "Previous question" }).click();
  const restore = flyDemo.getByRole("button", { name: "Ask about this after all" });
  await restore.scrollIntoViewIfNeeded();
  await restore.click();
  await fly.locator(".chip-flight").waitFor({ state: "attached", timeout: 400 });
  await fly.emulateMedia({ reducedMotion: "reduce" });
  await fly.waitForFunction(() => !document.querySelector(".chip-flight"), null, { timeout: 500 });
  await flyDemo.getByRole("button", { name: "Ask about this", exact: true }).click();
  assert.equal(await fly.locator(".chip-flight").count(), 0, "reduced motion has no flight");
  await moving.close();
  // Touch: the decision dock stays under the thumb while a long question is read.
  const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const tapper = await touch.newPage();
  await tapper.goto(origin);
  const tapDemo = tapper.locator(".hero-demo");
  await tapDemo.getByRole("button", { name: "Set aside", exact: true }).tap();
  await tapDemo.getByRole("button", { name: "Set aside", exact: true }).tap();
  assert.equal(await tapDemo.locator('.dot[data-state="aside"]').count(), 2, "each tap decides one question");
  await touch.close();

  // Empty workspace pages.
  const fresh = await browser.newContext({ viewport: { width: 390, height: 800 }, reducedMotion: "reduce" });
  const empty = await fresh.newPage();
  await empty.goto(origin + "/letter");
  await empty.getByRole("heading", { name: "Start with a bill to draft a letter." }).waitFor();
  await audit(empty, 390, "empty-letter");
  await empty.goto(origin + "/method");
  await empty.getByRole("heading", { level: 1 }).waitFor();
  await noOverflow(empty, "method 390");
  await audit(empty, 390, "method");
  await fresh.close();

  await reviewBrowserChecks(browser, origin, audit);
  await redesignBrowserChecks(browser, origin, audit);
  const health = await fetch(origin + "/api/health");
  assert.equal(health.status, 200);
  assert.equal((await health.json()).persistence, "browser-local");
  assert.match(health.headers.get("content-security-policy") ?? "", /connect-src 'self'/);
  assert.equal((await (await fetch(origin + "/api/samples")).json()).samples.length, 2);
  const invalid = await fetch(origin + "/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  assert.equal(invalid.status, 400);
  assert.deepEqual(errors, [], "browser console errors");
  console.log(a11y ? "Accessibility passed at 1440, 768, 390px across landing, landing questions, start, review questions, whole bill, line, bill details, replace, letter, empty and method states" : "Questions deck, review, correction, marks, set-aside, persistence, analysis failure, letter export, upload errors, blank bill, storage recovery, chip flight, API and responsive screenshots passed");
} finally {
  await browser?.close();
  if (!exited) { server.kill("SIGTERM"); await Promise.race([exit, delay(5000)]); }
  if (!exited) { server.kill("SIGKILL"); await exit; }
}
