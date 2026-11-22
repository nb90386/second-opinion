import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { analyzeBill } from "../lib/analysis.ts";
import { BillSchema, emptyBill, type LineItem } from "../lib/bill.ts";
import { CaseSchema, newCase } from "../lib/case.ts";
import { importBillCsv } from "../lib/csv.ts";
import { composeLetter, DEFAULT_OPTIONS, EMPTY_SENDER, letterForExport } from "../lib/letter.ts";
import { POST as analyze } from "../app/api/analyze/route.ts";
import { readCapped, BodyTooLarge } from "../lib/http.ts";
import { isRoomAndBoardCode } from "../lib/glossary.ts";
import { parseMoney } from "../lib/money.ts";

const line = (i: number): LineItem => ({ id: `m${String(i).padStart(39, "0")}`, date: "2026-01-01", code: "85025", description: "Misc supplies", quantity: 1, unitPrice: 100, amount: 200, mark: "not-received", note: "" });

test("500-line findings and edited generated letters survive the storage schema", () => {
  const bill = { ...emptyBill("large", "manual"), lineItems: Array.from({ length: 500 }, (_, i) => line(i)) };
  assert.ok(BillSchema.safeParse(bill).success);
  const findings = analyzeBill(bill).findings;
  assert.ok(findings.some(f => f.id.length > 400));
  assert.ok(findings.length > 1000);
  const current = newCase(bill, "2026-10-29");
  current.setAside = findings.map(f => f.id);
  current.letter.excluded = [...current.setAside];
  const draft = composeLetter({ bill, findings, sender: EMPTY_SENDER, options: DEFAULT_OPTIONS, today: "2026-10-29" });
  assert.ok(draft.length > 20000);
  current.letter.draft = draft + "\nMy additional note.";
  current.letter.draftBasis = draft;
  assert.ok(CaseSchema.safeParse(JSON.parse(JSON.stringify(current))).success);
});

test("money rejects ambiguous signs and internal digit whitespace", () => {
  for (const bad of ["(-5)", "(-$5)", "1 2.00", "1\n2.00"]) assert.equal(parseMoney(bad), null, bad);
  assert.equal(parseMoney(" ($1,234.50) "), -123450);
});

test("room nights accept spreadsheet revenue codes and exclude leave-of-absence codes", () => {
  assert.equal(isRoomAndBoardCode("120"), true);
  assert.equal(isRoomAndBoardCode("0120"), true);
  assert.equal(isRoomAndBoardCode("0180"), false);
  const bill = { ...emptyBill("leave", "manual"), careSetting: "inpatient" as const, admitDate: "2026-01-01", dischargeDate: "2026-01-02", lineItems: [{ ...line(0), code: "0180", description: "Room and board - leave of absence", quantity: 4, unitPrice: 100, amount: 400, mark: "none" as const }] };
  assert.equal(analyzeBill(bill).findings.some(f => f.rule === "room-nights"), false);
});

test("CSV rejects characters after a closing quote and ambiguous amount columns", () => {
  assert.throws(() => importBillCsv('date,description,amount\n2026-01-01,Test,"12"34', "csv"), /quot/i);
  assert.throws(() => importBillCsv("date,description,amount,total\n2026-01-01,Test,12,34", "csv"), /column/i);
});

test("CSV does not silently truncate descriptions or omit skipped-row reports", () => {
  const rows = ["date,description,amount", "2026-01-01,Good,12", `2026-01-01,${"x".repeat(161)},34`, ...Array.from({ length: 60 }, () => "bad,Invalid,12")];
  const result = importBillCsv(rows.join("\n"), "csv");
  assert.equal(result.imported, 1);
  assert.equal(result.problems.length, 61);
  assert.equal(result.problems[0].line, 3);
  assert.match(result.problems[0].message, /description/i);
});

test("example export labels survive editing while real letters are unchanged", () => {
  const bill = emptyBill("sample", "sample");
  assert.match(letterForExport(bill, "My edited letter"), /^SYNTHETIC EXAMPLE.*Do not send\.\n\nMy edited letter$/);
  assert.equal(letterForExport({ ...bill, origin: "manual" }, "My letter"), "My letter");
});

test("the downloadable template remains importable and labels every fictional price row", () => {
  const csv = readFileSync(new URL("../public/second-opinion-template.csv", import.meta.url), "utf8");
  const result = importBillCsv(csv, "template");
  assert.equal(result.imported, 3);
  assert.equal(result.problems.length, 0);
  assert.ok(result.bill.lineItems.every(line => line.description.startsWith("SYNTHETIC EXAMPLE - replace:")));
});

test("streamed bodies are capped without trusting Content-Length and cancel promptly", async () => {
  let cancelled = false;
  const body = new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(32)); },
    cancel() { cancelled = true; },
  });
  const request = new Request("http://localhost/api", { method: "POST", body, duplex: "half", headers: { "content-length": "1" } } as RequestInit);
  await assert.rejects(() => readCapped(request, 40), BodyTooLarge);
  assert.equal(cancelled, true);
});

test("analysis rejects hostile structure, invalid UTF-8 and too many lines without reflecting bill text", async () => {
  const bill = emptyBill("hostile", "manual");
  const post = (body: BodyInit) => analyze(new Request("http://localhost/api/analyze", { method: "POST", body, headers: { "content-type": "application/json" } }));
  assert.equal((await post(new Uint8Array([0xff]))).status, 400);
  const tooMany = await post(JSON.stringify({ ...bill, lineItems: Array.from({ length: 501 }, (_, i) => line(i)) }));
  assert.equal(tooMany.status, 400);
  const injected = await post(JSON.stringify({ ...bill, provider: "PRIVATE BILL TEXT", lineItems: [{ ...line(0), description: "PRIVATE BILL TEXT", quantity: -1 }], untrusted: "PRIVATE BILL TEXT" }));
  assert.equal(injected.status, 400);
  assert.equal(injected.headers.get("cache-control"), "no-store");
  assert.doesNotMatch(await injected.text(), /PRIVATE BILL TEXT/);
});
