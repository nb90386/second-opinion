import { useId, useState, type SubmitEvent } from "react";
import type { Finding } from "../../lib/analysis";
import { LineItemSchema, type LineItem } from "../../lib/bill";
import { formatDate } from "../../lib/dates";
import { lookupCode, NOTE_SOURCE } from "../../lib/glossary";
import { centsToInput, formatCents, parseMoney } from "../../lib/money";
import { Dialog } from "../Dialog";
import { LevelTag } from "../Tags";

type Mode = { kind: "view"; lineId: string } | { kind: "new" } | null;

interface LineDialogProps {
  mode: Mode;
  lines: LineItem[];
  findings: Finding[];
  /** Display number of each active (not set-aside) finding. */
  numbers: Map<string, number>;
  defaultDate: string;
  onClose: () => void;
  onSave: (line: LineItem) => void;
  onAdd: (line: LineItem) => void;
  onRemove: (lineId: string) => void;
}

export function LineDialog({ mode, lines, findings, numbers, defaultDate, onClose, onSave, onAdd, onRemove }: LineDialogProps) {
  const line = mode?.kind === "view" ? lines.find(l => l.id === mode.lineId) ?? null : null;
  const open = mode?.kind === "new" || line !== null;
  const titleId = useId();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [saved, setSaved] = useState("");

  function close() { setConfirmRemove(false); setSaved(""); onClose(); }

  if (mode?.kind === "new") {
    return (
      <Dialog open={open} onClose={close} title="Add a line" titleId={titleId} subtitle="A new charge from your statement">
        <p className="muted">Copy the line exactly as it appears on your itemized statement.</p>
        <LineForm key="new" initial={null} defaultDate={defaultDate} submitLabel="Add line" onSubmit={item => { onAdd(item); setSaved("Line added. Checks are re-running."); }} />
      </Dialog>
    );
  }

  const note = line ? lookupCode(line.code) : null;
  const lineFindings = line ? findings.filter(f => f.lineIds.includes(line.id)) : [];
  return (
    <Dialog
      open={open}
      onClose={close}
      title={line?.description ?? ""}
      titleId={titleId}
      subtitle={line ? `${formatDate(line.date)}${line.code ? ` · ${line.code}` : ""}` : null}
      fallbackFocus={() => document.querySelector<HTMLElement>(".row-open") ?? document.getElementById("main")}
    >
      {line && (
        <>
          <section aria-label="Charge">
            <div className="line-amount">{formatCents(line.amount)}</div>
            <div className="line-facts">
              <span>Quantity {line.quantity}</span>
              {line.unitPrice !== null && <span>{formatCents(line.unitPrice)} each</span>}
            </div>
          </section>

          <section aria-labelledby={`${titleId}-plain`}>
            <h3 className="section-title" id={`${titleId}-plain`}>In plain English</h3>
            <div className="code-note">
              {note ? (
                <>
                  <p><strong>{note.name}.</strong> {note.plain}</p>
                  <p className="source">{note.system} {line.code.toUpperCase()}. {NOTE_SOURCE}</p>
                </>
              ) : line.code ? (
                <p>We don&rsquo;t have a plain-language note for code <span className="mono">{line.code}</span>. Ask the billing office what service it represents.</p>
              ) : (
                <p>No billing code is listed. Itemized statements usually include one; asking for it makes the charge easier to check.</p>
              )}
            </div>
          </section>

          <section aria-labelledby={`${titleId}-questions`}>
            <h3 className="section-title" id={`${titleId}-questions`}>Questions on this line</h3>
            {lineFindings.length ? (
              <ul className="line-findings">
                {lineFindings.map(f => (
                  <li key={f.id}>
                    <LevelTag level={f.level} />
                    <strong>{numbers.has(f.id) ? `${numbers.get(f.id)}. ` : "Set aside: "}{f.title}</strong>
                    <span className="why">{f.why}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="muted">No checks raised a question about this line.</p>}
          </section>

          <MarkSection key={`mark-${line.id}`} line={line} onSave={onSave} />

          <section aria-labelledby={`${titleId}-correct`}>
            <h3 className="section-title" id={`${titleId}-correct`}>Correct this line</h3>
            <p className="small muted form-intro">If something came across wrong, fix it to match the paper bill. Checks re-run automatically.</p>
            <LineForm key={line.id} initial={line} defaultDate={defaultDate} submitLabel="Save correction" onSubmit={item => { onSave(item); setSaved("Correction saved. Checks are re-running."); }} />
            {saved && <p className="small" role="status">{saved}</p>}
          </section>

          <section aria-label="Remove line">
            {confirmRemove ? (
              <div className="confirm-row" role="group" aria-label="Confirm removal">
                <span>Remove this line from the bill?</span>
                <button type="button" className="button danger small" onClick={() => { onRemove(line.id); close(); }}>Remove line</button>
                <button type="button" className="button secondary small" onClick={() => setConfirmRemove(false)}>Keep it</button>
              </div>
            ) : (
              <button type="button" className="quiet compact" onClick={() => setConfirmRemove(true)}>Remove this line…</button>
            )}
          </section>
        </>
      )}
    </Dialog>
  );
}

function MarkSection({ line, onSave }: { line: LineItem; onSave: (line: LineItem) => void }) {
  const [note, setNote] = useState(line.note);
  const name = `mark-${line.id}`;
  const options = [
    { value: "none", label: "Looks right to me" },
    { value: "not-received", label: "I don't think I received this", hint: "Adds a question asking them to confirm it in your record or remove it." },
    { value: "unsure", label: "I'm not sure what this is", hint: "Adds a request for an explanation." },
  ] as const;
  return (
    <section>
      <fieldset>
        <legend className="section-title">Your mark</legend>
        {options.map(option => (
          <label className="choice" key={option.value}>
            <input type="radio" name={name} value={option.value} checked={line.mark === option.value} onChange={() => onSave({ ...line, mark: option.value, note })} />
            <span>{option.label}{"hint" in option && <span className="choice-hint">{option.hint}</span>}</span>
          </label>
        ))}
      </fieldset>
      {line.mark !== "none" && (
        <div className="field gap-top">
          <label htmlFor={`${name}-note`}>Your note <span className="muted">(optional, appears in the question)</span></label>
          <textarea id={`${name}-note`} className="textarea" maxLength={500} value={note} onChange={e => setNote(e.target.value)} onBlur={() => note !== line.note && onSave({ ...line, note })} />
        </div>
      )}
    </section>
  );
}

type FieldName = "date" | "code" | "description" | "quantity" | "unitPrice" | "amount";

function LineForm({ initial, defaultDate, submitLabel, onSubmit }: { initial: LineItem | null; defaultDate: string; submitLabel: string; onSubmit: (line: LineItem) => void }) {
  const id = useId();
  const [values, setValues] = useState<Record<FieldName, string>>({
    date: initial?.date ?? defaultDate,
    code: initial?.code ?? "",
    description: initial?.description ?? "",
    quantity: String(initial?.quantity ?? 1),
    unitPrice: centsToInput(initial?.unitPrice ?? null),
    amount: initial ? centsToInput(initial.amount) : "",
  });
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const set = (field: FieldName) => (event: { target: { value: string } }) => setValues(v => ({ ...v, [field]: event.target.value }));

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: Partial<Record<FieldName, string>> = {};
    const amount = parseMoney(values.amount);
    const unitPrice = values.unitPrice.trim() ? parseMoney(values.unitPrice) : null;
    const quantity = Number(values.quantity);
    if (amount === null) next.amount = "Enter the line total, like 186.00.";
    if (values.unitPrice.trim() && unitPrice === null) next.unitPrice = "Enter a dollar amount, or leave blank.";
    const candidate = {
      id: initial?.id ?? `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      date: values.date, code: values.code.trim().toUpperCase(), description: values.description.trim(),
      quantity, unitPrice, amount: amount ?? 0, mark: initial?.mark ?? "none", note: initial?.note ?? "",
    };
    const parsed = LineItemSchema.safeParse(candidate);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as FieldName;
        if (field in values && !next[field]) next[field] = issue.message;
      }
    }
    setErrors(next);
    if (Object.keys(next).length || !parsed.success) {
      const first = (Object.keys(next) as FieldName[])[0];
      if (first) document.getElementById(`${id}-${first}`)?.focus();
      return;
    }
    onSubmit(parsed.data);
  }

  const field = (name: FieldName, label: string, props: Record<string, string | number | boolean> = {}, hint?: string, span = false) => (
    <div className={`field${span ? " span-2" : ""}`}>
      <label htmlFor={`${id}-${name}`}>{label}</label>
      <input
        id={`${id}-${name}`} className={`input${name === "amount" || name === "unitPrice" ? " money" : ""}`} value={values[name]} onChange={set(name)}
        aria-invalid={errors[name] ? true : undefined} aria-describedby={[hint && `${id}-${name}-hint`, errors[name] && `${id}-${name}-error`].filter(Boolean).join(" ") || undefined}
        {...props}
      />
      {hint && <span className="hint" id={`${id}-${name}-hint`}>{hint}</span>}
      {errors[name] && <span className="error-text" id={`${id}-${name}-error`}>{errors[name]}</span>}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate>
      <div className="field-grid">
        {field("description", "Description", { maxLength: 160, autoComplete: "off" }, undefined, true)}
        {field("date", "Date of service", { type: "date" })}
        {field("code", "Code", { maxLength: 16, autoComplete: "off", spellCheck: false }, "CPT, HCPCS or revenue code, if listed")}
        {field("quantity", "Quantity", { inputMode: "decimal" })}
        {field("unitPrice", "Unit price ($)", { inputMode: "decimal" }, "Optional")}
        {field("amount", "Line total ($)", { inputMode: "decimal" }, "Exactly as printed", true)}
      </div>
      <div className="button-row gap-top"><button type="submit" className="button">{submitLabel}</button></div>
    </form>
  );
}
