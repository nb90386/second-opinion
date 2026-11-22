/* The Annotated Case File. Vanilla, file:// safe. Data: window.SO, helpers: window.SOH. */
(() => {
  "use strict";
  const SO = window.SO, H = window.SOH;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const reduced = () => H.reducedMotion();
  const wide = () => matchMedia("(min-width: 1100px)").matches;
  const KEYS = Object.keys(SO.cases);

  /* ───────── state ───────── */
  const params = new URLSearchParams(location.search);
  const state = {
    key: SO.cases[params.get("sample")] ? params.get("sample") : "emergency-visit",
    view: "front", tab: "statement", sel: null, openLine: null, fsel: null,
    off: new Set(),
    opts: { requestItemized: true, requestHold: true, askFinancialAssistance: false },
    sender: { name: "Jordan Avery", address: "", phone: "", email: "" },
    text: "", dirty: false, undo: null, stageOpened: false, firstRoute: true,
  };
  const cur = () => SO.cases[state.key];
  const bill = () => cur().bill;
  const finds = () => cur().analysis.findings;
  const byId = id => finds().find(f => f.id === id);
  const idxOf = f => finds().indexOf(f);
  const included = () => finds().filter(f => !state.off.has(f.id));
  const label = l => SO.levelLabel[l];
  const live = $("#live");
  const say = msg => { live.textContent = ""; setTimeout(() => { live.textContent = msg; }, 30); };
  const lineIndex = id => bill().lineItems.findIndex(l => l.id === id);
  const bates = id => "SO-" + String(lineIndex(id) + 1).padStart(4, "0");

  const MARK = {
    discrepancy: `<svg class="mk" viewBox="0 0 40 24" aria-hidden="true" focusable="false"><ellipse cx="20" cy="11" rx="17.5" ry="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M11 11h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 22.5h30" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    ask: `<svg class="mk" viewBox="0 0 40 24" aria-hidden="true" focusable="false"><path d="M10 3H4v18h6M30 3h6v18h-6" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3.5 2.5"/><path d="M13 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    detail: `<svg class="mk" viewBox="0 0 40 24" aria-hidden="true" focusable="false"><path d="M7 10h26" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 19h30" stroke="currentColor" stroke-width="2.6" stroke-dasharray="0.1 5" stroke-linecap="round"/></svg>`,
  };
  const ICON = {
    clear: `<svg class="ci" viewBox="0 0 22 22" aria-hidden="true"><path d="M5 11.5l4 4 8-9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    flagged: `<svg class="ci" viewBox="0 0 22 22" aria-hidden="true" style="color:var(--blue)"><circle cx="11" cy="11" r="7.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="11" cy="11" r="2.6" fill="currentColor"/></svg>`,
    "not-run": `<svg class="ci" viewBox="0 0 22 22" aria-hidden="true"><path d="M6 11h10" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  };
  const STATUS = { clear: "Clear", flagged: "Flagged", "not-run": "Not run" };
  const SUMEV = { "eob-balance": ["due"], "bill-total": ["total", "lines"], "good-faith-estimate": ["total"] };
  const BEV = { "eob-balance": "eob", "good-faith-estimate": "gfe" };

  /* ───────── shared markup ───────── */
  function factsHTML(f) {
    return `<dl>${f.facts.map(x => `<dt>${esc(x.label)}</dt><dd>${esc(x.value)}</dd>`).join("")}</dl>`;
  }
  function bodyHTML(f, i, opts = {}) {
    const off = state.off.has(f.id);
    return `
      <div class="blk"><h3>Why this stood out</h3><p>${esc(f.why)}</p></div>
      <div class="blk"><h3>A plain explanation that may apply</h3><p>${esc(f.innocent)}</p></div>
      <div class="blk"><h3>The facts</h3>${factsHTML(f)}</div>
      <div class="blk"><h3>What the letter will ask</h3><p class="ask-q">${esc(f.ask)}</p></div>
      ${f.next ? `<div class="blk"><h3>What you can do next</h3><p>${esc(f.next)}</p></div>` : ""}
      ${opts.inline ? `<div class="go"><button type="button" class="btn-sm ghost" data-act="toggle" data-f="${f.id}">${off ? "Include in the letter" : "Set aside"}</button></div>` : ""}
      ${opts.showOnStatement ? `<div class="go show-st"><button type="button" class="btn-sm ghost" data-act="show" data-f="${f.id}">Show on the statement</button></div>` : ""}`;
  }
  function amountLine(f) { return f.amountInQuestion != null ? `<span class="am">${H.money(f.amountInQuestion)} in question</span>` : ""; }

  /* ───────── build: front ───────── */
  function pickThree() {
    const withLines = finds().filter(f => f.lineIds.length);
    const picked = [];
    ["discrepancy", "ask", "detail"].forEach(l => { const f = withLines.find(x => x.level === l && !picked.includes(x)); if (f) picked.push(f); });
    withLines.forEach(f => { if (picked.length < 3 && !picked.includes(f)) picked.push(f); });
    return picked.slice(0, 3);
  }
  function buildFront() {
    const b = bill();
    $("#cover-front").innerHTML = `<div class="cover-label"><span class="p">${esc(b.provider)}</span><span class="a">Account ${esc(b.accountNumber)}</span><span class="s">Synthetic example</span></div>`;
    $$(".mk-wrap[data-mk]").forEach(w => { w.innerHTML = MARK[w.dataset.mk]; });
    const picks = pickThree();
    const items = b.lineItems;
    const keep = new Set();
    picks.forEach(f => f.lineIds.forEach(id => { const i = lineIndex(id); [i - 1, i, i + 1].forEach(j => { if (j >= 0 && j < items.length) keep.add(j); }); }));
    const order = [...keep].sort((x, y) => x - y);
    let rows = "", prev = -2;
    order.forEach(i => {
      if (prev >= 0 && i !== prev + 1) rows += `<div class="fgap" aria-hidden="true">· · ·</div>`;
      const l = items[i]; prev = i;
      rows += `<div class="fl" data-id="${l.id}"><span class="b">${bates(l.id)}</span><span class="date">${H.date(l.date)}</span><span class="d">${esc(l.description)}</span><span class="amt">${H.money(l.amount)}</span></div>`;
    });
    const stmt = `<div class="fsheet" id="fsheet">
      <div class="fhead"><strong>${esc(b.provider)}</strong><br>Account ${esc(b.accountNumber)} · Statement dated ${H.date(b.statementDate, { month: "short", day: "numeric", year: "numeric" })}</div>
      ${rows}
      <p class="foot" style="margin-top:12px">Exhibit A · page 1 of 1 · ${order.length} of ${items.length} lines shown</p></div>`;
    const tags = picks.map((f, k) => `<button type="button" class="ftag" aria-pressed="false" data-f="${f.id}" data-first="${f.lineIds[0]}" style="transition-delay:${k * 150}ms">
        <span class="face"><span class="lv">${MARK[f.level]}<span>${label(f.level)}</span></span>
        <span class="tt">${esc(f.title)}</span>${amountLine(f)}
        <span class="fx-body"><b>Why this stood out</b>${esc(f.why)}<b>A plain explanation that may apply</b>${esc(f.innocent)}</span></span></button>`).join("");
    $("#fright").innerHTML = stmt + `<div class="fx-margin" id="fxm">${tags}</div>`;
    state.fsel = null;
    $("#stage-hint").textContent = "Choose a tag to pull its lines out of the statement.";
  }
  function layoutFtags() {
    const tags = $$(".ftag"), m = $("#fxm");
    if (!m) return;
    if (!wide()) { tags.forEach(t => { t.style.top = ""; }); m.style.minHeight = ""; return; }
    const mt = m.getBoundingClientRect().top;
    let bottom = 0;
    tags.map(t => ({ t, y: $(`.fl[data-id="${t.dataset.first}"]`).getBoundingClientRect().top - mt })).sort((a, b) => a.y - b.y).forEach(({ t, y }) => {
      const top = Math.max(y - 6, bottom + 12);
      t.style.top = top + "px"; bottom = top + t.offsetHeight;
    });
    m.style.minHeight = bottom + "px";
  }
  function frontSelect(id) {
    state.fsel = state.fsel === id ? null : id;
    const f = state.fsel && byId(state.fsel);
    $$(".ftag").forEach(t => t.setAttribute("aria-pressed", String(t.dataset.f === state.fsel)));
    $$("#fsheet .fl").forEach(r => {
      r.className = "fl" + (f && f.lineIds.includes(r.dataset.id) ? ` ev ev-${f.level}` : "");
    });
    $("#fsheet").classList.toggle("pulling", !!f);
    $("#stage-hint").textContent = f ? "Choose the same tag again to put the lines back." : "Choose a tag to pull its lines out of the statement.";
    layoutFtags();
    say(f ? `${label(f.level)}. ${f.title}. Its lines are marked on the statement.` : "Lines put back.");
  }
  function openStage(animate) {
    const st = $("#stage");
    if (state.stageOpened) { st.classList.add("is-open", "tags-in"); return; }
    state.stageOpened = true;
    if (!animate || reduced()) { st.classList.add("is-open", "tags-in"); layoutFtags(); return; }
    layoutFtags();
    setTimeout(() => st.classList.add("is-open"), 250);
    setTimeout(() => { st.classList.add("tags-in"); }, 900);
  }

  /* ───────── build: folder ───────── */
  function buildFolder() {
    const b = bill(), a = cur().analysis;
    $("#folder-tab").textContent = `Account ${b.accountNumber}`;
    $("#fsub").innerHTML = `<b>${esc(b.provider)}</b> · Account ${esc(b.accountNumber)}. Synthetic example: fictional hospital, account and prices.`;

    /* tags (index) */
    const mk = (f, i) => {
      const n = i + 1;
      return `<li class="tag" data-f="${f.id}" data-selected="false"><div class="tag-in">
        <button type="button" class="tag-main" aria-expanded="false" aria-controls="tb-${i}" data-act="select">
          <span class="lv">${MARK[f.level]}<span>${label(f.level)}</span></span>
          <span class="tt"><span class="num">${n}.</span> ${esc(f.title)}</span>${amountLine(f)}
        </button>
        <button type="button" class="tag-tog" data-act="toggle" aria-label="Set aside question ${n}">Set aside</button>
        <div class="tag-body" id="tb-${i}">${bodyHTML(f, i, { showOnStatement: true })}</div>
      </div></li>`;
    };
    $("#tags").innerHTML = finds().map(mk).join("");
    $("#aside").innerHTML = "";

    /* checks */
    $("#checks").innerHTML = a.checks.map(c => {
      const f = c.status === "flagged" ? finds().find(x => x.rule === c.rule) : null;
      const inner = `${ICON[c.status]}<span><span class="cl">${esc(c.label)}</span><span class="cs ${c.status}">${STATUS[c.status]}</span><span class="cd">${esc(c.detail)}</span></span>`;
      return f ? `<li><button type="button" class="chk-row" data-act="check" data-f="${f.id}">${inner}</button></li>` : `<li><div class="chk-row">${inner}</div></li>`;
    }).join("");

    /* statement */
    const refs = H.refsByLine(finds());
    const lines = b.lineItems.map(l => {
      const q = refs[l.id] || [];
      const unit = l.unitPrice != null ? `${l.quantity} × ${H.money(l.unitPrice)}` : `${l.quantity} × no unit price`;
      const itags = finds().filter(f => f.lineIds.length && f.lineIds[f.lineIds.length - 1] === l.id).map(f => itagHTML(f)).join("");
      return `<li class="line" data-id="${l.id}">
        <button type="button" class="line-btn" aria-expanded="false" aria-controls="more-${l.id}">
          <span class="c-meta"><span class="bates"><span class="sr">Evidence number </span>${bates(l.id)}</span><span class="c-date">${H.date(l.date)}</span><span class="c-code">${esc(l.code)}</span></span>
          <span class="c-desc"><span class="d">${esc(l.description)}</span>${l.plainName ? `<span class="pn">${esc(l.plainName)}</span>` : ""}</span>
          <span class="c-qty">${unit}</span><span class="c-amt">${H.money(l.amount)}</span>
        </button>
        <div class="line-more" id="more-${l.id}" hidden>
          ${l.plainName ? `<span class="cs">${esc(l.codeSystem)} ${esc(l.code)} · in plain English</span><p class="cn"><strong>${esc(l.plainName)}.</strong> ${esc(l.codeNote || "")}</p>` : `<p class="cn">This line doesn't name a specific service.</p>`}
          <div class="qs">${q.length ? `<p>${q.length === 1 ? "A question about this line" : "Questions about this line"}</p>` + q.map(r => { const f = finds()[r.n - 1]; return `<button type="button" class="qchip" data-act="chip" data-f="${f.id}">${MARK[f.level]}<span><span class="qn">${r.n}. ${label(f.level)}</span><br>${esc(f.title)}</span></button>`; }).join("") : `<p>No questions on this line.</p>`}</div>
        </div>
        <div class="itags">${itags}</div>
      </li>`;
    }).join("");
    const headTags = finds().filter(f => !f.lineIds.length).map(f => itagHTML(f)).join("");
    const addr = esc(b.providerAddress).replace(/\n/g, " · ");
    $("#exA").innerHTML = `
      <p class="stamp">Exhibit A</p>
      <h2 class="stmt-title" id="exA-t">Hospital statement</h2>
      <div class="stmt-meta mono"><strong>${esc(b.provider)}</strong><br>${addr}<br>Account ${esc(b.accountNumber)} · Statement dated ${H.longDate(b.statementDate)}<br>Dates of service ${b.admitDate === b.dischargeDate ? H.longDate(b.admitDate) : H.longDate(b.admitDate) + " to " + H.longDate(b.dischargeDate)}</div>
      <dl class="sums mono">
        <div class="sum" data-sum="total"><dt>Total charges</dt><dd>${H.money(b.statedTotal)}</dd></div>
        <div class="sum" data-sum="due"><dt>Amount due</dt><dd>${H.money(b.amountDue)}</dd></div>
      </dl>
      ${headTags ? `<div class="itags" data-head>${headTags}</div>` : ""}
      <div class="ledger-head" aria-hidden="true"><span>No.</span><span>Date</span><span>Code</span><span>Description</span><span>Qty × price</span><span>Amount</span></div>
      <ol class="ledger" id="ledger">${lines}</ol>
      <div class="ledger-foot"><span>Added up from the ${a.lineCount} lines above</span><dl class="sum" data-sum="lines"><dt class="sr">Sum of the lines</dt><dd>${H.money(a.lineSum)}</dd></dl></div>
      <p class="foot">Exhibit A · page 1 of 1</p>`;

    /* exhibit B */
    const hasEob = b.eobResponsibility != null, hasGfe = b.goodFaithEstimate != null;
    $("#exB").innerHTML = `
      <button type="button" class="edge" data-act="eobtab">Exhibit B</button>
      <p class="stamp">Exhibit B</p>
      <h2 id="exB-t">The insurer's explanation of benefits</h2>
      <div class="b-sec"><p class="b-title">Explanation of benefits</p>
        ${hasEob ? `<div class="b-row" data-b="eob"><span>Your responsibility</span><b>${H.money(b.eobResponsibility)}</b></div>` : `<p class="b-none">No EOB entered</p>`}</div>
      ${hasGfe ? `<div class="b-sec"><p class="b-title">Good Faith Estimate</p><div class="b-row" data-b="gfe"><span>Estimate you entered</span><b>${H.money(b.goodFaithEstimate)}</b></div></div>` : ""}
      <p class="b-cmp" id="b-cmp" hidden></p>
      <p class="foot">Exhibit B · page 1 of 1</p>`;

    /* letter controls */
    $$(".opts input").forEach(i => { i.checked = !!state.opts[i.name]; });
    $$(".from input").forEach(i => { i.value = state.sender[i.name] || ""; });
  }
  function itagHTML(f) {
    const i = idxOf(f), n = i + 1, off = state.off.has(f.id);
    return `<div data-f="${f.id}"><button type="button" class="itag${off ? " is-aside" : ""}" aria-expanded="false" data-act="select" data-f="${f.id}">
      <span class="lv">${MARK[f.level]}<span>${label(f.level)}${off ? " · set aside" : ""}</span></span><span class="tt">${n}. ${esc(f.title)}</span></button>
      <div class="itag-body"><div class="tag-body">${bodyHTML(f, i, { inline: true })}</div></div></div>`;
  }

  /* ───────── selection: pull the evidence ───────── */
  function select(id, { force = false, scroll = true } = {}) {
    const next = !force && state.sel === id ? null : id;
    state.sel = next;
    if (next && state.tab === "index" && !wide()) { /* stay on the index; user chose to read */ }
    syncSel(scroll);
    const f = next && byId(next);
    say(f ? `Question ${idxOf(f) + 1} selected. ${label(f.level)}. ${f.lineIds.length ? "Its lines are marked on the statement." : "Its figures are marked."}` : "Selection cleared.");
  }
  function pos(el, anc) { let x = 0, y = 0, e = el; while (e && e !== anc) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return { x, y }; }

  function syncSel(scroll) {
    const f = state.sel && byId(state.sel);
    /* tags & inline tags */
    $$(".tag").forEach(t => {
      const on = !!f && t.dataset.f === f.id;
      t.dataset.selected = String(on);
      $(".tag-main", t).setAttribute("aria-expanded", String(on));
    });
    $$(".itag").forEach(t => t.setAttribute("aria-expanded", String(!!f && t.dataset.f === f.id)));
    /* ledger */
    const ledger = $("#exA");
    ledger.classList.toggle("pulling", !!f);
    $$(".line", ledger).forEach(li => {
      li.className = "line" + (f && f.lineIds.includes(li.dataset.id) ? ` ev ev-${f.level}` : "");
    });
    const sums = f && SUMEV[f.rule] ? SUMEV[f.rule] : [];
    $$(".sum", ledger).forEach(s => { s.className = "sum" + (sums.includes(s.dataset.sum) ? ` ev ev-${f.level}` : ""); });
    const bk = f && BEV[f.rule];
    $$(".b-row").forEach(r => { r.className = "b-row" + (bk === r.dataset.b ? ` ev ev-${f.level}` : ""); });
    const cmp = $("#b-cmp");
    if (f && bk) {
      const b = bill();
      cmp.hidden = false;
      cmp.innerHTML = bk === "eob"
        ? `The statement asks for ${H.money(b.amountDue)}. Your EOB says ${H.money(b.eobResponsibility)}. That is <strong>${H.money(f.amountInQuestion)} more</strong>.`
        : `Total charges are ${H.money(b.statedTotal)}, against an estimate of ${H.money(b.goodFaithEstimate)}. That is <strong>${H.money(f.amountInQuestion)} above it</strong>.`;
    } else cmp.hidden = true;
    /* B out? */
    syncB();
    /* margin note */
    placeNote(f);
    $("#hint").hidden = !!f || state.tab === "eob";
    requestAnimationFrame(() => { drawBracket(f); if (scroll) scrollToEvidence(f); });
  }
  function syncB() {
    const f = state.sel && byId(state.sel);
    const out = state.tab === "eob" || (f && BEV[f.rule]);
    $("#folder").classList.toggle("eob-out", !!out);
    $$('[data-tab="eob"]').forEach(b => b.setAttribute("aria-pressed", String(state.tab === "eob")));
  }
  function placeNote(f) {
    const note = $("#note");
    if (!f || BEV[f.rule] || !wide() || state.view !== "review") { note.hidden = true; return; }
    const b = f;
    note.innerHTML = `<span class="lv">${MARK[b.level]}<span>${label(b.level)}</span></span><span class="nt">${esc(b.title)}</span>${amountLine(b)}`;
    note.hidden = false;
    const stack = $("#stack"), margin = $("#margin");
    const anchor = b.lineIds.length ? $(`.line[data-id="${b.lineIds[0]}"]`) : $('.sum[data-sum="total"]');
    let top = pos(anchor, stack).y - pos(margin, stack).y - 4;
    const bOut = $("#folder").classList.contains("eob-out");
    if (bOut) top = Math.max(top, $("#exB").offsetHeight + 16);
    note.style.top = Math.max(top, 0) + "px";
    note.classList.remove("write"); void note.offsetWidth; note.classList.add("write");
  }
  function drawBracket(f) {
    const svg = $("#bracket");
    svg.innerHTML = "";
    if (!f || !wide() || state.view !== "review") return;
    const stack = $("#stack"), A = $("#exA");
    const pairs = { "eob-balance": ["due", "eob"], "good-faith-estimate": ["total", "gfe"], "bill-total": ["total", "lines"] };
    const p = pairs[f.rule];
    if (!p) return;
    const e1 = $(`.sum[data-sum="${p[0]}"]`, A);
    const p1 = pos(e1, stack);
    const x1 = p1.x + e1.offsetWidth + 8, y1 = p1.y + e1.offsetHeight / 2;
    const aRight = pos(A, stack).x + A.offsetWidth;
    let x2, y2, xm = aRight + 12, label;
    if (p[1] === "eob" || p[1] === "gfe") {
      const e2 = $(`.b-row[data-b="${p[1]}"]`), B = $("#exB");
      const bp = pos($("#margin"), stack);
      x2 = bp.x + 8 + e2.offsetLeft - 8; y2 = bp.y + B.offsetTop + e2.offsetTop + e2.offsetHeight / 2;
      label = p[1] === "eob" ? `${H.money(f.amountInQuestion)} more` : `${H.money(f.amountInQuestion)} above`;
      xm = Math.min(xm, x2 - 8);
    } else {
      const e2 = $('.sum[data-sum="lines"]', A), p2 = pos(e2, stack);
      x2 = p2.x + e2.offsetWidth + 8; y2 = p2.y + e2.offsetHeight / 2;
      label = `${H.money(f.amountInQuestion)} not in the lines`;
      xm = aRight - 10; x2 = Math.min(x2, xm);
    }
    const ns = "http://www.w3.org/2000/svg";
    const mkp = (d, cls) => { const e = document.createElementNS(ns, "path"); e.setAttribute("d", d); e.setAttribute("pathLength", "1"); if (cls) e.setAttribute("class", cls); svg.appendChild(e); return e; };
    mkp(`M${x1} ${y1} H${xm} V${y2} H${x2} M${x1} ${y1 - 8} V${y1 + 8} M${x2} ${y2 - 8} V${y2 + 8}`, "anim");
    const t = document.createElementNS(ns, "text");
    t.setAttribute("class", "lab"); t.textContent = label;
    svg.appendChild(t);
    const w = t.getComputedTextLength();
    const cx = Math.max(x1 + 14, Math.min((x1 + xm) / 2, xm - w - 20)) ;
    const rect = document.createElementNS(ns, "rect");
    rect.setAttribute("class", "labbg"); rect.setAttribute("x", cx - 10); rect.setAttribute("y", y1 - 36); rect.setAttribute("width", w + 20); rect.setAttribute("height", 28); rect.setAttribute("rx", 3);
    svg.insertBefore(rect, t);
    t.setAttribute("x", cx); t.setAttribute("y", y1 - 16);
    if (!reduced()) { rect.style.opacity = 0; t.style.opacity = 0; [rect, t].forEach(el => el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, delay: 500, fill: "forwards" })); }
  }
  function scrollToEvidence(f) {
    if (!f || state.view !== "review") return;
    let el;
    if (!wide() && state.tab === "index") return;
    if (f.lineIds.length) el = $(`.line[data-id="${f.lineIds[0]}"]`);
    else el = wide() ? $("#exA") : $(`.itag[data-f="${f.id}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const rowH = f.lineIds.length ? Math.max(r.height, 60) : 0;
    const topSafe = 80, botSafe = innerHeight - (wide() ? 80 : 150);
    if (r.top < topSafe || r.top + rowH > botSafe || (!f.lineIds.length && r.top < -20 && wide())) {
      const block = f.lineIds.length ? "center" : "start";
      el.scrollIntoView({ block, behavior: reduced() ? "auto" : "smooth" });
    }
  }

  /* ───────── tags: set aside / include (with a quiet FLIP) ───────── */
  function placeTags() {
    const lists = { on: $("#tags"), off: $("#aside") };
    finds().forEach(f => {
      const t = $(`.tag[data-f="${f.id}"]`);
      const off = state.off.has(f.id);
      t.classList.toggle("is-aside", off);
      const tog = $(".tag-tog", t), n = idxOf(f) + 1;
      tog.textContent = off ? "Include" : "Set aside";
      tog.setAttribute("aria-label", `${off ? "Include" : "Set aside"} question ${n}`);
      lists[off ? "off" : "on"].appendChild(t);
    });
    $$(".itag").forEach(b => {
      const off = state.off.has(b.dataset.f);
      b.classList.toggle("is-aside", off);
      const f = byId(b.dataset.f);
      $(".lv span", b).textContent = label(f.level) + (off ? " · set aside" : "");
    });
    $$(".itag-body [data-act=toggle]").forEach(b => { b.textContent = state.off.has(b.dataset.f) ? "Include in the letter" : "Set aside"; });
    const n = state.off.size, total = finds().length, inc = total - n;
    $("#aside-n").textContent = n;
    $("#pocket-empty").hidden = n > 0;
    $("#idx-sum").textContent = `${inc} of ${total} ${total === 1 ? "question goes" : "questions go"} in your letter.`;
    $("#idx-h").textContent = state.view === "letter" ? "Questions in the letter" : "Questions";
    $("#c-count").textContent = `${inc} of ${total} questions included`;
    $("#fh1").textContent = state.view === "letter" ? "Your letter to the billing office" : `${total} ${total === 1 ? "question" : "questions"} to ask about this bill`;
    const badge = $('#dock [data-pane="index"]');
    badge.innerHTML = `Questions<span class="badge" aria-label="${inc} included">${inc}</span>`;
  }
  function toggleAside(id) {
    const f = byId(id), n = idxOf(f) + 1;
    const snap = snapshot();
    const before = new Map($$(".tag").map(t => [t, t.getBoundingClientRect()]));
    const wasFocus = document.activeElement;
    if (state.off.has(id)) state.off.delete(id); else state.off.add(id);
    placeTags();
    if (!reduced()) $$(".tag").forEach(t => {
      const a = before.get(t), b = t.getBoundingClientRect();
      if (!a) return;
      const dx = a.left - b.left, dy = a.top - b.top;
      if (Math.abs(dx) + Math.abs(dy) > 1) t.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 380, easing: "cubic-bezier(.2,.7,.2,1)" });
    });
    if (wasFocus && wasFocus.isConnected) wasFocus.focus({ preventScroll: true });
    else { const t = $(`.tag[data-f="${id}"] .tag-tog`); if (t && t.offsetParent) t.focus({ preventScroll: true }); }
    const off = state.off.has(id);
    say(`Question ${n} ${off ? "set aside. The letter will skip it" : "included. The letter will ask it"}.`);
    letterChanged(snap, off ? `Question ${n} set aside.` : `Question ${n} included.`);
  }

  /* ───────── letter ───────── */
  const ta = $("#letter-text");
  const composed = () => H.composeLetter({ bill: bill(), findings: included(), sender: state.sender, options: state.opts });
  function autosize() { ta.style.height = "auto"; ta.style.height = Math.max(ta.scrollHeight + 4, 520) + "px"; }
  function snapshot() { return { off: [...state.off], opts: { ...state.opts }, sender: { ...state.sender }, text: state.text, dirty: state.dirty }; }
  function restore(s) {
    state.off = new Set(s.off); state.opts = { ...s.opts }; state.sender = { ...s.sender }; state.text = s.text; state.dirty = s.dirty;
    ta.value = state.text; $$(".opts input").forEach(i => { i.checked = !!state.opts[i.name]; }); $$(".from input").forEach(i => { i.value = state.sender[i.name] || ""; });
    placeTags(); setBar(null); autosize(); syncUndo();
  }
  function setBar(msg, actions = []) {
    const bar = $("#c-bar");
    if (!msg) { bar.hidden = true; return; }
    bar.hidden = false; $("#c-bar-msg").textContent = msg;
    const box = $(".c-bar-actions", bar); box.innerHTML = "";
    actions.forEach(([txt, fn, ghost]) => { const b = document.createElement("button"); b.type = "button"; b.className = "btn-sm" + (ghost ? " ghost" : ""); b.textContent = txt; b.addEventListener("click", fn); box.appendChild(b); });
  }
  function syncUndo() {
    $("#undo").hidden = !state.undo;
    $("#rebuild").hidden = !state.dirty;
  }
  function rebuildNow(snap, why) {
    state.undo = snap || snapshot();
    state.text = composed(); state.dirty = false; ta.value = state.text; autosize(); setBar(null); syncUndo();
    say(`${why ? why + " " : ""}Letter rebuilt from ${included().length} ${included().length === 1 ? "question" : "questions"}. Undo is available.`);
  }
  function letterChanged(snap, why) {
    if (!state.dirty) { rebuildNow(snap, why); return; }
    state.undo = snap; syncUndo();
    setBar(`${why || "Something changed."} You have edited this letter by hand. Update it from your questions, or keep your wording.`, [
      ["Update the letter", () => rebuildNow(snap, "Updated."), false],
      ["Keep my wording", () => { setBar(null); say("Your wording is kept."); }, true],
    ]);
    say(`${why || "Changed."} Your hand-edited letter was not changed. Choose to update it or keep your wording.`);
  }
  ta.addEventListener("input", () => { state.text = ta.value; state.dirty = ta.value !== composed(); if (!state.dirty) setBar(null); syncUndo(); autosize(); });
  $$(".opts input").forEach(i => i.addEventListener("change", () => {
    const snap = snapshot(); snap.opts[i.name] = !i.checked;
    state.opts[i.name] = i.checked; letterChanged(snap, "Option changed.");
  }));
  $$(".from input").forEach(i => i.addEventListener("input", () => {
    state.sender[i.name] = i.value;
    if (!state.dirty) { state.text = composed(); ta.value = state.text; autosize(); } else { setBar("Your details changed. You have edited this letter by hand.", [["Update the letter", () => rebuildNow(null, "Updated."), false], ["Keep my wording", () => setBar(null), true]]); }
  }));
  $("#undo").addEventListener("click", () => { if (!state.undo) return; const s = state.undo; state.undo = null; restore(s); say("Undone."); });
  $("#rebuild").addEventListener("click", () => {
    setBar("Replace your edits with a fresh letter built from the questions you've kept?", [["Replace my edits", () => rebuildNow(snapshot(), "Replaced."), false], ["Keep editing", () => setBar(null), true]]);
    $("#c-bar .btn-sm").focus();
  });
  $("#copy").addEventListener("click", async e => {
    const btn = e.currentTarget;
    try { await navigator.clipboard.writeText(ta.value); } catch { ta.focus(); ta.select(); try { document.execCommand("copy"); } catch {} ta.setSelectionRange(0, 0); }
    btn.textContent = "Copied"; say("Letter copied to the clipboard."); setTimeout(() => { btn.textContent = "Copy the letter"; }, 2000);
  });
  $("#download").addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob([ta.value], { type: "text/plain" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `letter-${bill().accountNumber}.txt` });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); say("Letter downloaded.");
  });

  /* ───────── events ───────── */
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-act], .line-btn, .ftag, .itabs [data-tab], #dock [data-pane], .samples [data-case], [data-own], #own-open, #own-go");
    if (!t) return;
    if (t.matches(".ftag")) return frontSelect(t.dataset.f);
    if (t.matches(".line-btn")) {
      const li = t.closest(".line"), more = $(".line-more", li), open = t.getAttribute("aria-expanded") !== "true";
      t.setAttribute("aria-expanded", String(open)); more.hidden = !open; state.openLine = open ? li.dataset.id : null; return;
    }
    if (t.matches(".samples [data-case]")) return setCase(t.dataset.case);
    if (t.matches("[data-own], #own-open")) return $("#own").showModal();
    if (t.matches("#own-go")) { $("#own").close(); return; }
    if (t.matches("#dock [data-pane]")) {
      if (t.tagName === "A") return;
      setTab(t.dataset.pane); return;
    }
    if (t.matches(".itabs [data-tab]")) {
      if (t.dataset.tab === "eob") { setTab(state.tab === "eob" ? "statement" : "eob"); return; }
      if (t.dataset.tab === "statement") { if (state.view === "review") { setTab("statement"); e.preventDefault(); } else state.tab = "statement"; return; }
      return;
    }
    const f = t.dataset.f || (t.closest("[data-f]") || {}).dataset?.f;
    switch (t.dataset.act) {
      case "select": return select(f);
      case "toggle": return toggleAside(f);
      case "chip": case "check": return select(f, { force: true });
      case "show": state.sel = f; setTab("statement", false); syncSel(false); requestAnimationFrame(() => scrollToEvidence(byId(f))); return;
      case "eobtab": return setTab("eob");
    }
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && state.sel && state.view === "review" && !$("#own").open && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) select(state.sel);
  });
  $("#own").addEventListener("click", e => { if (e.target === $("#own")) $("#own").close(); });
  $("#sample-select").addEventListener("change", e => setCase(e.target.value));

  function setTab(tab, doSync = true) {
    state.tab = tab;
    if (state.view !== "review") { location.hash = "#review"; return; }
    applyFolder();
    if (doSync) { syncSel(false); }
    if (tab === "eob" || tab === "index") say(tab === "eob" ? "Exhibit B, the EOB." : "Questions.");
    if (!wide()) window.scrollTo({ top: 0, behavior: "auto" });
  }
  function applyFolder() {
    const pane = state.view === "letter" ? "letter" : state.tab;
    $("#folder").dataset.pane = pane;
    $$("#dock [data-pane]").forEach(b => { const on = b.dataset.pane === pane; if (on) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current"); });
    $$(".itabs > *").forEach(b => {
      if (b.tagName === "A") { const on = (b.dataset.tab === "letter" && state.view === "letter") || (b.dataset.tab === "statement" && state.view === "review" && state.tab !== "eob"); if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); }
    });
    syncB();
  }

  function setCase(key) {
    if (!SO.cases[key] || key === state.key) { $$(".samples button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.case === state.key))); return; }
    state.key = key; state.sel = null; state.fsel = null; state.off = new Set(); state.openLine = null; state.undo = null; state.dirty = false; state.tab = "statement";
    try { history.replaceState(null, "", `?sample=${key}${location.hash}`); } catch {}
    buildAll();
    say(`Showing the ${key === "emergency-visit" ? "emergency visit" : "three-night stay"} example bill.`);
  }
  function buildAll() {
    $$(".samples button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.case === state.key)));
    $("#sample-select").value = state.key;
    buildFront(); buildFolder(); placeTags();
    state.text = composed(); ta.value = state.text; setBar(null); syncUndo();
    syncSel(false); applyFolder();
    $("#stage").classList.add("no-anim");
    if (state.stageOpened) $("#stage").classList.add("is-open", "tags-in");
    requestAnimationFrame(() => { layoutFtags(); autosize(); $("#stage").classList.remove("no-anim"); });
  }

  /* ───────── routing ───────── */
  function route() {
    const h = location.hash.replace("#", "");
    const view = ["front", "review", "letter"].includes(h) ? h : "front";
    const apply = () => {
      const changed = state.view !== view;
      state.view = view;
      document.body.dataset.view = view;
      $("#v-front").hidden = view !== "front";
      $("#v-folder").hidden = view === "front";
      $$(".views a").forEach(a => { if (a.dataset.nav === view) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
      document.title = { front: "Second Opinion · The annotated case file", review: "Review · Second Opinion", letter: "Letter · Second Opinion" }[view];
      if (view !== "front") { if (view === "letter") state.tab = state.tab === "index" ? "index" : "statement"; placeTags(); applyFolder(); syncSel(false); if (view === "letter") autosize(); }
      if (view === "front") { openStage(state.firstRoute); requestAnimationFrame(layoutFtags); }
      if (changed || state.firstRoute) {
        window.scrollTo(0, 0);
        if (!state.firstRoute) (view === "front" ? $("#h-front") : $("#fh1")).focus({ preventScroll: true });
      }
      state.firstRoute = false;
    };
    if (document.startViewTransition && !reduced() && state.view !== view && !state.firstRoute) document.startViewTransition(apply); else apply();
  }
  window.addEventListener("hashchange", route);
  let rz; window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { layoutFtags(); if (state.view !== "front") { autosize(); const f = state.sel && byId(state.sel); placeNote(f); drawBracket(f); } }, 120); });

  buildAll();
  route();
})();
