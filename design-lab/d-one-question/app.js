/* D. One question at a time. Vanilla, file:// safe. Data: window.SO, helpers: window.SOH. */
(() => {
  "use strict";
  const SO = window.SO, SOH = window.SOH;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = c => SOH.money(c);
  const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
  const LEVEL = SO.levelLabel;
  const CASES = { "emergency-visit": "Emergency visit", "three-night-stay": "Three-night stay" };
  const CHOICES = [["keep", "Ask"], ["unsure", "Not sure"], ["aside", "Set aside"]];
  const STATE_WORD = { keep: "asking", unsure: "not sure", aside: "set aside", none: "not decided" };

  const params = new URLSearchParams(location.search);
  const S = {
    caseId: SO.cases[params.get("sample")] ? params.get("sample") : "emergency-visit",
    idx: 0, dec: {}, hist: [], busy: false, ledger: false, trayOpen: false,
    sender: { name: "Jordan Avery", address: "", phone: "", email: "" },
    options: { requestItemized: true, requestHold: true, askFinancialAssistance: false },
    override: null, stale: false, letterUndo: null, view: "front", fanned: false,
  };
  const C = () => SO.cases[S.caseId];
  const F = () => C().analysis.findings;
  const N = () => F().length;
  const included = () => F().filter(f => S.dec[f.id] === "keep" || S.dec[f.id] === "unsure");
  const letterText = () => SOH.composeLetter({ bill: C().bill, findings: included(), sender: S.sender, options: S.options });
  const reduced = () => SOH.reducedMotion();
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const countWord = n => WORDS[n] || String(n);

  const live = $("#live");
  function announce(msg) { live.textContent = ""; setTimeout(() => { live.textContent = msg; }, 30); }

  /* ================= shared fragments ================= */
  const qtyText = l => l.unitPrice == null ? `qty ${l.quantity}` : `${l.quantity} × ${money(l.unitPrice)}`;
  const lineById = id => C().bill.lineItems.find(l => l.id === id);
  const levelPill = f => `<span class="level lv-${f.level}">${LEVEL[f.level]}</span>`;

  function evidenceHTML(f) {
    if (f.lineIds.length) {
      const rows = f.lineIds.map(lineById).map(l => `<li class="srow"><span class="s-desc">${esc(l.description)}</span><span class="s-amt">${money(l.amount)}</span><span class="s-meta">${SOH.date(l.date)} · ${esc(l.code)} · ${qtyText(l)}</span></li>`).join("");
      return `<div class="strip"><div class="strip-in"><p class="strip-cap">${f.lineIds.length === 1 ? "The line on your statement" : "The lines on your statement"}</p><ul>${rows}</ul></div></div>`;
    }
    const [a, b, ...rest] = f.facts;
    const fig = x => `<div><span class="fig-l">${esc(x.label)}</span><span class="fig-v">${esc(x.value)}</span></div>`;
    return `<div class="strip"><div class="strip-in"><p class="strip-cap">Two figures that don't line up</p><div class="figs">${fig(a)}${fig(b)}</div>${rest.length ? `<p class="fig-rest">${rest.map(x => `<span>${esc(x.label)} <b>${esc(x.value)}</b></span>`).join("")}</p>` : ""}</div></div>`;
  }

  function cardHTML(f, i, preview) {
    const d = S.dec[f.id];
    const facts = f.lineIds.length && f.facts.length > 2 ? `<dl class="facts">${f.facts.map(x => `<div><dt>${esc(x.label)}</dt><dd>${esc(x.value)}</dd></div>`).join("")}</dl>` : "";
    const amt = f.amountInQuestion == null ? `<p class="amt">No amount in question</p>` : `<p class="amt">Amount in question <strong class="num">${money(f.amountInQuestion)}</strong></p>`;
    return `<article class="card" data-level="${f.level}" aria-labelledby="${preview ? "pv-title" : "q-title"}">
      <div class="card-meta">${levelPill(f)}${amt}</div>
      <h2 class="q-title" id="${preview ? "pv-title" : "q-title"}" tabindex="-1" data-focus>${esc(f.title)}</h2>
      ${!preview && d ? `<p class="decided-note">You chose: ${d === "keep" ? "Ask about this" : d === "unsure" ? "I'm not sure (kept as a question)" : "Set aside"}. Choose again to change it.</p>` : ""}
      ${evidenceHTML(f)}${facts}
      <div class="reasons">
        <section class="reason"><h3>Why we noticed</h3><p>${esc(f.why)}</p></section>
        <section class="reason"><h3>Why it might be fine</h3><p>${esc(f.innocent)}</p></section>
      </div>
      ${preview ? "" : `<figure class="ask-q"><figcaption>What you'd ask</figcaption><blockquote>${esc(f.ask)}</blockquote></figure>
      <p class="hint">Not sure? We keep it in the letter as a question for the billing office to explain.</p>
      <div class="card-links"><button class="txtbtn" type="button" data-act="show-lines">${f.lineIds.length ? "Show these lines in the whole bill" : "Show this in the whole bill"}</button></div>`}
    </article>`;
  }

  function checksHTML() {
    const w = { clear: "Clear", flagged: "Flagged", "not-run": "Not run" };
    return `<ul class="checks">${C().analysis.checks.map(c => `<li><span class="cstat cstat-${c.status}">${w[c.status] || esc(c.status)}</span><span class="c-label">${esc(c.label)}</span><span class="c-detail">${esc(c.detail)}</span></li>`).join("")}</ul>`;
  }

  function qrowHTML(f, i) {
    const d = S.dec[f.id];
    const amt = f.amountInQuestion == null ? "" : `<span class="num">Amount in question ${money(f.amountInQuestion)}</span>`;
    const note = d === "unsure" ? `<p class="qrow-note">You weren't sure, so it stays in the letter as a question to explain.</p>` : "";
    return `<li class="qrow" data-id="${esc(f.id)}"><div class="qrow-t"><span class="qn">${i + 1}</span><div><p class="qrow-lv">${levelPill(f)}${amt}</p><p class="qrow-title">${esc(f.title)}</p>${note}</div></div>
      <div class="seg" role="group" aria-label="Decision for question ${i + 1}">${CHOICES.map(([k, t]) => `<button type="button" data-act="set" data-id="${esc(f.id)}" data-choice="${k}" aria-pressed="${d === k}">${t}</button>`).join("")}</div></li>`;
  }

  function sampleSwitchHTML() {
    return Object.keys(SO.cases).map(id => `<button type="button" data-act="sample" data-id="${id}" aria-pressed="${id === S.caseId}">${CASES[id] || id}</button>`).join("");
  }

  /* ================= FRONT ================= */
  function renderFront() {
    const n = N(), b = C().bill;
    $("#front-title").textContent = `${countWord(n)} question${n === 1 ? "" : "s"}, one at a time.`;
    $("#front-lede").textContent = `We read all ${C().analysis.lineCount} lines of the example bill and found ${countWord(n).toLowerCase()} thing${n === 1 ? "" : "s"} worth asking about. A high price on its own is never one of them.`;
    $$('[data-act="start"]').forEach(a => { a.textContent = "Open the example bill"; });
    const stack = $("#front-card");
    stack.innerHTML = cardHTML(F()[0], 0, true);
    if (!S.fanned && !reduced()) { stack.classList.add("fan-in"); setTimeout(() => stack.classList.remove("fan-in"), 2000); }
    S.fanned = true;
    $("#q-index").innerHTML = F().map((f, i) => `<li><button type="button" data-act="goto" data-i="${i}"><span class="qi-n">${i + 1}</span><span class="qi-body"><span class="qi-lv lv-${f.level}">${LEVEL[f.level]}</span><span class="qi-title">${esc(f.title)}</span></span></button></li>`).join("");
    $$("[data-sample-switch]").forEach(el => { el.innerHTML = sampleSwitchHTML(); });
    $("#all-q-title").textContent = `All ${countWord(n).toLowerCase()} question${n === 1 ? "" : "s"}`;
  }

  /* ================= REVIEW ================= */
  function mode() { return S.ledger ? "ledger" : S.idx >= N() ? "summary" : "card"; }

  function dotsHTML() {
    return F().map((f, i) => {
      const d = S.dec[f.id] || "none";
      return `<li><button class="dot" type="button" data-act="dot" data-i="${i}" data-state="${d}" ${i === S.idx && !S.ledger ? 'aria-current="step"' : S.ledger && i === S.idx ? 'aria-current="true"' : ""} aria-label="Question ${i + 1} of ${N()}: ${LEVEL[f.level]}, ${STATE_WORD[d]}"><span>${i + 1}</span></button></li>`;
    }).join("");
  }

  function renderProg() {
    const m = mode(), n = N();
    const label = m === "ledger" ? "The whole bill" : m === "summary" ? `All ${n} looked at` : `Question ${S.idx + 1} of ${n}`;
    const left = m === "ledger" ? `<button class="txtbtn" type="button" data-act="ledger-close">Back to the questions</button>` : `<button class="txtbtn" type="button" data-act="back" ${S.idx === 0 ? "disabled" : ""}>Back</button>`;
    const right = m === "ledger" ? `<span></span>` : `<button class="txtbtn" type="button" data-act="undo" ${S.hist.length ? "" : "disabled"}>Undo</button>`;
    $("#prog").innerHTML = `<div class="prog-row">${left}<p class="prog-label" aria-live="off">${label}</p>${right}</div><ol class="dots" aria-label="Jump to a question">${dotsHTML()}</ol>`;
  }

  function renderTools() {
    const m = mode();
    $("#deck-tools").innerHTML = m === "card" ? `<button class="txtbtn" type="button" data-act="ledger" aria-expanded="false">See the whole bill</button><span class="hint hint-kbd">Keys: ← → to move, Enter to ask about this.</span>` : m === "summary" ? `<button class="txtbtn" type="button" data-act="ledger" aria-expanded="false">See the whole bill</button>` : "";
  }

  function summaryHTML() {
    const n = N(), inc = included();
    const grp = (title, list) => list.length ? `<section class="sum-group" aria-label="${title}"><h3>${title} (${list.length})</h3><ul class="qlist" data-ctx="summary">${list.map(f => qrowHTML(f, F().indexOf(f))).join("")}</ul></section>` : "";
    const asking = F().filter(f => S.dec[f.id] === "keep" || S.dec[f.id] === "unsure");
    const aside = F().filter(f => S.dec[f.id] === "aside");
    const none = F().filter(f => !S.dec[f.id]);
    const heading = none.length ? `You've seen all ${countWord(n).toLowerCase()}.` : `All ${countWord(n).toLowerCase()} decided.`;
    const sub = inc.length ? `You're asking ${plural(inc.length, "question")}${aside.length ? ` and setting aside ${aside.length}` : ""}.${none.length ? ` ${plural(none.length, "question")} still undecided, and left out of the letter.` : ""} Change any of them here.` : `You haven't kept a question, so the letter only asks for more detail. Change any choice here.`;
    return `<section class="summary" aria-labelledby="sum-title"><h2 id="sum-title" tabindex="-1" data-focus>${heading}</h2><p class="lede">${sub}</p>
      ${grp("Asking about", asking)}${grp("Not decided yet", none)}${grp("Set aside", aside)}
      <div class="sum-actions"><a class="btn btn-primary" href="#letter">Read your letter</a></div>
      <details class="checked"><summary>What was checked</summary>${checksHTML()}</details></section>`;
  }

  function ledgerHTML() {
    const b = C().bill, refs = SOH.refsByLine(F());
    const meta = [b.provider, `Account ${b.accountNumber}`, b.admitDate === b.dischargeDate ? SOH.longDate(b.admitDate) : `${SOH.longDate(b.admitDate)} to ${SOH.longDate(b.dischargeDate)}`, `Statement dated ${SOH.longDate(b.statementDate)}`].join(" · ");
    const rows = b.lineItems.map(l => {
      const rs = refs[l.id] || [];
      const panel = `<div class="line-panel" id="lp-${l.id}" hidden>
        ${l.plainName ? `<p class="lp-plain">${esc(l.plainName)}</p>` : `<p class="lp-none">No plain-English name for this line.</p>`}
        ${l.codeNote ? `<p><span class="lp-sys">${esc(l.codeSystem)} ${esc(l.code)}.</span> ${esc(l.codeNote)}</p>` : ""}
        ${l.note ? `<p>Note on the statement: ${esc(l.note)}</p>` : ""}
        ${rs.length ? `<div class="lp-qs">${rs.map(r => `<button type="button" data-act="goq" data-i="${r.n - 1}"><span class="level lv-${r.level}">${LEVEL[r.level]}</span><span class="lp-t">Question ${r.n}: ${esc(F()[r.n - 1].title)}</span></button>`).join("")}</div>` : `<p class="lp-none">No question on this line.</p>`}
      </div>`;
      return `<li class="line" data-line="${l.id}"><button class="line-btn" type="button" data-act="line" data-id="${l.id}" aria-expanded="false" aria-controls="lp-${l.id}">
        <span class="l-desc"><span class="l-d">${esc(l.description)}</span>${l.plainName ? `<span class="l-plain">${esc(l.plainName)}</span>` : ""}</span>
        <span class="l-amt">${money(l.amount)}</span>
        <span class="l-sub"><span class="l-date">${SOH.date(l.date)}</span><span class="l-code">${esc(l.code)}</span><span class="l-qty">${qtyText(l)}</span>
        <span class="l-refs"><span class="look" hidden>Look here</span>${rs.map(r => `<span class="ref" data-n="${r.n}"><span class="sr">Question </span>Q${r.n}<span class="sr">, ${LEVEL[r.level]}</span></span>`).join("")}</span></span>
      </button>${panel}</li>`;
    }).join("");
    const t = (k, label, v) => v == null ? "" : `<div data-t="${k}"><dt>${label}</dt><dd>${money(v)}</dd></div>`;
    return `<section class="ledger" aria-labelledby="ledger-title">
      <div class="ledger-head"><h2 id="ledger-title" tabindex="-1" data-focus>The whole bill</h2><p class="ledger-meta">${esc(meta)}</p><p class="ledger-meta">Synthetic example: fictional hospital, account and prices. Open any line for its plain name and what it is.</p></div>
      <p class="marking" id="marking"></p>
      <div class="lhead" aria-hidden="true"><span>Date</span><span>Code</span><span>Description</span><span>Qty × price</span><span>Amount</span><span>Questions</span></div>
      <ul class="lines">${rows}</ul>
      <dl class="totals">${t("total", "Total charges on the bill", b.statedTotal)}${t("sum", `Sum of the ${C().analysis.lineCount} lines`, C().analysis.lineSum)}${t("due", "Amount due", b.amountDue)}${t("eob", "Your responsibility on the EOB", b.eobResponsibility)}${t("gfe", "Good Faith Estimate", b.goodFaithEstimate)}</dl>
      <h3>What was checked</h3>${checksHTML()}
    </section>`;
  }

  const RULE_TOTALS = { "eob-balance": ["due", "eob"], "bill-total": ["total", "sum"], "good-faith-estimate": ["total", "gfe"] };
  function markLedger(scroll) {
    if (!S.ledger) return;
    const f = F()[S.idx];
    const ids = new Set(f ? f.lineIds : []);
    const tots = f ? (RULE_TOTALS[f.rule] || []) : [];
    $$(".line").forEach(li => {
      const on = ids.has(li.dataset.line);
      li.classList.toggle("is-evidence", on);
      $(".look", li).hidden = !on;
      $$(".ref", li).forEach(r => r.classList.toggle("on", f && +r.dataset.n === S.idx + 1));
    });
    $$(".totals [data-t]").forEach(el => el.classList.toggle("is-evidence", tots.includes(el.dataset.t)));
    const m = $("#marking");
    if (!f) { m.hidden = true; return; }
    m.hidden = false;
    m.innerHTML = `<strong>Question ${S.idx + 1}: ${esc(f.title)}</strong> ${ids.size ? `${plural(ids.size, "line")} marked "Look here" below.` : "This one is about the totals, marked at the bottom."}`;
    if (scroll) {
      const target = $(".line.is-evidence") || $(".totals .is-evidence");
      if (target) target.scrollIntoView({ block: "center", behavior: reduced() ? "auto" : "smooth" });
    }
  }

  function renderTray(flashAsk) {
    const inc = included(), k = inc.length;
    const label = `Your letter`, count = `· ${plural(k, "question")}`;
    $("#tray-handle").innerHTML = `<span>${label}</span><span class="th-count">${count}</span><span class="chev" aria-hidden="true"></span>`;
    $("#tray-title").innerHTML = `${label} <span class="th-count">${count}</span>`;
    const paras = letterText().split("\n\n").map(p => {
      const flash = flashAsk && p.includes(flashAsk);
      return `<p${flash ? ' class="flash"' : ""}>${esc(p).replace(/\n/g, "<br>")}</p>`;
    }).join("");
    $("#tray-body").innerHTML = `${k ? "" : `<p class="tray-none">Nothing kept yet. Questions you ask about are added here.</p>`}<div class="letter-flow">${paras}</div>`;
    syncTrayAttrs();
    if (flashAsk) {
      const el = $("#tray-body .flash");
      if (el && $("#tray-body").offsetParent && getComputedStyle($("#tray-body")).overflowY === "auto") $("#tray-body").scrollTo({ top: Math.max(0, el.offsetTop - 60), behavior: reduced() ? "auto" : "smooth" });
    }
  }
  function syncTrayAttrs() {
    $("#tray").dataset.open = S.trayOpen;
    $("#tray-handle").setAttribute("aria-expanded", S.trayOpen);
    $("#scrim").hidden = !S.trayOpen;
  }
  function closeTray(focus) { S.trayOpen = false; syncTrayAttrs(); if (focus) $("#tray-handle").focus(); }

  function renderReview(opts = {}) {
    const m = mode();
    $("#view-review").dataset.mode = m; document.body.dataset.mode = m;
    renderProg(); renderTools();
    const deck = $("#deck");
    if (m === "ledger") deck.innerHTML = ledgerHTML();
    else if (m === "summary") deck.innerHTML = summaryHTML();
    else deck.innerHTML = cardHTML(F()[S.idx], S.idx, false);
    if (m === "ledger") markLedger(opts.scroll);
    if (m === "card") $$("#decide .btn").forEach(b => b.setAttribute("aria-pressed", S.dec[F()[S.idx].id] === b.dataset.choice));
    if (opts.tray !== false) renderTray();
    if (opts.animate && !reduced()) {
      const el = deck.firstElementChild;
      el.animate([{ opacity: 0, transform: "translateX(24px)" }, { opacity: 1, transform: "none" }], { duration: 280, easing: "ease-out" });
    }
    if (opts.focus) {
      window.scrollTo(0, 0);
      const h = $("[data-focus]", deck);
      if (h) h.focus({ preventScroll: true });
    }
  }

  /* ----- moving between cards ----- */
  function go(i, o = {}) {
    if (S.busy) return;
    S.idx = Math.max(0, Math.min(N(), i));
    renderReview({ animate: true, focus: o.focus !== false, scroll: true, tray: false });
  }

  function visibleTarget() {
    const a = $("#tray-title"), b = $("#tray-handle");
    return a.offsetParent !== null ? $(".th-count", a) : b.offsetParent !== null ? $(".th-count", b) : null;
  }
  function flyChip(card, n, ask) {
    const target = visibleTarget();
    const from = $(".q-title", card).getBoundingClientRect();
    if (!target) return Promise.resolve().then(() => renderTray(ask));
    const t = target.getBoundingClientRect();
    const chip = document.createElement("div");
    chip.className = "chip"; chip.textContent = n; chip.setAttribute("aria-hidden", "true");
    document.body.append(chip);
    const x0 = Math.max(8, from.left), y0 = Math.min(Math.max(from.top, 88), innerHeight - 120);
    const x1 = t.left + t.width / 2 - 18, y1 = t.top + t.height / 2 - 18;
    const a = chip.animate([
      { transform: `translate(${x0}px, ${y0}px) scale(.6)`, opacity: 0 },
      { transform: `translate(${x0}px, ${y0}px) scale(1)`, opacity: 1, offset: .18 },
      { transform: `translate(${x1}px, ${y1}px) scale(.55)`, opacity: 1 },
    ], { duration: 560, easing: "cubic-bezier(.5,0,.2,1)", fill: "forwards" });
    return a.finished.catch(() => {}).then(() => {
      chip.remove(); renderTray(ask);
      const t2 = visibleTarget(); if (t2) t2.animate([{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }], { duration: 260, easing: "ease-out" });
    });
  }

  async function decide(choice) {
    if (S.busy || S.idx >= N()) return;
    const f = F()[S.idx], prev = S.dec[f.id];
    S.hist.push({ id: f.id, idx: S.idx, prev });
    S.dec[f.id] = choice;
    S.override !== null && (S.stale = true);
    const kept = choice !== "aside";
    const letterNo = included().findIndex(x => x.id === f.id) + 1;
    const num = S.idx + 1;
    const msg = choice === "aside" ? `Question ${num} set aside.` : choice === "unsure" ? `Question ${num} kept as a question to explain. Added to your letter as number ${letterNo}.` : `Question ${num} added to your letter as number ${letterNo}.`;
    const card = $("#deck .card");
    S.idx += 1;
    announce(S.idx >= N() ? `${msg} That was the last question. Summary shown.` : `${msg} Now question ${S.idx + 1} of ${N()}.`);
    if (reduced() || !card) { renderReview({ focus: true }); return; }
    S.busy = true;
    let fly = Promise.resolve();
    if (kept) fly = flyChip(card, letterNo, f.ask); else renderTray();
    try { await card.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateX(-18px)" }], { duration: 160, easing: "ease-in", fill: "forwards" }).finished; } catch (e) { /* element replaced */ }
    renderReview({ animate: true, focus: true, tray: false });
    S.busy = false;
    await fly;
  }

  function undo() {
    if (S.busy || !S.hist.length) return;
    const h = S.hist.pop();
    if (h.prev === undefined) delete S.dec[h.id]; else S.dec[h.id] = h.prev;
    if (S.override !== null) S.stale = true;
    S.idx = h.idx; S.ledger = false;
    renderReview({ animate: true, focus: true });
    announce(`Undone. Back on question ${h.idx + 1} of ${N()}.`);
  }

  function openLedger(scroll) {
    S.ledger = true; renderReview({ focus: false, tray: false, scroll });
    window.scrollTo(0, 0);
    if (scroll) requestAnimationFrame(() => markLedger(true));
    announce("The whole bill is open.");
    const h = $("#ledger-title"); if (h) h.focus({ preventScroll: true });
  }
  function closeLedger() { S.ledger = false; renderReview({ animate: true, focus: true, tray: false }); announce("Back to the questions."); }

  /* ================= LETTER ================= */
  function snap() { return JSON.parse(JSON.stringify({ dec: S.dec, options: S.options, sender: S.sender, override: S.override, stale: S.stale })); }
  function restore(s) { S.dec = s.dec; S.options = s.options; S.sender = s.sender; S.override = s.override; S.stale = s.stale; }
  function sizeTA() { const ta = $("#letter-text"); ta.style.height = "auto"; ta.style.height = `${ta.scrollHeight + 4}px`; }

  const OPTS = [
    ["requestItemized", "Ask for a complete itemized statement", "Lists each charge with date, code, quantity and amount."],
    ["requestHold", "Ask them to hold the account", "No collections referral while the questions are reviewed."],
    ["askFinancialAssistance", "Ask about financial assistance", "Requests their policy and application."],
  ];

  function renderLetter() {
    const k = included().length, n = N();
    $("#letter-lede").textContent = k ? `It asks ${plural(k, "question")} and accuses no one. Edit anything. Nothing is sent from here.` : `No questions kept, so it only asks for more detail. Edit anything. Nothing is sent from here.`;
    const itemizedHandled = included().some(f => f.rule === "bill-total");
    const s = S.sender;
    const f = (id, label, v, area) => `<div class="field"><label for="${id}">${label}</label>${area ? `<textarea id="${id}" data-field="${id}" rows="3">${esc(v)}</textarea>` : `<input id="${id}" data-field="${id}" value="${esc(v)}" autocomplete="off">`}</div>`;
    $("#letter-side").innerHTML = `
      <section class="side-block" aria-labelledby="sb-you"><h2 id="sb-you">About you</h2>
        ${f("f-name", "Your name", s.name)}
        <details class="more"><summary>Add address, phone or email</summary>${f("f-address", "Mailing address", s.address, true)}${f("f-phone", "Phone", s.phone)}${f("f-email", "Email", s.email)}</details>
      </section>
      <section class="side-block" aria-labelledby="sb-opts"><h2 id="sb-opts">Also ask the billing office to</h2>
        ${OPTS.map(([k2, t, small]) => `<label class="opt"><input type="checkbox" data-opt="${k2}" ${S.options[k2] ? "checked" : ""}><span>${t}<small>${k2 === "requestItemized" && itemizedHandled ? "Already covered by the question about the bill's total." : small}</small></span></label>`).join("")}
      </section>
      <section class="side-block" aria-labelledby="sb-qs"><h2 id="sb-qs">Your ${n} questions</h2>
        <ul class="qlist" data-ctx="letter">${F().map(qrowHTML).join("")}</ul>
        <p class="hint"><a href="#review">Back to the questions, one at a time</a></p>
      </section>`;
    syncLetter();
  }

  function syncLetter() {
    const ta = $("#letter-text");
    if (S.override === null) ta.value = letterText(); else ta.value = S.override;
    sizeTA();
    renderLetterNote();
  }

  function renderLetterNote(extra) {
    const el = $("#letter-note");
    if (S.stale && S.override !== null) {
      el.hidden = false;
      el.innerHTML = `<p><strong>You've edited the letter by hand.</strong> Your changes to the questions or options aren't in the text yet. Rebuilding replaces your edits.</p><div class="row"><button class="btn btn-primary" type="button" data-act="rebuild">Rebuild the letter</button><button class="btn btn-outline" type="button" data-act="keepedits">Keep my text</button>${S.letterUndo ? `<button class="btn btn-quiet" type="button" data-act="letter-undo">Undo change</button>` : ""}</div>`;
    } else if (extra && S.letterUndo) {
      el.hidden = false;
      el.innerHTML = `<p>${esc(extra)}</p><div class="row"><button class="btn btn-outline" type="button" data-act="letter-undo">Undo</button></div>`;
    } else { el.hidden = true; el.innerHTML = ""; }
  }

  function letterChanged(label, { undoable = true } = {}) {
    if (S.override !== null) S.stale = true;
    syncLetter();
    if (label) {
      renderLetterNote(S.override === null ? `${label} The letter was rebuilt.` : null);
      announce(S.override === null ? `${label} The letter was rebuilt.` : `${label} Your edited letter is unchanged until you rebuild it.`);
    }
  }

  async function copyLetter() {
    const ta = $("#letter-text");
    let ok = false;
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(ta.value); ok = true; } } catch (e) { /* fall back */ }
    if (!ok) { ta.focus(); ta.select(); try { ok = document.execCommand("copy"); } catch (e) { ok = false; } }
    const b = $('[data-act="copy"]');
    const prev = "Copy letter";
    b.textContent = ok ? "Copied" : "Press Ctrl or Cmd + C"; announce(ok ? "Letter copied." : "Copy didn't work here. The text is selected so you can copy it.");
    setTimeout(() => { b.textContent = prev; }, 2200);
  }
  function downloadLetter() {
    const url = URL.createObjectURL(new Blob([$("#letter-text").value], { type: "text/plain" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "second-opinion-letter.txt" });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce("Letter downloaded as a text file.");
  }

  /* ================= set from a segmented control ================= */
  function setDecision(id, choice, ctx) {
    const f = F().find(x => x.id === id), i = F().indexOf(f);
    if (ctx === "letter") S.letterUndo = { snap: snap(), label: "" };
    S.dec[id] = choice;
    const word = choice === "aside" ? "set aside" : choice === "unsure" ? "kept, not sure" : "kept";
    if (ctx === "summary") {
      renderReview({ tray: true });
      const b = $(`#deck [data-act="set"][data-id="${CSS.escape(id)}"][data-choice="${choice}"]`); if (b) b.focus();
      if (S.override !== null) S.stale = true;
      announce(`Question ${i + 1} ${word}. Your letter now has ${plural(included().length, "question")}.`);
    } else {
      letterChanged(`Question ${i + 1} ${word}.`);
      renderLetter();
      const b = $(`#letter-side [data-act="set"][data-id="${CSS.escape(id)}"][data-choice="${choice}"]`); if (b) b.focus();
      renderLetterNote(S.override === null ? `Question ${i + 1} ${word}. The letter was rebuilt.` : null);
    }
  }

  /* ================= samples ================= */
  function switchCase(id) {
    if (!SO.cases[id] || id === S.caseId) return;
    Object.assign(S, { caseId: id, idx: 0, dec: {}, hist: [], ledger: false, trayOpen: false, override: null, stale: false, letterUndo: null });
    try { const u = new URL(location.href); u.searchParams.set("sample", id); history.replaceState(null, "", u); } catch (e) { /* file:// may refuse */ }
    renderFront(); renderView(true);
    announce(`Switched to the ${CASES[id]} example. Your choices were reset.`);
  }

  /* ================= routing ================= */
  const VIEWS = ["front", "review", "letter"];
  function currentView() { const h = (location.hash || "#front").slice(1); return VIEWS.includes(h) ? h : "front"; }
  function renderView(keep) {
    if (S.view === "review") { renderReview({}); }
    if (S.view === "letter") renderLetter();
  }
  function route(initial) {
    const v = currentView();
    const apply = () => {
      S.view = v;
      document.body.dataset.view = v;
      VIEWS.forEach(x => { $(`#view-${x}`).hidden = x !== v; });
      $$("[data-nav]").forEach(a => { if (a.dataset.nav === v) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
      document.title = { front: "Second Opinion: one question at a time", review: `Questions: ${Math.min(S.idx + 1, N())} of ${N()} · Second Opinion`, letter: "Your letter · Second Opinion" }[v];
      S.trayOpen = false;
      if (v === "front") renderFront();
      if (v === "review") { S.ledger = false; renderReview({ focus: !initial }); }
      if (v === "letter") renderLetter();
      if (!initial) {
        window.scrollTo(0, 0);
        if (v !== "review") $(`#view-${v} h1`).focus({ preventScroll: true });
      }
    };
    if (!initial && document.startViewTransition && !reduced()) document.startViewTransition(apply); else apply();
  }

  /* ================= events ================= */
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-act]");
    if (!t) return;
    const act = t.dataset.act;
    switch (act) {
      case "start": S.idx = 0; break; // link navigates
      case "own": { const p = $("#own-panel"); const open = p.hidden; p.hidden = !open; t.setAttribute("aria-expanded", open); break; }
      case "goto": S.idx = +t.dataset.i; if (currentView() === "review") route(false); else location.hash = "#review"; break;
      case "decide": decide(t.dataset.choice); break;
      case "back": go(S.idx - 1); break;
      case "undo": undo(); break;
      case "dot": {
        const i = +t.dataset.i;
        if (S.ledger) { S.idx = i; renderReview({ tray: false, scroll: true }); const b = $(`.dot[data-i="${i}"]`); if (b) b.focus(); announce(`Marking question ${i + 1} in the bill.`); }
        else go(i);
        break;
      }
      case "ledger": openLedger(true); break;
      case "ledger-close": closeLedger(); break;
      case "show-lines": openLedger(true); break;
      case "line": {
        const open = t.getAttribute("aria-expanded") === "true";
        t.setAttribute("aria-expanded", !open); $("#" + t.getAttribute("aria-controls")).hidden = open;
        break;
      }
      case "goq": S.ledger = false; go(+t.dataset.i); break;
      case "tray": S.trayOpen = !S.trayOpen; syncTrayAttrs(); if (S.trayOpen) { const el = $("#tray-body"); el.scrollTop = 0; } break;
      case "tray-close": closeTray(true); break;
      case "set": setDecision(t.dataset.id, t.dataset.choice, t.closest("[data-ctx]").dataset.ctx); break;
      case "sample": switchCase(t.dataset.id); { const b = $(`[data-sample-switch] [data-id="${t.dataset.id}"]`); if (b) b.focus(); } break;
      case "copy": copyLetter(); break;
      case "download": downloadLetter(); break;
      case "rebuild": { S.letterUndo = { snap: snap(), label: "" }; S.override = null; S.stale = false; syncLetter(); renderLetterNote(`Letter rebuilt from your ${plural(included().length, "question")}. Your edits were replaced.`); announce("Letter rebuilt. Your edits were replaced. Undo is available."); break; }
      case "keepedits": S.stale = false; renderLetterNote(); announce("Keeping your edited text."); break;
      case "letter-undo": { if (S.letterUndo) { restore(S.letterUndo.snap); S.letterUndo = null; renderLetter(); announce("Undone."); const b = $("[data-act=copy]"); b.focus(); } break; }
    }
  });

  document.addEventListener("input", e => {
    const t = e.target;
    if (t.id === "letter-text") { S.override = t.value; S.stale = false; sizeTA(); renderLetterNote(); return; }
    if (t.dataset.field) {
      const map = { "f-name": "name", "f-address": "address", "f-phone": "phone", "f-email": "email" };
      S.sender[map[t.dataset.field]] = t.value;
      if (S.override !== null) { S.stale = true; renderLetterNote(); } else syncLetter();
    }
  });
  document.addEventListener("change", e => {
    const t = e.target;
    if (t.dataset.opt) {
      S.letterUndo = { snap: snap(), label: "" };
      S.options[t.dataset.opt] = t.checked; // snapshot above holds the old value via JSON copy
      S.letterUndo.snap.options[t.dataset.opt] = !t.checked;
      letterChanged(`Option ${t.checked ? "added" : "removed"}.`);
    }
  });

  document.addEventListener("keydown", e => {
    if (S.view !== "review" || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Escape") { if (S.trayOpen) { closeTray(true); e.preventDefault(); } else if (S.ledger) { closeLedger(); } return; }
    if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
    if (S.ledger) return;
    if (e.key === "ArrowRight") { go(S.idx + 1); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { go(S.idx - 1); e.preventDefault(); }
    else if (e.key === "Enter" && S.idx < N() && !e.target.closest("button, a, summary, details") ) { decide("keep"); e.preventDefault(); }
  });

  window.addEventListener("hashchange", () => route(false));

  /* ================= boot ================= */
  renderFront();
  route(true);
  if (currentView() === "front" && !S.fanned) { /* fan-in is applied by renderFront */ }
})();
