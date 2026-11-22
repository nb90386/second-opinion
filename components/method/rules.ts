import type { Level } from "../../lib/analysis";

// Every check, in plain words: what raises it and what to keep in mind. The method page lists them in
// full; the landing page groups their names by level. Mirrors lib/analysis.ts.
export const RULES: { name: string; level: Level; fires: string; limits: string }[] = [
  { name: "Line arithmetic", level: "discrepancy", fires: "A line's unit price times its quantity differs from its total by more than a cent.", limits: "Only lines that print a unit price can be checked." },
  { name: "Bill total", level: "discrepancy", fires: "The line items don't add up to the total charges printed on the bill.", limits: "Expected if you haven't entered every line." },
  { name: "EOB balance", level: "discrepancy", fires: "The amount due is more than the patient responsibility on your insurer's Explanation of Benefits.", limits: "Needs both numbers from you. The EOB may cover only part of the bill." },
  { name: "Exact duplicate", level: "ask", fires: "Two or more lines match on date, code, description, quantity and amount.", limits: "Some services are legitimately repeated on one day." },
  { name: "Room nights", level: "ask", fires: "For a hospital stay, room-and-board days exceed the nights between admission and discharge.", limits: "Recognizes revenue codes 0110–0219, excluding 018x leave of absence, or “room and board” in the description. A leading zero is optional. Hospitals count days differently." },
  { name: "Outside your visit", level: "ask", fires: "A charge is dated before your admission or visit, or after your discharge.", limits: "Needs your visit dates. Visits past midnight and late-posted results can explain it." },
  { name: "Good Faith Estimate", level: "ask", fires: "A self-pay bill is at least $400 above the Good Faith Estimate you entered.", limits: "The federal process compares each provider's bill with its own estimate; eligibility is decided by CMS." },
  { name: "Not received (your mark)", level: "ask", fires: "You marked a line as a service you don't believe you received.", limits: "Based only on your mark." },
  { name: "Repeated code", level: "detail", fires: "The same code appears more than once on a day with different amounts or descriptions.", limits: "Often correct: separate doses or body sites share codes." },
  { name: "Needs itemization", level: "detail", fires: "A description is a general category such as “misc”, “supplies” or “pharmacy”.", limits: "A fixed word list; it may miss other vague descriptions." },
  { name: "Not sure (your mark)", level: "detail", fires: "You marked a line as one you aren't sure about.", limits: "Based only on your mark." },
];

export const LEVEL_MEANING: Record<Level, string> = {
  discrepancy: "Two numbers on your own documents disagree.",
  ask: "A pattern that is often an error, though it can be correct.",
  detail: "The bill doesn't say enough to check.",
};
