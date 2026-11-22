# Second Opinion

Second Opinion helps someone read an itemized hospital bill: it explains each charge in plain English, marks the lines worth questioning with the reason for every mark, and drafts an editable letter to the billing office. Full-stack Next.js 16 prototype; no accounts, no paid services, no external data flows.

Read `docs/BRIEF.md` (product, research, rules, data boundary, acceptance), `DESIGN.md` (visual system) and `docs/HANDOFF.md` (state, verification, risks).

## Run

Node ≥22.18 and npm.

```sh
npm ci            # installs exactly what package-lock.json records
npm run build
npm start         # http://127.0.0.1:3000
# or: npm run dev
```

## The flow

1. **Start** (`/start`): open one of two synthetic example bills, upload a CSV (`public/second-opinion-template.csv`), or start a blank bill and type lines in. PDFs and photos are refused with an explanation; reading them isn't implemented.
2. **Review** (`/review`): the ledger of lines, with plain-English notes for known codes, and a margin of numbered questions. Open any line to read it, mark it ("I don't think I received this" / "I'm not sure"), correct it or remove it. Edit bill details (visit dates, totals, EOB, Good Faith Estimate) to enable more checks. Set aside questions you've resolved.
3. **Letter** (`/letter`): your details, the questions to include and optional requests become a letter you can edit, copy, download as .txt, or print / save as PDF.
4. **Method** (`/method`): every rule, what is never flagged, and where data goes.

## Architecture

| Path | Role |
| --- | --- |
| `lib/bill.ts` | zod schema for the bill: the one contract shared by fixtures, CSV import, the API and storage. Money is integer cents. |
| `lib/analysis.ts` | Deterministic rule engine (`ENGINE_VERSION`). Pure; unit tested. Never compares against outside prices. |
| `lib/csv.ts` | RFC 4180 parser with byte/row/column/cell limits and row-level problems. |
| `lib/letter.ts` | Pure letter composition. Questions and requests only; placeholders for missing details. |
| `lib/glossary.ts` | Plain-language notes for a short list of codes we're confident about. Unknown codes get no guess. |
| `lib/samples.ts` | Two synthetic bills (fictional hospitals, accounts and prices). |
| `lib/case.ts`, `lib/caseStore.ts` | Versioned browser-local case (`second-opinion.case.v1`) behind `useSyncExternalStore`; corrupt/blocked storage is detected and reported. |
| `components/CaseProvider.tsx` | Case context and debounced, abortable server analysis with stale/error states. |
| `app/api/*` | `GET /api/health`, `GET /api/samples`, `GET /api/samples/[id]`, `POST /api/bills/parse` (multipart CSV ≤200 KB), `POST /api/analyze` (strict JSON ≤512 KB). Stateless; byte-capped body reads; `Cache-Control: no-store`. |
| `next.config.ts` | CSP with `connect-src 'self'`, nosniff, no-referrer, frame denial. |
| `app/fonts` | Newsreader and IBM Plex (OFL), vendored; no font CDN. |

## Verify

```sh
npm run typecheck
npm run lint
npm test             # unit + route-handler tests (36 on 2026-11-22)
npm run build
npm run test:browser # full journeys at 1440/768/390, reduced motion; screenshots in artifacts/
npm run test:a11y    # same journeys with axe WCAG 2.1 A/AA across screens and error states
```

Independent review findings, fixes, exact gate results and browser-runtime limitations are in `docs/REVIEW.md`. Browser checks also cover 320px reflow, large bills, stale letters, clipboard, print pagination and saved-case deletion.

The browser harness starts its own production server on port 3217 (`STUDIO_PORT` overrides) and needs a Chromium build matching the installed Playwright (`npx playwright install chromium`). Set `STUDIO_PLAYWRIGHT` to point the harness at a different Playwright install. Screenshots are written to `artifacts/`, which is gitignored.

### Last verified (2026-11-22)

| Check | Result |
| --- | --- |
| `npm test` | 36 passed, 0 failed |
| `npm run typecheck` | clean |
| `npm run lint` | clean (0 warnings) |
| `npm run build`, `test:browser`, `test:a11y` | not re-run for this snapshot; see `docs/REVIEW.md` for the last recorded results |

## Limitations

- Prototype, not a medical, legal or financial service. Findings come from a fixed rule set (`lib/analysis.ts`) and never compare against outside prices or payer data.
- Input is CSV or manual entry only. PDF and photo bills are refused; OCR is not implemented.
- Cases are stored unencrypted in browser `localStorage`. The server processes bills in memory and keeps nothing, but hosting-level logging and retention were never audited.
- The plain-language glossary covers a short list of codes; unknown codes get no explanation.
- Browser testing covered Chromium only. Safari, Firefox, screen readers and physical touch devices are unverified (see `docs/HANDOFF.md`).

## Origin

Built in October 2026 as a project inside a local agent-runner workspace and imported here as a standalone repository, so there is no earlier Git history. Product brief, design system and review notes are in `docs/BRIEF.md`, `DESIGN.md`, `docs/HANDOFF.md` and `docs/REVIEW.md`.
