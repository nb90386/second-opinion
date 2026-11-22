# D. One question at a time

**Idea.** The engine's findings become a short guided conversation. Each kept question travels into a letter that builds beside you; the full ledger is one tap away.

**Type.** Avenir Next (fallback IBM Plex Sans) for the interface; question titles 32px phone to 44px desktop, weight 600, tight. Newsreader for the letter and the quoted "What you'd ask" (that text is letter text). IBM Plex Mono only for statement lines, figures and ledger rows.
**Colour.** Sage ground `#E9EEEA`, white cards, ink `#17211D`, teal `#0B5F5A` for the one primary action, soft yellow `#FFF2B3` for evidence ("Look here"). Level colours per SPEC, always with words. Radius: cards 24, buttons/chips pills, fields 14.
**Motion.** Card exit 160ms ease-in, next card 280ms ease-out from 24px; a numbered chip flies from the card to the tray (WAAPI, transform/opacity); tray paragraph flash; one authored moment: the fan-in of three card edges on first load of the front. View Transitions as enhancement. Reduced motion: state changes instantly.

**Signature.** The deck and the tray. Decisions, undo, back, dots (jump), arrow keys, Enter, "See the whole bill" (ledger with Look here marks, line panels with plain name and codeNote, question chips that jump back, totals marked for EOB/total/GFE questions, What was checked). Focus moves to the new card heading after each decision.

**Real vs simulated.** Real: all data, the letter via `SOH.composeLetter`. Simulated: "I'm not sure" keeps the question with the engine's ask text (the letter wording is not changed, so it stays byte-exact); "Use your own bill" only explains CSV/typed lines. Nothing is sent.

**Deviations.** Primary front button reads "Open the example bill" (brief) instead of SPEC's "Start with question 1".

**Known weaknesses.** Cards are long on phone (two reason blocks plus ask). Desktop sticky decide bar sits over the card bottom. Ledger on desktop stays in the 640px deck column, so no wide table. Letter edits with later question changes use a rebuild/keep banner (single-level undo). No automated keyboard test beyond a flow script. Clipboard falls back to selection on file://.

**Mapping to the Next app.** New `QuestionDeck`, `DotsProgress`, `LetterTray` and `EvidenceStrip` components; Review route replaces the two-pane list; Letter composer reused as is. About 400 lines of new CSS (tokens above). Risk: expert users need the ledger/dots path to be fast; guided flow adds clicks to a six-item task.
