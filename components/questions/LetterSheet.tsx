import { ViewTransition, type ReactNode } from "react";

// Moving between review and letter, the letter beside the questions and the letter page's paper are
// the same sheet: it grows into place going forward and shrinks back going back. Untyped navigations
// (browser back, refresh) swap without movement, like the rest of the workspace.
const TRAVEL = { "nav-forward": "letter-travel", "nav-back": "letter-travel", default: "none" };

export function LetterSheet({ children, travels = true }: { children: ReactNode; travels?: boolean }) {
  return travels ? <ViewTransition name="letter-sheet" share={TRAVEL} default="none">{children}</ViewTransition> : <>{children}</>;
}
