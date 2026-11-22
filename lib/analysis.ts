import type { Bill, LineItem } from "./bill.ts";
import { addDays, daysBetween, formatDate, formatLongDate } from "./dates.ts";
import { isRoomAndBoardCode, normalizeCode } from "./glossary.ts";
import { formatCents, sumCents } from "./money.ts";

// Deterministic, explainable checks. Every rule compares numbers already on the user's documents;
// none compares against outside prices, and a high amount alone never raises a finding.

export const ENGINE_VERSION = "2026.10-2";

export type Level = "discrepancy" | "ask" | "detail";
export type RuleId =
  | "line-math" | "bill-total" | "eob-balance" | "duplicate" | "repeated-code"
  | "room-nights" | "outside-stay" | "good-faith-estimate" | "itemize" | "not-received" | "unsure";

export interface Fact { label: string; value: string }

export interface Finding {
  id: string;
  rule: RuleId;
  level: Level;
  title: string;
  lineIds: string[];
  facts: Fact[];
  /** Why the rule fired, in terms of the user's own numbers. */
  why: string;
  /** Ordinary reasons the pattern can be correct. */
  innocent: string;
  /** The question to put to the billing office; reused by the letter. */
  ask: string;
  next?: string;
  /** Only set where the document numbers determine it. */
  amountInQuestion: number | null;
}

export interface Check { rule: RuleId; label: string; status: "clear" | "flagged" | "not-run"; detail: string }

export interface Analysis {
  engine: string;
  findings: Finding[];
  checks: Check[];
  lineCount: number;
  lineSum: number;
  flaggedLineCount: number;
}

export const LEVEL_LABEL: Record<Level, string> = { discrepancy: "Numbers disagree", ask: "Worth asking", detail: "Ask for detail" };
const LEVEL_ORDER: Record<Level, number> = { discrepancy: 0, ask: 1, detail: 2 };

const money = formatCents;
const describe = (line: LineItem) => `“${line.description.trim()}”`;
const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

function lineMath(bill: Bill): [Finding[], Check] {
  const priced = bill.lineItems.filter(line => line.unitPrice !== null);
  const findings: Finding[] = [];
  for (const line of priced) {
    const expected = Math.round((line.unitPrice as number) * line.quantity);
    const difference = line.amount - expected;
    if (Math.abs(difference) <= 1) continue;
    const over = difference > 0;
    findings.push({
      id: `line-math:${line.id}`, rule: "line-math", level: "discrepancy",
      title: `${describe(line)} total doesn't match its price × quantity`,
      lineIds: [line.id],
      facts: [
        { label: "Unit price", value: money(line.unitPrice as number) },
        { label: "Quantity", value: String(line.quantity) },
        { label: "Price × quantity", value: money(expected) },
        { label: "Line total on bill", value: money(line.amount) },
      ],
      why: `${money(line.unitPrice as number)} × ${line.quantity} is ${money(expected)}, but the line total is ${money(line.amount)} — ${money(Math.abs(difference))} ${over ? "more" : "less"}.`,
      innocent: "A unit or quantity that wasn't printed, a partial unit, or a typo when the line was entered. If you typed this line in yourself, check it against the original first.",
      ask: `For ${describe(line)} on ${formatLongDate(line.date)}, please confirm the quantity and unit price and correct the line total of ${money(line.amount)} if it is wrong.`,
      amountInQuestion: over ? difference : null,
    });
  }
  const check: Check = priced.length === 0
    ? { rule: "line-math", label: "Line totals match price × quantity", status: "not-run", detail: "No lines list a unit price." }
    : { rule: "line-math", label: "Line totals match price × quantity", status: findings.length ? "flagged" : "clear", detail: `${plural(priced.length, "line")} with a unit price checked.` };
  return [findings, check];
}

