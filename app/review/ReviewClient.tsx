"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useCase } from "../../components/CaseProvider";
import { FORWARD } from "../../components/PageTransition";
import { QuestionDeck } from "../../components/questions/QuestionDeck";
import { BillSummary } from "../../components/review/BillSummary";
import { CheckStatus } from "../../components/review/CheckStatus";
import { FindingsMargin } from "../../components/review/FindingsMargin";
import { Ledger, type LineRef } from "../../components/review/Ledger";
import { LineDialog } from "../../components/review/LineDialog";
import type { Analysis, Finding } from "../../lib/analysis";
import { LIMITS, type LineItem } from "../../lib/bill";
import { localToday } from "../../lib/dates";
import { composeLetter } from "../../lib/letter";

type Mode = { kind: "view"; lineId: string } | { kind: "new" } | null;
type View = "questions" | "bill";

// The view lives in the address (?view=bill), so it survives a reload and needs no storage of its own.
const VIEW_EVENT = "second-opinion:view";
const subscribeView = (notify: () => void) => {
  window.addEventListener("popstate", notify);
  window.addEventListener(VIEW_EVENT, notify);
  return () => { window.removeEventListener("popstate", notify); window.removeEventListener(VIEW_EVENT, notify); };
};
const getView = (): View => (new URLSearchParams(window.location.search).get("view") === "bill" ? "bill" : "questions");
const getServerView = (): View => "questions";
function setView(view: View) {
  const url = new URL(window.location.href);
  if (view === "bill") url.searchParams.set("view", "bill"); else url.searchParams.delete("view");
  window.history.replaceState(window.history.state, "", url);
  window.dispatchEvent(new Event(VIEW_EVENT));
}

const noSubscribe = () => () => {};
const getToday = () => localToday(new Date());
const getServerToday = () => null;

