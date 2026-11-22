import { ViewTransition, type ReactNode } from "react";

// Workspace steps read left to right: start → review → letter. Links tag their direction with
// transitionTypes; untyped navigations (browser back, refresh) swap without movement.
const SLIDE = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" };

export const FORWARD = ["nav-forward"];
export const BACK = ["nav-back"];

export function PageTransition({ children }: { children: ReactNode }) {
  return <ViewTransition enter={SLIDE} exit={SLIDE} default="none">{children}</ViewTransition>;
}
