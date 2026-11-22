/* Second Opinion · Concept B · The Financial Examination Desk
   Vanilla JS. Data: window.SO (case.js), helpers: window.SOH. Every figure is derived from the case. */
(() => {
  'use strict';
  const SO = window.SO, H = window.SOH;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = H.money;
  const LV = SO.levelLabel;
  const reduce = () => H.reducedMotion();
  const behavior = () => (reduce() ? 'auto' : 'smooth');
  const stacked = () => matchMedia('(max-width: 1079px)').matches;
  const live = msg => { const e = $('#live'); e.textContent = ''; setTimeout(() => { e.textContent = msg; }, 30); };

  const GL = {
    discrepancy: '<svg class="gl" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M6 1.2 11.2 10.6H.8z" fill="currentColor"/></svg>',
    ask: '<svg class="gl" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><circle cx="6" cy="6" r="4.6" fill="currentColor"/></svg>',
    detail: '<svg class="gl" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><circle cx="6" cy="6" r="3.9" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    clear: '<svg class="gl" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M2 6.4 4.9 9.2 10 3.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    flagged: '<svg class="gl" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M6 1 11 6 6 11 1 6z" fill="currentColor"/></svg>',
    'not-run': '<svg class="gl" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M2.5 6h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  };
  const STATUS = { clear: 'Clear', flagged: 'Flagged', 'not-run': 'Not run' };
  const OPTS = [
    ['requestItemized', 'Ask for a complete itemized statement'],
    ['requestHold', 'Ask them to hold the account and not send it to collections'],
    ['askFinancialAssistance', 'Ask about their financial assistance policy'],
  ];
  const REASON = { 'room-nights': 'how many days were counted', duplicate: 'a repeated line', 'outside-stay': 'its date', itemize: 'what its description covers', 'line-math': 'its arithmetic', 'bill-total': 'the bill total' };

  const S = {
    id: 'emergency-visit', view: null, sel: null, open: null, aside: new Set(),
    opts: { requestItemized: true, requestHold: true, askFinancialAssistance: false },
    sender: { name: 'Jordan Avery', address: '', phone: '', email: '' },
    text: '', last: '', pending: false, undo: null, drawFront: true,
  };
  let D = {};

  /* ---------- derive everything from the case ---------- */
  function derive() {
    const c = SO.cases[S.id], b = c.bill, a = c.analysis;
    const findings = a.findings.map((f, i) => ({ ...f, n: i + 1 }));
    const refs = H.refsByLine(a.findings);
    const lineById = Object.fromEntries(b.lineItems.map(l => [l.id, l]));
    const notItemized = Math.max(0, b.statedTotal - a.lineSum);
    const total = Math.max(b.statedTotal, a.lineSum);
    const largest = b.lineItems.reduce((m, l) => (l.amount > m.amount ? l : m));
    const adj = b.statedTotal - b.amountDue;
    let cmp = null;
    if (b.eobResponsibility != null) cmp = { kind: 'eob', base: b.amountDue, value: b.eobResponsibility, name: 'Your EOB says you owe', sub: 'Your share, as your insurer states it', rule: 'eob-balance' };
    else if (b.goodFaithEstimate != null) cmp = { kind: 'gfe', base: b.statedTotal, value: b.goodFaithEstimate, name: 'Your Good Faith Estimate', sub: 'The estimate you were given before care', rule: 'good-faith-estimate' };
    if (cmp) cmp.gap = cmp.base - cmp.value;
    let acc = 0;
    const segs = b.lineItems.map(l => { const s = { id: l.id, from: acc, w: l.amount }; acc += l.amount; return s; });
    if (notItemized) segs.push({ id: '__gap', from: acc, w: notItemized, gap: true }), (acc += notItemized);
    D = { c, b, a, findings, refs, lineById, notItemized, total, largest, adj, cmp, segs, billFinding: findings.find(f => f.rule === 'bill-total') };

    // Reconciliation checks: every figure on screen has to tie back to the case.
    console.assert(acc === total, 'strip segments must sum to the total', acc, total);
    console.assert(b.lineItems.reduce((s, l) => s + l.amount, 0) === a.lineSum, 'line sum matches engine lineSum');
    console.assert(b.lineItems.length === a.lineCount, 'line count matches engine');
    console.assert(adj === b.statedTotal - b.amountDue, 'adjustments = stated - due');
    if (cmp) {
      const f = findings.find(x => x.rule === cmp.rule);
      console.assert(f && f.amountInQuestion === Math.abs(cmp.gap), 'bridge gap equals the finding amount', cmp.gap, f && f.amountInQuestion);
    }
    const mathIds = new Set(findings.filter(f => f.rule === 'line-math').flatMap(f => f.lineIds));
    b.lineItems.forEach(l => { if (l.unitPrice != null) console.assert((l.quantity * l.unitPrice === l.amount) === !mathIds.has(l.id), 'line math agrees with engine for', l.id); });
    if (!notItemized) console.assert(a.lineSum === b.statedTotal, 'lines sum to stated total when no gap finding');
    else console.assert(D.billFinding && D.billFinding.amountInQuestion === notItemized, 'not-itemized gap equals bill-total finding');
  }

  const incl = () => D.findings.filter(f => !S.aside.has(f.n));
  const lvl = f => `<span class="lv lv-${f.level}">${GL[f.level]}<span>${esc(LV[f.level])}</span></span>`;
  const amtOrDash = f => (f.amountInQuestion == null ? '<span class="zero" aria-hidden="true">—</span><span class="sr">no amount in question</span>' : money(f.amountInQuestion));
  const lineName = l => l.plainName || l.description;

  /* ---------- bridge (SVG bars inside semantic rows) ---------- */
  function bridgeHTML() {
    const { b, cmp, adj } = D;
    const max = Math.max(b.statedTotal, b.amountDue, cmp ? cmp.value : 0, 1);
    const X = v => +(v / max * 1000).toFixed(2);
    const svg = (inner, h = 36) => `<svg class="bsvg" viewBox="0 0 1000 ${h}" preserveAspectRatio="none" aria-hidden="true" focusable="false" style="height:${h}px">${inner}</svg>`;
    const bar = (cls, a, z) => `<rect class="bar ${cls}" x="${X(a)}" y="6" width="${Math.max(0, X(z) - X(a))}" height="22"/>`;
    const row = (i, key, label, sub, graphic, fig, extra = '') => `<li class="brow" data-k="${key}" style="--i:${i}"><div class="bl"><span class="bn">${label}</span><span class="bs">${sub}</span></div><div class="bt">${graphic}${extra}</div><div class="bf">${fig}</div></li>`;
    const rows = [];
    rows.push(row(0, 'charges', 'Charges on bill', 'The total printed on the statement', svg(bar('ink', 0, b.statedTotal)), money(b.statedTotal)));
    rows.push(row(1, 'adj', 'Payments &amp; adjustments shown on bill', adj === 0 ? 'None shown on this bill' : 'The difference between two numbers on your bill; not itemized',
      svg(adj === 0 ? `<rect class="bar none" x="${X(b.statedTotal) - 1}" y="6" width="1" height="22"/>` : bar('grey', b.amountDue, b.statedTotal)), adj === 0 ? '<span class="zero">$0.00</span>' : money(-adj)));
    rows.push(row(2, 'due', 'Bill asks you to pay', 'Amount due', svg(bar('ink', 0, b.amountDue)), money(b.amountDue)));
    if (cmp) {
      const lo = Math.min(cmp.base, cmp.value), hi = Math.max(cmp.base, cmp.value);
      const g = `<g class="gap"><rect class="gaprect" x="${X(lo)}" y="6" width="${X(hi) - X(lo)}" height="22"/><path class="brace" d="M${X(lo)} 31v6H${X(hi)}v-6" vector-effect="non-scaling-stroke"/></g>`;
      const mid = (lo + hi) / 2 / max * 100;
      rows.push(row(3, 'cmp', cmp.name, cmp.sub, svg(bar('blue', 0, cmp.value) + g, 44), money(cmp.value),
        `<span class="bgl" style="left:${mid.toFixed(2)}%">${money(cmp.gap, { sign: true })}</span>`));
    } else {
      rows.push(row(3, 'cmp', 'Add your EOB to compare', 'Your insurer’s statement of what you owe', svg(`<rect class="bar empty" x="0.5" y="6.5" width="999" height="21" vector-effect="non-scaling-stroke"/>`), '<span class="zero">—</span>'));
    }
    let head = '';
    if (cmp) {
      const more = cmp.gap >= 0;
      head = `<p class="gapline"><span class="fig tnum">${money(Math.abs(cmp.gap))}</span><span class="gaptext">${more ? 'more' : 'less'} than ${cmp.kind === 'eob' ? 'your EOB says you owe' : 'your Good Faith Estimate'}. Both numbers are printed on your own documents. The difference is a question to ask, not a conclusion.</span></p>`;
    } else head = `<p class="gapline"><span class="gaptext">No second figure to compare yet. Add your EOB to see the bill set against it.</span></p>`;
    return `<div class="bridge${cmp ? '' : ' no-cmp'}">${head}<ol class="brows" aria-label="How the bill reconciles">${rows.join('')}</ol></div>`;
  }

  /* ---------- bill strip ---------- */
  function captionText() {
    const { largest, refs, findings } = D;
    const name = esc(lineName(largest));
    const r = refs[largest.id];
    if (!r) return `Width shows each line’s share of the charges. The largest line, ${name}, raised no question: price alone is never a reason to ask.`;
    const f = findings[r[0].n - 1];
    return `Width shows each line’s share of the charges. The largest line, ${name}, is in question ${r[0].n}, which is about ${REASON[f.rule] || 'something other than its price'}, not its price.`;
  }
  let uid = 0;
  function stripHTML() {
    const { segs, total, b, refs, lineById } = D;
    const pid = 'hatch' + (++uid);
    const rects = segs.map((s, i) => {
      const x = (s.from / total * 1000).toFixed(3), w = (s.w / total * 1000).toFixed(3);
      const cls = s.gap ? 'gapseg' : i % 2 ? 'b' : 'a';
      const tick = !s.gap && refs[s.id] || s.gap ? `<rect class="tick" data-id="${s.id}" x="${x}" y="0" width="${w}" height="4"/>` : '';
      return `<rect class="seg-r ${cls}" data-id="${s.id}" x="${x}" y="8" width="${w}" height="44"${s.gap ? ` style="fill:url(#${pid})"` : ''}/>${tick}`;
    }).join('');
    const btns = segs.map((s, i) => {
      const l = lineById[s.id];
      const qs = s.gap ? [D.billFinding] : (refs[s.id] || []).map(r => D.findings[r.n - 1]);
      const label = s.gap ? `Not in the line items, ${money(s.w)}${qs[0] ? `, question ${qs[0].n}` : ''}` : `${H.date(l.date)}, ${lineName(l)}, ${money(l.amount)}${qs.length ? `, question ${qs.map(q => q.n).join(' and ')}` : ', no question'}`;
      return `<button type="button" class="segbtn" data-id="${s.id}" tabindex="${i ? -1 : 0}" aria-label="${esc(label)}" style="left:${(s.from / total * 100).toFixed(4)}%;width:${(s.w / total * 100).toFixed(4)}%"></button>`;
    }).join('');
    const unit = D.notItemized ? `<p class="strip-note">Lines add to ${money(D.a.lineSum)}; the bill says ${money(b.statedTotal)}. The hatched part is the ${money(D.notItemized)} that no line explains.</p>` : '';
    return `<div class="strip" data-strip>
      <div class="ticks" aria-hidden="true"></div>
      <div class="strip-bar">
        <svg viewBox="0 0 1000 56" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <defs><pattern id="${pid}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#fff"/><rect width="2.4" height="6" fill="#8A8D91"/></pattern></defs>
          ${rects}
        </svg>
        <div class="segs" role="group" aria-label="Bill strip: one segment per line, width shows its share of the charges. Arrow keys move between lines.">${btns}</div>
      </div>
      <p class="strip-read" data-read aria-live="off"></p>
      <p class="caption">${captionText()}</p>${unit}
    </div>`;
  }
  const DEFAULT_READ = 'Hover, focus or tap a segment to read the line.';
  function readHTML(id) {
    const s = D.segs.find(x => x.id === id);
    if (!s) return DEFAULT_READ;
    const share = (s.w / D.total * 100).toFixed(1);
    if (s.gap) return `<strong>Not in the line items</strong> <span class="tnum">${money(s.w)}</span> · ${share}% of the charges · question ${D.billFinding ? D.billFinding.n : ''}`;
    const l = D.lineById[id], r = D.refs[id];
    return `<strong>${esc(lineName(l))}</strong> <span class="mono">${esc(l.code)}</span> · ${H.date(l.date)} · <span class="tnum">${money(l.amount)}</span> · ${share}% of the charges · ${r ? 'question ' + r.map(x => x.n).join(' and ') : 'no question'}`;
  }
  function layoutTicks(root) {
    $$('[data-strip]', root).forEach(strip => {
      const wrap = $('.ticks', strip), W = wrap.clientWidth;
      if (!W) return;
      wrap.innerHTML = '';
      const groups = [];
      D.segs.forEach(s => {
        const rs = s.gap ? (D.billFinding ? [{ n: D.billFinding.n }] : []) : (D.refs[s.id] || []);
        if (!rs.length) return;
        const key = rs.map(r => r.n).join(',');
        const x0 = s.from / D.total * W, x1 = (s.from + s.w) / D.total * W, last = groups[groups.length - 1];
        if (last && last.key === key && Math.abs(last.x1 - x0) < 1.5) last.x1 = x1; else groups.push({ key, ns: rs.map(r => r.n), x0, x1 });
      });
      const edge = [-99, -99];
      groups.forEach(g => {
        const cx = (g.x0 + g.x1) / 2, el = document.createElement('span');
        el.className = 'tk'; el.textContent = g.ns.join(', '); el.dataset.ns = g.ns.join(',');
        wrap.appendChild(el);
        const w = el.offsetWidth;
        let left = Math.min(Math.max(cx - w / 2, 0), W - w), lv = 0;
        if (left < edge[0] + 5) { lv = 1; if (left < edge[1] + 5) { lv = 0; left = edge[0] + 5; } }
        edge[lv] = left + w;
        el.style.left = left + 'px'; el.style.setProperty('--lv', lv); el.style.setProperty('--lx', Math.min(Math.max(cx - left, 1), w - 1) + 'px');
        el.classList.toggle('aside', g.ns.every(n => S.aside.has(n)));
      });
    });
  }

  /* ---------- ledger ---------- */
  const chip = r => { const f = D.findings[r.n - 1]; return `<button type="button" class="chip lv-${f.level}${S.aside.has(r.n) ? ' aside' : ''}" data-q="${r.n}" aria-label="Question ${r.n}: ${esc(LV[f.level])}${S.aside.has(r.n) ? ', set aside' : ''}. Select it."><span class="chip-i">${GL[f.level]}<span class="tnum">${r.n}</span></span></button>`; };
  function ledgerHTML() {
    const rows = D.b.lineItems.map(l => {
      const rs = D.refs[l.id] || [];
      const multi = l.quantity > 1 && l.unitPrice != null;
      const qu = l.unitPrice == null ? '<span class="zero">—</span>' : `${l.quantity} × ${money(l.unitPrice)}`;
      const detQ = rs.length ? rs.map(r => { const f = D.findings[r.n - 1]; return `<li><button type="button" class="qlink lv-${f.level}" data-pick="${r.n}">${GL[f.level]}<span class="tnum">Question ${r.n}</span><span class="qlink-t">${esc(LV[f.level])}: ${esc(f.title)}</span></button></li>`; }).join('') : '';
      return `<tr class="ln" data-id="${l.id}">
        <td class="c-date">${H.date(l.date)}</td>
        <td class="c-code mono">${esc(l.code)}</td>
        <td class="c-item"><button type="button" class="ln-btn" aria-expanded="false" aria-controls="d-${l.id}"><span class="pn">${esc(lineName(l))}</span><span class="desc mono" data-ui>${esc(l.description)}</span></button></td>
        <td class="c-qty${multi ? ' multi' : ''} tnum">${qu}</td>
        <td class="c-amt tnum">${money(l.amount)}</td>
        <td class="c-q">${rs.map(chip).join('')}</td>
      </tr>
      <tr class="detail" id="d-${l.id}" hidden><td colspan="6"><div class="dp">
        <div class="dp-main"><h3>${esc(lineName(l))}</h3><p>${esc(l.codeNote || 'No note for this code.')}</p>
          <dl class="mini"><div><dt>Code</dt><dd><span class="mono">${esc(l.code)}</span> · ${esc(l.codeSystem)}</dd></div><div><dt>As printed</dt><dd class="mono">${esc(l.description)}</dd></div><div><dt>Date</dt><dd>${H.longDate(l.date)}</dd></div><div><dt>Quantity × price</dt><dd class="tnum">${l.unitPrice == null ? `${l.quantity}, no unit price printed` : `${l.quantity} × ${money(l.unitPrice)}`}</dd></div></dl>
        </div>
        <div class="dp-q"><h4>${rs.length ? 'Questions on this line' : 'No question on this line'}</h4>
          ${rs.length ? `<ul>${detQ}</ul>` : `<p>${l.id === D.largest.id ? 'This is the largest line on the bill. Price alone is never a reason to ask, so it raised nothing.' : 'Nothing on this line disagrees with the rest of the bill.'}</p>`}
          <button type="button" class="btn quiet sm ln-close">Close</button></div>
      </div></td></tr>`;
    }).join('');
    return `<div class="ledger-wrap"><table class="ledger"><caption class="sr">Every line on the bill. Select a line to read what it is.</caption>
      <thead><tr><th scope="col">Date</th><th scope="col">Code</th><th scope="col">What it is</th><th scope="col" class="r">Quantity × price</th><th scope="col" class="r">Amount</th><th scope="col" class="r">Questions</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><th scope="row" colspan="4">${D.b.lineItems.length} lines add to</th><td class="c-amt tnum">${money(D.a.lineSum)}</td><td></td></tr></tfoot></table></div>`;
  }

  /* ---------- questions rail ---------- */
  function questionsHTML() {
    return D.findings.map(f => {
      const lines = f.lineIds.map(id => D.lineById[id]);
      const evidence = lines.length
        ? `<h4>Lines it points to</h4><ul class="ev">${lines.map(l => `<li><span class="tnum">${H.date(l.date)}</span><span>${esc(lineName(l))} <span class="mono">${esc(l.code)}</span></span><span class="tnum">${money(l.amount)}</span></li>`).join('')}</ul>`
        : `<h4>Where to look</h4><p class="ev-note">This compares two figures on the bill, so no single line is marked. See the bars at the top of the page.</p>`;
      return `<li class="q lv-${f.level}" data-n="${f.n}">
        <button type="button" class="q-head" data-q="${f.n}" aria-expanded="false" aria-controls="qb${f.n}">
          <span class="q-n tnum">${f.n}</span>
          <span class="q-lvl">${lvl(f)}<span class="q-set">Set aside</span></span>
          <span class="q-title">${esc(f.title)}</span>
          <span class="q-amt tnum">${amtOrDash(f)}</span>
        </button>
        <div class="q-body" id="qb${f.n}" hidden>
          <div class="pair">
            <div><h4>Why this is worth a question</h4><p>${esc(f.why)}</p></div>
            <div><h4>What may explain it</h4><p>${esc(f.innocent)}</p></div>
          </div>
          <dl class="facts">${f.facts.map(x => `<div><dt>${esc(x.label)}</dt><dd class="tnum">${esc(x.value)}</dd></div>`).join('')}</dl>
          ${evidence}
          <h4>What the letter will ask</h4><blockquote class="ask">${esc(f.ask)}</blockquote>
          ${f.next ? `<h4>What else you can do</h4><p>${esc(f.next)}</p>` : ''}
          <div class="q-act">
            <button type="button" class="btn quiet sm" data-aside="${f.n}" aria-pressed="false"><span class="lbl">Set aside</span></button>
            <button type="button" class="btn quiet sm" data-show="${f.n}">${f.lineIds.length ? 'Show in the ledger' : 'Show in the bars'}</button>
          </div>
        </div>
      </li>`;
    }).join('');
  }

  /* ---------- register ---------- */
  function registerHTML(links) {
    const byRule = {};
    D.findings.forEach(f => (byRule[f.rule] ||= []).push(f.n));
    return `<table class="reg"><caption class="sr">What was checked</caption>
      <thead><tr><th scope="col">Check</th><th scope="col">Status</th><th scope="col">Detail</th></tr></thead><tbody>
      ${D.a.checks.map(k => `<tr class="st-${k.status}"><th scope="row">${esc(k.label)}</th><td><span class="stat">${GL[k.status]}<span>${STATUS[k.status]}</span></span></td><td>${esc(k.detail)}${links && byRule[k.rule] ? ` <span class="rlinks">${byRule[k.rule].map(n => `<button type="button" class="rlink" data-pick="${n}">Question ${n}</button>`).join(' ')}</span>` : ''}</td></tr>`).join('')}
      </tbody></table>`;
  }

  /* ---------- views ---------- */
  function renderFront() {
    const { b, findings } = D;
    $('#view-front').innerHTML = `
    <div class="front">
      <div class="hero">
        <div class="hero-copy">
          <h1 id="h-front" tabindex="-1">Check the bill against itself.</h1>
          <p class="lede">Second Opinion lays the numbers on your bill and your insurance paperwork side by side, so you can see where they disagree and ask about it calmly.</p>
          <div class="actions">
            <a class="btn primary" href="#review">Open the example bill</a>
            <button type="button" class="btn quiet" data-own>Use your own bill</button>
          </div>
          <dl class="trio">
            <div><dt>lines read</dt><dd class="tnum">${b.lineItems.length}</dd></div>
            <div><dt>${findings.length === 1 ? 'question' : 'questions'}</dt><dd class="tnum">${findings.length}</dd></div>
            <div><dt>outside prices</dt><dd class="tnum">0</dd></div>
          </dl>
        </div>
        <figure class="hero-bridge${S.drawFront ? ' draw' : ''}" aria-labelledby="fig-b">
          <figcaption id="fig-b" class="figcap">${esc(b.provider)}, account ${esc(b.accountNumber)}</figcaption>
          ${bridgeHTML()}
        </figure>
      </div>

      <section class="band" aria-labelledby="h-strip-f">
        <div class="band-head"><h2 id="h-strip-f">Every line, drawn to scale</h2><p>Nothing on this bill is called wrong because of what it costs.</p></div>
        ${stripHTML()}
      </section>

      <section class="band" aria-labelledby="h-reg-f">
        <div class="band-head"><h2 id="h-reg-f">${D.a.checks.length} checks, all on the bill’s own numbers</h2><p>Each check says in words whether it is clear, flagged or not run.</p></div>
        ${registerHTML(false)}
      </section>

      <section class="band rules" aria-labelledby="h-rules">
        <div class="band-head"><h2 id="h-rules">How it behaves</h2></div>
        <dl class="rule-list">
          <div><dt>It does not judge prices.</dt><dd>A high price is never a finding. There are no reference prices and no savings claims, so there is nothing to compare a charge against except your own paperwork.</dd></div>
          <div><dt>It shows both sides.</dt><dd>Every question comes with the reason it is worth asking and the ordinary explanation that may already answer it.</dd></div>
          <div><dt>It asks; it does not accuse.</dt><dd>The letter is plain, editable and polite. You decide which questions go in it.</dd></div>
        </dl>
        <div class="actions end">
          <a class="btn primary" href="#review">Open the example bill</a>
          <button type="button" class="btn quiet" data-own>Use your own bill</button>
        </div>
      </section>
      <p class="foot">Synthetic example: fictional hospital, account and prices. Second Opinion reads CSV files and typed-in lines. It does not read PDFs or photos.</p>
    </div>`;
  }

  function renderReview() {
    const { b } = D;
    const dates = b.admitDate && b.dischargeDate && b.admitDate !== b.dischargeDate ? `${H.date(b.admitDate)} to ${H.date(b.dischargeDate)}, ${b.dischargeDate.slice(0, 4)}` : H.longDate(b.admitDate);
    $('#view-review').innerHTML = `
    <div class="review">
      <header class="vhead">
        <div>
          <h1 id="h-review" tabindex="-1">${esc(b.provider)}</h1>
          <p class="meta">Account ${esc(b.accountNumber)} · ${b.careSetting === 'inpatient' ? 'Stay' : 'Visit'} ${esc(dates)} · Statement dated ${H.longDate(b.statementDate)} · ${b.lineItems.length} lines</p>
        </div>
        <div class="vhead-act"><p class="count"><span class="inc-count"></span> in your letter</p><a class="btn primary" href="#letter">Write the letter</a></div>
      </header>

      <section class="blk" aria-labelledby="h-bridge"><h2 id="h-bridge" class="h2">How the totals meet</h2>${bridgeHTML()}</section>
      <section class="blk" aria-labelledby="h-strip"><h2 id="h-strip" class="h2">Every line, drawn to scale</h2>${stripHTML()}</section>

      <div class="grid">
        <section class="ledger-col" aria-labelledby="h-ledger"><h2 id="h-ledger" class="h2">Line by line</h2>${ledgerHTML()}</section>
        <section class="rail" id="rail" aria-labelledby="h-q">
          <div class="rail-head"><h2 id="h-q" class="h2">Questions worth asking</h2><p class="hint">Amounts can overlap, so they are never added together. Select a question to mark its lines.</p></div>
          <ol class="qs">${questionsHTML()}</ol>
        </section>
      </div>

      <section class="blk" aria-labelledby="h-reg"><h2 id="h-reg" class="h2">What was checked</h2>${registerHTML(true)}</section>
    </div>`;
  }

  function renderLetter() {
    const { findings } = D;
    $('#view-letter').innerHTML = `
    <div class="letter">
      <header class="vhead">
        <div><h1 id="h-letter" tabindex="-1">Your letter</h1><p class="meta">It asks questions and nothing else. Edit anything; the words are yours.</p></div>
        <div class="vhead-act"><a class="btn quiet" href="#review">Back to the review</a></div>
      </header>
      <div class="lgrid">
        <div class="lrail">
          <fieldset class="lfs"><legend class="h2">Questions to include</legend>
            <p class="hint"><span class="inc-count"></span>. Amounts can overlap, so they are not added together.</p>
            <ul class="lchecks">${findings.map(f => `<li><label class="lcheck lv-${f.level}"><input type="checkbox" data-incl="${f.n}" checked><span class="box" aria-hidden="true"></span><span class="lc-t"><span class="lc-top">${lvl(f)}</span><span class="lc-title">${f.n}. ${esc(f.title)}</span></span><span class="lc-amt tnum">${amtOrDash(f)}</span></label></li>`).join('')}</ul>
          </fieldset>
          <fieldset class="lfs"><legend class="h2">Also ask for</legend>
            <ul class="lchecks plain">${OPTS.map(([k, t]) => `<li><label class="lcheck"><input type="checkbox" data-opt="${k}"${S.opts[k] ? ' checked' : ''}><span class="box" aria-hidden="true"></span><span class="lc-t"><span class="lc-title">${t}</span></span></label></li>`).join('')}</ul>
          </fieldset>
          <fieldset class="lfs"><legend class="h2">Your details</legend>
            <div class="fields">
              <label>Your name<input data-sender="name" autocomplete="name" value="${esc(S.sender.name)}"></label>
              <label>Mailing address<textarea data-sender="address" rows="2" autocomplete="street-address">${esc(S.sender.address)}</textarea></label>
              <label>Phone<input data-sender="phone" type="tel" autocomplete="tel" value="${esc(S.sender.phone)}"></label>
              <label>Email<input data-sender="email" type="email" autocomplete="email" value="${esc(S.sender.email)}"></label>
            </div>
          </fieldset>
        </div>
        <div class="lsheet">
          <div class="lbar">
            <div class="lbar-l"><button type="button" class="btn primary sm" data-copy>Copy letter</button><button type="button" class="btn quiet sm" data-dl>Download .txt</button></div>
            <div class="lbar-r"><button type="button" class="btn quiet sm" data-undo hidden>Undo last change</button></div>
          </div>
          <div class="lnotice" data-notice hidden></div>
          <label class="sr" for="lt">Letter text, editable</label>
          <textarea id="lt" class="paper" spellcheck="true" rows="20"></textarea>
        </div>
      </div>
    </div>`;
    syncLetterView();
  }

  /* ---------- letter state ---------- */
  const compose = () => H.composeLetter({ bill: D.b, findings: incl(), sender: S.sender, options: S.opts });
  const dirty = () => S.text !== S.last;
  function snapshot() { S.undo = { aside: new Set(S.aside), opts: { ...S.opts }, text: S.text, last: S.last, pending: S.pending }; }
  function sync(announce) {
    const composed = compose();
    if (!dirty()) { S.text = S.last = composed; S.pending = false; if (announce) live(`Letter rebuilt from ${incl().length} ${incl().length === 1 ? 'question' : 'questions'}.`); }
    else { S.pending = true; if (announce) live('Your letter has edits. Choose whether to rebuild it with this change.'); }
  }
  function autosize() { const t = $('#lt'); if (!t) return; t.style.height = 'auto'; t.style.height = t.scrollHeight + 2 + 'px'; }
  function syncLetterView() {
    const t = $('#lt'); if (!t) return;
    if (t.value !== S.text) t.value = S.text;
    autosize();
    $$('[data-incl]').forEach(i => { i.checked = !S.aside.has(+i.dataset.incl); });
    $$('[data-opt]').forEach(i => { i.checked = !!S.opts[i.dataset.opt]; });
    const u = $('[data-undo]'); if (u) u.hidden = !S.undo;
    const n = $('[data-notice]');
    if (n) {
      if (S.pending) { n.hidden = false; n.innerHTML = `<p>You have edited this letter, so your latest change is not in it yet.</p><div><button type="button" class="btn primary sm" data-rebuild>Rebuild the letter</button><button type="button" class="btn quiet sm" data-keep>Keep my text</button></div>`; }
      else n.hidden = true;
    }
  }

  /* ---------- selection, aside, counts ---------- */
  function applyAside() {
    const k = incl().length, tot = D.findings.length;
    $$('.inc-count').forEach(e => { e.textContent = `${k} of ${tot} ${tot === 1 ? 'question' : 'questions'}`; });
    D.findings.forEach(f => {
      const off = S.aside.has(f.n);
      const li = $(`.q[data-n="${f.n}"]`); if (li) li.classList.toggle('is-aside', off);
      const b = $(`[data-aside="${f.n}"]`); if (b) { b.setAttribute('aria-pressed', off); $('.lbl', b).textContent = off ? 'Include again' : 'Set aside'; }
      $$(`.chip[data-q="${f.n}"]`).forEach(c => c.classList.toggle('aside', off));
    });
    $$('.tick').forEach(t => {
      const id = t.dataset.id, ns = id === '__gap' ? [D.billFinding && D.billFinding.n] : (D.refs[id] || []).map(r => r.n);
      t.classList.toggle('aside', ns.length > 0 && ns.every(n => S.aside.has(n)));
    });
    layoutTicks(document);
    syncLetterView();
  }
  function toggleAside(n) {
    snapshot();
    const off = !S.aside.has(n);
    off ? S.aside.add(n) : S.aside.delete(n);
    applyAside(); sync(false);
    syncLetterView();
    live(`Question ${n} ${off ? 'set aside. It will not be in your letter' : 'included again'}. ${incl().length} of ${D.findings.length} questions in your letter.`);
  }

  function applySelection() {
    const f = S.sel ? D.findings[S.sel - 1] : null;
    $$('.q').forEach(li => {
      const on = f && +li.dataset.n === f.n;
      li.classList.toggle('is-open', !!on);
      $('.q-head', li).setAttribute('aria-expanded', !!on);
      $('.q-body', li).hidden = !on;
    });
    const ids = new Set(f ? f.lineIds : []);
    $$('tr.ln').forEach(r => r.classList.toggle('is-evidence', ids.has(r.dataset.id)));
    const gapSel = f && !f.lineIds.length;
    $$('.seg-r').forEach(r => r.classList.toggle('sel', ids.has(r.dataset.id) || (gapSel && r.dataset.id === '__gap' && f.rule === 'bill-total')));
    $$('.bridge').forEach(br => br.classList.toggle('gap-active', !!(f && D.cmp && f.rule === D.cmp.rule)));
    $$('.hero-bridge .bridge').forEach(br => br.classList.remove('gap-active'));
    const dock = $('#dock');
    if (f && S.view === 'review') {
      dock.hidden = false;
      dock.innerHTML = `<div class="dock-t"><span class="tnum">Question ${f.n}</span> ${lvl(f)}<span class="dock-title">${esc(f.title)}</span></div><div class="dock-a"><button type="button" class="btn quiet sm" data-back="${f.n}">Back to question</button><button type="button" class="btn primary sm" data-clear aria-label="Clear selection">Clear</button></div>`;
    } else { dock.hidden = true; dock.innerHTML = ''; }
  }
  function scrollToEvidence(n) {
    const f = D.findings[n - 1];
    const target = f.lineIds.length ? $(`tr.ln[data-id="${f.lineIds[0]}"]`) : $('#view-review .bridge');
    if (target) target.scrollIntoView({ block: f.lineIds.length ? 'center' : 'start', behavior: behavior() });
  }
  function selectQ(n, { toggle = false, scroll = false } = {}) {
    S.sel = toggle && S.sel === n ? null : n;
    applySelection();
    if (S.sel) {
      const it = $(`.q[data-n="${S.sel}"]`);
      if (it && !stacked()) { const rail = $('#rail'); const top = it.offsetTop; rail.scrollTo({ top: Math.max(0, top - 56), behavior: behavior() }); }
      if (scroll) scrollToEvidence(S.sel);
      const f = D.findings[S.sel - 1];
      live(`Question ${f.n} selected, ${LV[f.level]}. ${f.lineIds.length ? f.lineIds.length + (f.lineIds.length === 1 ? ' line is' : ' lines are') + ' marked in the ledger.' : 'It compares two figures on the bill.'}`);
    } else live('Selection cleared.');
  }

  /* ---------- opening a line (view transition from row to panel) ---------- */
  function toggleLine(id, { scroll = false } = {}) {
    const prev = S.open, next = prev === id ? null : id;
    const row = i => $(`tr.ln[data-id="${i}"]`), pan = i => $(`#d-${i} .dp`);
    const apply = () => {
      if (prev) { row(prev).classList.remove('is-open'); $(`#d-${prev}`).hidden = true; $('.ln-btn', row(prev)).setAttribute('aria-expanded', 'false'); }
      if (next) { row(next).classList.add('is-open'); $(`#d-${next}`).hidden = false; $('.ln-btn', row(next)).setAttribute('aria-expanded', 'true'); }
      S.open = next;
    };
    const single = !!(prev) !== !!(next);
    if (document.startViewTransition && !reduce() && single && !scroll) {
      const src = next ? row(next) : pan(prev);
      src.style.viewTransitionName = 'ln';
      const t = document.startViewTransition(() => { src.style.viewTransitionName = ''; apply(); (next ? pan(next) : row(prev)).style.viewTransitionName = 'ln'; });
      t.finished.finally(() => $$('[style*="view-transition-name"]').forEach(e => { e.style.viewTransitionName = ''; }));
    } else apply();
    if (scroll && next) row(next).scrollIntoView({ block: 'center', behavior: behavior() });
    if (next) live(`${lineName(D.lineById[next])} opened.`); else live('Line closed.');
  }

  /* ---------- strip interaction ---------- */
  function idAtX(strip, x) {
    const r = $('.strip-bar', strip).getBoundingClientRect();
    const v = (x - r.left) / r.width * D.total;
    const s = D.segs.find(q => v >= q.from && v < q.from + q.w) || D.segs[D.segs.length - 1];
    return s.id;
  }
  function hot(strip, id) {
    $$('.seg-r', strip).forEach(r => r.classList.toggle('hot', r.dataset.id === id));
    $('[data-read]', strip).innerHTML = id ? readHTML(id) : DEFAULT_READ;
  }

  /* ---------- letter actions ---------- */
  function copyText() {
    const t = $('#lt'), txt = t.value;
    const done = ok => live(ok ? 'Letter copied to the clipboard.' : 'Could not copy. Select the text and copy it yourself.');
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).then(() => done(true), () => done(false));
    else { t.focus(); t.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* ignore */ } t.setSelectionRange(0, 0); done(ok); }
    const b = $('[data-copy]'); if (b) { b.textContent = 'Copied'; setTimeout(() => { b.textContent = 'Copy letter'; }, 1600); }
  }
  function download() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([$('#lt').value], { type: 'text/plain' }));
    a.download = 'letter-to-billing-office.txt'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
    live('Letter downloaded as a text file.');
  }

  /* ---------- events ---------- */
  document.addEventListener('click', e => {
    const t = e.target; let b;
    if ((b = t.closest('[data-own]'))) { $('#own').showModal(); return; }
    if ((b = t.closest('[data-sample]'))) { setCase(b.dataset.sample); return; }
    if ((b = t.closest('.chip'))) { selectQ(+b.dataset.q); return; }
    if ((b = t.closest('.q-head'))) { selectQ(+b.dataset.q, { toggle: true, scroll: !stacked() }); return; }
    if ((b = t.closest('[data-pick]'))) {
      const n = +b.dataset.pick, fromReg = !!b.closest('.reg');
      selectQ(n, { scroll: fromReg && !stacked() });
      if (stacked()) { const li = $(`.q[data-n="${n}"]`); li && li.scrollIntoView({ block: 'start', behavior: behavior() }); }
      return;
    }
    if ((b = t.closest('[data-aside]'))) { toggleAside(+b.dataset.aside); return; }
    if ((b = t.closest('[data-show]'))) { scrollToEvidence(+b.dataset.show); return; }
    if ((b = t.closest('[data-back]'))) { const li = $(`.q[data-n="${b.dataset.back}"]`); li && li.scrollIntoView({ block: 'start', behavior: behavior() }); return; }
    if (t.closest('[data-clear]')) { S.sel = null; applySelection(); live('Selection cleared.'); return; }
    if ((b = t.closest('.ln-btn'))) { toggleLine(b.closest('tr').dataset.id); return; }
    if (t.closest('.ln-close')) { const id = S.open; toggleLine(id); const bt = $(`tr.ln[data-id="${id}"] .ln-btn`); bt && bt.focus(); return; }
    if ((b = t.closest('.strip'))) {
      const sb = t.closest('.segbtn');
      if (t.closest('.strip-bar') && S.view === 'review') {
        const id = e.detail === 0 && sb ? sb.dataset.id : idAtX(b, e.clientX);
        if (id === '__gap') { if (D.billFinding) selectQ(D.billFinding.n, { scroll: false }); }
        else toggleLine(id, { scroll: true });
        return;
      }
    }
    if (t.closest('[data-copy]')) { copyText(); return; }
    if (t.closest('[data-dl]')) { download(); return; }
    if (t.closest('[data-undo]')) {
      if (!S.undo) return;
      const u = S.undo; S.aside = u.aside; S.opts = u.opts; S.text = u.text; S.last = u.last; S.pending = u.pending; S.undo = null;
      applyAside(); live('Last change undone.'); return;
    }
    if (t.closest('[data-rebuild]')) { snapshot(); S.text = S.last = compose(); S.pending = false; syncLetterView(); live('Letter rebuilt. You can undo this.'); return; }
    if (t.closest('[data-keep]')) { S.pending = false; S.last = compose(); syncLetterView(); live('Keeping your text.'); return; }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('[data-incl]')) { const n = +t.dataset.incl; if (S.aside.has(n) === !t.checked) return; toggleAside(n); }
    else if (t.matches('[data-opt]')) { snapshot(); S.opts[t.dataset.opt] = t.checked; sync(true); syncLetterView(); }
  });
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'lt') { S.text = t.value; autosize(); }
    else if (t.matches('[data-sender]')) { S.sender[t.dataset.sender] = t.value; const was = dirty(); if (!was) sync(false); else S.pending = true; syncLetterView(); }
  });
  ['pointermove', 'pointerdown'].forEach(ev => document.addEventListener(ev, e => { const s = e.target.closest && e.target.closest('.strip-bar'); if (s) { const st = s.closest('.strip'); hot(st, idAtX(st, e.clientX)); } }));
  document.addEventListener('pointerout', e => { const s = e.target.closest && e.target.closest('.strip-bar'); if (s && !s.contains(e.relatedTarget)) { const st = s.closest('.strip'), f = document.activeElement; hot(st, f && f.classList.contains('segbtn') && st.contains(f) ? f.dataset.id : null); } });
  document.addEventListener('focusin', e => { const b = e.target.closest && e.target.closest('.segbtn'); if (b) hot(b.closest('.strip'), b.dataset.id); });
  document.addEventListener('focusout', e => { const b = e.target.closest && e.target.closest('.segbtn'); if (b) hot(b.closest('.strip'), null); });
  document.addEventListener('keydown', e => {
    const b = e.target.closest && e.target.closest('.segbtn');
    if (b) {
      const all = $$('.segbtn', b.closest('.strip')), i = all.indexOf(b);
      const k = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: all.length - 1 }[e.key];
      if (k != null) { e.preventDefault(); const n = all[Math.max(0, Math.min(all.length - 1, k))]; all.forEach(x => { x.tabIndex = -1; }); n.tabIndex = 0; n.focus(); }
    }
    if (e.key === 'Escape' && S.view === 'review' && S.open && !$('#own').open) { const id = S.open; toggleLine(id); }
  });

  /* ---------- routing ---------- */
  const TITLES = { front: 'Second Opinion: check the bill against itself', review: 'Second Opinion: review', letter: 'Second Opinion: your letter' };
  function route() {
    const h = (location.hash || '#front').slice(1).split('?')[0];
    show(['front', 'review', 'letter'].includes(h) ? h : 'front');
  }
  function show(v) {
    const first = S.view === null, changed = S.view !== v;
    const apply = () => {
      S.view = v;
      $$('.view').forEach(s => { s.hidden = s.dataset.view !== v; });
      $$('[data-nav]').forEach(a => { a.dataset.nav === v ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
      document.title = TITLES[v];
      document.body.dataset.view = v;
      if (v === 'letter') { sync(false); syncLetterView(); }
      applyAside(); applySelection();
      layoutTicks(document);
    };
    if (document.startViewTransition && !first && changed && !reduce()) document.startViewTransition(apply); else apply();
    if (changed) { window.scrollTo(0, 0); const h1 = $('h1', $(`#view-${v}`)); if (h1 && !first) h1.focus({ preventScroll: true }); }
    if (v === 'front' && S.drawFront) setTimeout(() => { S.drawFront = false; const f = $('.hero-bridge'); f && f.classList.remove('draw'); }, 2600);
  }
  function setCase(id) {
    if (!SO.cases[id]) id = 'emergency-visit';
    const switched = id !== S.id;
    S.id = id; S.sel = null; S.open = null; S.aside = new Set(); S.undo = null; S.pending = false; S.text = S.last = '';
    derive();
    $$('[data-sample]').forEach(b => b.setAttribute('aria-pressed', b.dataset.sample === id));
    if (switched) S.drawFront = true;
    renderFront(); renderReview(); renderLetter();
    if (S.view) { applyAside(); applySelection(); layoutTicks(document); if (S.drawFront && S.view === 'front') setTimeout(() => { S.drawFront = false; const f = $('.hero-bridge'); f && f.classList.remove('draw'); }, 2600); }
    try { const u = new URL(location.href); u.searchParams.set('sample', id); history.replaceState(null, '', u); } catch (e) { /* file:// may refuse */ }
    if (switched) live(`Showing the ${D.b.provider} example.`);
  }

  window.addEventListener('hashchange', route);
  let rz = 0;
  new ResizeObserver(() => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => layoutTicks(document)); }).observe(document.body);
  const q = new URLSearchParams(location.search).get('sample');
  setCase(q && SO.cases[q] ? q : 'emergency-visit');
  route();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => layoutTicks(document));
})();
