"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Finding } from "../../lib/analysis";
import type { Bill } from "../../lib/bill";
import { composeLetter, DEFAULT_OPTIONS, EMPTY_SENDER } from "../../lib/letter";
import { QuestionDeck } from "../questions/QuestionDeck";

/** The real example bill's questions, to try on the landing page. Choices here stay on this page. */
export function DemoDesk({ bill, findings, letterDate }: { bill: Bill; findings: Finding[]; letterDate: string }) {
  const [aside, setAside] = useState<Set<string>>(new Set());
  const [round, setRound] = useState(0);
  const included = useMemo(() => findings.filter(f => !aside.has(f.id)), [findings, aside]);
  const letterNumbers = useMemo(() => new Map(included.map((f, i) => [f.id, i + 1])), [included]);
  const letterText = composeLetter({ bill, findings: included, sender: EMPTY_SENDER, options: { ...DEFAULT_OPTIONS, requestHold: false }, today: letterDate });
  const toggle = (finding: Finding, on: boolean) => setAside(previous => {
    const next = new Set(previous);
    if (on) next.add(finding.id); else next.delete(finding.id);
    return next;
  });

  return (
    <QuestionDeck
      key={round} variant="demo" findings={findings} lines={bill.lineItems} aside={aside} letterNumbers={letterNumbers}
      letterText={letterText} letterFrom="To the billing office:" letterTitle="Your letter so far"
      onAsk={finding => toggle(finding, false)} onSetAside={finding => toggle(finding, true)}
      done={() => (
        <div className="button-row">
          <Link className="button" href="/start">Try it with the full example</Link>
          <button type="button" className="button secondary" onClick={() => { setAside(new Set()); setRound(n => n + 1); }}>Start these questions again</button>
        </div>
      )}
    />
  );
}
