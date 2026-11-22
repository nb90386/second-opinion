# Second Opinion — product brief

## The job

Someone receives an itemized hospital bill they don't understand. They want to know, line by line, what they were charged for, whether anything looks wrong, and what exactly to say to the billing office. Second Opinion reads the bill with them, explains each charge in plain English, points out the specific lines worth questioning and why, and drafts a calm, specific inquiry letter they can edit and send themselves.

Primary user: a patient or family member with an itemized statement in hand, often stressed, rarely a billing expert, frequently on a phone. Secondary: patient advocates and caregivers handling bills for someone else.

## What the product will not do

- Call a charge wrong because it is expensive. Hospital list prices are routinely far above what insurers pay; a high number is not, by itself, evidence of an error.
- Invent reference prices, Medicare rates, payer adjustments or coverage determinations. No reference price data ships with this prototype. The only comparisons are between numbers on the user's own documents (bill vs. bill total, bill vs. EOB, bill vs. Good Faith Estimate).
- Read PDFs or photos. CSV upload and manual entry are the supported paths; the interface says so plainly.
- Give legal or medical advice. The letter asks questions and requests corrections; it does not assert rights or allege fraud.

## Research notes

Verified this session against primary sources:

- **CMS patient-provider dispute resolution** ([cms.gov/medical-bill-rights/help/dispute-a-bill](https://www.cms.gov/medical-bill-rights/help/dispute-a-bill)): available to people who were uninsured or self-pay, received a Good Faith Estimate, and were billed at least $400 more than it, for care on or after January 1, 2022, with an initial bill dated within the last 120 calendar days. $25 non-refundable fee. Second Opinion uses this for one rule and one "what to do next" note, and always points to the CMS page rather than restating eligibility as fact for the user's situation.
- **Hospital price transparency** ([cms.gov hospital price transparency](https://www.cms.gov/priorities/key-initiatives/hospital-price-transparency)): hospitals must publish a comprehensive machine-readable file of items and services and a consumer-friendly display of shoppable services. This is the most credible future source of reference prices. It is not integrated here: files are large, hospital-specific, and inconsistently formatted, and no hospital's data was fetched.

Commonly cited by consumer guides but **not independently verified this session** (treated as assumptions, never stated as rules in the product): itemized-bill rights under state law, HIPAA right of access to billing records and its response window, the share of bills containing errors, and specific NCCI code-pair edits. Nonprofit-hospital financial assistance obligations under IRS §501(r) were found only in older secondary sources, so the letter offers an *optional request* for the hospital's financial assistance policy and makes no claim about eligibility.

Room-and-board counting: a common billing convention counts inpatient days by midnights, so the discharge day usually is not a room day. The product phrases this as a question for the billing office, not as a rule the hospital broke.

Existing alternatives: hospital billing offices, insurer member services, paid patient advocates, and general consumer guides. Patient advocates are effective but costly and scarce; guides are generic and leave the line-by-line work to the patient. The gap is the line-by-line read plus a specific, sendable letter.

## Business direction (not built)

A sustainable version would most plausibly be free for the read-and-letter workflow, with revenue from (a) employer or union benefits programs offering it to members, or (b) a paid escalation to human patient advocates for complex bills. Contingency fees on savings create incentives to over-flag, which conflicts with the product's core promise; avoid them. No payments, accounts or growth features are built because none has a real use case in this prototype.

## Scope of this vertical slice

1. **Start** — choose one of two synthetic example bills, upload a CSV (template provided), or start a blank bill and type lines in.
2. **Review** — ledger of line items with plain-English notes for known codes; every line is editable (correct, add, remove); bill facts (dates, totals, amount due, EOB, Good Faith Estimate) are editable.
3. **Findings** — deterministic rules run on the server; each finding states its level, why it was raised, the exact evidence, innocent explanations, what to ask, and the amount in question when it can be computed. Users can set a finding aside or mark a line as not received / not sure.
4. **Letter** — composed from the user's details and the findings they include; editable; copy, download as .txt, or print / save as PDF.
5. **Method** — a page describing every rule, what is never flagged, and where data goes.

### Rules (engine `2026.10-2`)

| Rule | Level | Fires when |
| --- | --- | --- |
| Line arithmetic | Numbers disagree | unit price × quantity differs from the line total by more than 1¢ |
| Bill total | Numbers disagree | line items don't sum to the total printed on the bill |
| EOB balance | Numbers disagree | amount due exceeds the patient responsibility on the user's EOB |
| Exact duplicate | Worth asking | same date, code, description, quantity and amount appear more than once |
| Room nights | Worth asking | inpatient room-and-board days exceed nights between admission and discharge |
| Outside stay | Worth asking | a service date falls before admission or after discharge |
| Good Faith Estimate | Worth asking | self-pay bill total is $400+ above the user's Good Faith Estimate |
| Not received (user) | Worth asking | the user marked a line as a service they did not receive |
| Repeated code | Ask for detail | same code billed more than once on a day with different amounts |
| Needs itemization | Ask for detail | description is a generic bucket (misc, supplies, pharmacy…) |
| Not sure (user) | Ask for detail | the user marked a line as unsure |

High prices are never flagged.

## Data boundary

- `GET /api/samples`, `GET /api/samples/[id]` — synthetic fixtures.
- `POST /api/bills/parse` — multipart CSV, ≤200 KB, ≤500 rows; returns a draft bill and row-level warnings. Stateless.
- `POST /api/analyze` — strict JSON bill schema (zod), ≤512 KB; returns findings and checks. Stateless.
- `GET /api/health` — reports `persistence: "browser-local"`, `retention: "none"`.

Route handlers keep nothing, log no bill content, and call no third party. Content-Security-Policy restricts browser connections to the app's own origin. The case (bill, corrections, letter, sender details) lives in this browser's localStorage under one versioned key. In this prototype the server is the user's own machine; a hosted version would receive bill contents, which is why the API is designed to be stateless.

## Acceptance criteria

- From the landing page, a keyboard-only user can open an example, review a flagged line, correct it and see findings update, set a finding aside, draft the letter, edit it and download it.
- CSV upload accepts the template, reports row-level problems by row number, rejects oversized, wrong-type and binary files with specific messages, and never loses the existing case on failure.
- Every finding shows level, reason, evidence and what to ask. Synthetic data is labeled everywhere it appears.
- Analysis failure keeps the last results visibly marked as out of date, with retry.
- Reload restores the case. Corrupt storage is reported and not silently overwritten until the user starts again; blocked storage is explained.
- No horizontal overflow at 390, 768 and 1440px. Axe WCAG 2.1 A/AA passes on each screen. Reduced motion disables transitions.
- All six gates pass: typecheck, lint, test, build, test:browser, test:a11y.
