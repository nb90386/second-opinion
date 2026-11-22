import { useId, useState, type SubmitEvent } from "react";
import type { Analysis } from "../../lib/analysis";
import { BillSchema, CARE_SETTING_LABEL, type Bill, type CareSetting, type Coverage } from "../../lib/bill";
import { formatDate } from "../../lib/dates";
import { centsToInput, formatCents, parseMoney } from "../../lib/money";
import { Dialog } from "../Dialog";

const ORIGIN_LABEL: Record<Bill["origin"], string> = { sample: "Synthetic example", upload: "From your CSV", manual: "Entered by hand" };

export function BillSummary({ bill, analysis, activeCount, onSave }: { bill: Bill; analysis: Analysis | null; activeCount: number; onSave: (bill: Bill) => void }) {
  const [editing, setEditing] = useState(false);
  // The question count acknowledges a change (not the first count) with a brief highlighter mark.
  const [seenCount, setSeenCount] = useState(analysis ? activeCount : null);
  const [countChanged, setCountChanged] = useState(false);
  if (analysis && activeCount !== seenCount) {
    setSeenCount(activeCount);
    setCountChanged(seenCount !== null);
  }
  const titleId = useId();
  const lineSum = bill.lineItems.reduce((total, line) => total + line.amount, 0);
  const visit = bill.admitDate
    ? bill.dischargeDate && bill.dischargeDate !== bill.admitDate ? `${formatDate(bill.admitDate)} – ${formatDate(bill.dischargeDate)}` : formatDate(bill.admitDate)
    : null;
  const prompts = [
    !bill.provider && "the hospital's name",
    !bill.admitDate && "your visit dates",
    bill.statedTotal === null && "the bill's total charges",
    bill.amountDue === null && "the amount due",
    bill.coverage === "insured" && bill.eobResponsibility === null && "your EOB's patient responsibility",
    bill.coverage === "self-pay" && bill.goodFaithEstimate === null && "your Good Faith Estimate, if you got one",
  ].filter((p): p is string => typeof p === "string");

  return (
    <section className="bill-head" aria-labelledby="bill-title">
      <div>
        <h1 id="bill-title" className={bill.provider ? undefined : "placeholder"}>{bill.provider || "Untitled bill"}</h1>
        <div className="bill-meta">
          <span>{CARE_SETTING_LABEL[bill.careSetting]} · {ORIGIN_LABEL[bill.origin]}</span>
          {visit && <span>{bill.careSetting === "inpatient" ? "Stay" : "Visit"} {visit}</span>}
          {bill.accountNumber && <span>Account <span className="mono">{bill.accountNumber}</span></span>}
          {bill.statementDate && <span>Statement {formatDate(bill.statementDate)}</span>}
          {bill.coverage !== "unknown" && <span>{bill.coverage === "insured" ? "Insured" : "Self-pay"}</span>}
        </div>
      </div>
      <dl className="figures">
        <div><dt>Line items</dt><dd>{formatCents(lineSum)}</dd></div>
        <div><dt>Amount due</dt>{bill.amountDue !== null ? <dd>{formatCents(bill.amountDue)}</dd> : <dd className="unknown">Not entered</dd>}</div>
        <div><dt>Questions</dt><dd key={activeCount} className={countChanged ? "figure-changed" : undefined}>{analysis ? activeCount : "–"}</dd></div>
      </dl>
      <div className="bill-tools">
        {prompts.length > 0
          ? <p className="prompt-list">Add {prompts.length > 1 ? `${prompts.slice(0, -1).join(", ")} and ${prompts[prompts.length - 1]}` : prompts[0]} to run more checks.</p>
          : <span />}
        <button type="button" className="button secondary small" onClick={() => setEditing(true)}>Edit bill details</button>
      </div>
      <Dialog open={editing} onClose={() => setEditing(false)} title="Bill details" titleId={titleId} variant="center" subtitle="From the top of your statement">
        <BillForm key={JSON.stringify(bill)} bill={bill} onSave={next => { onSave(next); setEditing(false); }} onCancel={() => setEditing(false)} />
      </Dialog>
    </section>
  );
}

type MoneyField = "statedTotal" | "amountDue" | "eobResponsibility" | "goodFaithEstimate";

