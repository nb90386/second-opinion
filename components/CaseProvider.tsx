"use client";

import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Analysis } from "../lib/analysis";
import type { Bill } from "../lib/bill";
import { newCase, type Case } from "../lib/case";
import { getServerSnapshot, getSnapshot, saveCase, subscribe, type StorageHealth } from "../lib/caseStore";

export type AnalysisStatus = "idle" | "checking" | "ready" | "error";

interface CaseContextValue {
  loading: boolean;
  current: Case | null;
  storage: StorageHealth;
  analysis: Analysis | null;
  /** True when `analysis` describes an earlier version of the bill. */
  stale: boolean;
  analysisStatus: AnalysisStatus;
  analysisError: string;
  retryAnalysis: () => void;
  startCase: (bill: Bill) => void;
  updateCase: (update: (current: Case) => Case) => void;
  updateBill: (update: (bill: Bill) => Bill) => void;
  clearCase: () => void;
}

const CaseContext = createContext<CaseContextValue | null>(null);

const ANALYZE_DELAY_MS = 250;

export function CaseProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const current = snapshot.status === "ready" ? snapshot.current : null;
  const billKey = current ? JSON.stringify(current.bill) : null;
  const billId = current?.bill.id ?? null;
  const [result, setResult] = useState<{ key: string; billId: string; analysis: Analysis } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Analysis runs on the local server; edits are debounced and superseded requests are aborted.
  useEffect(() => {
    if (!billKey || !billId) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/analyze", { method: "POST", body: billKey, headers: { "content-type": "application/json" }, signal: controller.signal });
        const body = await response.json().catch(() => null);
        if (!response.ok || !body?.analysis) {
          const issue = body?.error?.issues?.[0];
          throw new Error(issue ? `${body.error.message} (${issue.path}: ${issue.message})` : body?.error?.message ?? "The check didn't finish.");
        }
        if (controller.signal.aborted) return;
        setResult({ key: billKey, billId, analysis: body.analysis });
        setFailure(null);
      } catch (error) {
        if (controller.signal.aborted) return;
        setFailure({ key: billKey, message: error instanceof TypeError ? "Couldn't reach the local server." : (error as Error).message });
      }
    }, ANALYZE_DELAY_MS);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [billKey, billId, attempt]);

  const startCase = useCallback((bill: Bill) => saveCase(newCase(bill, new Date().toISOString())), []);
  const updateCase = useCallback((update: (current: Case) => Case) => {
    const latest = getSnapshot();
    if (latest.status !== "ready" || !latest.current) return;
    saveCase({ ...update(latest.current), updatedAt: new Date().toISOString() });
  }, []);
  const updateBill = useCallback((update: (bill: Bill) => Bill) => updateCase(c => ({ ...c, bill: update(c.bill) })), [updateCase]);
  const clearCase = useCallback(() => saveCase(null), []);
  const retryAnalysis = useCallback(() => { setFailure(null); setAttempt(n => n + 1); }, []);

  // Results from a different bill are never shown, even as stale.
  const sameBill = !!result && result.billId === billId;
  const analysis = sameBill ? result.analysis : null;
  const stale = sameBill && result.key !== billKey;
  const analysisStatus: AnalysisStatus = !billKey ? "idle" : result?.key === billKey ? "ready" : failure?.key === billKey ? "error" : "checking";

  const value: CaseContextValue = {
    loading: snapshot.status === "loading",
    current,
    storage: snapshot.status === "ready" ? snapshot.storage : "ok",
    analysis,
    stale,
    analysisStatus,
    analysisError: failure?.key === billKey ? failure.message : "",
    retryAnalysis, startCase, updateCase, updateBill, clearCase,
  };
  return <CaseContext.Provider value={value}>{children}</CaseContext.Provider>;
}

export function useCase(): CaseContextValue {
  const value = useContext(CaseContext);
  if (!value) throw new Error("useCase must be used inside CaseProvider");
  return value;
}
