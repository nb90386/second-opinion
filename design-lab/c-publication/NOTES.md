# Concept C: the consumer-rights publication

**Idea.** A public-interest explainer magazine whose cover story is your bill. It teaches you to read any hospital bill, then reads this one with you, and every explanatory figure is drawn from the real case data rather than stock art.

## Type, colour, motion
- **Type.** Display is Avenir Next Condensed (800 on the cover, 700 elsewhere), falling back to IBM Plex Sans 700. Text is Charter, falling back to Newsreader. IBM Plex Mono appears only inside reproduced statement lines and the amounts printed on them.
- **Colour.** Newsprint `#F7F7F4`, ink `#101210`, civic green `#0D4A3B` for full-bleed openers, and signal lime `#D5F06A` only as the highlighter on lines a question points at (always with ink text). No other hues.
- **Levels.** Written in words with underline weight: heavy 4px (*Numbers disagree*), 2px (*Worth asking*), dotted (*Ask for detail*).
- **Motion.** Lime marks are drawn with a `scaleX` transform. The one authored moment is the highlighter sweeping line 13 (or the room-days line in the stay case) on the cover. Other motion: the itemize box rows rising in, and a short view-transition crossfade. All of it collapses under `prefers-reduced-motion`.

## Signature interaction
"Anatomy of your bill". The toggle switches between **Any bill** (five column callouts on leader lines above the real statement) and **Your bill** (the same statement with the six questions pinned to their lines by JS-measured elbow leaders). Below it, "Five checks, six questions" gives one SVG/HTML figure per rule, computed from the case data: duplicate overlay, price × quantity bars, visit calendar, EOB / total / estimate bars, room days against midnights, and the itemize box that opens into "?" rows.

## Real vs simulated
- **Real:** all data from `case.js`, the letter from `SOH.composeLetter`, selection and inclusion state, the letter edit/rebuild/undo flow, copy, download, glossary popovers, and sample switching (`?sample=` and the header control).
- **Simulated:** "Use your own bill" opens a dialog that says CSV or typed lines only, and nothing is uploaded. Sender details live in memory only. The CMS link is the only external href.
- **Deviation from the spec:** the figures section is titled with computed counts ("Five checks, six questions" for the emergency visit), because only five distinct rules fire there. The "six checks" wording would be wrong for that case.

## Known weaknesses
- The Your bill leader lines are measured in JS. They are recomputed on resize and when fonts load, but I have not tested unusual zoom levels.
- On phone and tablet (under 1100px) the anatomy figure becomes a stacked list built from one real line, not a table with leaders.
- Avenir Next Condensed and Charter are macOS faces. The fallbacks are wider, so the cover headline wraps differently elsewhere.
- The Review headline is long for providers with long names.
- Magazine framing adds scroll before the work starts. The Review actions stay beside each article to offset that.
- I did not run a screen reader. Keyboard paths are built from real buttons, checkboxes and a native `<dialog>`.

## Mapping onto the Next app
- **Components touched:** Start page (cover and anatomy), Review (an article list, a sticky statement with a line detail, a checks table), Letter (option checklist, question checkboxes and an edit/rebuild banner).
- **New CSS:** tokens, the lime highlighter pattern, level underlines, the broadsheet grid and the figure primitives (hatch pattern, bars, calendar strip).
- **Risk:** medium. The figures need one small component per rule. The leader-line layout is the fiddliest piece and could be dropped to a plain list without losing function.
