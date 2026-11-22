# C. The Consumer Rights Publication

**Idea:** a public-interest explainer magazine whose cover story is *your* bill. The product teaches you to read any hospital bill, then reads this one with you. Every educational figure is drawn from the user's real data, never from stock illustration.

**Palette (civic poster).**
- Newsprint `#F7F7F4` is the reading ground, with ink `#101210`. Use **civic green** `#0D4A3B` as the full-bleed field colour for section openers and the front cover, with white text on it. Use **signal lime** `#D5F06A` only as the "look here" highlighter on lines a question points at, always with ink text, never on green text.
- Levels are written in words in ink: *Numbers disagree* has a heavy 4px underline, *Worth asking* a 2px underline, *Ask for detail* a dotted one.
- Use no other hues. Avoid rust and cream.

**Type.**
- Display: "Avenir Next Condensed" Heavy/Bold (fallback IBM Plex Sans, weight 700, `font-stretch: condensed`). Set it very large (cover headline about 9vw on desktop, tight −0.02em, leading 0.92).
- Text: Charter (fallback Newsreader), 18/29, in a 60–68ch measure.
- IBM Plex Mono only inside reproduced statement lines.
- Two families in use, plus mono for data.

**Layout.** Broadsheet: a 12-column grid with uneven columns, standfirsts, captions under figures, and pull-quotes that are real sentences from the findings (e.g. the `innocent` text). Neighbouring sections never share a layout.

**Signature: "Anatomy of your bill".**
- An annotated figure of the user's actual statement, with callouts drawn as leader lines to: Date of service, Code (CPT / HCPCS / Revenue code, taken from `codeSystem`), Description, Units × price, Charge.
- A toggle switches between **"Any bill"** (callouts explain the columns) and **"Your bill"** (the same callouts now point at the six questions on this bill's lines).
- Below that sit **"The six checks, illustrated"**, small explanatory figures drawn in SVG from the real data:
  - the duplicate: two identical rows overlaid;
  - the arithmetic: 4 × $21.00 = $84.00 against the printed $105.00;
  - outside your visit: a calendar strip of Aug 13–18 with the visit day filled and Aug 17's pharmacy charge outside it;
  - the EOB: two bars, $1,890.00 against $1,250.00;
  - itemization: a "MISC MED/SURG SUPPLIES" box that opens into "?" rows.
  
  For the three-night stay, draw the room-nights figure (4 room days on a 3-night calendar) and the GFE figure instead. Each figure answers "what does this check look for?"
- Glossary terms (EOB, CPT, HCPCS, revenue code, Good Faith Estimate) are inline buttons that open a short definition popover. Write the definitions carefully: "commonly", no legal claims, and link CMS only as in ../docs/BRIEF.md.

**Front (the cover).**
- A green full-bleed cover. The headline is huge: "Your hospital bill, read line by line."
- The standfirst is one sentence. A cover line reads "In this issue: Cedar Hollow Regional Medical Center, 17 charges, 6 questions, synthetic example" (computed).
- A large crop of the actual statement runs off the right edge, with the lime highlighter on one line.
- Primary action: "Open the example bill". The single authored moment is the highlighter sweeping that one line on load.
- Below the cover comes the Anatomy figure.

**Review layout.**
- *Desktop:* a two-column broadsheet. The left (7 cols) is the questions as short articles: a headline (`title`), a standfirst (`why`), the evidence figure for its rule, "Why it might be fine" (`innocent`) as a pull-quote, "What to ask" (`ask`), and Include / Set aside. The right (5 cols) is the full statement as a sticky reproduced document.
- Selecting an article highlights its lines in lime.
- A "Read as table / Read as story" toggle switches the left column to a dense list.
- *Phone:* the articles stack. The statement becomes a collapsible "Your statement" section, with an "on your bill" excerpt inside each article.

**Letter view.** It is styled as a public-service form page: "Your letter to the billing office". The letter sheet sits on a green field, with options as a short checklist and the question toggles beside it.

**Risk to watch.** Magazine framing can make a tool feel like content to read rather than work to do. Keep the review actions obvious and close to each article.
