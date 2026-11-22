import type { Bill, LineItem } from "./bill.ts";
import { sumCents } from "./money.ts";

// Synthetic examples. Hospitals, accounts and every dollar amount are fictional and are not
// real prices, rates or payer amounts. Codes are real public code numbers used for realism.

type LineInput = [id: string, date: string, code: string, description: string, quantity: number, unitPrice: number | null, amount: number];

const lines = (rows: LineInput[]): LineItem[] =>
  rows.map(([id, date, code, description, quantity, unitPrice, amount]) => ({ id, date, code, description, quantity, unitPrice, amount, mark: "none", note: "" }));

const emergencyLines = lines([
  ["a01", "2026-08-14", "99285", "ED VISIT LEVEL 5", 1, 284000, 284000],
  ["a02", "2026-08-14", "85025", "CBC W/ AUTO DIFF", 1, 18600, 18600],
  ["a03", "2026-08-14", "80053", "COMPREHENSIVE METABOLIC PANEL", 1, 41200, 41200],
  ["a04", "2026-08-14", "36415", "VENIPUNCTURE", 1, 4800, 4800],
  ["a05", "2026-08-14", "36415", "VENIPUNCTURE", 1, 4800, 4800],
  ["a06", "2026-08-14", "84484", "TROPONIN QUANT", 1, 26400, 26400],
  ["a07", "2026-08-14", "93005", "ECG TRACING", 1, 31000, 31000],
  ["a08", "2026-08-14", "74177", "CT ABD & PELVIS W/ CONTRAST", 1, 596000, 596000],
  ["a09", "2026-08-14", "Q9967", "CONTRAST LOCM PER ML", 100, 240, 24000],
  ["a10", "2026-08-14", "96374", "IV PUSH SINGLE/INITIAL DRUG", 1, 38600, 38600],
  ["a11", "2026-08-14", "96375", "IV PUSH EACH ADDL DRUG", 1, 17200, 17200],
  ["a12", "2026-08-14", "J1885", "KETOROLAC 15 MG INJ", 2, 3850, 7700],
  ["a13", "2026-08-14", "J2405", "ONDANSETRON 1 MG INJ", 4, 2100, 10500],
  ["a14", "2026-08-14", "96360", "IV HYDRATION INITIAL HR", 1, 51200, 51200],
  ["a15", "2026-08-14", "J7030", "NORMAL SALINE 1000 CC", 1, 9600, 9600],
  ["a16", "2026-08-14", "0270", "MISC MED/SURG SUPPLIES", 1, null, 31800],
  ["a17", "2026-08-17", "0250", "PHARMACY", 1, null, 6400],
]);

const stayLines = lines([
  ["b01", "2026-06-02", "0120", "SEMI-PRIVATE ROOM & BOARD", 4, 315000, 1260000],
  ["b02", "2026-06-02", "99223", "INITIAL HOSPITAL CARE", 1, 89000, 89000],
  ["b03", "2026-06-03", "99232", "SUBSEQUENT HOSPITAL CARE", 1, 41000, 41000],
  ["b04", "2026-06-04", "99232", "SUBSEQUENT HOSPITAL CARE", 1, 41000, 41000],
  ["b05", "2026-06-05", "99238", "DISCHARGE DAY MANAGEMENT", 1, 38000, 38000],
  ["b06", "2026-06-02", "85025", "CBC W/ AUTO DIFF", 1, 18600, 18600],
  ["b07", "2026-06-03", "85025", "CBC W/ AUTO DIFF", 1, 18600, 18600],
  ["b08", "2026-06-03", "80048", "BASIC METABOLIC PANEL", 1, 26800, 26800],
  ["b09", "2026-06-03", "80048", "BASIC METABOLIC PANEL", 1, 26800, 26800],
  ["b10", "2026-06-02", "71046", "CHEST X-RAY 2 VIEWS", 1, 62000, 62000],
  ["b11", "2026-06-04", "85610", "PROTHROMBIN TIME", 1, 14200, 14200],
  ["b12", "2026-06-03", "J7030", "NORMAL SALINE 1000 CC", 2, 9600, 19200],
  ["b13", "2026-06-02", "0250", "PHARMACY", 1, null, 114800],
  ["b14", "2026-06-07", "85025", "CBC W/ AUTO DIFF", 1, 18600, 18600],
]);

export interface SampleSummary { id: string; title: string; provider: string; setting: string; blurb: string; lineCount: number }

const SAMPLES: { summary: Omit<SampleSummary, "lineCount">; bill: Bill }[] = [
  {
    summary: {
      id: "emergency-visit",
      title: "Emergency visit, one evening",
      provider: "Cedar Hollow Regional Medical Center",
      setting: "Emergency · insured",
      blurb: "Abdominal pain, a CT scan and IV medication. The bill asks for more than the insurer's EOB says is owed.",
    },
    bill: {
      id: "sample-emergency-visit", origin: "sample", sampleId: "emergency-visit",
      provider: "Cedar Hollow Regional Medical Center", providerAddress: "Patient Financial Services\n400 Example Parkway\nCedar Hollow, OR 97000",
      accountNumber: "SO-48213-ER", statementDate: "2026-09-22", careSetting: "emergency",
      admitDate: "2026-08-14", dischargeDate: "2026-08-14", coverage: "insured",
      statedTotal: sumCents(emergencyLines.map(line => line.amount)), amountDue: 189000, eobResponsibility: 125000, goodFaithEstimate: null,
      lineItems: emergencyLines,
    },
  },
  {
    summary: {
      id: "three-night-stay",
      title: "Three-night hospital stay",
      provider: "Ashgrove Memorial Hospital",
      setting: "Inpatient · self-pay",
      blurb: "Pneumonia treated over three nights, paid out of pocket with a Good Faith Estimate beforehand.",
    },
    bill: {
      id: "sample-three-night-stay", origin: "sample", sampleId: "three-night-stay",
      provider: "Ashgrove Memorial Hospital", providerAddress: "Billing Office\n12 Sample Road\nAshgrove, VT 05000",
      accountNumber: "SO-77120-IP", statementDate: "2026-07-10", careSetting: "inpatient",
      admitDate: "2026-06-02", dischargeDate: "2026-06-05", coverage: "self-pay",
      // The printed total includes $296.00 that no line accounts for.
      statedTotal: sumCents(stayLines.map(line => line.amount)) + 29600, amountDue: sumCents(stayLines.map(line => line.amount)) + 29600,
      eobResponsibility: null, goodFaithEstimate: 1450000,
      lineItems: stayLines,
    },
  },
];

export function listSamples(): SampleSummary[] {
  return SAMPLES.map(({ summary, bill }) => ({ ...summary, lineCount: bill.lineItems.length }));
}

/** A fresh deep copy, so callers can never mutate the fixture. */
export function getSample(id: string): Bill | null {
  const sample = SAMPLES.find(entry => entry.summary.id === id);
  return sample ? structuredClone(sample.bill) : null;
}
