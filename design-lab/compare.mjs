// Captures every concept × view × width with one harness, runs axe (WCAG 2.1 A/AA) per view,
// measures overflow, console errors and first-screen weight. Output: shots/compare/*.png + compare.json
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.STUDIO_PLAYWRIGHT || "/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright");
const AXE = readFileSync(process.env.STUDIO_AXE || "/Users/edge/Forge/projects/forge-first-build/dashboard/node_modules/.pnpm/axe-core@4.14.0/node_modules/axe-core/axe.min.js", "utf8");
const concepts = (process.argv[2] || "a-case-file,b-examination-desk,c-publication,d-one-question").split(",");
const widths = [1440, 768, 390];
const views = ["front", "review", "letter"];
mkdirSync("shots/compare", { recursive: true });
const browser = await chromium.launch();
const results = [];
for (const c of concepts) for (const v of views) for (const w of widths) {
  const page = await browser.newPage({ viewport: { width: w, height: w < 500 ? 844 : 900 } });
  const errors = [];
  page.on("console", m => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", e => errors.push(e.message));
  const t0 = Date.now();
  await page.goto(`file://${process.cwd()}/${c}/index.html#${v}`);
  await page.waitForTimeout(1600);
  const loadMs = Date.now() - t0;
  await page.screenshot({ path: `shots/compare/${c}-${v}-${w}.png` });
  await page.screenshot({ path: `shots/compare/${c}-${v}-${w}-full.png`, fullPage: true });
  const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: innerWidth, h: document.documentElement.scrollHeight, h1: [...document.querySelectorAll("h1")].filter(e => e.offsetParent).map(e => e.textContent.trim()) }));
  await page.addScriptTag({ content: AXE });
  const axe = await page.evaluate(async () => { const r = await axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] }); return r.violations.map(x => ({ id: x.id, impact: x.impact, n: x.nodes.length })); });
  results.push({ concept: c, view: v, width: w, overflow: m.sw > m.vw, pageHeight: m.h, h1: m.h1, axe, errors, loadMs });
  await page.close();
}
// Source weight per concept
for (const c of concepts) {
  let bytes = 0; for (const f of ["index.html", "styles.css", "app.js"]) { try { bytes += readFileSync(`${c}/${f}`).length; } catch {} }
  results.push({ concept: c, sourceBytes: bytes });
}
await browser.close();
writeFileSync("shots/compare/compare.json", JSON.stringify(results, null, 1));
for (const r of results) if (r.view) console.log(`${r.concept.padEnd(20)} ${r.view.padEnd(7)} ${String(r.width).padEnd(5)} overflow:${r.overflow ? "YES" : "no "} axe:${r.axe.map(a => a.id + "×" + a.n).join(",") || "0"} err:${r.errors.length} h1:${r.h1.join("|").slice(0, 50)}`); else console.log(r);
