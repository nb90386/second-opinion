import { newBillId } from "../../../../lib/bill.ts";
import { CSV_LIMITS, CsvError, importBillCsv } from "../../../../lib/csv.ts";
import { BodyTooLarge, json, problem, readCapped } from "../../../../lib/http.ts";

const MAX_BODY = CSV_LIMITS.bytes + 16 * 1024; // multipart framing overhead
const CSV_TYPES = new Set(["text/csv", "application/csv", "application/vnd.ms-excel", "text/plain", "text/x-csv", ""]);

function decode(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    // Spreadsheet apps on Windows often save CSV as Windows-1252.
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

// Stateless: the file is parsed in memory and discarded. Nothing is written, logged or retained.
export async function POST(request: Request) {
  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("multipart/form-data")) return problem(415, "unsupported_media_type", "Upload the bill as a file.");
  let form: FormData;
  try {
    const body = await readCapped(request, MAX_BODY);
    form = await new Response(body, { headers: { "content-type": type } }).formData();
  } catch (error) {
    if (error instanceof BodyTooLarge) return problem(413, "too_large", `This file is larger than ${CSV_LIMITS.bytes / 1024} KB. Split the bill into smaller CSV files.`);
    return problem(400, "invalid_upload", "The upload couldn't be read. Try choosing the file again.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) return problem(400, "missing_file", "Choose a CSV file to upload.");
  if (file.size === 0) return problem(400, "empty_file", "This file is empty.");
  if (file.size > CSV_LIMITS.bytes) return problem(413, "too_large", `This file is larger than ${CSV_LIMITS.bytes / 1024} KB. Split the bill into smaller CSV files.`);
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return problem(415, "pdf_not_supported", "PDF bills can't be read yet. Type the lines into the CSV template, or start a blank bill and enter them here.");
  }
  if (/\.(xlsx|xls|numbers|ods)$/.test(name)) return problem(415, "spreadsheet_not_supported", "Save the spreadsheet as CSV (comma-separated values) first, then upload that file.");
  if (/\.(png|jpe?g|heic|gif|webp)$/.test(name) || file.type.startsWith("image/")) {
    return problem(415, "image_not_supported", "Photos of bills can't be read yet. Type the lines into the CSV template, or start a blank bill and enter them here.");
  }
  if (!name.endsWith(".csv") || !CSV_TYPES.has(file.type)) return problem(415, "unsupported_type", "Only .csv files are supported.");
  try {
    const result = importBillCsv(decode(new Uint8Array(await file.arrayBuffer())), newBillId("upload"));
    return json(result);
  } catch (error) {
    if (error instanceof CsvError) return problem(422, "unreadable_csv", error.message);
    return problem(500, "parse_failed", "Something went wrong reading this file. Nothing was saved.");
  }
}
