import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeBill, isGenericDescription, type RuleId } from "../lib/analysis.ts";
import { BillSchema, emptyBill, type Bill, type LineItem } from "../lib/bill.ts";
import { getSample, listSamples } from "../lib/samples.ts";

const line = (id: string, overrides: Partial<LineItem> = {}): LineItem => ({
  id, date: "2026-03-01", code: "85025", description: "CBC", quantity: 1, unitPrice: 10000, amount: 10000, mark: "none", note: "", ...overrides,
});
const bill = (lineItems: LineItem[], overrides: Partial<Bill> = {}): Bill => ({ ...emptyBill("t", "manual"), lineItems, ...overrides });
const rules = (b: Bill): RuleId[] => analyzeBill(b).findings.map(f => f.rule);

test("samples are valid bills and raise exactly their designed findings", () => {
  assert.equal(listSamples().length, 2);
  const er = getSample("emergency-visit");
  const stay = getSample("three-night-stay");
  assert.ok(er && stay);
  assert.ok(BillSchema.safeParse(er).success);
  assert.ok(BillSchema.safeParse(stay).success);
  assert.deepEqual(rules(er).sort(), ["duplicate", "eob-balance", "itemize", "itemize", "line-math", "outside-stay"]);
  assert.deepEqual(rules(stay).sort(), ["bill-total", "duplicate", "good-faith-estimate", "itemize", "outside-stay", "room-nights"]);
});

test("a high price alone is never flagged", () => {
  const result = analyzeBill(bill([line("a", { code: "74177", description: "CT", unitPrice: 9_999_900, amount: 9_999_900 })]));
  assert.deepEqual(result.findings, []);
});

test("line arithmetic flags overcharges with the exact difference and tolerates a cent of rounding", () => {
  const [finding] = analyzeBill(bill([line("a", { quantity: 4, unitPrice: 2100, amount: 10500 })])).findings;
  assert.equal(finding.rule, "line-math");
  assert.equal(finding.level, "discrepancy");
  assert.equal(finding.amountInQuestion, 2100);
  assert.deepEqual(rules(bill([line("a", { quantity: 3, unitPrice: 333, amount: 1000 })])), []);
  const under = analyzeBill(bill([line("a", { quantity: 2, unitPrice: 1000, amount: 1500 })])).findings[0];
  assert.equal(under.amountInQuestion, null, "an undercharge is reported without an amount in question");
});

test("exact duplicates require every field to match; extra copies are the amount in question", () => {
  const found = analyzeBill(bill([line("a"), line("b"), line("c")])).findings;
  assert.equal(found.length, 1);
  assert.equal(found[0].rule, "duplicate");
  assert.deepEqual(found[0].lineIds, ["a", "b", "c"]);
  assert.equal(found[0].amountInQuestion, 20000);
  assert.deepEqual(rules(bill([line("a"), line("b", { date: "2026-03-02" })])), [], "different days are not duplicates");
  assert.deepEqual(rules(bill([line("a", { amount: -10000, unitPrice: -10000 }), line("b", { amount: -10000, unitPrice: -10000 })])), [], "credits are ignored");
});

test("same code on the same day with different details asks for detail", () => {
  assert.deepEqual(rules(bill([line("a"), line("b", { amount: 12000, unitPrice: 12000 })])), ["repeated-code"]);
});

test("room nights compare billed room days with midnights between admission and discharge", () => {
  const stay = { careSetting: "inpatient" as const, admitDate: "2026-06-02", dischargeDate: "2026-06-05" };
  const room = (quantity: number) => line("r", { date: "2026-06-02", code: "0120", description: "SEMI-PRIVATE", quantity, unitPrice: 300000, amount: 300000 * quantity });
  const [finding] = analyzeBill(bill([room(4)], stay)).findings;
  assert.equal(finding.rule, "room-nights");
  assert.equal(finding.title, "4 room days billed for a 3-night stay");
  assert.equal(finding.amountInQuestion, 300000);
  assert.deepEqual(rules(bill([room(3)], stay)), []);
  const check = analyzeBill(bill([room(3)], { ...stay, careSetting: "emergency" })).checks.find(c => c.rule === "room-nights");
  assert.equal(check?.status, "not-run");
  assert.deepEqual(rules(bill([line("r", { date: "2026-06-02", code: "", description: "Room & Board - Semi", quantity: 5, unitPrice: 1000, amount: 5000 })], stay)), ["room-nights"]);
});