function billTotal(bill: Bill, lineSum: number): [Finding[], Check] {
  const label = "Line items add up to the bill's total";
  if (bill.statedTotal === null || bill.lineItems.length === 0) {
    return [[], { rule: "bill-total", label, status: "not-run", detail: "Add the bill's total charges to check this." }];
  }
  const difference = bill.statedTotal - lineSum;
  if (Math.abs(difference) <= 1) return [[], { rule: "bill-total", label, status: "clear", detail: `Lines sum to ${money(lineSum)}, matching the bill.` }];
  const unexplained = difference > 0;
  return [[{
    id: "bill-total:bill", rule: "bill-total", level: "discrepancy",
    title: unexplained ? `${money(difference)} of the bill's total isn't in the line items` : `Line items add up to ${money(-difference)} more than the bill's total`,
    lineIds: [],
    facts: [
      { label: "Total charges on bill", value: money(bill.statedTotal) },
      { label: "Sum of line items", value: money(lineSum) },
      { label: "Difference", value: money(Math.abs(difference)) },
    ],
    why: `The line items add up to ${money(lineSum)}, but the bill's total charges are ${money(bill.statedTotal)}.`,
    innocent: "If you haven't entered every line yet, this is expected. Some statements also print totals before or after adjustments.",
    ask: `Please provide a complete itemized statement that reconciles to the total charges of ${money(bill.statedTotal)}.`,
    amountInQuestion: unexplained ? difference : null,
  }], { rule: "bill-total", label, status: "flagged", detail: `Off by ${money(Math.abs(difference))}.` }];
}

function eobBalance(bill: Bill): [Finding[], Check] {
  const label = "Amount due matches your EOB";
  if (bill.eobResponsibility === null || bill.amountDue === null) {
    return [[], { rule: "eob-balance", label, status: "not-run", detail: "Add the amount due and your EOB's patient responsibility to check this." }];
  }
  const difference = bill.amountDue - bill.eobResponsibility;
  if (difference <= 1) return [[], { rule: "eob-balance", label, status: "clear", detail: `Amount due is within what your EOB says you owe.` }];
  return [[{
    id: "eob-balance:bill", rule: "eob-balance", level: "discrepancy",
    title: `You're asked to pay ${money(difference)} more than your EOB says you owe`,
    lineIds: [],
    facts: [
      { label: "Amount due on bill", value: money(bill.amountDue) },
      { label: "Your responsibility on EOB", value: money(bill.eobResponsibility) },
      { label: "Difference", value: money(difference) },
    ],
    why: `Your insurer's Explanation of Benefits puts your share at ${money(bill.eobResponsibility)}. The bill asks for ${money(bill.amountDue)}.`,
    innocent: "The bill may have been sent before your insurer finished processing, the EOB may cover only part of this care, or another claim may be included.",
    ask: `Please reconcile this balance with my insurer's Explanation of Benefits, which shows my responsibility as ${money(bill.eobResponsibility)}, and send a corrected statement.`,
    next: "Call the number on your EOB too. Insurers can confirm whether the claim is final and what the hospital agreed to accept.",
    amountInQuestion: difference,
  }], { rule: "eob-balance", label, status: "flagged", detail: `${money(difference)} above your EOB.` }];
}

const duplicateKey = (line: LineItem) =>
  [line.date, normalizeCode(line.code), line.description.trim().toLowerCase().replace(/\s+/g, " "), line.quantity, line.amount].join("|");

function groupBy<T>(items: readonly T[], key: (item: T) => string): T[][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    groups.set(k, [...(groups.get(k) ?? []), item]);
  }
  return [...groups.values()];
}

function duplicates(bill: Bill): [Finding[], Check] {
  const groups = groupBy(bill.lineItems.filter(line => line.amount > 0), duplicateKey).filter(group => group.length > 1);
  const findings = groups.map((group): Finding => {
    const [first] = group;
    const copies = group.length;
    return {
      id: `duplicate:${group.map(line => line.id).join("+")}`, rule: "duplicate", level: "ask",
      title: `${describe(first)} appears ${copies} times on ${formatDate(first.date)}`,
      lineIds: group.map(line => line.id),
      facts: [
        { label: "Date", value: formatDate(first.date) },
        { label: "Code", value: first.code || "None listed" },
        { label: "Each line", value: money(first.amount) },
        { label: "Copies", value: String(copies) },
      ],
      why: `${plural(copies, "line")} match exactly on date, code, description, quantity and amount.`,
      innocent: "Some services really are repeated on the same day — two separate blood draws, or a test repeated hours later. Your own records or the billing office can confirm.",
      ask: `Please confirm whether ${describe(first)} was provided ${copies} times on ${formatLongDate(first.date)}. If not, please remove the duplicate ${copies === 2 ? "charge" : "charges"} of ${money(first.amount)}.`,
      amountInQuestion: first.amount * (copies - 1),
    };
  });
  return [findings, { rule: "duplicate", label: "No exact duplicate lines", status: findings.length ? "flagged" : "clear", detail: findings.length ? `${plural(findings.length, "group")} of identical lines.` : `${plural(bill.lineItems.length, "line")} compared.` }];
}

