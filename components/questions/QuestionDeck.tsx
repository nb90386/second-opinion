"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { Finding } from "../../lib/analysis";
import type { LineItem } from "../../lib/bill";
import { captureChip, cancelFlight, flyChip, FLIGHT_MS, prefersReducedMotion, type Launch } from "./flight";
import { LetterPreview } from "./LetterPreview";
import { QuestionCard } from "./QuestionCard";
import { QuestionRef } from "../Tags";
import { LetterSheet } from "./LetterSheet";

interface DeckProps {
  findings: Finding[];
  lines: LineItem[];
  aside: Set<string>;
  /** Number of each question in the letter as it stands; absent when the letter leaves it out. */
  letterNumbers: Map<string, number>;
  letterText: string;
  /** Start the letter preview at the paragraph beginning with this text. */
  letterFrom?: string;
  letterTitle: ReactNode;
  letterFoot?: ReactNode;
  onAsk: (finding: Finding) => void;
  onSetAside: (finding: Finding) => void;
  onShowOnBill?: (finding: Finding) => void;
  /** Shown after the last question. */
  done: (counts: { asking: number; aside: number }) => ReactNode;
  variant?: "workspace" | "demo";
}

/**
 * One question at a time, with the letter beside it. Keeping a question sends its number into the
 * letter; setting it aside takes it out. Every decision moves to the next question and focus follows.
 */