test("outside-stay groups every charge dated before admission or after discharge", () => {
  const dates = { admitDate: "2026-03-01", dischargeDate: "2026-03-02" };
  const found = analyzeBill(bill([line("a", { date: "2026-02-28" }), line("b"), line("c", { date: "2026-03-04", code: "80053" })], dates)).findings;
  assert.equal(found.length, 1);
  assert.deepEqual(found[0].lineIds, ["a", "c"]);
  assert.equal(found[0].amountInQuestion, 20000);
  assert.equal(analyzeBill(bill([line("a")])).checks.find(c => c.rule === "outside-stay")?.status, "not-run");
});

test("bill total and EOB checks compare only the user's own documents", () => {
  assert.deepEqual(rules(bill([line("a")], { statedTotal: 10000 })), []);
  const total = analyzeBill(bill([line("a")], { statedTotal: 15000 })).findings[0];
  assert.equal(total.rule, "bill-total");
  assert.equal(total.amountInQuestion, 5000);
  const eob = analyzeBill(bill([line("a")], { amountDue: 9000, eobResponsibility: 4000 })).findings[0];
  assert.equal(eob.rule, "eob-balance");
  assert.equal(eob.amountInQuestion, 5000);
  assert.deepEqual(rules(bill([line("a")], { amountDue: 4000, eobResponsibility: 4000 })), []);
});

test("Good Faith Estimate applies only to self-pay bills at least $400 over", () => {
  const base = { coverage: "self-pay" as const, goodFaithEstimate: 10000, statementDate: "2026-07-10" };
  const [finding] = analyzeBill(bill([line("a", { unitPrice: 50000, amount: 50000 })], base)).findings;
  assert.equal(finding.rule, "good-faith-estimate");
  assert.equal(finding.amountInQuestion, 40000);
  assert.match(finding.next ?? "", /November 7, 2026/);
  assert.deepEqual(rules(bill([line("a", { unitPrice: 49999, amount: 49999 })], base)), []);
  assert.deepEqual(rules(bill([line("a", { unitPrice: 90000, amount: 90000 })], { ...base, coverage: "insured" })), []);
});

test("generic descriptions are recognized without catching specific ones", () => {
  for (const generic of ["PHARMACY", "MISC MED/SURG SUPPLIES", "Supplies", "Lab", "General pharmacy", "SUNDRY"]) assert.ok(isGenericDescription(generic), generic);
  for (const specific of ["CBC W/ AUTO DIFF", "PHARMACY - ONDANSETRON 4 MG", "Lab - troponin"]) assert.ok(!isGenericDescription(specific), specific);
});

test("patient marks become findings and findings are ordered by level", () => {
  const result = analyzeBill(bill([line("a", { mark: "unsure" }), line("b", { code: "80053", mark: "not-received", note: "Never had this" }), line("c", { code: "x", quantity: 2, amount: 1 })]));
  assert.deepEqual(result.findings.map(f => f.rule), ["line-math", "not-received", "unsure"]);
  assert.equal(result.findings[1].amountInQuestion, 10000);
  assert.ok(result.findings[1].facts.some(f => f.value === "Never had this"));
  assert.equal(result.flaggedLineCount, 3);
});

test("finding ids are deterministic so set-aside choices survive re-analysis", () => {
  const sample = getSample("emergency-visit") as Bill;
  assert.deepEqual(analyzeBill(sample).findings.map(f => f.id), analyzeBill(getSample("emergency-visit") as Bill).findings.map(f => f.id));
});
