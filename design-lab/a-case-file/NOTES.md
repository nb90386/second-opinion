# A. The Annotated Case File

**Idea.** The bill is a case file: statement, EOB and letter are separate exhibits in one manila folder, and each question is a paper tag clipped to the lines it concerns.

**Type.** Newsreader for the reader's voice (notes, headings, letter, plain names in italic); IBM Plex Mono only for statement and EOB data; Avenir Next Condensed 600 (fallback IBM Plex Sans 600) for tabs, stamps and level words, in sentence case.
**Colour.** Graphite desk #24282C, manila #D9C48E (field only), paper #FFF, ink #16191D, one blue pencil #2349A6, wash #DCE5F7. Level is carried by words plus mark shape: solid ring and underline (Numbers disagree), dashed bracket (Worth asking), dotted underline (Ask for detail).
**Motion.** transform, opacity, clip-path and stroke-dashoffset only. Authored moment: the cover swings open on the front and three tags clip on. Elsewhere motion only shows change: evidence lifts and is drawn, the margin note writes in, Exhibit B slides out, tags FLIP into the "Set aside" pocket. Reduced motion: state changes instantly.

**Signature: pull the evidence.** Select a tag (or a check, or a line's question chip): the evidence lines lift onto a blue-wash acetate with the level's mark, other lines dim, the margin note writes in and the page scrolls to it. EOB and Good Faith Estimate questions slide out Exhibit B with a bracket and the difference. The bill-total question brackets the total to the line sum. Esc clears.

**Real vs simulated.** Real: data from case.js, `SOH.composeLetter`, hash routing, selection, set aside/include, live letter rebuild with a confirm bar and undo, copy, download. Simulated: "Use your own bill" only explains CSV and typed lines; Bates numbers are positional.

**Known weaknesses.** Desktop left leaf is sticky with its own scroll. Below 1100px (tablet included) the phone composition is used. Bracket geometry is computed from offsets and recalculated on resize only. The cover flip is 3D CSS cropped on the left by design. The memo section's lower left is sparse. Dimmed rows sit near the contrast floor.

**Mapping to the Next app.** New components: Folder shell, Exhibit sheet, Tag, Ledger line, MarginNote, Bracket (SVG overlay), Dock. Touches the front, review and letter pages. About 600 lines of CSS (tokens and mark shapes are portable). Risk: bracket and note positioning need layout measurement (ResizeObserver); view transitions and the 3D cover are optional; copy must stay about records and questions, never a case against anyone.
