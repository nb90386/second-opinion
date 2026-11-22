import type { Finding } from "./analysis.ts";
import type { Bill } from "./bill.ts";
import { formatLongDate } from "./dates.ts";
import { formatCents } from "./money.ts";

// The letter asks questions and requests corrections. It deliberately makes no legal claims,
// alleges nothing and states no rights; missing details stay as visible [placeholders].

export interface Sender { name: string; address: string; phone: string; email: string }
export interface LetterOptions { requestItemized: boolean; requestHold: boolean; askFinancialAssistance: boolean }

export const DEFAULT_OPTIONS: LetterOptions = { requestItemized: true, requestHold: true, askFinancialAssistance: false };
export const EMPTY_SENDER: Sender = { name: "", address: "", phone: "", email: "" };

/** Keep the specimen label on copied, downloaded and printed example letters, including edited ones. */
export function letterForExport(bill: Bill, text: string): string {
  return bill.origin === "sample" ? `SYNTHETIC EXAMPLE — Fictional hospital, account and prices. Do not send.\n\n${text}` : text;
}

const or = (value: string, placeholder: string) => value.trim() || `[${placeholder}]`;

function serviceDates(bill: Bill): string | null {
  const { admitDate, dischargeDate } = bill;
  if (admitDate && dischargeDate && admitDate !== dischargeDate) return `${formatLongDate(admitDate)} to ${formatLongDate(dischargeDate)}`;
  if (admitDate) return formatLongDate(admitDate);
  const dates = bill.lineItems.map(line => line.date).sort();
  if (!dates.length) return null;
  return dates[0] === dates[dates.length - 1] ? formatLongDate(dates[0]) : `${formatLongDate(dates[0])} to ${formatLongDate(dates[dates.length - 1])}`;
}

export function composeLetter(input: { bill: Bill; findings: Finding[]; sender: Sender; options: LetterOptions; today: string }): string {
  const { bill, findings, sender, options, today } = input;
  const contact = [sender.phone.trim(), sender.email.trim()].filter(Boolean).join(" · ");
  const dates = serviceDates(bill);
  const blocks: string[] = [];

  blocks.push([or(sender.name, "Your name"), or(sender.address, "Your mailing address"), contact].filter(Boolean).join("\n"));
  blocks.push(formatLongDate(today));
  blocks.push([or(bill.provider, "Hospital name"), bill.providerAddress.trim() || "[Billing office address]"].join("\n"));
  blocks.push([
    `Re: Questions about account ${or(bill.accountNumber, "account number")}`,
    dates ? `Dates of service: ${dates}` : null,
    bill.statementDate ? `Statement dated: ${formatLongDate(bill.statementDate)}` : null,
  ].filter(Boolean).join("\n"));
  blocks.push("To the billing office:");

  if (findings.length) {
    blocks.push(`I am reviewing the itemized statement for the account above and have ${findings.length === 1 ? "a question about a charge" : "questions about the charges"} listed below. Please review ${findings.length === 1 ? "it" : "each item"} and reply in writing, with a corrected statement if any charge changes.`);
    blocks.push(findings.map((finding, index) => {
      const amount = finding.amountInQuestion !== null ? ` (Amount in question: ${formatCents(finding.amountInQuestion)}.)` : "";
      return `${index + 1}. ${finding.ask}${amount}`;
    }).join("\n\n"));
  } else {
    blocks.push("I am reviewing the statement for the account above and would like more detail before paying it.");
  }

  const requests: string[] = [];
  // The bill-total question already asks for a reconciled itemized statement; don't ask twice.
  if (options.requestItemized && !findings.some(f => f.rule === "bill-total")) requests.push("Please send a complete itemized statement listing each charge with its date of service, billing code, quantity and amount.");
  if (options.requestHold) requests.push("While these questions are being reviewed, I ask that the account be placed on hold and not referred to collections.");
  if (options.askFinancialAssistance) requests.push("Please also send a copy of your financial assistance policy and application, and let me know whether this account can be considered under it.");
  if (requests.length) blocks.push(requests.join(" "));

  blocks.push(`I'm happy to provide any information you need${contact ? `. You can reach me at ${contact}` : ""}. Thank you for your help.`);
  blocks.push(`Sincerely,\n\n${or(sender.name, "Your name")}`);
  return blocks.join("\n\n");
}

export function letterFileName(bill: Bill, today: string): string {
  const slug = (bill.provider || "billing-inquiry").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "billing-inquiry";
  return `${slug}-inquiry-${today}.txt`;
}