function repeatedCodes(bill: Bill): [Finding[], Check] {
  const groups = groupBy(bill.lineItems.filter(line => line.code.trim() && line.amount > 0), line => `${line.date}|${normalizeCode(line.code)}`)
    .filter(group => group.length > 1 && new Set(group.map(duplicateKey)).size > 1);
  const findings = groups.map((group): Finding => {
    const [first] = group;
    const code = normalizeCode(first.code);
    return {
      id: `repeated-code:${group.map(line => line.id).join("+")}`, rule: "repeated-code", level: "detail",
      title: `Code ${code} is billed ${group.length} times on ${formatDate(first.date)} with different details`,
      lineIds: group.map(line => line.id),
      facts: group.map(line => ({ label: line.description.trim(), value: `Qty ${line.quantity} · ${money(line.amount)}` })),
      why: `The same code appears ${group.length} times on one day, but the lines differ in description, quantity or amount.`,
      innocent: "Separate doses, different body sites or a repeated test can share a code. The lines may all be correct.",
      ask: `Please explain what distinguishes each charge billed under code ${code} on ${formatLongDate(first.date)}.`,
      amountInQuestion: null,
    };
  });
  return [findings, { rule: "repeated-code", label: "Same-day repeats of a code", status: findings.length ? "flagged" : "clear", detail: findings.length ? `${plural(findings.length, "code")} to ask about.` : "No code repeats with different details." }];
}

const ROOM_DESCRIPTION = /\broom\s*(and|&)\s*board\b/i;

function roomNights(bill: Bill): [Finding[], Check] {
  const label = "Room days match nights stayed";
  if (bill.careSetting !== "inpatient" || !bill.admitDate || !bill.dischargeDate) {
    return [[], { rule: "room-nights", label, status: "not-run", detail: "Applies to hospital stays with admission and discharge dates." }];
  }
  const rooms = bill.lineItems.filter(line => line.amount > 0
    && !/^0?18\d$/.test(normalizeCode(line.code))
    && (isRoomAndBoardCode(line.code) || ROOM_DESCRIPTION.test(line.description)));
  if (rooms.length === 0) return [[], { rule: "room-nights", label, status: "not-run", detail: "No room-and-board lines found." }];
  const nights = daysBetween(bill.admitDate, bill.dischargeDate);
  const billed = rooms.reduce((total, line) => total + line.quantity, 0);
  if (billed <= nights) return [[], { rule: "room-nights", label, status: "clear", detail: `${plural(billed, "room day")} for ${plural(nights, "night")}.` }];
  const rates = new Set(rooms.map(line => line.unitPrice));
  const rate = rates.size === 1 ? [...rates][0] : null;
  const extra = billed - nights;
  return [[{
    id: `room-nights:${rooms.map(line => line.id).join("+")}`, rule: "room-nights", level: "ask",
    title: `${plural(billed, "room day")} billed for a ${nights}-night stay`,
    lineIds: rooms.map(line => line.id),
    facts: [
      { label: "Admitted", value: formatDate(bill.admitDate) },
      { label: "Discharged", value: formatDate(bill.dischargeDate) },
      { label: "Nights", value: String(nights) },
      { label: "Room days billed", value: String(billed) },
      ...(rate !== null ? [{ label: "Daily rate on bill", value: money(rate) }] : []),
    ],
    why: `Admission on ${formatDate(bill.admitDate)} and discharge on ${formatDate(bill.dischargeDate)} is ${plural(nights, "night")}. Room and board is billed for ${plural(billed, "day")}.`,
    innocent: "Room days are commonly counted by midnights, so the day you go home usually isn't billed — but hospitals' policies differ, and time in another unit, such as observation, can change the count.",
    ask: `Please explain how room and board days were counted for my stay from ${formatLongDate(bill.admitDate)} to ${formatLongDate(bill.dischargeDate)}, and correct the charge if the day of discharge was billed.`,
    amountInQuestion: rate !== null ? Math.round(rate * extra) : null,
  }], { rule: "room-nights", label, status: "flagged", detail: `${plural(extra, "day")} more than nights stayed.` }];
}

