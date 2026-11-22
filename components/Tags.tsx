import { ViewTransition } from "react";
import { LEVEL_LABEL, type Level } from "../lib/analysis";

// Only the first questions carry a shared name: each named element costs a snapshot during a
// navigation, and a bill can have hundreds of questions.
const TRAVEL_LIMIT = 12;

/**
 * A numbered question badge. Levels are drawn as shapes in the one blue pencil (solid for
 * "Numbers disagree", dashed for "Worth asking", dotted for "Ask for detail"), so colour is never
 * the signal. Between review and letter it travels to its place in the other list.
 */
export function QuestionRef({ number, level, labelled = true }: { number: number; level: Level; labelled?: boolean }) {
  const badge = <span className={`ref ${level}`} aria-hidden={labelled ? undefined : true}>{labelled && <span className="sr-only">Question </span>}{number}</span>;
  return number <= TRAVEL_LIMIT ? <ViewTransition name={`question-${number}`} share="question-travel" default="none">{badge}</ViewTransition> : badge;
}

/** The pencil mark for a level: a ring, a bracket or a dotted underline. Decorative; the words carry the meaning. */
export function LevelMark({ level }: { level: Level | "clear" | "not-run" }) {
  return (
    <svg className={`level-mark ${level}`} width="22" height="14" viewBox="0 0 22 14" aria-hidden="true" focusable="false">
      {level === "discrepancy" && <ellipse cx="11" cy="7" rx="9.5" ry="5.5" />}
      {level === "ask" && <path d="M5 1.5H2v11h3M17 1.5h3v11h-3" />}
      {level === "detail" && <path d="M1.5 11.5h19" />}
      {level === "clear" && <path d="M4 7.5l4 3.5 10-8" />}
      {level === "not-run" && <path d="M4 7h14" />}
    </svg>
  );
}

export function LevelTag({ level }: { level: Level }) {
  return <span className={`tag ${level}`}><LevelMark level={level} />{LEVEL_LABEL[level]}</span>;
}

export function Specimen({ children = "Synthetic example" }: { children?: string }) {
  return <span className="specimen">{children}</span>;
}

export function Chevron() {
  return <svg className="chevron" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 2.5L8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
