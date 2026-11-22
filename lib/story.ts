import { analyzeBill, LEVEL_LABEL, type Finding, type Level } from "./analysis.ts";
import type { Bill } from "./bill.ts";
import { formatDate } from "./dates.ts";
import { lookupCode } from "./glossary.ts";
import { composeLetter, DEFAULT_OPTIONS, EMPTY_SENDER } from "./letter.ts";
import { formatCents } from "./money.ts";

// The landing page's walk-through of the example bill. Every figure, note and question below is
// derived from the synthetic sample by the same engine the review uses; nothing is hand-written
// about the bill's numbers.

export const FOOTER = "footer";

export interface StoryRef { number: number; level: Level }

export interface StoryLine {
  id: string;
  date: string;
  code: string;
  description: string;
  qtyPrice: string | null;
  amount: string;
  plain: string | null;
  refs: StoryRef[];
}

export interface StoryNote { anchor: string; text: string; tone: Level | "none" }

export interface Chapter {
  key: string;
  title: string;
  body: string;
  /** Line ids (or FOOTER) the reader is looking at in this chapter. */
  focus: string[];
  /** Figures circled in pencil, by line id (or FOOTER for the amount due). */
  circle: string[];
  note: StoryNote | null;
}

export interface StoryQuestion { number: number; level: Level; levelLabel: string; title: string; amount: string | null }

export interface Story {
  provider: string;
  account: string;
  visit: string;
  statementDate: string;
  lines: StoryLine[];
  lineSum: string;
  amountDue: string;
  /** Charges minus amount due, when the bill gives both. */
  adjustments: string | null;
  eob: string | null;
  /** Questions about the bill as a whole rather than a line (shown against the amount due). */
  footerRefs: StoryRef[];
  questions: StoryQuestion[];
  chapters: Chapter[];
  letter: string;
}

const short = (iso: string) => formatDate(iso).replace(/, \d{4}$/, "");
const byRule = (findings: Finding[], rule: Finding["rule"]) => findings.find(f => f.rule === rule);

