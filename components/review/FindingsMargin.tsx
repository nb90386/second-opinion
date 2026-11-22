import Link from "next/link";
import type { Analysis, Finding, Level } from "../../lib/analysis";
import { LEVEL_LABEL } from "../../lib/analysis";
import { formatCents } from "../../lib/money";
import type { AnalysisStatus } from "../CaseProvider";
import { FORWARD } from "../PageTransition";
import { Chevron, LevelMark, LevelTag, QuestionRef } from "../Tags";

interface MarginProps {
  analysis: Analysis | null;
  status: AnalysisStatus;
  stale: boolean;
  active: Finding[];
  aside: Finding[];
  /** What the latest re-check changed; null after a first check. */
  change: { fresh: Set<string>; resolved: number } | null;
  onShowLines: (finding: Finding) => void;
  onToggleAside: (finding: Finding) => void;
  /** Pointing at or focusing a question highlights its lines in the ledger. */
  onPreview: (finding: Finding | null) => void;
  /** Questions whose lines are in the ledger's reading band as it scrolls. */
  reading?: Set<string>;
}

// An opened question keeps its body in view: once it has finished opening, the margin moves just enough
// to show it, never past its title. Until the sticky margin is fully on screen (or where it doesn't
// scroll on its own), the page moves instead.
const HEADER_CLEARANCE = 88;
function revealOpened(item: HTMLElement) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pass = (retry: boolean) => {
    const margin = item.closest<HTMLElement>(".margin");
    const own = margin && getComputedStyle(margin).overflowY === "auto" ? margin.getBoundingClientRect() : null;
    const scroller = own && own.bottom <= window.innerHeight + 1 ? margin : null;
    const view = scroller && own ? own : { top: HEADER_CLEARANCE, bottom: window.innerHeight };
    const box = item.getBoundingClientRect();
    const overflow = box.bottom - (view.bottom - 28);
    if (overflow <= 0) return;
    const by = Math.min(overflow, box.top - view.top - 24);
    if (by <= 0) return;
    (scroller ?? window).scrollBy({ top: by, behavior: reduce ? "auto" : "smooth" });
    // Moving the page can stick the margin before the body is in view; then the margin moves the rest.
    if (!scroller && own && retry) window.setTimeout(() => pass(false), reduce ? 0 : 420);
  };
  window.setTimeout(() => pass(true), reduce ? 0 : 300);
}

const CHECK_STATUS = { clear: "No questions", flagged: "Flagged", "not-run": "Not checked" } as const;

export function FindingsMargin({ analysis, status, stale, active, aside, change, onShowLines, onToggleAside, onPreview, reading }: MarginProps) {
  const counts = (["discrepancy", "ask", "detail"] as Level[]).map(level => [level, active.filter(f => f.level === level).length] as const).filter(([, n]) => n > 0);
  return (
    <aside className="margin" aria-labelledby="margin-title">
      <div className="margin-head">
        <h2 id="margin-title">Questions for the billing office</h2>
      </div>

      {!analysis && status === "checking" && (
        // Holds roughly the space the questions will take, so the ledger below doesn't jump when they arrive.
        <div className="findings-pending" aria-hidden="true"><span /><span /><span /></div>
      )}

      {analysis && (
        <>
          {counts.length > 0 && <div className="margin-summary">{counts.map(([level, n]) => <span key={level} className={`tag ${level}`}><LevelMark level={level} /><span className="tag-count">{n}</span> {LEVEL_LABEL[level]}</span>)}</div>}
          {active.length === 0 ? (
            <div className="no-findings">
              <strong>{aside.length ? "Everything is set aside." : "No questions raised."}</strong>
              {aside.length ? "Restore a question below to include it again." : "None of the checks found a pattern worth asking about. That doesn't prove every charge is right. See what was checked below."}
            </div>
          ) : (
            <ol className={`findings${stale ? " is-stale" : ""}`} aria-label="Questions">
              {active.map((finding, index) => <FindingItem key={finding.id} finding={finding} number={index + 1} fresh={change?.fresh.has(finding.id) ?? false} reading={reading?.has(finding.id) ?? false} onShowLines={onShowLines} onToggleAside={onToggleAside} onPreview={onPreview} />)}
            </ol>
          )}
          {aside.length > 0 && (
            <details className="aside-group">
              <summary>Set aside ({aside.length})</summary>
              <ul className="findings">
                {aside.map(finding => <FindingItem key={finding.id} finding={finding} onShowLines={onShowLines} onToggleAside={onToggleAside} onPreview={onPreview} />)}
              </ul>
            </details>
          )}
          <details className="checks">
            <summary><Chevron />What was checked</summary>
            <ul className="check-list">
              {analysis.checks.map(check => (
                <li key={check.rule}>
                  <span className={`tag ${check.status}`}><LevelMark level={check.status === "flagged" ? "discrepancy" : check.status} />{CHECK_STATUS[check.status]}</span>
                  <span>{check.label}</span>
                  <span className="check-detail">{check.detail}</span>
                </li>
              ))}
            </ul>
          </details>
          <p className="never-note">Never flagged: a charge for being expensive. List prices are often far above what insurers pay, so price alone isn&rsquo;t evidence of an error. <Link href="/method">How each check works</Link>.</p>
          <Link className="button" href="/letter" transitionTypes={FORWARD}>Draft the letter</Link>
        </>
      )}
    </aside>
  );
}