function BillForm({ bill, onSave, onCancel }: { bill: Bill; onSave: (bill: Bill) => void; onCancel: () => void }) {
  const id = useId();
  const [text, setText] = useState({ provider: bill.provider, providerAddress: bill.providerAddress, accountNumber: bill.accountNumber, statementDate: bill.statementDate ?? "", admitDate: bill.admitDate ?? "", dischargeDate: bill.dischargeDate ?? "" });
  const [careSetting, setCareSetting] = useState<CareSetting>(bill.careSetting);
  const [coverage, setCoverage] = useState<Coverage>(bill.coverage);
  const [money, setMoney] = useState<Record<MoneyField, string>>({
    statedTotal: centsToInput(bill.statedTotal), amountDue: centsToInput(bill.amountDue),
    eobResponsibility: centsToInput(bill.eobResponsibility), goodFaithEstimate: centsToInput(bill.goodFaithEstimate),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: Record<string, string> = {};
    const cents = {} as Record<MoneyField, number | null>;
    for (const field of Object.keys(money) as MoneyField[]) {
      if ((field === "eobResponsibility" && coverage !== "insured") || (field === "goodFaithEstimate" && coverage !== "self-pay")) {
        cents[field] = null;
        continue;
      }
      const raw = money[field].trim();
      const value = raw ? parseMoney(raw) : null;
      if (raw && value === null) next[field] = "Enter a dollar amount, like 1890.00, or leave blank.";
      cents[field] = value;
    }
    const isStay = careSetting === "inpatient";
    const candidate: Bill = {
      ...bill,
      provider: text.provider.trim(), providerAddress: text.providerAddress.trim(), accountNumber: text.accountNumber.trim(),
      statementDate: text.statementDate || null,
      careSetting,
      admitDate: text.admitDate || null,
      // A single visit date means the visit started and ended that day.
      dischargeDate: text.dischargeDate || (!isStay && text.admitDate ? text.admitDate : null),
      coverage,
      ...cents,
      eobResponsibility: coverage === "insured" ? cents.eobResponsibility : null,
      goodFaithEstimate: coverage === "self-pay" ? cents.goodFaithEstimate : null,
    };
    const parsed = BillSchema.safeParse(candidate);
    if (!parsed.success) for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) { document.getElementById(`${id}-${first}`)?.focus(); return; }
    if (parsed.success) onSave(parsed.data);
  }

  const input = (name: keyof typeof text, label: string, props: Record<string, string | number | boolean> = {}, hint?: string, span = false) => (
    <div className={`field${span ? " span-2" : ""}`}>
      <label htmlFor={`${id}-${name}`}>{label}</label>
      <input id={`${id}-${name}`} className="input" value={text[name]} onChange={e => setText(t => ({ ...t, [name]: e.target.value }))}
        aria-invalid={errors[name] ? true : undefined} aria-describedby={[hint && `${id}-${name}-hint`, errors[name] && `${id}-${name}-error`].filter(Boolean).join(" ") || undefined} {...props} />
      {hint && <span className="hint" id={`${id}-${name}-hint`}>{hint}</span>}
      {errors[name] && <span className="error-text" id={`${id}-${name}-error`}>{errors[name]}</span>}
    </div>
  );
  const moneyInput = (name: MoneyField, label: string, hint: string) => (
    <div className="field">
      <label htmlFor={`${id}-${name}`}>{label}</label>
      <input id={`${id}-${name}`} className="input money" inputMode="decimal" value={money[name]} onChange={e => setMoney(m => ({ ...m, [name]: e.target.value }))}
        aria-invalid={errors[name] ? true : undefined} aria-describedby={`${id}-${name}-hint${errors[name] ? ` ${id}-${name}-error` : ""}`} />
      <span className="hint" id={`${id}-${name}-hint`}>{hint}</span>
      {errors[name] && <span className="error-text" id={`${id}-${name}-error`}>{errors[name]}</span>}
    </div>
  );
  const isStay = careSetting === "inpatient";

  return (
    <form onSubmit={submit} noValidate className="field-grid">
      {input("provider", "Hospital or provider", { maxLength: 120, autoComplete: "organization" }, undefined, true)}
      <div className="field span-2">
        <label htmlFor={`${id}-providerAddress`}>Billing office address</label>
        <textarea id={`${id}-providerAddress`} className="textarea" rows={3} maxLength={240} value={text.providerAddress} onChange={e => setText(t => ({ ...t, providerAddress: e.target.value }))} aria-invalid={errors.providerAddress ? true : undefined} aria-describedby={`${id}-providerAddress-hint${errors.providerAddress ? ` ${id}-providerAddress-error` : ""}`} />
        <span className="hint" id={`${id}-providerAddress-hint`}>Where disputes or questions should be mailed. It&rsquo;s usually on the back of the statement.</span>
        {errors.providerAddress && <span className="error-text" id={`${id}-providerAddress-error`}>{errors.providerAddress}</span>}
      </div>
      {input("accountNumber", "Account number", { maxLength: 40, spellCheck: false, autoComplete: "off" })}
      {input("statementDate", "Statement date", { type: "date" })}
      <div className="field span-2">
        <label htmlFor={`${id}-careSetting`}>Kind of care</label>
        <select id={`${id}-careSetting`} className="select" value={careSetting} onChange={e => setCareSetting(e.target.value as CareSetting)}>
          <option value="emergency">Emergency visit</option>
          <option value="outpatient">Outpatient care</option>
          <option value="inpatient">Hospital stay (admitted)</option>
        </select>
      </div>
      {input("admitDate", isStay ? "Admitted" : "Visit date", { type: "date" })}
      {input("dischargeDate", isStay ? "Discharged" : "Visit ended (if a later day)", { type: "date" })}
      <fieldset className="span-2">
        <legend>Did insurance process this bill?</legend>
        {([["insured", "Yes, I have insurance"], ["self-pay", "No, I'm uninsured or paying myself"], ["unknown", "I'm not sure"]] as const).map(([value, label]) => (
          <label className="choice" key={value}>
            <input type="radio" name={`${id}-coverage`} value={value} checked={coverage === value} onChange={() => setCoverage(value)} />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
      {moneyInput("statedTotal", "Total charges", "As printed on the bill, before payments.")}
      {moneyInput("amountDue", "Amount due", "What the bill asks you to pay.")}
      {coverage === "insured" && moneyInput("eobResponsibility", "Patient responsibility on your EOB", "From your insurer's Explanation of Benefits for this care.")}
      {coverage === "self-pay" && moneyInput("goodFaithEstimate", "Good Faith Estimate total", "The written estimate you received before care, if any.")}
      <div className="button-row span-2">
        <button type="submit" className="button">Save details</button>
        <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
