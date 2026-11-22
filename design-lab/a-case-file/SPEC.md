# A. The Annotated Case File

**Idea:** the patient's own case file for this bill becomes the interface. Every document involved (the hospital statement, the insurer's EOB, the letter) is a separate exhibit in one folder, and Second Opinion's questions are evidence tags clipped to the exact lines they concern.

**World.** A manila folder lies open on a dark graphite desk. Inside are stacked sheets:
- *Exhibit A* is the hospital statement, white paper set in Plex Mono, in the hospital's voice.
- *Exhibit B* is the insurer's EOB, a smaller sheet that shows "Your responsibility $1,250.00". Draw it from `bill.eobResponsibility`. When the case has no EOB, the exhibit reads "No EOB entered".
- *Exhibit C* is the letter, the cover memo.

Each sheet has a page foot such as "Exhibit A · page 1 of 1" and an evidence number per statement line in the left margin, `SO-0001`…`SO-0017` (Bates-style; it is a reference, not a claim).

**Palette.** Desk `#24282C`; manila folder `#D9C48E` (used as a field, never as the page ground for text); paper `#FFFFFF` with ink `#16191D`. All annotation is in **one blue pencil** `#2349A6`. The three levels are encoded by **mark shape**, not hue: *Numbers disagree* gets a solid ring and solid underline, *Worth asking* a dashed bracket, *Ask for detail* a dotted underline. The level is always written in words beside the mark. "Look here" uses a pale blue wash `#DCE5F7`. Avoid terracotta, rust and cream page grounds.

**Type.**
- Newsreader for the reader's voice: notes, headings and the letter. Use the italic for handwritten-feeling margin notes.
- IBM Plex Mono, for the statement and EOB only (`data-ui`).
- "Avenir Next Condensed" Demi Bold (fallback IBM Plex Sans, weight 600), for exhibit tabs, stamps and the folder label, in sentence case (no tracked caps).

**Layout.**
- *Desktop:* the folder is open as a spread. The left leaf holds the case index (questions as tag list, checks). The right leaf holds the stacked exhibit sheets, the active one on top, with physical **folder index tabs** sticking out of the right edge ("Statement", "EOB", "Letter") that act as navigation.
- *Phone:* the folder closes to a single sheet stack, and the index tabs become a bottom tab row stuck to the screen edge. Question tags sit inline under their lines.

**Signature interaction: "pull the evidence".**
- Choosing a question tag lifts its lines out of the statement: they slide forward onto a clear acetate overlay with a blue-pencil ring, the rest of the sheet dims, and the margin note writes itself in (clip-path).
- For the EOB question, Exhibit B slides out beside the statement, and a blue bracket joins "Amount due $1,890.00" to "Your responsibility $1,250.00", labelled "$640.00 more".
- Set aside drops the tag back into a "Set aside" pocket on the folder flap.

**Front.** The closed folder carries a typed label: "Cedar Hollow Regional Medical Center · Account SO-48213-ER · Synthetic example". Above it, h1: "Read the bill before you pay it." with one sentence beneath. On load the folder opens once (one authored moment) to show the statement with three tags already clipped on, then waits for you. Primary action: "Open the example bill".

**Letter view.** The letter is Exhibit C on top of the stack. The questions it cites are listed in the left leaf as tags you can unclip (set aside) or clip (include), and the letter rebuilds on change.

**Risk to watch.** "Case file" can feel legal or adversarial. Keep the language about questions and records, never about a case *against* anyone.
