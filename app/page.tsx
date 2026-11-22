import Link from "next/link";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";
import { DemoDesk } from "../components/landing/DemoDesk";
import { LEVEL_MEANING, RULES } from "../components/method/rules";
import { LevelMark, LevelTag, Specimen } from "../components/Tags";
import { analyzeBill, LEVEL_LABEL, type Level } from "../lib/analysis";
import { lookupCode } from "../lib/glossary";
import { formatCents } from "../lib/money";
import { getSample } from "../lib/samples";

// The example is the real synthetic bill read by the real engine, at build time. The letter's date is
// fixed to a week after the fictional statement so the page is static.
const DEMO_LETTER_DATE = "2026-09-29";
const LEVELS: Level[] = ["discrepancy", "ask", "detail"];

export default function Home() {
  const bill = getSample("emergency-visit");
  if (!bill) throw new Error("The example bill is missing.");
  const analysis = analyzeBill(bill);
  const flagged = new Set(analysis.findings.flatMap(f => f.lineIds));
  // The most expensive line, shown only if no question rests on it: the product's promise, on this bill's own data.
  const largest = [...bill.lineItems].sort((a, b) => b.amount - a.amount)[0];
  const largestNote = largest ? lookupCode(largest.code) : null;
  const showLargest = largest && !flagged.has(largest.id);
  // One real question per level from the example, so each level is shown rather than described.
  const examples = new Map(LEVELS.map(level => [level, analysis.findings.find(f => f.level === level)]));

  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        <section className="hero wrap" aria-labelledby="hero-title">
          <div className="hero-copy">
            <h1 id="hero-title">Your hospital bill, one question at a time.</h1>
            <p className="lede">
              Second Opinion reads an itemized hospital statement line by line, explains each charge in plain English, and lays out the
              few things worth asking the billing office. You decide what to ask. It writes the letter.
            </p>
            <div className="button-row">
              <Link className="button" href="/start">Open the example bill</Link>
              <Link className="button secondary" href="/start#your-bill">Use your own bill</Link>
            </div>
            <p className="hero-terms">
              No account. Nothing is compared with outside prices. Your bill is saved in this browser and checked by this app&rsquo;s own server, which keeps nothing.
            </p>
          </div>
          <div className="hero-demo" aria-labelledby="demo-title">
            <div className="demo-head">
              <h2 id="demo-title">Try it on the example bill</h2>
              <p>
                A fictional emergency visit at {bill.provider}: {bill.lineItems.length} lines, {analysis.findings.length} questions. Ask about each one or set
                it aside, and watch the letter change. <Specimen />
              </p>
            </div>
            <DemoDesk bill={bill} findings={analysis.findings} letterDate={DEMO_LETTER_DATE} />
          </div>
        </section>

        {showLargest && (
          <section className="largest" aria-labelledby="largest-title">
            <div className="wrap largest-grid">
              <h2 id="largest-title">The biggest charge on this bill raised no question.</h2>
              <div>
                <div className="largest-line" aria-label="The largest line on the example statement">
                  <span className="mono">{largest.code}</span>
                  <span className="largest-desc"><span className="mono">{largest.description}</span>{largestNote && <span className="strip-plain">{largestNote.name}</span>}</span>
                  <strong className="mono">{formatCents(largest.amount)}</strong>
                  <span className="largest-note"><LevelMark level="clear" />No check raised a question about this line.</span>
                </div>
                <p>
                  {formatCents(largest.amount)} is a lot of money. On its own it isn&rsquo;t evidence of a mistake: hospital list prices are routinely far
                  above what insurers pay. Second Opinion asks about numbers that disagree with each other, patterns that are often errors, and lines too
                  vague to check. Never about a price for being high.
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="checks-overview wrap" aria-labelledby="checks-title">
          <div className="checks-intro">
            <h2 id="checks-title">{analysis.checks.length} checks, all against your own paperwork</h2>
            <p>Every question names the rule that raised it, the numbers behind it, and the ordinary reasons it could be fine. <Link href="/method">How each check works</Link></p>
          </div>
          <div className="level-columns">
            {LEVELS.map(level => (
              <div key={level} className="level-column">
                <h3><LevelTag level={level} /></h3>
                <p>{LEVEL_MEANING[level]}</p>
                {examples.get(level) && (
                  <figure className="level-example">
                    <figcaption>On the example bill</figcaption>
                    <p>{examples.get(level)!.title}</p>
                    <p className="why">{examples.get(level)!.why}</p>
                  </figure>
                )}
                <ul aria-label={`Checks that can raise ${LEVEL_LABEL[level]}`}>{RULES.filter(rule => rule.level === level).map(rule => <li key={rule.name}>{rule.name}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>

        <section className="limits" aria-labelledby="limits-title">
          <div className="wrap limits-grid">
            <h2 id="limits-title">What it won&rsquo;t pretend to know</h2>
            <ul className="limit-list">
              <li><strong>Whether a price is fair</strong><span>Hospital list prices are often far above what insurers pay. A charge is never flagged for being expensive.</span></li>
              <li><strong>Your insurance contract</strong><span>It compares the bill with the numbers on your own EOB. It doesn&rsquo;t know your plan&rsquo;s rates or decide coverage.</span></li>
              <li><strong>Reference prices</strong><span>No Medicare or hospital price data is built in, so none is shown. Every comparison uses your own documents.</span></li>
              <li><strong>What&rsquo;s in a PDF or photo</strong><span>Reading scanned bills isn&rsquo;t built yet. Use the CSV template or type the lines in.</span></li>
            </ul>
          </div>
        </section>

        <section className="ways wrap" aria-labelledby="ways-title">
          <h2 id="ways-title">Three ways to start</h2>
          <ul className="ways-list">
            <li>
              <h3>The example bill</h3>
              <p>The emergency visit above, with every question already raised. Fictional hospital, account and prices.</p>
              <Link href="/start">Open an example</Link>
            </li>
            <li>
              <h3>A CSV of your lines</h3>
              <p>Copy the lines from your statement into the template: date, code, description, quantity, price, amount.</p>
              <Link href="/start#your-bill">Upload a file</Link>
            </li>
            <li>
              <h3>Type them in</h3>
              <p>Start with a blank bill and add each charge. Useful for short bills or when a file isn&rsquo;t practical.</p>
              <Link href="/start#your-bill">Start a blank bill</Link>
            </li>
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
