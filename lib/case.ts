import { z } from "zod";
import { BillSchema, LIMITS, type Bill } from "./bill.ts";
import { DEFAULT_OPTIONS, EMPTY_SENDER } from "./letter.ts";

// A case is everything the browser keeps: the bill (with the user's corrections), which findings
// were set aside, and the letter in progress. It is stored under one versioned localStorage key.

export const CASE_KEY = "second-opinion.case.v1";

const text = (max: number) => z.string().max(max);
// Group findings can reference every 40-character line id. All findings on a valid
// bill, and a generated letter edited by the user, must remain readable on reload.
const findingIds = z.array(text(LIMITS.lines * 41 + 40)).max(LIMITS.lines * 5 + 10);
export const MAX_LETTER_LENGTH = 1_000_000;

export const CaseSchema = z.strictObject({
  version: z.literal(1),
  bill: BillSchema,
  setAside: findingIds,
  letter: z.strictObject({
    sender: z.strictObject({ name: text(120), address: text(300), phone: text(40), email: text(120) }),
    options: z.strictObject({ requestItemized: z.boolean(), requestHold: z.boolean(), askFinancialAssistance: z.boolean() }),
    excluded: findingIds,
    /** The user's edited letter; null while it follows the findings automatically. */
    draft: text(MAX_LETTER_LENGTH).nullable(),
    /** The generated letter the user started editing from, to notice when findings change underneath an edit. */
    draftBasis: text(MAX_LETTER_LENGTH).nullable(),
  }),
  updatedAt: text(40),
});

export type Case = z.infer<typeof CaseSchema>;

export function newCase(bill: Bill, now: string): Case {
  return {
    version: 1,
    bill,
    setAside: [],
    letter: {
      sender: { ...EMPTY_SENDER },
      options: { ...DEFAULT_OPTIONS, askFinancialAssistance: bill.coverage === "self-pay" },
      excluded: [],
      draft: null,
      draftBasis: null,
    },
    updatedAt: now,
  };
}
