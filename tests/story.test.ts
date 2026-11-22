import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeBill } from "../lib/analysis.ts";
import { getSample } from "../lib/samples.ts";
import { buildStory, FOOTER } from "../lib/story.ts";

const bill = getSample("emergency-visit");
assert.ok(bill);

test("the landing walk-through is the example bill as the engine reads it", () => {
  const story = buildStory(bill, "2026-09-29");
  const { findings } = analyzeBill(bill);
  assert.equal(story.lines.length, bill.lineItems.length);
  assert.equal(story.questions.length, findings.length);
  assert.deepEqual(story.questions.map(q => q.title), findings.map(f => f.title));
  assert.deepEqual(story.chapters.map(c => c.key), ["statement", "translate", "duplicate", "math", "expensive", "eob", "questions", "letter"]);

  const math = story.chapters.find(c => c.key === "math");
  assert.equal(math?.note?.text, "4 × $21.00 is $84.00, not $105.00.");
  assert.deepEqual(math?.circle, ["a13"]);
  assert.deepEqual(story.chapters.find(c => c.key === "duplicate")?.focus, ["a04", "a05"]);
  // The "expensive" chapter picks the largest line no rule flagged, proving price alone raises nothing.
  const expensive = story.chapters.find(c => c.key === "expensive");
  assert.deepEqual(expensive?.focus, ["a08"]);
  assert.equal(story.lines.find(l => l.id === "a08")?.refs.length, 0);
  assert.equal(story.chapters.find(c => c.key === "eob")?.note?.anchor, FOOTER);
  assert.deepEqual(story.footerRefs, [{ number: 1, level: "discrepancy" }]);
  assert.equal(story.adjustments, "-$10,148.00");
});

test("the walk-through letter carries every question, numbered, and nothing after them", () => {
  const story = buildStory(bill, "2026-09-29");
  assert.match(story.letter, /^To the billing office:/);
  for (let n = 1; n <= story.questions.length; n++) assert.match(story.letter, new RegExp(`^${n}\\. `, "m"));
  assert.doesNotMatch(story.letter, /Sincerely|on hold/);
});

test("chapters that depend on a finding are left out when the bill doesn't raise it", () => {
  const clean = { ...bill, eobResponsibility: null, lineItems: bill.lineItems.filter(l => !["a05", "a13"].includes(l.id)) };
  const keys = buildStory(clean, "2026-09-29").chapters.map(c => c.key);
  assert.ok(!keys.includes("duplicate") && !keys.includes("math") && !keys.includes("eob"));
  assert.deepEqual(keys.slice(-2), ["questions", "letter"]);
});
