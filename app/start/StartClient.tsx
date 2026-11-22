"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { useCase } from "../../components/CaseProvider";
import { Dialog } from "../../components/Dialog";
import { FORWARD } from "../../components/PageTransition";
import { Specimen } from "../../components/Tags";
import { BillSchema, emptyBill, newBillId, type Bill } from "../../lib/bill";
import { getSnapshot } from "../../lib/caseStore";
import type { RowProblem } from "../../lib/csv";
import type { SampleSummary } from "../../lib/samples";

type Upload =
  | { status: "idle" }
  | { status: "reading" }
  | { status: "error"; message: string }
  | { status: "imported"; imported: number; problems: RowProblem[] };

interface Pending { bill: Bill; report?: { imported: number; problems: RowProblem[] } }

async function errorMessage(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null);
  return typeof body?.error?.message === "string" ? body.error.message : fallback;
}

export function StartClient({ samples }: { samples: SampleSummary[] }) {
  const router = useRouter();
  const { current, loading, storage, startCase } = useCase();
  const [opening, setOpening] = useState<string | null>(null);
  const [sampleError, setSampleError] = useState("");
  const [upload, setUpload] = useState<Upload>({ status: "idle" });
  const [pending, setPending] = useState<Pending | null>(null);
  const request = useRef<AbortController | null>(null);
  const busy = loading || opening !== null || upload.status === "reading";

  useEffect(() => () => { request.current?.abort(); }, []);

  function begin(next: Pending) {
    const latest = getSnapshot();
    if (latest.status === "ready" && latest.current) { setPending(next); return; }
    commit(next);
  }

  function commit({ bill, report }: Pending) {
    startCase(bill);
    setPending(null);
    if (report && report.problems.length) setUpload({ status: "imported", ...report });
    else router.push("/review", { transitionTypes: FORWARD });
  }

  async function openSample(id: string) {
    if (request.current || loading) return;
    const controller = new AbortController();
    request.current = controller;
    setOpening(id);
    setSampleError("");
    try {
      const response = await fetch(`/api/samples/${encodeURIComponent(id)}`, { signal: controller.signal });
      if (!response.ok) throw new Error(await errorMessage(response, "The example couldn't be opened."));
      const parsed = BillSchema.safeParse((await response.json()).bill);
      if (controller.signal.aborted) return;
      if (!parsed.success) throw new Error("The example came back in an unexpected format.");
      begin({ bill: parsed.data });
    } catch (error) {
      if (controller.signal.aborted) return;
      setSampleError(error instanceof TypeError ? "Couldn't reach the local server. Check that it's running, then try again." : (error as Error).message);
    } finally {
      if (request.current === controller) request.current = null;
      setOpening(null);
    }
  }

  async function submitUpload(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.current || loading) return;
    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    if (!(file instanceof File) || (file.size === 0 && file.name === "")) {
      setUpload({ status: "error", message: "Choose a CSV file first." });
      return;
    }
    setUpload({ status: "reading" });
    const controller = new AbortController();
    request.current = controller;
    try {
      const response = await fetch("/api/bills/parse", { method: "POST", body: form, signal: controller.signal });
      if (!response.ok) throw new Error(await errorMessage(response, "This file couldn't be read."));
      const body = await response.json();
      if (controller.signal.aborted) return;
      const parsed = BillSchema.safeParse(body.bill);
      if (!parsed.success) throw new Error("The file was read, but the result wasn't in the expected format.");
      setUpload({ status: "idle" });
      begin({ bill: parsed.data, report: { imported: body.imported, problems: body.problems ?? [] } });
    } catch (error) {
      if (controller.signal.aborted) return;
      setUpload({ status: "error", message: error instanceof TypeError ? "Couldn't reach the local server. Your current bill wasn't changed." : (error as Error).message });
    } finally {
      if (request.current === controller) request.current = null;
      if (controller.signal.aborted) setUpload({ status: "idle" });
    }
  }

  return (
    <>
      <h1 className="start-title">Put the bill in front of you.</h1>
      <p className="lede">Use an example to see how a review works, or bring the lines from your own itemized statement.</p>

      {!loading && current && upload.status !== "imported" && (
        <div className="resume">
          <p>
            <strong>{current.bill.provider || "Your bill"}</strong> is open, with {current.bill.lineItems.length} {current.bill.lineItems.length === 1 ? "line" : "lines"}.
            <span className="muted"> Starting another replaces it.</span>
          </p>
          <Link className="button secondary small" href="/review" transitionTypes={FORWARD}>Continue reviewing</Link>
        </div>
      )}
      {storage === "corrupt" && <div className="notice warn" role="status"><p>Starting a new bill will replace the saved case that couldn&rsquo;t be read.</p></div>}

      {upload.status === "imported" && (
        <div className="notice" role="status" aria-live="polite">
          <div>
            <p><strong>Imported {upload.imported} {upload.imported === 1 ? "line" : "lines"}.</strong> {upload.problems.length} {upload.problems.length === 1 ? "row was" : "rows were"} skipped. Add {upload.problems.length === 1 ? "it" : "them"} by hand if needed:</p>
            <ul className="problems">{upload.problems.map(p => <li key={p.line}>Line {p.line}: {p.message}</li>)}</ul>
            <p><Link className="button small" href="/review" transitionTypes={FORWARD}>Continue to review</Link></p>
          </div>
        </div>
      )}

      <div className="start-grid">
        <section aria-labelledby="examples-title">
          <h2 id="examples-title">Try an example</h2>
          <p className="section-lede">Two fictional bills, each with a different mix of things worth asking about.</p>
          <ul className="sample-list">
            {samples.map(sample => (
              <li className="sample" key={sample.id}>
                <div>
                  <h3>{sample.title}</h3>
                  <p>{sample.blurb}</p>
                  <div className="sample-meta"><span>{sample.provider}</span><span>{sample.setting}</span><span>{sample.lineCount} lines</span><Specimen>Fictional</Specimen></div>
                </div>
                <button type="button" className="button secondary" onClick={() => openSample(sample.id)} disabled={busy} aria-describedby={sampleError ? "sample-error" : undefined}>
                  {opening === sample.id ? "Opening…" : <>Open<span className="sr-only"> {sample.title}</span></>}
                </button>
              </li>
            ))}
          </ul>
          {sampleError && <div className="notice error gap-top" role="alert" id="sample-error"><p>{sampleError}</p></div>}
        </section>

        <section aria-labelledby="your-bill-title" id="your-bill">
          <h2 id="your-bill-title">Use your bill</h2>
          <p className="section-lede">You need the <em>itemized</em> statement, which lists every charge. Ask the billing office for it if you only have a summary.</p>
          <form className="upload-box" onSubmit={submitUpload} noValidate>
            <div className="field">
              <label htmlFor="bill-file">CSV file of line items</label>
              <input id="bill-file" name="file" type="file" accept=".csv,text/csv" className="file-input" disabled={busy} aria-invalid={upload.status === "error" ? true : undefined} aria-describedby={`upload-help${upload.status === "error" ? " upload-error" : ""}`} onChange={() => upload.status === "error" && setUpload({ status: "idle" })} />
            </div>
            <ul className="upload-limits" id="upload-help">
              <li>Columns: <strong>date</strong>, <strong>description</strong> and <strong>amount</strong>; code, quantity and unit_price are optional.</li>
              <li>Dates as 2026-08-14 or 8/14/2026. Up to 500 lines and 200 KB.</li>
              <li>PDFs and photos can&rsquo;t be read yet. Copy the lines into the <a href="/second-opinion-template.csv" download>CSV template</a> (it has three fictional example rows to replace).</li>
            </ul>
            <div className="button-row">
              <button className="button" type="submit" disabled={busy}>{upload.status === "reading" ? "Reading file…" : "Read this file"}</button>
            </div>
            {upload.status === "error" && <div className="notice error" role="alert" id="upload-error"><p>{upload.message}</p></div>}
            <p className="small muted">The file is sent to this app&rsquo;s server, read in memory, then discarded. No third-party service receives it.</p>
          </form>
          <div className="or-rule">or</div>
          <p className="section-lede">Type the lines in yourself, straight from the paper bill.</p>
          <button type="button" className="button secondary" disabled={busy} onClick={() => { if (!request.current) begin({ bill: emptyBill(newBillId("manual"), "manual") }); }}>Start a blank bill</button>
        </section>
      </div>

      <Dialog
        open={pending !== null}
        onClose={() => setPending(null)}
        title="Replace the bill in progress?"
        titleId="replace-title"
        variant="compact"
        footer={
          <div className="button-row">
            <button type="button" className="button danger" onClick={() => pending && commit(pending)}>Replace it</button>
            <button type="button" className="button secondary" onClick={() => setPending(null)}>Keep current bill</button>
          </div>
        }
      >
        <p>
          {current?.bill.provider ? <>The bill from <strong>{current.bill.provider}</strong></> : "Your current bill"}, your corrections and your letter draft will be removed from this browser. This can&rsquo;t be undone.
        </p>
      </Dialog>
    </>
  );
}
