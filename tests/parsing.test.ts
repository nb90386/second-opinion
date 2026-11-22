import assert from "node:assert/strict";
import { test } from "node:test";
import { BillSchema } from "../lib/bill.ts";
import { CsvError, importBillCsv, parseCsvText, TEMPLATE_HEADER } from "../lib/csv.ts";
import { addDays, daysBetween, isIsoDate, parseCalendarDate } from "../lib/dates.ts";
import { formatCents, parseMoney } from "../lib/money.ts";

test("money parsing accepts common bill formats and rejects everything else", () => {
  assert.equal(parseMoney("$1,234.56"), 123456);
  assert.equal(parseMoney("1234"), 123400);
  assert.equal(parseMoney("12.5"), 1250);
  assert.equal(parseMoney("(12.00)"), -1200);
  assert.equal(parseMoney("-$5"), -500);
  for (const bad of ["", "abc", "1,23", "12.345", "1e5", "$", "--5", "10000000000"]) assert.equal(parseMoney(bad), null, bad);
  assert.equal(formatCents(123456), "$1,234.56");
});

test("dates are strict calendar dates in UTC", () => {
  assert.ok(isIsoDate("2026-02-28"));
  assert.ok(!isIsoDate("2026-02-30"));
  assert.equal(parseCalendarDate("8/14/2026"), "2026-08-14");
  assert.equal(parseCalendarDate("08/14/26"), null);
  assert.equal(daysBetween("2026-06-02", "2026-06-05"), 3);
  assert.equal(addDays("2026-07-10", 120), "2026-11-07");
});

test("CSV parsing handles quotes, embedded commas and newlines, CRLF and BOM", () => {
  const records = parseCsvText('﻿a,b\r\n"x, y","say ""hi""\nthere"\r\n\r\n3,4');
  assert.deepEqual(records.map(r => r.cells), [["a", "b"], ["x, y", 'say "hi"\nthere'], ["3", "4"]]);
  assert.deepEqual(records.map(r => r.line), [1, 2, 5]);
  assert.throws(() => parseCsvText('a,"open'), CsvError);
  assert.throws(() => parseCsvText("a\u0000b"), /binary/);
});

test("the template imports into a valid bill and reports bad rows by line number", () => {
  const csv = [
    TEMPLATE_HEADER,
    "2026-08-14,99285,ED VISIT LEVEL 5,1,2840.00,2840.00",
    "08/14/2026,36415,\"VENIPUNCTURE, ROUTINE\",,,$48.00",
    "2026-13-01,85025,CBC,1,186,186",
    "2026-08-14,,=HYPERLINK(\"x\"),1,,10",
    "2026-08-14,80053,CMP,two,,412",
  ].join("\n");
  const result = importBillCsv(csv, "upload-1");
  assert.equal(result.imported, 3);
  assert.ok(BillSchema.safeParse(result.bill).success);
  assert.equal(result.bill.lineItems[1].description, "VENIPUNCTURE, ROUTINE");
  assert.equal(result.bill.lineItems[1].quantity, 1);
  assert.equal(result.bill.lineItems[2].description, '=HYPERLINK("x")', "formula-like text stays inert text");
  assert.deepEqual(result.problems.map(p => p.line), [4, 6]);
  assert.match(result.problems[0].message, /date "2026-13-01"/);
  assert.equal(result.bill.admitDate, null, "visit dates are never inferred");
});

test("header aliases are recognized and missing required columns are named", () => {
  const result = importBillCsv("Service Date,CPT/HCPCS,Description,Units,Charges\n2026-01-02,85025,CBC,1,186", "u");
  assert.equal(result.bill.lineItems[0].amount, 18600);
  assert.throws(() => importBillCsv("date,code\n2026-01-01,1", "u"), /Missing: description, amount/);
  assert.throws(() => importBillCsv("date,description,amount\n", "u"), /no line items/);
  assert.throws(() => importBillCsv("date,description,amount\nx,y,z", "u"), /None of the 1 rows/);
});

test("row and cell limits are enforced", () => {
  const many = ["date,description,amount", ...Array.from({ length: 502 }, () => "2026-01-01,x,1")].join("\n");
  assert.throws(() => importBillCsv(many, "u"), /more than 500 line items/);
  assert.throws(() => parseCsvText(`a\n${"x".repeat(501)}`), /longer than 500/);
});
