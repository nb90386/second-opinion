# D. One Question at a Time (fourth direction, invented)

**Insight:** A–C all show the whole dense bill at once. The real user is stressed and on a phone, and what they actually need is a short series of decisions: "should I ask about this?" This direction turns the bill into **one calm question at a time**, and the letter assembles itself from the answers. The full ledger is always one step away, but it is no longer the first thing you face.

**Idea sentence:** the six questions the engine found become a short guided conversation, and each kept question visibly travels into a letter that builds as you go.

**Palette (daylight, calm).**
- Ground: pale sage-grey `#E9EEEA`. Card surface: `#FFFFFF`. Ink: `#17211D`. Secondary: `#4D5A54`.
- Action: deep teal `#0B5F5A` (white text) for the one primary action.
- Level colours are quiet and always paired with words: *Numbers disagree* `#9B2C2C` text on `#F6E3E1`; *Worth asking* `#7A5A00` on `#F5EBCF`; *Ask for detail* `#2F4E6B` on `#E2EAF2`.
- "Look here" is a soft yellow `#FFF2B3` under evidence lines.
- No rust/cream pairing.

**Type.**
- "Avenir Next" (fallback IBM Plex Sans) for the interface, with question titles large: 32–40px weight 600 on phone, 44px on desktop, tight.
- Newsreader only for the letter, so the letter feels like a real letter.
- IBM Plex Mono only for the statement excerpt strip (`data-ui`).
- Shape: cards use a 24px radius, and buttons are fully round pills. Decide once and apply consistently.

**Signature interaction: "the deck and the tray".**
- *Review* shows one question card at a time, in engine order, with a progress line ("Question 2 of 6", a real `<ol>` of small dots that are themselves buttons).
- Each card holds:
  - the plain-sentence title;
  - the level in words;
  - the amount in question;
  - **the evidence**: a torn strip of the actual statement lines involved (mono, soft yellow wash), or for the EOB question two figures side by side;
  - "Why we noticed" (`why`);
  - "Why it might be fine" (`innocent`), given equal visual weight;
  - "What you'd ask" (`ask`) in a quoted style.
- Three big thumb buttons sit at the bottom: **Ask about this** (primary), **I'm not sure** (keep it, but phrase it as asking for detail; simulate it by including it, with a note), and **Set aside**.
- On a decision, the card leaves (exit 160ms ease-in) and the next arrives (280ms ease-out from 24px). If the question was kept, a small numbered chip **flies into the letter tray** (FLIP from the card to the tray).
- The tray is a bottom sheet on phone ("Your letter · 3 questions", tap to expand) and a live letter sheet on the right column on desktop. It updates live via `SOH.composeLetter` from the kept questions.
- Back/undo is always available. ←/→ and Enter work on desktop.
- After the last card comes a "Done" summary: the kept and set-aside lists, each with a change control, then "Read your letter" goes to `#letter`.
- **"See the whole bill"** is a secondary toggle that reveals the full ledger with question refs. Opening a line shows its plain name and `codeNote`. The ledger is never hidden from someone who wants it.

**Front.**
- A calm screen with h1: "Six questions, one at a time." (computed: "N questions"). A sub-sentence explains that we read all 17 lines of the example bill and found N things worth asking about, and that high prices alone are never one of them.
- Show the first question card itself as a live preview: the first screen *is* the product.
- Primary action: "Start with question 1" (goes to `#review`). Secondary: "Use your own bill".
- The single authored moment: the card stack fans in once on load (three offset card edges settling).

**Letter view.** The full letter, editable, with options and a sender name, plus the kept/set-aside lists with toggles. Copy and download. Desktop is two columns; phone is one.

**Risk to watch.** Being guided can feel slow for advocates who want the whole bill. The "See the whole bill" path and the jump-to dots must make expert use fast.
