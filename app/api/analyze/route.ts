import { analyzeBill } from "../../../lib/analysis.ts";
import { BillSchema, describeIssues } from "../../../lib/bill.ts";
import { BodyTooLarge, json, problem, readCapped } from "../../../lib/http.ts";

const MAX_BYTES = 512 * 1024;

// Stateless: the bill is validated, analyzed and discarded. Nothing is logged or retained.
export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return problem(415, "unsupported_media_type", "Send the bill as JSON.");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await readCapped(request, MAX_BYTES)));
  } catch (error) {
    if (error instanceof BodyTooLarge) return problem(413, "too_large", "This bill is too large to check in one request.");
    return problem(400, "invalid_json", "The bill couldn't be read as JSON.");
  }
  const parsed = BillSchema.safeParse(raw);
  if (!parsed.success) return problem(400, "invalid_bill", "Some bill details aren't valid.", { issues: describeIssues(parsed.error) });
  return json({ analysis: analyzeBill(parsed.data) });
}
