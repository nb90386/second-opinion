import type { Analysis } from "../../lib/analysis";
import type { AnalysisStatus } from "../CaseProvider";

function describeChange(change: { fresh: Set<string>; resolved: number } | null): string {
  if (!change) return "";
  const parts = [
    change.resolved && `${change.resolved} ${change.resolved === 1 ? "question" : "questions"} resolved`,
    change.fresh.size && `${change.fresh.size} new`,
  ].filter(Boolean);
  return parts.length ? ` · ${parts.join(", ")} after your edit` : "";
}

/** Where the check stands, shared by both review views; a failed check keeps the last results, marked out of date, with retry. */
export function CheckStatus({ analysis, status, stale, error, change, onRetry }: {
  analysis: Analysis | null; status: AnalysisStatus; stale: boolean; error: string;
  change: { fresh: Set<string>; resolved: number } | null; onRetry: () => void;
}) {
  return (
    <>
      <p className="check-status" data-state={status} role="status">
        <span className="dot" aria-hidden="true" />
        {status === "checking" ? (analysis ? "Re-checking after your edit…" : "Checking each line…")
          : status === "error" ? "Check didn't finish"
          : status === "ready" && analysis ? `Checked ${analysis.lineCount} ${analysis.lineCount === 1 ? "line" : "lines"} with ${analysis.checks.length} checks${describeChange(change)}` : ""}
      </p>
      {status === "error" && (
        <div className="notice error check-error" role="alert">
          <div>
            <p>{stale ? "Couldn't re-check after your last edit, so these results are from before it." : "Couldn't check this bill."} {error}</p>
            <button type="button" className="quiet compact" onClick={onRetry}>Try again</button>
          </div>
        </div>
      )}
    </>
  );
}
