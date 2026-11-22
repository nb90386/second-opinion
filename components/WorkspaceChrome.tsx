"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { BrandMark } from "./Brand";
import { useCase } from "./CaseProvider";
import { Specimen } from "./Tags";
import { Dialog } from "./Dialog";
import { BACK, FORWARD } from "./PageTransition";

const STEPS = [{ href: "/review", label: "Review the bill" }, { href: "/letter", label: "Draft the letter" }];

/**
 * `caseDependent` pages render nothing useful until the saved case is read (the first client render).
 * Their work area stays invisible for that frame, so the specimen band and notices arriving above it
 * don't register as a layout shift of a visible, empty page.
 */
export function WorkspaceChrome({ children, caseDependent = false }: { children: ReactNode; caseDependent?: boolean }) {
  const pathname = usePathname();
  const { current, loading, storage, clearCase } = useCase();
  const here = STEPS.findIndex(step => step.href === pathname);
  const [confirmClear, setConfirmClear] = useState(false);
  return (
    <>
      <header className="app-header" style={{ viewTransitionName: "app-header" }} data-hold={caseDependent && loading ? "" : undefined}>
        <div className="wrap">
          <Link className="brand" href="/" aria-label="Second Opinion home">
            <BrandMark size={24} />
            <span className="brand-word" aria-hidden="true">Second Opinion</span>
          </Link>
          <nav className="steps-nav" aria-label="Steps">
            {STEPS.map((step, index) => (
              <Link key={step.href} href={step.href} aria-current={pathname === step.href ? "page" : undefined} transitionTypes={index === here ? undefined : index > here ? FORWARD : BACK}>
                <span className="num" aria-hidden="true">{index + 1}</span>{step.label}
              </Link>
            ))}
          </nav>
          <div className="header-actions" style={loading ? { visibility: "hidden" } : undefined}>
            {/* Saved state: shown only while this browser is actually keeping the case; it refreshes on each change. */}
            {current && storage === "ok" && (
              <span key={current.updatedAt} className="saved-note">
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7.5l2.8 2.8L11 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Saved in this browser
              </span>
            )}
            {(current || storage === "corrupt") && <button type="button" className="quiet compact" onClick={() => setConfirmClear(true)}>Clear saved bill…</button>}
            <Link className="quiet compact" href="/start">{current ? "New bill" : "Start"}</Link>
          </div>
        </div>
      </header>
      {current?.bill.origin === "sample" && (
        <div className="synthetic-band" style={{ viewTransitionName: "synthetic-band" }}>
          <div className="wrap">
            <Specimen />
            <p>Fictional hospital, account and prices.<span className="band-more"> Codes are real public code numbers; no amount here is a real rate.</span></p>
          </div>
        </div>
      )}
      <StorageNotice storage={storage} />
      <Dialog open={confirmClear} onClose={() => setConfirmClear(false)} title="Clear this saved bill?" titleId="clear-case-title" variant="compact"
        fallbackFocus={() => document.getElementById("main")}
        footer={<div className="button-row"><button type="button" className="button danger" onClick={() => { clearCase(); setConfirmClear(false); }}>Clear bill and letter</button><button type="button" className="button secondary" onClick={() => setConfirmClear(false)}>Keep it</button></div>}>
        <p>This removes the bill, corrections, personal details and letter saved by Second Opinion in this browser. It can&rsquo;t be undone. Download your letter first if you want to keep it.</p>
      </Dialog>
      {children}
    </>
  );
}

function StorageNotice({ storage }: { storage: string }) {
  if (storage === "ok") return null;
  const message = storage === "corrupt"
    ? "The case saved in this browser couldn't be read, so it wasn't opened. It stays untouched until you start a new bill."
    : storage === "clear-failed"
      ? "This browser didn't allow the saved bill to be removed. It is closed in this tab, but may return on reload. Clear this site's data in your browser settings to remove it."
      : "This browser isn't letting Second Opinion save. Your changes may be lost when you reload or close this tab.";
  return (
    <div className="wrap notice-wrap">
      <div className="notice warn" role="status"><p>{message}</p></div>
    </div>
  );
}
