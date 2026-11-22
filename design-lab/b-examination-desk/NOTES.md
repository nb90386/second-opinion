# B. The Financial Examination Desk: notes

**Idea.** Check the bill against itself. Every figure is already printed on the user's documents, so the interface is a quiet reconciliation instrument where disagreements become visible geometry.

**Type, colour, motion.**
- Geist (variable) for everything, tabular figures globally; Geist Mono only for codes and the statement's own descriptions. Two sizes carry the page: very large light figures (the gap at 56-92px, weight 300, tracking -0.03em) and 14-15px text.
- Achromatic: frame `#F3F3F1`, white sheet inset 8px with a 1px edge, ink `#111214`, secondary `#5F6368`, one data blue `#1D5FBF` (tint `#E8EFFA`). Level glyphs are SVG (triangle, dot, ring) next to the level in words.
- Motion: one authored moment (the bridge bars grow left to right, 480ms ease-out, staggered; the gap bracket and its label last). Elsewhere only state changes: View Transitions for route changes and for a line row morphing into its detail panel (shared name `ln`), strip fill transitions. All of it is off under `prefers-reduced-motion`.

**Signature views (all SVG, computed from case data).** Reconciliation bridge (floating-bar waterfall with a blue dashed gap and bracket), bill strip (width = share of charges, ticks and question numbers with collision-avoiding labels, hatched segment for the part of the total no line explains), verification register. `console.assert` checks cover strip sum, line sum vs engine, bridge gap vs finding amount, line-math vs engine, not-itemized gap vs bill-total finding.

**Interactions.** Select a question: lines marked in ledger and strip, ledger scrolls to them (desktop), bridge gap lights for bill-level questions. Open a line: detail with plain name, codeNote and its questions. Set aside / include, with live region and letter sync. Letter: checklist, options, sender fields, editable textarea; clean letters rebuild live, edited letters ask first, and Undo restores the previous state. Copy, download .txt.

**Simulated vs real.** Real: engine findings, checks, letter composer. Simulated: "Use your own bill" is an honest dialog only; no upload.

**Known weaknesses.**
- Strip segments under 44px wide (several are 5px) fail the touch-target size for pointer use; the ledger rows and arrow-key roving cover the same function, and taps resolve to the nearest segment.
- On stacked layouts (< 1080px) selecting a question does not auto-scroll to the ledger (it would pull the question out of view); instead the question lists its lines, offers "Show in the ledger", and a bottom dock keeps the selection.
- Row-to-panel View Transition on a table row was not visually verified frame by frame; falls back to an instant open.
- Reads cool, as the spec warned; warmth comes from copy and the innocent explanation sitting beside the reason.
- Fonts load via relative `../shared/fonts`; Firefox from file:// may block them and fall back to system sans.

**Mapping to the Next app.** Components: `Bridge`, `BillStrip`, `Ledger` (+ `LineDetail`), `QuestionRail`, `Register`, `LetterDesk`. New CSS: the token set above, bar/strip styles, two-line phone ledger. Risk: the strip and bridge need a shared scale helper and tests for the reconciliation asserts; the ledger/rail selection state belongs in one reducer; the sticky rail with internal scroll needs care with the page header.