export function QuestionDeck({ findings, lines, aside, letterNumbers, letterText, letterFrom, letterTitle, letterFoot, onAsk, onSetAside, onShowOnBill, done, variant = "workspace" }: DeckProps) {
  const id = useId();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  // While a kept question's chip is in the air, the letter holds still so the chip lands where it aimed.
  const landingUntil = useRef(0);
  const [landed, setLanded] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const doneHeading = useRef<HTMLHeadingElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const letter = useRef<HTMLDivElement>(null);
  const pending = useRef<{ launch: Launch | null; findingId: string } | null>(null);
  // On a phone the decision docks to the bottom of the screen, but only once the question has been
  // reached: a card that has just entered at the bottom shows its title before the buttons.
  const [docked, setDocked] = useState(false);
  const moved = useRef(false);

  const total = findings.length;
  const at = Math.min(index, total);
  const finding = at < total ? findings[at] : null;
  const isAside = finding ? aside.has(finding.id) : false;
  const letterNumber = finding ? letterNumbers.get(finding.id) ?? null : null;

  // After a move, focus the new question's title so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    const target = finding ? heading.current : doneHeading.current;
    target?.focus({ preventScroll: true });
    const top = root.current?.getBoundingClientRect().top ?? 0;
    if (top < 0 || top > innerHeight * 0.6) root.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  }, [at, finding]);

  // Once the kept question has a paragraph in the letter, fly its chip there and sweep it in.
  useLayoutEffect(() => {
    const flight = pending.current;
    if (!flight) return;
    const number = letterNumbers.get(flight.findingId);
    if (number === undefined) return;
    pending.current = null;
    const paragraph = letter.current?.querySelector<HTMLElement>(`[data-q="${number}"]`) ?? null;
    if (paragraph && letter.current) {
      const box = letter.current.getBoundingClientRect(), p = paragraph.getBoundingClientRect();
      if (p.top < box.top || p.bottom > box.bottom) letter.current.scrollTo({ top: letter.current.scrollTop + p.top - box.top - 24, behavior: "auto" });
    }
    const visible = paragraph && paragraph.getBoundingClientRect().top < innerHeight && paragraph.getBoundingClientRect().bottom > 0;
    setLanded(number);
    if (visible && flight.launch) landingUntil.current = performance.now() + FLIGHT_MS;
    void flyChip(visible ? flight.launch : null, paragraph);
  }, [letterNumbers]);

  // The letter follows the deck: the paragraph for the question on screen is brought into the letter's
  // own view (never the page's), after any chip in flight has landed.
  useEffect(() => {
    const container = letter.current;
    if (!container || letterNumber === null) return;
    const follow = () => {
      const paragraph = container.querySelector<HTMLElement>(`[data-q="${letterNumber}"]`);
      if (!paragraph) return;
      const box = container.getBoundingClientRect(), p = paragraph.getBoundingClientRect();
      if (p.top >= box.top + 8 && p.bottom <= box.bottom - 8) return;
      container.scrollTo({ top: container.scrollTop + p.top - box.top - 24, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    };
    const wait = Math.max(0, landingUntil.current - performance.now());
    if (!wait) { follow(); return; }
    const timer = window.setTimeout(follow, wait);
    return () => window.clearTimeout(timer);
  }, [at, letterNumber]);

  useEffect(() => {
    if (landed === null) return;
    const timer = window.setTimeout(() => setLanded(null), 1400);
    return () => window.clearTimeout(timer);
  }, [landed]);

  useEffect(() => () => cancelFlight(), []);

  useEffect(() => {
    const title = heading.current;
    if (!title || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setDocked(entry.isIntersecting || entry.boundingClientRect.top < 0), { rootMargin: "0px 0px -50% 0px" });
    observer.observe(title);
    return () => observer.disconnect();
  }, [finding]);

  function go(next: number, message?: string) {
    const clamped = Math.max(0, Math.min(total, next));
    moved.current = true;
    setDirection(clamped < at ? "back" : "forward");
    setIndex(clamped);
    setAnnouncement(message ?? (clamped < total ? `Question ${clamped + 1} of ${total}.` : "That's every question."));
  }

  function ask() {
    if (!finding) return;
    const source = root.current?.querySelector(".qcard [data-chip-source] .ref") ?? root.current?.querySelector(`[data-dot="${at}"]`) ?? null;
    pending.current = { launch: captureChip(source), findingId: finding.id };
    const wasIn = letterNumber !== null;
    onAsk(finding);
    // Already in the letter: nothing re-renders the letter, so land the chip now.
    if (wasIn) {
      const flight = pending.current;
      pending.current = null;
      const paragraph = letter.current?.querySelector(`[data-q="${letterNumber}"]`) ?? null;
      setLanded(letterNumber);
      if (flight.launch && !prefersReducedMotion()) landingUntil.current = performance.now() + FLIGHT_MS;
      void flyChip(flight.launch, paragraph);
    }
    go(at + 1, `${wasIn ? "Kept" : "Added to your letter"}: question ${at + 1}. ${at + 1 < total ? `Question ${at + 2} of ${total}.` : "That's every question."}`);
  }

  function setAside() {
    if (!finding) return;
    onSetAside(finding);
    go(at + 1, `Set aside: question ${at + 1}. It won't be in your letter. ${at + 1 < total ? `Question ${at + 2} of ${total}.` : "That's every question."}`);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("input, textarea, select, [contenteditable='true']") || event.altKey || event.metaKey || event.ctrlKey) return;
    if (event.key === "ArrowRight" && at < total) { event.preventDefault(); go(at + 1); }
    if (event.key === "ArrowLeft" && at > 0) { event.preventDefault(); go(at - 1); }
  }

  const asking = findings.filter(f => letterNumbers.has(f.id)).length;
  const asideCount = findings.filter(f => aside.has(f.id)).length;
  const headingId = `${id}-q`;

  return (
    <div className={`deck deck-${variant}`} ref={root} onKeyDown={onKeyDown} data-docked={docked || undefined}>
      <div className="deck-main">
        <div className="deck-nav">
          <button type="button" className="step-button" onClick={() => go(at - 1)} disabled={at === 0} aria-label="Previous question">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M11 3.5L5.5 9l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <ol className="dots" aria-label="Questions">
            {findings.map((f, i) => {
              const state = aside.has(f.id) ? "set aside" : letterNumbers.has(f.id) ? "in your letter" : "left out of the letter";
              return (
                <li key={f.id}>
                  <button type="button" className="dot" data-dot={i} data-state={aside.has(f.id) ? "aside" : letterNumbers.has(f.id) ? "asking" : "out"}
                    aria-current={i === at ? "step" : undefined} aria-label={`Question ${i + 1}, ${state}: ${f.title}`} onClick={() => go(i)}>
                    {i + 1}
                  </button>
                </li>
              );
            })}
            <li>
              <button type="button" className="dot dot-done" aria-current={at === total ? "step" : undefined} aria-label="Summary" onClick={() => go(total)}>
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7.5l2.8 2.8L11 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </li>
          </ol>
          <button type="button" className="step-button" onClick={() => go(at + 1)} disabled={at === total} aria-label="Next question">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M7 3.5L12.5 9 7 14.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>

        <div className="deck-stage" data-direction={direction}>
          {finding ? (
            <QuestionCard key={finding.id} ref={heading} finding={finding} position={at + 1} total={total} letterNumber={letterNumber} lines={lines} headingId={headingId} onShowOnBill={onShowOnBill}>
              <div className="qcard-actions">
                {isAside ? <p className="qcard-state">You set this aside, so your letter doesn&rsquo;t ask it.</p>
                  : letterNumber === null ? <p className="qcard-state">You left this out on the letter page.</p>
                  : <p className="qcard-state"><span className="qcard-ref" data-chip-source><QuestionRef number={letterNumber} level={finding.level} labelled={false} /></span><span>In your letter as question {letterNumber}.</span>{variant === "workspace" && <a className="letter-jump" href={`#${id}-letter`}>See the letter</a>}</p>}
                <div className="qcard-buttons">
                  <button type="button" className="button" onClick={ask}>{isAside || letterNumber === null ? "Ask about this after all" : "Ask about this"}</button>
                  {isAside
                    ? <button type="button" className="button secondary" onClick={() => go(at + 1)}>Keep it set aside</button>
                    : <button type="button" className="button secondary" onClick={setAside} aria-describedby={`${id}-aside-hint`}>Set aside</button>}
                </div>
                {!isAside && <p className="qcard-hint" id={`${id}-aside-hint`}>Set a question aside if it&rsquo;s already resolved or you&rsquo;re satisfied it&rsquo;s fine. You can change your mind.</p>}
              </div>
            </QuestionCard>
          ) : (
            <section className="qcard qcard-done" aria-labelledby={`${id}-done`}>
              <h2 id={`${id}-done`} ref={doneHeading} tabIndex={-1} className="qcard-title">That&rsquo;s every question.</h2>
              <p className="qcard-summary">
                {asking === 0 ? "Your letter doesn't ask about any specific line, so it asks for more detail on the bill as a whole." : `Your letter asks ${asking} ${asking === 1 ? "question" : "questions"}.`}
                {asideCount > 0 && ` ${asideCount} set aside.`}
              </p>
              {done({ asking, aside: asideCount })}
            </section>
          )}
        </div>
      </div>

      <LetterSheet travels={variant === "workspace"}>
      <aside className="deck-letter" id={`${id}-letter`} aria-labelledby={`${id}-letter-title`}>
        <div className="deck-letter-head">
          <h2 id={`${id}-letter-title`}>{letterTitle}</h2>
          <span className="deck-letter-count">{asking} {asking === 1 ? "question" : "questions"}</span>
        </div>
        <LetterPreview ref={letter} text={letterText} current={letterNumber} landed={landed} from={letterFrom} label="Letter so far" />
        {letterFoot}
      </aside>
      </LetterSheet>

      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    </div>
  );
}
