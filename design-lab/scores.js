// Scorecard for the comparison console. Scores are 1–5, judged from screenshots at 1440/768/390,
// the shared harness (compare.mjs: axe, overflow, errors) and hands-on use. Weights live in DECISION.md.
window.LAB = {
  concepts: [
    {
      dir: "d-one-question", short: "D · One question", name: "D. One Question at a Time", winner: true,
      idea: "The engine's questions become a short guided conversation; every kept question travels into a letter that builds as you go.",
      scores: [["Immediate recognition", 3.5], ["Brand originality", 4], ["Visual craft", 4], ["Accessibility", 3.5], ["Mobile composition", 5], ["Trustworthiness", 5], ["Interaction depth", 4.5], ["Connection to product", 5], ["Performance / complexity", 4]],
      total: "4.33",
      pros: ["The only phone first screen showing a question, its evidence and the three thumb actions", "“Why it might be fine” has equal weight to “Why we noticed”: the calmest, most trustworthy voice", "The letter visibly assembles from decisions; the product's job is the interface"],
      cons: ["Visual identity is the weakest of the four (a pleasant, generic “calm app”)", "Undecided questions are left out of the letter; production must keep include-by-default", "Advocates need the whole-bill path to stay one tap away"],
    },
    {
      dir: "a-case-file", short: "A · Case file", name: "A. The Annotated Case File",
      idea: "The patient's own case file: statement, EOB and letter are exhibits in one folder, and questions are evidence tags clipped to lines.",
      scores: [["Immediate recognition", 5], ["Brand originality", 4], ["Visual craft", 3.5], ["Accessibility", 4], ["Mobile composition", 3], ["Trustworthiness", 3.5], ["Interaction depth", 5], ["Connection to product", 5], ["Performance / complexity", 3]],
      total: "3.96",
      pros: ["Best single moment in the lab: the EOB slides out as Exhibit B with a blue bracket to “$640.00 more”", "Levels encoded by mark shape in one blue pencil, so colour is never the signal", "Most ownable look: graphite desk, manila folder, white exhibits"],
      cons: ["Exhibits and evidence read legal and adversarial against a calm, asking product", "Busy: boxes inside boxes on manila; descriptions wrap in a narrow statement", "On a phone the first screen is the statement header, not a question"],
    },
    {
      dir: "c-publication", short: "C · Publication", name: "C. The Consumer Rights Publication",
      idea: "A public-interest explainer whose cover story is your bill, with every educational figure drawn from your own data.",
      scores: [["Immediate recognition", 5], ["Brand originality", 4.5], ["Visual craft", 3.5], ["Accessibility", 4], ["Mobile composition", 3], ["Trustworthiness", 4], ["Interaction depth", 4], ["Connection to product", 4.5], ["Performance / complexity", 3.5]],
      total: "3.96",
      pros: ["Strongest poster: civic green cover and condensed display type, unmistakable", "“Anatomy of your bill” and the illustrated checks genuinely teach", "Lime highlighter is a clear, single “look here” signal"],
      cons: ["Reads as content to read, not work to do; review actions compete with articles", "Phone first screens spend themselves on headings before any line or question", "Depends on macOS faces (Avenir Next Condensed, Charter), so a production version needs licensed or OFL replacements"],
    },
    {
      dir: "b-examination-desk", short: "B · Desk", name: "B. The Financial Examination Desk",
      idea: "Check the bill against itself: a precise reconciliation instrument where disagreements become visible geometry.",
      scores: [["Immediate recognition", 3], ["Brand originality", 2.5], ["Visual craft", 4], ["Accessibility", 3.5], ["Mobile composition", 3], ["Trustworthiness", 4.5], ["Interaction depth", 3.5], ["Connection to product", 4], ["Performance / complexity", 4]],
      total: "3.61",
      pros: ["Scale strip with “the largest line raised no question” makes the no-price-judgement promise visible", "Most rigorous numerals; every figure asserted against the data", "Simplest to build on the existing stack"],
      cons: ["Looks like any achromatic fintech dashboard; the least memorable", "At bill scale the $640.00 finding is a 40px sliver: the chart undersells its own point", "Bridge fills the first review screen; questions and ledger fall below the fold"],
    },
  ],
};
