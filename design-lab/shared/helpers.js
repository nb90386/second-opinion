// Tiny shared helpers for the design-lab prototypes. Data comes from case.js (real engine output).
window.SOH = {
  money(cents, { sign = false } = {}) {
    if (cents == null) return "—";
    const s = (Math.abs(cents) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
    return cents < 0 ? `−${s}` : sign ? `+${s}` : s;
  },
  date(iso, opts = { month: "short", day: "numeric" }) {
    return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", ...opts });
  },
  longDate(iso) { return this.date(iso, { month: "long", day: "numeric", year: "numeric" }); },
  /** Question number (1-based, engine order) for each line id. */
  refsByLine(findings) {
    const map = {};
    findings.forEach((f, i) => f.lineIds.forEach(id => (map[id] ||= []).push({ n: i + 1, level: f.level })));
    return map;
  },
  reducedMotion() { return matchMedia("(prefers-reduced-motion: reduce)").matches; },
};

// Faithful port of lib/letter.ts composeLetter, so every prototype writes the product's real letter.
SOH.composeLetter = function ({ bill, findings, sender = { name: "Jordan Avery", address: "", phone: "", email: "" }, options = { requestItemized: true, requestHold: true, askFinancialAssistance: false }, today = SO.today }) {
  const or = (v, p) => (v || "").trim() || `[${p}]`;
  const ld = iso => SOH.longDate(iso);
  const contact = [sender.phone, sender.email].map(s => (s || "").trim()).filter(Boolean).join(" · ");
  const { admitDate, dischargeDate } = bill;
  const dates = admitDate && dischargeDate && admitDate !== dischargeDate ? `${ld(admitDate)} to ${ld(dischargeDate)}` : admitDate ? ld(admitDate) : null;
  const b = [];
  b.push([or(sender.name, "Your name"), or(sender.address, "Your mailing address"), contact].filter(Boolean).join("\n"));
  b.push(ld(today));
  b.push([or(bill.provider, "Hospital name"), bill.providerAddress.trim() || "[Billing office address]"].join("\n"));
  b.push([`Re: Questions about account ${or(bill.accountNumber, "account number")}`, dates ? `Dates of service: ${dates}` : null, bill.statementDate ? `Statement dated: ${ld(bill.statementDate)}` : null].filter(Boolean).join("\n"));
  b.push("To the billing office:");
  if (findings.length) {
    b.push(`I am reviewing the itemized statement for the account above and have ${findings.length === 1 ? "a question about a charge" : "questions about the charges"} listed below. Please review ${findings.length === 1 ? "it" : "each item"} and reply in writing, with a corrected statement if any charge changes.`);
    b.push(findings.map((f, i) => `${i + 1}. ${f.ask}${f.amountInQuestion !== null ? ` (Amount in question: ${SOH.money(f.amountInQuestion)}.)` : ""}`).join("\n\n"));
  } else b.push("I am reviewing the statement for the account above and would like more detail before paying it.");
  const r = [];
  if (options.requestItemized && !findings.some(f => f.rule === "bill-total")) r.push("Please send a complete itemized statement listing each charge with its date of service, billing code, quantity and amount.");
  if (options.requestHold) r.push("While these questions are being reviewed, I ask that the account be placed on hold and not referred to collections.");
  if (options.askFinancialAssistance) r.push("Please also send a copy of your financial assistance policy and application, and let me know whether this account can be considered under it.");
  if (r.length) b.push(r.join(" "));
  b.push(`I'm happy to provide any information you need${contact ? `. You can reach me at ${contact}` : ""}. Thank you for your help.`);
  b.push(`Sincerely,\n\n${or(sender.name, "Your name")}`);
  return b.join("\n\n");
};
