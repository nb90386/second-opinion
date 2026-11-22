"use client";

import Link from "next/link";
import { useId, useState, useSyncExternalStore } from "react";
import { useCase } from "../../components/CaseProvider";
import { BACK } from "../../components/PageTransition";
import { LetterSheet } from "../../components/questions/LetterSheet";
import { LevelTag, QuestionRef } from "../../components/Tags";
import { MAX_LETTER_LENGTH } from "../../lib/case";
import { localToday } from "../../lib/dates";
import { composeLetter, letterFileName, letterForExport, type LetterOptions, type Sender } from "../../lib/letter";
import { formatCents } from "../../lib/money";

const noSubscribe = () => () => {};
const getToday = () => localToday(new Date());
const getServerToday = () => null;

const OPTION_LABELS: [keyof LetterOptions, string, string][] = [
  ["requestItemized", "Ask for a complete itemized statement", "Useful even if you have one: it should list codes for every charge."],
  ["requestHold", "Ask them to hold the account while they review", "A request; the billing office decides whether to agree."],
  ["askFinancialAssistance", "Ask about financial assistance", "Requests the hospital's policy and application. Many hospitals have one."],
];

export function LetterClient() {
  const { loading, current, analysis, stale, analysisStatus, analysisError, retryAnalysis, updateCase } = useCase();
  const today = useSyncExternalStore(noSubscribe, getToday, getServerToday);
  const id = useId();
  const [exportStatus, setExportStatus] = useState("");
  const [confirmRebuild, setConfirmRebuild] = useState(false);

  if (loading) return <p className="sr-only" role="status">Opening your bill…</p>;
  if (!current) {
    return (
      <div className="empty-state">
        <h1>Start with a bill to draft a letter.</h1>
        <p>The letter is built from the questions Second Opinion finds in your bill, so it needs a bill first.</p>
        <div className="button-row">
          <Link className="button" href="/start">Open the example bill</Link>
          <Link className="button secondary" href="/start#your-bill">Use your own bill</Link>
        </div>
      </div>
    );
  }
  const { bill, letter } = current;
  const active = (analysis?.findings ?? []).filter(f => !current.setAside.includes(f.id));
  const included = active.filter(f => !letter.excluded.includes(f.id));
  const generated = analysis && today ? composeLetter({ bill, findings: included, sender: letter.sender, options: letter.options, today }) : null;
  const text = letter.draft ?? generated ?? "";
  const edited = letter.draft !== null;
  const outOfDate = edited && generated !== null && letter.draftBasis !== generated;
  const asideCount = (analysis?.findings ?? []).filter(f => current.setAside.includes(f.id)).length;
  const checksReady = analysisStatus === "ready" && !stale;
  const exportReady = !!text && checksReady;
  const exportText = letterForExport(bill, text);

  const setLetter = (update: (l: typeof letter) => typeof letter) => updateCase(c => ({ ...c, letter: update(c.letter) }));
  const setSender = (field: keyof Sender, value: string) => setLetter(l => ({ ...l, sender: { ...l.sender, [field]: value } }));
  const toggleIncluded = (findingId: string) => setLetter(l => {
    const validIds = new Set((analysis?.findings ?? []).map(f => f.id));
    const kept = l.excluded.filter(x => validIds.has(x));
    return { ...l, excluded: kept.includes(findingId) ? kept.filter(x => x !== findingId) : [...kept, findingId] };
  });

  async function copy() {
    try {
      await navigator.clipboard.writeText(exportText);
      setExportStatus("Copied to your clipboard.");
    } catch {
      setExportStatus("Your browser didn't allow copying. Select the letter text and copy it yourself.");
    }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([exportText], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = letterFileName(bill, today ?? "draft");
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExportStatus(`Downloaded ${link.download}.`);
  }

  const senderField = (field: keyof Sender, label: string, props: Record<string, string> = {}) => (
    <div className="field">
      <label htmlFor={`${id}-${field}`}>{label}</label>
      {field === "address"
        ? <textarea id={`${id}-${field}`} className="textarea" rows={3} maxLength={300} value={letter.sender.address} onChange={e => setSender("address", e.target.value)} autoComplete="street-address" />
        : <input id={`${id}-${field}`} className="input" value={letter.sender[field]} onChange={e => setSender(field, e.target.value)} {...props} />}
    </div>
  );

  return (
    <>
      <h1 className="start-title">A letter you can send today.</h1>
      <p className="lede">Built from the questions you kept. Change any word. The draft asks questions and requests corrections; it makes no legal claims.</p>

      {analysisStatus === "error" ? (
        <div className="notice error gap-top" role="alert"><div><p>Couldn&rsquo;t check your latest bill. {stale ? "The questions and draft below use results from before your last edit." : "Your saved draft is preserved."} {analysisError} Copy, download and print will be available after a successful check.</p><button type="button" className="quiet compact" onClick={retryAnalysis}>Try again</button></div></div>
      ) : analysisStatus === "checking" && stale && <p className="notice gap-top" role="status">Checking your latest bill… {stale ? "The questions and draft below are from before your last edit. " : ""}Copy, download and print will be available when the check finishes.</p>}

      <div className="letter-grid">
        <div className="letter-controls">
          <section aria-labelledby={`${id}-include`}>
            <h2 id={`${id}-include`}>Questions to include</h2>
            {!analysis && analysisStatus !== "error" && <><p className="small muted" role="status">Checking the bill…</p><div className="findings-pending" aria-hidden="true"><span /><span /><span /></div></>}
            {analysis && (active.length ? (
              <ul className="include-list">
                {active.map((finding, index) => (
                  <li key={finding.id}>
                    <label className="choice">
                      <input type="checkbox" checked={!letter.excluded.includes(finding.id)} onChange={() => toggleIncluded(finding.id)} />
                      <span>
                        <QuestionRef number={index + 1} level={finding.level} labelled={false} /> {finding.title}
                        <span className="choice-hint"><LevelTag level={finding.level} />{finding.amountInQuestion !== null && <> · {formatCents(finding.amountInQuestion)} in question</>}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : <p className="small muted gap-top">No open questions. The letter will ask for detail on the bill as a whole.</p>)}
            {asideCount > 0 && <p className="small muted gap-top">{asideCount} set-aside {asideCount === 1 ? "question isn't" : "questions aren't"} included. <Link href="/review" transitionTypes={BACK}>Review them</Link>.</p>}
          </section>

          <section aria-labelledby={`${id}-you`}>
            <h2 id={`${id}-you`}>From you</h2>
            <p className="small muted">Saved only in this browser. Leave blank to keep a [placeholder].</p>
            <div className="stack">
              {senderField("name", "Your name", { autoComplete: "name", maxLength: "120" })}
              {senderField("address", "Mailing address")}
              {senderField("phone", "Phone", { autoComplete: "tel", inputMode: "tel", maxLength: "40" })}
              {senderField("email", "Email", { autoComplete: "email", type: "email", maxLength: "120" })}
            </div>
          </section>

          <fieldset>
            <legend><h2>Also ask</h2></legend>
            {OPTION_LABELS.map(([key, label, hint]) => (
              <label className="choice" key={key}>
                <input type="checkbox" checked={letter.options[key]} onChange={() => setLetter(l => ({ ...l, options: { ...l.options, [key]: !l.options[key] } }))} />
                <span>{label}<span className="choice-hint">{hint}</span></span>
              </label>
            ))}
          </fieldset>
        </div>

        <LetterSheet>
        <section className="letter-paper" aria-labelledby={`${id}-letter`}>
          <div className="letter-toolbar">
            <div>
              <h2 id={`${id}-letter`} className="sr-only">Letter</h2>
              <span className="letter-status" role="status">{edited ? "Edited by you" : generated ? "Drafted from your questions. Edit anything." : ""}</span>
            </div>
            <div className="button-row">
              <button type="button" className="button secondary small" onClick={copy} disabled={!exportReady}>Copy</button>
              <button type="button" className="button secondary small" onClick={download} disabled={!exportReady}>Download .txt</button>
              <button type="button" className="button small" onClick={() => window.print()} disabled={!exportReady}>Print or save PDF</button>
            </div>
          </div>
          {exportStatus && <p className="notice" role="status"><span>{exportStatus}</span></p>}
          {(outOfDate || edited) && (
            <div className={`notice${outOfDate ? " warn" : ""}`}>
              <div>
                <p>{outOfDate ? "Your questions or details changed after you started editing. Rebuilding includes them and replaces your edits." : "You've edited this letter. Rebuilding replaces your edits with a fresh draft."}</p>
                {confirmRebuild ? (
                  <div className="button-row">
                    <button type="button" className="button danger small" disabled={!checksReady} onClick={() => { setLetter(l => ({ ...l, draft: null, draftBasis: null })); setConfirmRebuild(false); }}>Replace my edits</button>
                    <button type="button" className="button secondary small" onClick={() => setConfirmRebuild(false)}>Keep editing</button>
                  </div>
                ) : <button type="button" className="quiet compact" disabled={!checksReady} onClick={() => setConfirmRebuild(true)}>Rebuild the letter…</button>}
              </div>
            </div>
          )}
          <label className="sr-only" htmlFor={`${id}-text`}>Letter text</label>
          <textarea
            id={`${id}-text`} className="letter-text" value={text} spellCheck maxLength={MAX_LETTER_LENGTH}
            placeholder={analysis ? "" : "The draft appears once the bill has been checked."}
            onChange={e => {
              const value = e.target.value;
              setLetter(l => ({ ...l, draft: value, draftBasis: l.draft === null ? generated : l.draftBasis }));
            }}
          />
          {text.length >= MAX_LETTER_LENGTH && <p className="notice warn" role="status">The letter has reached its length limit. Remove some text before adding more.</p>}
        </section>
        </LetterSheet>
      </div>
      <div className="print-letter" aria-hidden="true">{exportReady ? exportText : "The latest bill has not been checked. Return to Second Opinion and retry before printing the letter."}</div>
    </>
  );
}