function FindingItem({ finding, number, fresh = false, reading = false, onShowLines, onToggleAside, onPreview }: { finding: Finding; number?: number; fresh?: boolean; reading?: boolean; onShowLines: (f: Finding) => void; onToggleAside: (f: Finding) => void; onPreview: (f: Finding | null) => void }) {
  const isAside = number === undefined;
  return (
    <li className={`finding${isAside ? " is-aside" : ""}`} data-fresh={fresh || undefined} data-reading={reading || undefined} id={`finding-${number ?? "aside"}-${finding.id.replace(/[^\w-]/g, "_")}`}
      onMouseEnter={() => onPreview(finding)} onMouseLeave={() => onPreview(null)}
      onFocus={() => onPreview(finding)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) onPreview(null); }}>
      <details onToggle={event => { if (event.currentTarget.open) revealOpened(event.currentTarget.parentElement as HTMLElement); }}>
        <summary>
          {isAside ? <span aria-hidden="true" /> : <QuestionRef number={number} level={finding.level} />}
          <span className="finding-title"><span className="finding-title-text">{finding.title}</span>{fresh && <span className="sr-only"> (new after your edit)</span>}</span>
          {finding.amountInQuestion !== null ? <span className="finding-amount">{formatCents(finding.amountInQuestion)}</span> : <span />}
          <span className="finding-meta"><LevelTag level={finding.level} />{isAside && <span className="small muted">Set aside</span>}<Chevron /></span>
        </summary>
        <div className="finding-body">
          <p>{finding.why}</p>
          {finding.facts.length > 0 && (
            <dl className="facts">{finding.facts.map((fact, i) => <div key={`${fact.label}-${i}`}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
          )}
          <div><span className="label-inline">Could be fine if</span><p>{finding.innocent}</p></div>
          <div><span className="label-inline">What to ask</span><blockquote className="ask-quote">{finding.ask}</blockquote></div>
          {finding.next && <div><span className="label-inline">Also</span><p>{finding.next}</p></div>}
          {finding.amountInQuestion !== null && <p className="small muted">The amount in question is what this question concerns, not money you are owed.</p>}
          <div className="finding-actions">
            {finding.lineIds.length > 0 && <button type="button" className="quiet compact" onClick={() => onShowLines(finding)}>Show on bill</button>}
            <button type="button" className="quiet compact" onClick={() => onToggleAside(finding)}>{isAside ? "Restore this question" : "Set aside: it's resolved or fine"}</button>
          </div>
        </div>
      </details>
    </li>
  );
}
