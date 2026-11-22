import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "../../components/SiteChrome";
import { LevelTag } from "../../components/Tags";
import { RULES, LEVEL_MEANING } from "../../components/method/rules";
import { ENGINE_VERSION } from "../../lib/analysis";

export const metadata: Metadata = { title: "How it checks" };

export default function MethodPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        <div className="wrap">
          <header className="page-head">
            <h1>Every mark has a rule, and every rule is written down here.</h1>
            <p className="lede">Second Opinion compares the numbers on your own documents with each other. It doesn&rsquo;t use outside prices, guess at your insurance, or treat a large number as a mistake.</p>
          </header>
          <div className="prose-grid">
            <nav className="toc" aria-label="On this page">
              <a href="#rules">The checks</a>
              <a href="#never">What&rsquo;s never flagged</a>
              <a href="#data">Where your data goes</a>
              <a href="#limits">Limits</a>
            </nav>
            <div className="prose">
              <section id="rules" aria-labelledby="rules-title">
                <h2 id="rules-title">The checks</h2>
                <p>Rules are deterministic: the same bill always gets the same marks. Each mark says why it fired, what could make it fine, and what to ask. Engine version {ENGINE_VERSION}.</p>
                <p>Every question has one of three levels, written in words and drawn as a pencil mark, so colour is never the only signal.</p>
                <dl className="level-legend">
                  {(["discrepancy", "ask", "detail"] as const).map(level => <div key={level}><dt><LevelTag level={level} /></dt><dd>{LEVEL_MEANING[level]}</dd></div>)}
                </dl>
                <table className="rule-table" role="table">
                  <thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col">Check</th><th role="columnheader" scope="col">Raised when</th><th role="columnheader" scope="col">Keep in mind</th></tr></thead>
                  <tbody role="rowgroup">
                    {RULES.map(rule => (
                      <tr key={rule.name} role="row">
                        <td role="cell">{rule.name}<br /><LevelTag level={rule.level} /></td>
                        <td role="cell" data-label="Raised when">{rule.fires}</td>
                        <td role="cell" data-label="Keep in mind">{rule.limits}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
              <section id="never" aria-labelledby="never-title">
                <h2 id="never-title">What&rsquo;s never flagged</h2>
                <p>A charge is never marked just for being expensive. Hospital list prices (the chargemaster) are routinely far above what insurers actually pay, so a high number on its own says little about whether it&rsquo;s an error.</p>
                <p>No reference prices are built in. Hospitals publish their standard charges in machine-readable files under federal price transparency rules, and that is the most promising future source. This prototype doesn&rsquo;t use any hospital&rsquo;s data, so it shows no comparison rather than an invented one.</p>
              </section>
              <section id="data" aria-labelledby="data-title">
                <h2 id="data-title">Where your data goes</h2>
                <ul>
                  <li>Your bill, corrections and letter are saved in this browser&rsquo;s local storage, under one key. Nothing is stored on a server, and there are no accounts.</li>
                  <li>To check the bill and read CSV files, the page sends them to this app&rsquo;s own server, which processes them in memory, keeps nothing and logs nothing. In this prototype that server runs on your own computer.</li>
                  <li>The page is only allowed to connect to its own origin. There are no analytics, trackers or third-party fonts.</li>
                  <li>Local storage isn&rsquo;t a backup. Clearing site data, using a private window, or switching browsers or devices loses the case. Download your letter to keep it.</li>
                  <li>Use &ldquo;Clear saved bill&rdquo; in the workspace to remove your bill, personal details and letter. Anyone using this browser profile can open the saved case until it is cleared.</li>
                  <li>If two tabs edit the same case, the most recent change wins; the other tab reloads it.</li>
                </ul>
              </section>
              <section id="limits" aria-labelledby="limits-title">
                <h2 id="limits-title">Limits</h2>
                <ul>
                  <li>PDFs and photos can&rsquo;t be read yet. CSV upload and typing the lines in are the supported ways in.</li>
                  <li>Plain-English notes cover a short list of common codes. They are summaries written for this app, not official code descriptions.</li>
                  <li>Second Opinion can&rsquo;t tell you what you owe, decide insurance coverage, or give legal or medical advice. For coverage questions, call the number on your EOB. For bills over a Good Faith Estimate, see <a href="https://www.cms.gov/medical-bill-rights/help/dispute-a-bill" rel="noreferrer">CMS&rsquo;s dispute process</a>.</li>
                </ul>
                <p className="gap-top"><Link className="button" href="/start">Start with a bill</Link></p>
              </section>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
