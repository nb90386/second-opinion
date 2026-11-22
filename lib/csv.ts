import { emptyBill, LIMITS, LineItemSchema, type Bill, type LineItem } from "./bill.ts";
import { parseCalendarDate } from "./dates.ts";
import { parseMoney } from "./money.ts";

// Defensive CSV import. Text is parsed, never evaluated: a cell starting with "=" is just text.

export const CSV_LIMITS = { bytes: 200 * 1024, rows: LIMITS.lines, columns: 30, cell: 500 } as const;

export class CsvError extends Error {}

export interface CsvRecord { line: number; cells: string[] }

/** RFC 4180-style parsing: quoted fields, doubled quotes, CRLF or LF, optional BOM. */
export function parseCsvText(input: string): CsvRecord[] {
  const text = input.replace(/^﻿/, "");
  if (text.includes("\u0000")) throw new CsvError("This file contains binary data. Save the spreadsheet as CSV (comma-separated values) and try again.");
  const records: CsvRecord[] = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  let closedQuote = false;
  let line = 1;
  let recordLine = 1;
  const pushCell = () => {
    if (cell.length > CSV_LIMITS.cell) throw new CsvError(`A cell on line ${recordLine} is longer than ${CSV_LIMITS.cell} characters.`);
    cells.push(cell);
    cell = "";
    closedQuote = false;
    if (cells.length > CSV_LIMITS.columns) throw new CsvError(`Line ${recordLine} has more than ${CSV_LIMITS.columns} columns.`);
  };
  const pushRecord = () => {
    pushCell();
    if (cells.some(value => value.trim() !== "")) records.push({ line: recordLine, cells });
    if (records.length > CSV_LIMITS.rows + 1) throw new CsvError(`This file has more than ${CSV_LIMITS.rows} line items. Split it into smaller files.`);
    cells = [];
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') { quoted = false; closedQuote = true; }
      else { if (char === "\n") line++; cell += char; }
    } else if (closedQuote && char !== "," && char !== "\n" && char !== "\r") {
      throw new CsvError(`Unexpected text after a closing quote on line ${line}. Check the CSV quoting.`);
    } else if (char === '"' && cell === "") quoted = true;
    else if (char === ",") pushCell();
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      pushRecord();
      line++;
      recordLine = line;
    } else cell += char;
  }
  if (quoted) throw new CsvError(`A quoted cell starting on line ${recordLine} is never closed.`);
  if (cell !== "" || cells.length) pushRecord();
  return records;
}

type Field = "date" | "code" | "description" | "quantity" | "unitPrice" | "amount";

const ALIASES: Record<Field, string[]> = {
  date: ["date", "servicedate", "dateofservice", "dos"],
  code: ["code", "cpt", "hcpcs", "cpthcpcs", "revcode", "revenuecode", "billingcode", "procedurecode"],
  description: ["description", "desc", "service", "item", "servicedescription"],
  quantity: ["quantity", "qty", "units"],
  unitPrice: ["unitprice", "price", "rate", "unitcharge", "priceeach"],
  amount: ["amount", "charge", "charges", "total", "linetotal", "totalcharge", "amountbilled"],
};

export const REQUIRED_COLUMNS = "date, description and amount";
export const TEMPLATE_HEADER = "date,code,description,quantity,unit_price,amount";

const normalizeHeader = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

export interface RowProblem { line: number; message: string }
export interface CsvImport { bill: Bill; imported: number; problems: RowProblem[] }

function clean(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
}

export function importBillCsv(text: string, billId: string): CsvImport {
  const records = parseCsvText(text);
  if (records.length === 0) throw new CsvError("This file is empty.");
  const [header, ...rows] = records;
  const columns = new Map<Field, number>();
  header.cells.forEach((name, index) => {
    const normalized = normalizeHeader(name);
    for (const [field, aliases] of Object.entries(ALIASES) as [Field, string[]][]) {
      if (aliases.includes(normalized)) {
        if (columns.has(field)) throw new CsvError(`More than one column maps to ${field}. Keep just one column for each bill field.`);
        columns.set(field, index);
      }
    }
  });
  const missing = (["date", "description", "amount"] as const).filter(field => !columns.has(field));
  if (missing.length) {
    throw new CsvError(`The first row must name the columns. Missing: ${missing.join(", ")}. Required columns are ${REQUIRED_COLUMNS}; code, quantity and unit_price are optional.`);
  }
  if (rows.length === 0) throw new CsvError("The file has a header row but no line items.");
  const problems: RowProblem[] = [];
  const lineItems: LineItem[] = [];
  const get = (cells: string[], field: Field) => {
    const index = columns.get(field);
    return index === undefined ? "" : clean(cells[index] ?? "");
  };
  for (const { line, cells } of rows) {
    const date = parseCalendarDate(get(cells, "date"));
    const amount = parseMoney(get(cells, "amount"));
    const rawUnit = get(cells, "unitPrice");
    const unitPrice = rawUnit ? parseMoney(rawUnit) : null;
    const rawQuantity = get(cells, "quantity");
    const quantity = rawQuantity ? Number(rawQuantity) : 1;
    const description = get(cells, "description");
    const code = get(cells, "code").toUpperCase();
    const reasons: string[] = [];
    if (cells.length !== header.cells.length) reasons.push(`expected ${header.cells.length} columns, found ${cells.length}`);
    if (!date) reasons.push(`date "${get(cells, "date")}" isn't YYYY-MM-DD or MM/DD/YYYY`);
    if (amount === null) reasons.push(`amount "${get(cells, "amount")}" isn't a dollar amount`);
    if (!description) reasons.push("description is empty");
    if (description.length > LIMITS.description) reasons.push(`description exceeds ${LIMITS.description} characters; shorten it before importing`);
    if (rawUnit && unitPrice === null) reasons.push(`unit price "${rawUnit}" isn't a dollar amount`);
    if (!Number.isFinite(quantity) || !/^\d+(\.\d{1,2})?$/.test(rawQuantity || "1") || quantity <= 0 || quantity > 9999) reasons.push(`quantity "${rawQuantity}" isn't a number from 0.01 to 9999`);
    if (code.length > LIMITS.code || !/^[A-Z0-9.-]*$/.test(code)) reasons.push(`code "${code.slice(0, 20)}" should contain only letters, numbers, dots and dashes`);
    if (reasons.length) { problems.push({ line, message: `Skipped: ${reasons.join("; ")}.` }); continue; }
    const item = LineItemSchema.safeParse({ id: `u${lineItems.length + 1}`, date, code, description, quantity, unitPrice, amount, mark: "none", note: "" });
    if (!item.success) { problems.push({ line, message: `Skipped: ${item.error.issues[0]?.message ?? "invalid row"}` }); continue; }
    lineItems.push(item.data);
  }
  if (lineItems.length === 0) throw new CsvError(`None of the ${rows.length} rows could be read. ${problems[0] ? `Line ${problems[0].line}: ${problems[0].message}` : ""}`.trim());
  const bill = emptyBill(billId, "upload");
  // Visit dates are left for the user to enter: deriving them from line dates would hide outside-visit charges.
  bill.lineItems = lineItems;
  return { bill, imported: lineItems.length, problems };
}