function outsideStay(bill: Bill): [Finding[], Check] {
  const label = "Service dates fall within your visit";
  const { admitDate, dischargeDate } = bill;
  if (!admitDate || !dischargeDate) return [[], { rule: "outside-stay", label, status: "not-run", detail: "Add your visit or admission dates to check this." }];
  const outside = bill.lineItems.filter(line => line.amount > 0 && (line.date < admitDate || line.date > dischargeDate));
  if (outside.length === 0) return [[], { rule: "outside-stay", label, status: "clear", detail: `All dates fall between ${formatDate(admitDate)} and ${formatDate(dischargeDate)}.` }];
  const visit = admitDate === dischargeDate ? formatLongDate(admitDate) : `${formatLongDate(admitDate)} to ${formatLongDate(dischargeDate)}`;
  const dates = [...new Set(outside.map(line => formatDate(line.date)))].join(", ");
  const longDates = [...new Set(outside.map(line => formatLongDate(line.date)))].join(", ");
  return [[{
    id: `outside-stay:${outside.map(line => line.id).join("+")}`, rule: "outside-stay", level: "ask",
    title: outside.length === 1 ? `${describe(outside[0])} is dated ${formatDate(outside[0].date)}, outside your visit` : `${outside.length} charges are dated outside your visit`,
    lineIds: outside.map(line => line.id),
    facts: [
      { label: "Your visit", value: visit },
      ...outside.map(line => ({ label: `${formatDate(line.date)} · ${line.description.trim()}`, value: money(line.amount) })),
    ],
    why: `Your visit dates are ${visit}, but ${outside.length === 1 ? "this charge is" : "these charges are"} dated ${dates}.`,
    innocent: "Visits that run past midnight, results posted on a later date, or a follow-up visit billed on the same statement can all explain this. Check whether you had care on that date.",
    ask: `Please confirm what service was provided on ${longDates}. My visit was ${visit}.`,
    amountInQuestion: sumCents(outside.map(line => line.amount)),
  }], { rule: "outside-stay", label, status: "flagged", detail: `${plural(outside.length, "charge")} outside your dates.` }];
}

export const GFE_THRESHOLD = 40_000;

function goodFaithEstimate(bill: Bill, lineSum: number): [Finding[], Check] {
  const label = "Bill is within $400 of your Good Faith Estimate";
  if (bill.coverage !== "self-pay" || bill.goodFaithEstimate === null) {
    return [[], { rule: "good-faith-estimate", label, status: "not-run", detail: "Applies to self-pay bills where you received a Good Faith Estimate." }];
  }
  const total = bill.statedTotal ?? lineSum;
  const difference = total - bill.goodFaithEstimate;
  if (difference < GFE_THRESHOLD) return [[], { rule: "good-faith-estimate", label, status: "clear", detail: `Total is ${difference > 0 ? `${money(difference)} above` : "at or below"} your estimate.` }];
  const deadline = bill.statementDate ? addDays(bill.statementDate, 120) : null;
  return [[{
    id: "good-faith-estimate:bill", rule: "good-faith-estimate", level: "ask",
    title: `Your bill is ${money(difference)} above your Good Faith Estimate`,
    lineIds: [],
    facts: [
      { label: "Good Faith Estimate", value: money(bill.goodFaithEstimate) },
      { label: bill.statedTotal === null ? "Sum of line items" : "Total charges on bill", value: money(total) },
      { label: "Difference", value: money(difference) },
      ...(deadline ? [{ label: "120 days after statement date", value: formatLongDate(deadline) }] : []),
    ],
    why: `Your bill of ${money(total)} is ${money(difference)} more than the ${money(bill.goodFaithEstimate)} Good Faith Estimate you entered.`,
    innocent: "The estimate may have covered only some providers or services, or your care may have changed. The federal comparison is made between each provider's or facility's bill and its own estimate.",
    ask: `Please explain why my charges exceed the Good Faith Estimate of ${money(bill.goodFaithEstimate)} and provide an itemized comparison.`,
    next: `If you were uninsured or self-pay, CMS runs a dispute process for bills at least $400 above a Good Faith Estimate. It must be started within 120 days of the initial bill's date${deadline ? ` (for a first bill dated ${formatDate(bill.statementDate as string)}, about ${formatLongDate(deadline)})` : ""} and has a $25 fee. Check eligibility at cms.gov/medical-bill-rights.`,
    amountInQuestion: difference,
  }], { rule: "good-faith-estimate", label, status: "flagged", detail: `${money(difference)} over your estimate.` }];
}