export function buildStory(bill: Bill, today: string): Story {
  const { findings, lineSum } = analyzeBill(bill);
  const refs = new Map<string, StoryRef[]>();
  findings.forEach((finding, index) => {
    for (const id of finding.lineIds) refs.set(id, [...(refs.get(id) ?? []), { number: index + 1, level: finding.level }]);
  });

  const lines: StoryLine[] = bill.lineItems.map(line => ({
    id: line.id,
    date: short(line.date),
    code: line.code,
    description: line.description,
    qtyPrice: line.unitPrice !== null && line.quantity > 1 ? `${line.quantity} × ${formatCents(line.unitPrice)}` : null,
    amount: formatCents(line.amount),
    plain: lookupCode(line.code)?.name ?? null,
    refs: refs.get(line.id) ?? [],
  }));

  const recognized = lines.filter(line => line.plain).length;
  const chapters: Chapter[] = [
    {
      key: "statement", title: "Start with the statement.", focus: [], circle: [], note: null,
      body: `This is a fictional emergency visit: ${lines.length} lines of codes and abbreviations, ${formatCents(lineSum)} in charges and ${bill.amountDue !== null ? formatCents(bill.amountDue) : "an amount"} due. Nothing on it says which lines deserve a second look.`,
    },
    {
      key: "translate", title: "Give every code a name.", focus: [], circle: [], note: null,
      body: `${recognized === lines.length ? `All ${lines.length}` : `${recognized} of the ${lines.length}`} codes on this bill get a plain-English name. A code Second Opinion doesn’t recognize gets no guess, so you know where to ask.`,
    },
  ];

  const duplicate = byRule(findings, "duplicate");
  if (duplicate) {
    const [first] = duplicate.lineIds;
    const line = bill.lineItems.find(l => l.id === first);
    chapters.push({
      key: "duplicate", title: "The same line, twice.", focus: duplicate.lineIds, circle: [], note: { anchor: duplicate.lineIds.at(-1) ?? first, text: "Same date, code, description and amount. Worth asking whether there were two.", tone: duplicate.level },
      body: `${line ? lookupCode(line.code)?.name ?? line.description : "A charge"} appears ${duplicate.lineIds.length} times on one day. Sometimes that’s correct. It’s still a fair question, and asking costs nothing.`,
    });
  }

  const math = byRule(findings, "line-math");
  if (math) {
    const line = bill.lineItems.find(l => l.id === math.lineIds[0]);
    const expected = math.facts.find(f => f.label === "Price × quantity")?.value;
    if (line && line.unitPrice !== null && expected) {
      chapters.push({
        key: "math", title: "One line doesn’t multiply.", focus: [line.id], circle: [line.id],
        note: { anchor: line.id, text: `${line.quantity} × ${formatCents(line.unitPrice)} is ${expected}, not ${formatCents(line.amount)}.`, tone: math.level },
        body: `The unit price times the quantity should equal the line total. Here it comes to ${expected}, and the bill says ${formatCents(line.amount)}. Arithmetic is the one place a bill can be checked against itself.`,
      });
    }
  }

  const flagged = new Set(findings.flatMap(f => f.lineIds));
  const largest = bill.lineItems.filter(line => !flagged.has(line.id)).sort((a, b) => b.amount - a.amount)[0];
  if (largest) {
    chapters.push({
      key: "expensive", title: "Expensive isn’t the same as wrong.", focus: [largest.id], circle: [],
      note: { anchor: largest.id, text: "Largest charge on the bill. Not flagged.", tone: "none" },
      body: `At ${formatCents(largest.amount)}, this is the biggest line. Second Opinion leaves it alone: hospital list prices often run far above what insurers pay, and it doesn’t compare against outside prices.`,
    });
  }

  const eob = byRule(findings, "eob-balance");
  if (eob && bill.amountDue !== null && bill.eobResponsibility !== null) {
    chapters.push({
      key: "eob", title: "The bottom line disagrees with your insurer.", focus: [FOOTER], circle: [FOOTER],
      note: { anchor: FOOTER, text: `Your EOB says ${formatCents(bill.eobResponsibility)}. That’s ${formatCents(eob.amountInQuestion ?? 0)} less.`, tone: eob.level },
      body: `The bill asks for ${formatCents(bill.amountDue)}. The Explanation of Benefits from the insurer puts your share at ${formatCents(bill.eobResponsibility)}. Both numbers are on your own paperwork, so the difference is worth asking about.`,
    });
  }

  chapters.push({
    key: "questions", title: `${findings.length} questions, in order.`, focus: [...flagged, FOOTER], circle: [], note: null,
    body: `The lines without a question fold away, and what’s left is sorted by how clear-cut it is: numbers that disagree first, then things worth asking, then requests for detail. Each one says why it was raised.`,
  });
  chapters.push({
    key: "letter", title: "Each question becomes a sentence you can send.", focus: [], circle: [], note: null,
    body: "The questions turn into a plain, specific letter to the billing office. It asks; it doesn’t accuse. Edit it here, or open the example to draft the whole thing.",
  });

  const fullLetter = composeLetter({ bill, findings, sender: EMPTY_SENDER, options: DEFAULT_OPTIONS, today });
  // From the "To the billing office" salutation through the numbered questions.
  const blocks = fullLetter.split("\n\n");
  const start = blocks.findIndex(block => block.startsWith("To the billing office"));
  const end = blocks.findLastIndex(block => /^\d+\. /.test(block));
  const letter = start >= 0 && end >= start ? blocks.slice(start, end + 1).join("\n\n") : fullLetter;

  return {
    provider: bill.provider,
    account: bill.accountNumber,
    visit: bill.admitDate ? formatDate(bill.admitDate) : "",
    statementDate: bill.statementDate ? formatDate(bill.statementDate) : "",
    lines,
    lineSum: formatCents(lineSum),
    amountDue: bill.amountDue !== null ? formatCents(bill.amountDue) : "",
    adjustments: bill.amountDue !== null && bill.amountDue !== lineSum ? formatCents(bill.amountDue - lineSum) : null,
    eob: bill.eobResponsibility !== null ? formatCents(bill.eobResponsibility) : null,
    footerRefs: findings.flatMap((f, i) => f.lineIds.length === 0 ? [{ number: i + 1, level: f.level }] : []),
    questions: findings.map((f, i) => ({ number: i + 1, level: f.level, levelLabel: LEVEL_LABEL[f.level], title: f.title, amount: f.amountInQuestion !== null ? formatCents(f.amountInQuestion) : null })),
    chapters,
    letter,
  };
}
