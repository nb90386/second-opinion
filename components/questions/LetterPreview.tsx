import { forwardRef } from "react";

const QUESTION = /^(\d+)\. /;

/**
 * The letter as it stands, set as paper. Each numbered question is its own paragraph so the one being
 * discussed can be marked, and a newly kept question can be swept in with the highlighter.
 */
export const LetterPreview = forwardRef<HTMLDivElement, { text: string; current: number | null; landed: number | null; from?: string; label: string }>(
  function LetterPreview({ text, current, landed, from, label }, ref) {
    const blocks = text.split("\n\n");
    const start = from ? Math.max(0, blocks.findIndex(block => block.startsWith(from))) : 0;
    return (
      <div className="letter-preview" ref={ref} tabIndex={0} role="region" aria-label={label}>
        {blocks.slice(start).map((block, i) => {
          const number = Number(QUESTION.exec(block)?.[1] ?? 0) || null;
          return (
            <p key={`${i}-${block.slice(0, 24)}`} data-q={number ?? undefined} data-current={(number !== null && number === current) || undefined} data-landed={(number !== null && number === landed) || undefined}>
              {block}
            </p>
          );
        })}
      </div>
    );
  },
);