const GENERIC_WORDS = /\b(misc\.?|miscellaneous|sundry|sundries|general|other|various)\b/i;
const GENERIC_WHOLE = /^(pharmacy|drugs?|supplies|supply|med(ical)?[ /-]?surg(ical)?( supplies)?|medical supplies|lab(oratory)?)$/i;

export function isGenericDescription(description: string): boolean {
  const cleaned = description.trim().replace(/[^\w/& -]+/g, " ").replace(/\s+/g, " ").trim();
  return GENERIC_WORDS.test(cleaned) || GENERIC_WHOLE.test(cleaned);
}

function itemize(bill: Bill): [Finding[], Check] {
  const generic = bill.lineItems.filter(line => line.amount > 0 && isGenericDescription(line.description));
  const findings = generic.map((line): Finding => ({
    id: `itemize:${line.id}`, rule: "itemize", level: "detail",
    title: `${describe(line)} doesn't say what it covers`,
    lineIds: [line.id],
    facts: [{ label: "Date", value: formatDate(line.date) }, { label: "Amount", value: money(line.amount) }],
    why: "The description is a general category rather than a specific item or service.",
    innocent: "Summary statements often group supplies or drugs. The detail usually exists; it just isn't printed.",
    ask: `Please itemize the ${money(line.amount)} charge for ${describe(line)} on ${formatLongDate(line.date)}, listing each item, quantity and price.`,
    amountInQuestion: null,
  }));
  return [findings, { rule: "itemize", label: "Every line names a specific service", status: findings.length ? "flagged" : "clear", detail: findings.length ? `${plural(findings.length, "general line")} to itemize.` : "No general-category lines." }];
}

function patientMarks(bill: Bill): Finding[] {
  return bill.lineItems.filter(line => line.mark !== "none").map((line): Finding => {
    const notReceived = line.mark === "not-received";
    const note = line.note.trim();
    return {
      id: `${line.mark}:${line.id}`, rule: notReceived ? "not-received" : "unsure", level: notReceived ? "ask" : "detail",
      title: notReceived ? `You don't recognize ${describe(line)}` : `You're not sure about ${describe(line)}`,
      lineIds: [line.id],
      facts: [{ label: "Date", value: formatDate(line.date) }, { label: "Amount", value: money(line.amount) }, ...(note ? [{ label: "Your note", value: note }] : [])],
      why: notReceived ? "You marked this as a service you don't believe you received." : "You marked this charge as one you aren't sure about.",
      innocent: "Some services happen without you noticing — lab work on a sample already taken, or a medication added to an IV.",
      ask: notReceived
        ? `I don't believe I received ${describe(line)} on ${formatLongDate(line.date)} (${money(line.amount)}). Please confirm it in my medical record or remove the charge.`
        : `Please explain what ${describe(line)} on ${formatLongDate(line.date)} (${money(line.amount)}) was for.`,
      amountInQuestion: notReceived ? line.amount : null,
    };
  });
}

export function analyzeBill(bill: Bill): Analysis {
  const lineSum = sumCents(bill.lineItems.map(line => line.amount));
  const order = new Map(bill.lineItems.map((line, index) => [line.id, index]));
  const results = [lineMath(bill), billTotal(bill, lineSum), eobBalance(bill), duplicates(bill), repeatedCodes(bill), roomNights(bill), outsideStay(bill), goodFaithEstimate(bill, lineSum), itemize(bill)];
  const findings = [...results.flatMap(([found]) => found), ...patientMarks(bill)];
  const position = (finding: Finding) => finding.lineIds.length ? Math.min(...finding.lineIds.map(id => order.get(id) ?? 0)) : -1;
  findings.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || position(a) - position(b));
  return {
    engine: ENGINE_VERSION,
    findings,
    checks: results.map(([, check]) => check),
    lineCount: bill.lineItems.length,
    lineSum,
    flaggedLineCount: new Set(findings.flatMap(finding => finding.lineIds)).size,
  };
}
