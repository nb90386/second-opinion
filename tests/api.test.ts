import assert from "node:assert/strict";
import { test } from "node:test";
import { POST as analyze } from "../app/api/analyze/route.ts";
import { POST as parse } from "../app/api/bills/parse/route.ts";
import { GET as health } from "../app/api/health/route.ts";
import { GET as sample } from "../app/api/samples/[id]/route.ts";
import { GET as samples } from "../app/api/samples/route.ts";
import { composeLetter, DEFAULT_OPTIONS, EMPTY_SENDER } from "../lib/letter.ts";
import { analyzeBill } from "../lib/analysis.ts";
import { getSample } from "../lib/samples.ts";
import { BillSchema, emptyBill, newBillId, type Bill } from "../lib/bill.ts";

const post = (body: BodyInit, type: string) => new Request("http://127.0.0.1/api", { method: "POST", body, headers: { "content-type": type } });
const upload = (contents: BlobPart, name: string, type = "text/csv") => {
  const form = new FormData();
  form.set("file", new File([contents], name, { type }));
  return new Request("http://127.0.0.1/api/bills/parse", { method: "POST", body: form });
};
const params = (id: string) => ({ params: Promise.resolve({ id }) });

test("health states the browser-local, no-retention boundary", async () => {
  const body = await health().json();
  assert.equal(body.persistence, "browser-local");
  assert.equal(body.retention, "none");
});

test("samples are listed, fetched by id and 404 otherwise", async () => {
  assert.equal((await samples().json()).samples.length, 2);
  const found = await sample(new Request("http://x"), params("emergency-visit"));
  assert.equal((await found.json()).bill.provider, "Cedar Hollow Regional Medical Center");
  assert.equal((await sample(new Request("http://x"), params("nope"))).status, 404);
});

test("analyze validates strictly and returns findings", async () => {
  const bill = getSample("emergency-visit") as Bill;
  const ok = await analyze(post(JSON.stringify(bill), "application/json"));
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("cache-control"), "no-store");
  assert.equal((await ok.json()).analysis.findings.length, 6);
  assert.equal((await analyze(post("{", "application/json"))).status, 400);
  assert.equal((await analyze(post(JSON.stringify(bill), "text/plain"))).status, 415);
  const extra = await analyze(post(JSON.stringify({ ...bill, injected: true }), "application/json"));
  assert.equal(extra.status, 400, "unknown keys are rejected");
  const invalid = await analyze(post(JSON.stringify({ ...bill, lineItems: [{ ...bill.lineItems[0], amount: 1.5 }] }), "application/json"));
  const problem = await invalid.json();
  assert.equal(problem.error.code, "invalid_bill");
  assert.equal(problem.error.issues[0].path, "lineItems.0.amount");
  assert.equal((await analyze(post("x".repeat(600 * 1024), "application/json"))).status, 413);
});

test("CSV upload parses safe files and rejects others with specific messages", async () => {
  const good = await parse(upload("date,description,amount\n2026-01-02,CBC,186\nbad,row,1", "bill.csv"));
  assert.equal(good.status, 200);
  const body = await good.json();
  assert.equal(body.imported, 1);
  assert.equal(body.problems[0].line, 3);
  assert.match(body.bill.id, /^upload-/);
  assert.ok(BillSchema.safeParse(body.bill).success, "parsed bills satisfy the shared schema");
  const pdf = await parse(upload("%PDF-1.7", "bill.pdf", "application/pdf"));
  assert.equal(pdf.status, 415);
  assert.match((await pdf.json()).error.message, /PDF bills can't be read yet/);
  assert.equal((await parse(upload("x", "bill.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))).status, 415);
  assert.equal((await parse(upload(new Uint8Array([0x61, 0, 0x62]), "bill.csv"))).status, 422);
  assert.equal((await parse(upload("", "bill.csv"))).status, 400);
  assert.equal((await parse(upload("a".repeat(201 * 1024), "bill.csv"))).status, 413);
  assert.equal((await parse(post("date,amount", "text/csv"))).status, 415);
  const latin = await parse(upload(new Uint8Array([...new TextEncoder().encode("date,description,amount\n2026-01-02,Caf"), 0xe9, ...new TextEncoder().encode(",5")]), "bill.csv"));
  assert.equal((await latin.json()).bill.lineItems[0].description, "Café", "Windows-1252 files decode");
});

test("generated bill ids always satisfy the schema", () => {
  for (const prefix of ["upload", "manual"] as const) assert.ok(BillSchema.safeParse(emptyBill(newBillId(prefix), prefix)).success);
});

test("letter uses only supplied details, leaves placeholders and makes no legal claims", () => {
  const bill = getSample("three-night-stay") as Bill;
  const findings = analyzeBill(bill).findings;
  const letter = composeLetter({ bill, findings, sender: { ...EMPTY_SENDER, email: "pat@example.com" }, options: DEFAULT_OPTIONS, today: "2026-10-29" });
  assert.match(letter, /\[Your name\]/);
  assert.match(letter, /Re: Questions about account SO-77120-IP/);
  assert.match(letter, /Dates of service: June 2, 2026 to June 5, 2026/);
  assert.match(letter, /6\. /);
  assert.match(letter, /not referred to collections/);
  assert.equal(letter.match(/itemized statement/g)?.length, 2, "the opening line and the bill-total question; no duplicate generic request");
  assert.match(letter, /pat@example\.com/);
  assert.doesNotMatch(letter, /\b(fraud|illegal|law requires|entitled|violat)/i);
  const none = composeLetter({ bill, findings: [], sender: EMPTY_SENDER, options: { requestItemized: false, requestHold: false, askFinancialAssistance: true }, today: "2026-10-29" });
  assert.match(none, /would like more detail/);
  assert.match(none, /financial assistance policy/);
});
