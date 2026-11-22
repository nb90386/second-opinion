# B. The Financial Examination Desk

**Taste Skill dealt style:** `achromatic-ledger`. There is no brand colour in the chrome. Money and counts are set in ink. One data hue (`#1D5FBF`) marks the screen's main data element, and the only other signal is a small mark where a figure disagrees.

**Idea:** check the bill against itself. Every figure the product uses is a number already printed on the user's own documents, so the interface is an exceptionally precise reconciliation instrument: a quiet desk where the numbers are laid side by side and the disagreements become visible geometry.

**Palette.** Frame `#F3F3F1`, sheet `#FFFFFF` (inset 8px, 1px edge `#E6E6E3`, no shadow), ink `#111214`, secondary `#5F6368` (≥ 4.5:1), data blue `#1D5FBF` with tint `#E8EFFA`, and zero/grey values `#8A8D91` (large text only).
- Levels are written in words, plus a small glyph: ▲ for *Numbers disagree* (in blue), ● for *Worth asking* (ink) and ○ for *Ask for detail* (ink).
- Use no other hues. The primary button is near-black; the secondary is a grey pill `#E7E7E5`.

**Type.**
- Geist (`shared/fonts/geist-latin.woff2`, variable) for everything, with `font-variant-numeric: tabular-nums` on every figure.
- Headline figures are large and light: the $640.00 gap at 72–96px weight 300, tracking −0.03em.
- Geist Mono only for billing codes and the statement's own descriptions (`data-ui`).
- Two sizes do most of the work: very large figures, and 14–15px text.

**Signature data views (all computed from the case data, no outside numbers):**
1. **The reconciliation bridge** (the hero on Front, the head of Review). It is a horizontal waterfall drawn in SVG.
   - *Charges on bill* (`statedTotal`, ink bar) → *Payments & adjustments shown on bill* (= statedTotal − amountDue, grey, labelled "the difference between two numbers on your bill; not itemized") → *Bill asks you to pay* (`amountDue`, ink) set against *Your EOB says you owe* (`eobResponsibility`, blue).
   - The gap between the last two is drawn as a blue bracket, "+$640.00".
   - If the case has no EOB, the bridge ends at Amount due and the comparison slot reads "Add your EOB to compare". The three-night stay is self-pay with a Good Faith Estimate, so compare `statedTotal` against `goodFaithEstimate` (when not null) the same way.
2. **The bill strip.** One full-width bar divided into all line items, with width proportional to amount, in alternating ink tones (`#2A2C30` / `#4A4D52`).
   - Lines with questions get a blue top tick and their question number. Hover, focus or tap a segment to read the line.
   - Caption, set as a sentence: "Width shows each line's share of the charges. The largest line, CT abdomen & pelvis, raised no question: price alone is never a reason to ask." Compute the name from data.
   - This is the product's honesty, made visible.
3. **The verification register.** All checks in a tight table: the check, its status in words with a glyph, and the detail.

**Review layout.**
- *Desktop:* a 12-column grid. The bridge sits on top (about 280px tall). Below it, the ledger table takes 8 columns (rules and alignment only, no zebra, sentence-case grey 12px headers, right-aligned tabular money). The questions list takes 4 columns: a sticky right rail of rows with the amount in question large and right-aligned.
- Select a question: its segments in the strip and its rows in the ledger take the blue tint, and the ledger scrolls to them.
- *Spatial transition:* opening a line expands it from its row into a detail panel (FLIP, or the View Transitions API when supported), and it collapses back to the row.
- *Phone:* the bridge turns vertical (stacked bars with figures right-aligned), the strip stays full width, and the ledger rows reflow into two-line entries.

**Front.** h1: "Check the bill against itself." One sentence beneath it. The reconciliation bridge of the example bill draws once on load (bars grow left to right at 480ms ease-out, the gap bracket last); this is the single authored moment. Primary action: "Open the example bill". Beside it, three plain figures from the example: 17 lines read, 6 questions, 0 outside prices.

**Letter view.** The letter is on the white sheet in Geist at 16/26. The left rail is a checklist of questions, each with its amount in question in tabular figures. No total of amounts is shown, because they overlap.

**Risk to watch.** It can read as a finance dashboard and feel cold to a stressed patient. Plain-English names and the innocent explanations must stay prominent, so warmth comes from the words.