export function ReviewClient() {
  const { loading, current, analysis, stale, analysisStatus, analysisError, retryAnalysis, updateCase, updateBill } = useCase();
  const view = useSyncExternalStore(subscribeView, getView, getServerView);
  const today = useSyncExternalStore(noSubscribe, getToday, getServerToday);
  const [mode, setMode] = useState<Mode>(null);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const [previewed, setPreviewed] = useState<string[]>([]);
  const marked = useMemo(() => new Set([...highlighted, ...previewed]), [highlighted, previewed]);
  const pendingShow = useRef<Finding | null>(null);
  const [readingLines, setReadingLines] = useState<Set<string>>(new Set());
  // What the latest re-check changed, so an edit's effect is visible: new questions are marked and
  // the status line counts what was resolved. A first check or a page load reports nothing.
  const [seenAnalysis, setSeenAnalysis] = useState<Analysis | null>(analysis);
  const [change, setChange] = useState<{ fresh: Set<string>; resolved: number } | null>(null);
  if (analysis !== seenAnalysis) {
    setSeenAnalysis(analysis);
    if (seenAnalysis && analysis) {
      const before = new Set(seenAnalysis.findings.map(f => f.id));
      const after = new Set(analysis.findings.map(f => f.id));
      setChange({ fresh: new Set([...after].filter(id => !before.has(id))), resolved: [...before].filter(id => !after.has(id)).length });
    }
  }

  const setAside = useMemo(() => new Set(current?.setAside ?? []), [current?.setAside]);
  const excluded = useMemo(() => new Set(current?.letter.excluded ?? []), [current?.letter.excluded]);
  const findings = useMemo(() => analysis?.findings ?? [], [analysis]);
  const active = findings.filter(f => !setAside.has(f.id));
  const aside = findings.filter(f => setAside.has(f.id));
  const { refs, numbers } = useMemo(() => {
    const refs = new Map<string, LineRef[]>();
    const numbers = new Map<string, number>();
    findings.filter(f => !setAside.has(f.id)).forEach((finding, index) => {
      numbers.set(finding.id, index + 1);
      for (const id of finding.lineIds) refs.set(id, [...(refs.get(id) ?? []), { number: index + 1, level: finding.level }]);
    });
    return { refs, numbers };
  }, [findings, setAside]);
  // The letter asks what is neither set aside nor left out on the letter page, in the engine's order.
  const included = useMemo(() => findings.filter(f => !setAside.has(f.id) && !excluded.has(f.id)), [findings, setAside, excluded]);
  const letterNumbers = useMemo(() => new Map(included.map((f, i) => [f.id, i + 1])), [included]);
  const letterText = current && analysis && today ? composeLetter({ bill: current.bill, findings: included, sender: current.letter.sender, options: current.letter.options, today }) : "";

  const showLines = useCallback((finding: Finding) => {
    setHighlighted(new Set(finding.lineIds));
    const [first] = finding.lineIds;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(`line-${first}`)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    document.getElementById(`open-${first}`)?.focus({ preventScroll: true });
    window.setTimeout(() => setHighlighted(new Set()), 2400);
  }, []);

  // As the ledger scrolls, the margin marks the questions about the lines in the reading band (the
  // middle of the screen): the annotations follow the bill being read. Only lines with questions are watched.
  const watchKey = view === "bill" ? [...refs.keys()].join(",") : "";
  useEffect(() => {
    if (!watchKey || typeof IntersectionObserver === "undefined") return;
    const inBand = new Set<string>();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).id.slice("line-".length);
        if (entry.isIntersecting) inBand.add(id); else inBand.delete(id);
      }
      setReadingLines(new Set(inBand));
    }, { rootMargin: "-35% 0px -45% 0px" });
    for (const id of watchKey.split(",")) { const row = document.getElementById(`line-${id}`); if (row) observer.observe(row); }
    return () => { observer.disconnect(); setReadingLines(new Set()); };
  }, [watchKey]);

  // "See it on the bill" switches to the whole bill, then marks the lines once the ledger is there.
  useEffect(() => {
    if (view !== "bill" || !pendingShow.current) return;
    const finding = pendingShow.current;
    pendingShow.current = null;
    showLines(finding);
  }, [view, showLines]);

  if (loading) return <p className="sr-only" role="status">Opening your bill…</p>;
  if (!current) {
    return (
      <div className="empty-state">
        <h1>There&rsquo;s no bill to review.</h1>
        <p>Open the example to see how a review works, or bring the lines from your own itemized statement.</p>
        <div className="button-row">
          <Link className="button" href="/start">Open the example bill</Link>
          <Link className="button secondary" href="/start#your-bill">Use your own bill</Link>
        </div>
      </div>
    );
  }
  const bill = current.bill;

  function toggleAside(finding: Finding) {
    const validIds = new Set(findings.map(f => f.id));
    updateCase(c => {
      const kept = c.setAside.filter(id => validIds.has(id));
      return { ...c, setAside: kept.includes(finding.id) ? kept.filter(id => id !== finding.id) : [...kept, finding.id] };
    });
  }
  function ask(finding: Finding) {
    updateCase(c => ({ ...c, setAside: c.setAside.filter(id => id !== finding.id), letter: { ...c.letter, excluded: c.letter.excluded.filter(id => id !== finding.id) } }));
  }
  function putAside(finding: Finding) {
    const validIds = new Set(findings.map(f => f.id));
    updateCase(c => ({ ...c, setAside: [...c.setAside.filter(id => validIds.has(id) && id !== finding.id), finding.id] }));
  }
  function seeOnBill(finding: Finding) {
    pendingShow.current = finding;
    setView("bill");
  }

  const saveLine = (line: LineItem) => updateBill(b => ({ ...b, lineItems: b.lineItems.map(l => (l.id === line.id ? line : l)) }));
  const addLine = (line: LineItem) => {
    if (bill.lineItems.length >= LIMITS.lines) return;
    updateBill(b => b.lineItems.length >= LIMITS.lines ? b : ({ ...b, lineItems: [...b.lineItems, line] }));
    setMode({ kind: "view", lineId: line.id });
  };
  const removeLine = (lineId: string) => updateBill(b => ({ ...b, lineItems: b.lineItems.filter(l => l.id !== lineId) }));
  const lastDate = bill.lineItems.at(-1)?.date ?? bill.admitDate ?? "";

  // Questions are the way in. A bill with no lines, or no questions once checked, has only the bill to show.
  const noQuestions = bill.lineItems.length === 0 || (analysis !== null && findings.length === 0);
  const shown: View = noQuestions ? "bill" : view;
  const edited = current.letter.draft !== null;

  return (
    <>
      <div className="review-head" data-view={shown}>
      <BillSummary bill={bill} analysis={analysis} activeCount={active.length} onSave={next => updateBill(() => next)} />
      </div>
      <div className="review-bar">
        {!noQuestions && (
          <div className="view-switch" role="group" aria-label="Review by">
            <button type="button" aria-pressed={shown === "questions"} onClick={() => setView("questions")}>
              <span className="label-long">One question at a time</span><span className="label-short">Questions</span><span className="view-count">{analysis ? findings.length : "–"}</span>
            </button>
            <button type="button" aria-pressed={shown === "bill"} onClick={() => setView("bill")}>
              <span className="label-long">The whole bill</span><span className="label-short">Whole bill</span><span className="view-count">{bill.lineItems.length}</span>
            </button>
          </div>
        )}
        <CheckStatus analysis={analysis} status={analysisStatus} stale={stale} error={analysisError} change={change} onRetry={retryAnalysis} />
      </div>

      {shown === "questions" ? (
        analysis ? (
          <div className={stale ? "is-stale-deck" : undefined}>
            <QuestionDeck
              findings={findings} lines={bill.lineItems} aside={setAside} letterNumbers={letterNumbers} letterText={letterText} letterFrom="To the billing office:"
              letterTitle="Your letter" onAsk={ask} onSetAside={putAside} onShowOnBill={seeOnBill}
              letterFoot={
                <div className="deck-letter-foot">
                  {edited && <p className="small">You&rsquo;ve edited the letter by hand. Your edits are kept; the letter page offers to rebuild it with these choices.</p>}
                  <Link className="button secondary small" href="/letter" transitionTypes={FORWARD}>Edit, copy or print</Link>
                </div>
              }
              done={() => (
                <div className="button-row">
                  <Link className="button" href="/letter" transitionTypes={FORWARD}>Read your letter</Link>
                  <button type="button" className="button secondary" onClick={() => setView("bill")}>Check the whole bill</button>
                </div>
              )}
            />
          </div>
        ) : analysisStatus !== "error" && (
          // Holds the card's place while the first check runs: static, no shimmer.
          <div className="deck-pending" aria-hidden="true"><span /><span /><span /></div>
        )
      ) : (
        <div className="workspace-grid">
          <section aria-labelledby="ledger-title">
            <div className="ledger-head">
              <h2 id="ledger-title">Line items</h2>
              <span className="small muted">Choose a line to see what it is or correct it</span>
            </div>
            <Ledger lines={bill.lineItems} refs={refs} highlighted={marked} onOpen={lineId => setMode({ kind: "view", lineId })} onAdd={() => setMode({ kind: "new" })} />
          </section>
          <FindingsMargin
            analysis={analysis} status={analysisStatus} stale={stale}
            active={active} aside={aside} change={change} onShowLines={showLines} onToggleAside={toggleAside} onPreview={finding => setPreviewed(finding?.lineIds ?? [])}
            reading={new Set(active.filter(f => f.lineIds.some(id => readingLines.has(id))).map(f => f.id))}
          />
        </div>
      )}
      <LineDialog
        mode={mode} lines={bill.lineItems} findings={findings} numbers={numbers} defaultDate={lastDate}
        onClose={() => setMode(null)} onSave={saveLine} onAdd={addLine} onRemove={removeLine}
      />
    </>
  );
}
