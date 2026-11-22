// Screenshot helper for the lab: node shot.mjs <html path> <out prefix> [widths] [--full] [--action js]
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.STUDIO_PLAYWRIGHT || "/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright");
const [file, out, widthsArg = "1440,768,390", ...rest] = process.argv.slice(2);
const full = rest.includes("--full");
const ai = rest.indexOf("--action"); const action = ai >= 0 ? rest[ai + 1] : null;
const browser = await chromium.launch();
const errors = [];
for (const w of widthsArg.split(",").map(Number)) {
  const page = await browser.newPage({ viewport: { width: w, height: w < 500 ? 844 : 900 }, deviceScaleFactor: 1 });
  page.on("console", m => { if (m.type() === "error" || m.type() === "warning") errors.push(`${w}: ${m.text()}`); });
  page.on("pageerror", e => errors.push(`${w}: ${e.message}`));
  await page.goto(new URL(file, `file://${process.cwd()}/`).href);
  await page.waitForTimeout(1200);
  if (action) { await page.evaluate(action); await page.waitForTimeout(1200); }
  const sw = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  if (sw[0] > sw[1]) errors.push(`${w}: horizontal overflow ${sw[0]} > ${sw[1]}`);
  await page.screenshot({ path: `${out}-${w}.png`, fullPage: full });
  await page.close();
}
await browser.close();
console.log(errors.length ? errors.join("\n") : "no console errors, no overflow");
