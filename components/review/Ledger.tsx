import type { Level } from "../../lib/analysis";
import { LIMITS, type LineItem } from "../../lib/bill";
import { lookupCode } from "../../lib/glossary";
import { formatCents, sumCents } from "../../lib/money";

export interface LineRef { number: number; level: Level }

const LEVEL_RANK: Record<Level, number> = { discrepancy: 0, ask: 1, detail: 2 };
const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const MARK_LABEL = { "not-received": "You marked: not received", unsure: "You marked: not sure" } as const;

interface LedgerProps {
  lines: LineItem[];
  refs: Map<string, LineRef[]>;
  highlighted: Set<string>;
  onOpen: (lineId: string) => void;
  onAdd: () => void;
}

export function Ledger({ lines, refs, highlighted, onOpen, onAdd }: LedgerProps) {
  if (lines.length === 0) {
    return (
      <div className="ledger-empty">
        <h3>No line items yet</h3>
        <p>Add each charge from your itemized statement: the date, code if there is one, description and amount.</p>
        <button type="button" className="button" onClick={onAdd}>Add the first line</button>
      </div>
    );
  }
  const total = sumCents(lines.map(line => line.amount));
  return (
    <>
      <table className="ledger" role="table">
        <caption className="sr-only">Line items on this bill. Choose a line to see what it is, mark it, or correct it.</caption>
        <thead role="rowgroup">
          <tr role="row">
            <th role="columnheader" className="col-mark" scope="col"><span className="sr-only">Questions</span></th>
            <th role="columnheader" className="col-date" scope="col">Date</th>
            <th role="columnheader" className="col-code" scope="col">Code</th>
            <th role="columnheader" scope="col">Description</th>
            <th role="columnheader" className="num" scope="col">Qty × price</th>
            <th role="columnheader" className="num" scope="col">Amount</th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {lines.map(line => {
            const lineRefs = refs.get(line.id) ?? [];
            const level = lineRefs.map(r => r.level).sort((a, b) => LEVEL_RANK[a] - LEVEL_RANK[b])[0];
            const note = lookupCode(line.code);
            return (
              <tr role="row" key={line.id} id={`line-${line.id}`} data-level={level} className={highlighted.has(line.id) ? "is-highlighted" : undefined}>
                <td role="cell" className="col-mark">
                  {lineRefs.length > 0 && (
                    <span className="refs">
                      {lineRefs.map(r => <span key={r.number} className={`ref ${r.level}`}><span className="sr-only">Question </span>{r.number}</span>)}
                    </span>
                  )}
                  {line.mark !== "none" && <span className="user-mark">{MARK_LABEL[line.mark]}</span>}
                </td>
                <td role="cell" className="col-date"><time dateTime={line.date}>{shortDate.format(new Date(`${line.date}T00:00:00Z`))}</time></td>
                <td role="cell" className="col-code"><span className="mono">{line.code || "—"}</span></td>
                <td role="cell" className="col-desc">
                  <button type="button" className="row-open" id={`open-${line.id}`} onClick={() => onOpen(line.id)}>{line.description}</button>
                  {note && <span className="plain">{note.name}</span>}
                </td>
                <td role="cell" className="col-qty num"><span className="qty">{line.unitPrice !== null ? `${line.quantity} × ${formatCents(line.unitPrice)}` : line.quantity === 1 ? "1" : String(line.quantity)}</span></td>
                <td role="cell" className="col-amount num"><span className={`amount${line.amount < 0 ? " credit" : ""}`}>{formatCents(line.amount)}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="ledger-foot">
        <button type="button" className="quiet" onClick={onAdd} disabled={lines.length >= LIMITS.lines}>+ Add a line</button>
        <span className="ledger-total">{lines.length} {lines.length === 1 ? "line" : "lines"} · <strong>{formatCents(total)}</strong></span>
      </div>
      {lines.length >= LIMITS.lines && <p className="small muted" role="status">This bill has reached the {LIMITS.lines}-line limit. Remove a line before adding another.</p>}
    </>
  );
}
