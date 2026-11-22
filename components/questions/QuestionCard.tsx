import { forwardRef, type ReactNode } from "react";
import type { Finding } from "../../lib/analysis";
import type { LineItem } from "../../lib/bill";
import { formatDate } from "../../lib/dates";
import { lookupCode } from "../../lib/glossary";
import { formatCents } from "../../lib/money";
import { LevelTag } from "../Tags";

// Rules whose facts say more than the strip already shows (itemize and user marks only repeat date and amount).
const FACTS_ADD_TO_STRIP = new Set<Finding["rule"]>(["line-math", "repeated-code", "room-nights", "outside-stay"]);

interface CardProps {
  finding: Finding;
  /** Position in the engine's order, 1-based. */
  position: number;
  total: number;
  /** Number in the letter while the question is being asked; null when set aside. */
  letterNumber: number | null;
  lines: LineItem[];
  headingId: string;
  /** Switches to the whole bill with this question's lines marked. */
  onShowOnBill?: (finding: Finding) => void;
  /** Rendered last: the decision controls. */
  children: ReactNode;
}

/**
 * One question, in the order a careful reader would raise it: what we noticed, the lines it rests on,
 * why it might be fine (given the same weight as the reason), and the exact words the letter will use.
 */
export const QuestionCard = forwardRef<HTMLHeadingElement, CardProps>(function QuestionCard({ finding, position, total, letterNumber, lines, headingId, onShowOnBill, children }, headingRef) {
  const evidence = lines.filter(line => finding.lineIds.includes(line.id));
  return (
    <article className="qcard" data-level={finding.level} data-aside={letterNumber === null || undefined} aria-labelledby={headingId}>
      <div className="qcard-top">
        <LevelTag level={finding.level} />
        <span className="qcard-count">Question {position} of {total}</span>
        {finding.amountInQuestion !== null && (
          <span className="qcard-amount"><span className="qcard-amount-label">In question</span>{formatCents(finding.amountInQuestion)}</span>
        )}
      </div>
      <h2 className="qcard-title" id={headingId} ref={headingRef} tabIndex={-1}>
        {finding.title}
      </h2>
      <Evidence finding={finding} lines={evidence} onShowOnBill={onShowOnBill} />
      <div className="qcard-sides">
        <div>
          <h3>Why we noticed</h3>
          <p>{finding.why}</p>
        </div>
        <div>
          <h3>Why it might be fine</h3>
          <p>{finding.innocent}</p>
        </div>
      </div>
      <div className="qcard-ask">
        <h3>{letterNumber !== null ? "Your letter will ask" : "If you ask, your letter will say"}</h3>
        <blockquote>{finding.ask}</blockquote>
        {finding.next && <p className="qcard-next">{finding.next}</p>}
      </div>
      {children}
    </article>
  );
});

/** The lines a question rests on, cut from the statement; or, for a disagreement between two documents, both figures joined by a bracket. */
function Evidence({ finding, lines, onShowOnBill }: { finding: Finding; lines: LineItem[]; onShowOnBill?: (finding: Finding) => void }) {
  if (lines.length) {
    return (
      <figure className="evidence">
        <figcaption className="evidence-caption">
          <span>{lines.length === 1 ? "The line on your statement" : `The ${lines.length} lines on your statement`}</span>
          {onShowOnBill && <button type="button" className="quiet compact" onClick={() => onShowOnBill(finding)}>See it on the bill</button>}
        </figcaption>
        <ul className="strip">
          {lines.map(line => {
            const note = lookupCode(line.code);
            return (
              <li key={line.id} className="strip-line">
                <span className="strip-date mono">{formatDate(line.date).replace(/, \d{4}$/, "")}</span>
                <span className="strip-desc"><span className="mono">{line.description}</span>{note && <span className="strip-plain">{note.name}</span>}</span>
                <span className="strip-qty mono">{line.unitPrice !== null ? `${line.quantity} × ${formatCents(line.unitPrice)}` : `Qty ${line.quantity}`}</span>
                <span className="strip-amount mono">{formatCents(line.amount)}</span>
              </li>
            );
          })}
        </ul>
        {FACTS_ADD_TO_STRIP.has(finding.rule) && <Facts finding={finding} />}
      </figure>
    );
  }
  if (finding.facts.length >= 3) {
    const [a, b, gap] = finding.facts;
    return (
      <figure className="evidence">
        <figcaption className="evidence-caption">Two figures from your documents</figcaption>
        <div className="pair">
          <div className="pair-figure"><span>{a.label}</span><strong className="mono">{a.value}</strong></div>
          <div className="pair-figure"><span>{b.label}</span><strong className="mono">{b.value}</strong></div>
          <span className="pair-bracket" aria-hidden="true" />
          <p className="pair-gap"><span>{gap.label}</span> <strong className="mono">{gap.value}</strong></p>
        </div>
        {finding.facts.length > 3 && <Facts finding={{ ...finding, facts: finding.facts.slice(3) }} />}
      </figure>
    );
  }
  return finding.facts.length ? <Facts finding={finding} /> : null;
}

function Facts({ finding }: { finding: Finding }) {
  return <dl className="facts">{finding.facts.map((fact, i) => <div key={`${fact.label}-${i}`}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>;
}
