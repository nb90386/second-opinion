/* Second Opinion, concept C: the consumer-rights publication.
   Vanilla JS. Data from ../shared/case.js (window.SO) and helpers.js (window.SOH). */
(() => {
'use strict';
const SO = window.SO, H = window.SOH, money = H.money;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
const word = n => WORDS[n] ?? String(n);
const lc = s => s.charAt(0).toLowerCase() + s.slice(1);
const smooth = () => (H.reducedMotion() ? 'auto' : 'smooth');

/* ---------- state ---------- */
const params = new URLSearchParams(location.search);
let caseKey = SO.cases[params.get('sample')] ? params.get('sample') : 'emergency-visit';
const ui = { anat: 'any', read: 'story', view: 'front' };
const globals = {
  options: { requestItemized: true, requestHold: true, askFinancialAssistance: false },
  sender: { name: 'Jordan Avery', address: '', phone: '', email: '' },
};
const per = {};
const S = () => (per[caseKey] ||= { aside: new Set(), sel: null, openLine: null, letter: { text: '', dirty: false, key: '' } });
const C = () => SO.cases[caseKey];
const B = () => C().bill;
const F = () => C().analysis.findings;
const A = () => C().analysis;
const line = id => B().lineItems.find(l => l.id === id);
const refs = () => H.refsByLine(F());
const SAMPLE_NAME = { 'emergency-visit': 'emergency visit', 'three-night-stay': 'three-night stay' };
const built = {};

/* ---------- small formatters ---------- */
const fmtQP = l => (l.unitPrice != null ? `${l.quantity} × ${money(l.unitPrice)}` : `${l.quantity}`);
const dayMs = 864e5;
const toD = iso => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
const addDays = (iso, n) => new Date(toD(iso) + n * dayMs).toISOString().slice(0, 10);
const dow = iso => new Date(toD(iso)).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
const dom = iso => +iso.slice(8, 10);
const lvl = level => `<span class="lvl lvl--${level}">${esc(SO.levelLabel[level])}</span>`;
const includedFindings = () => F().filter(f => !S().aside.has(f.id));

/* ---------- glossary (careful wording, no legal claims) ---------- */
const GLOSS = {
  eob: { t: 'EOB (Explanation of Benefits)', d: 'A statement your health insurer commonly sends after it processes a claim. It usually shows what was billed, what the plan allowed and paid, and what it says you owe. It is not a bill.' },
  cpt: { t: 'CPT code', d: 'Current Procedural Terminology. A standard set of five-digit codes, published by the American Medical Association, that commonly names medical services such as visits, tests and procedures.' },
  hcpcs: { t: 'HCPCS code', d: 'Healthcare Common Procedure Coding System. Codes commonly used for drugs, supplies and services that CPT does not cover. Many begin with a letter, such as J or Q.' },
  rev: { t: 'Revenue code', d: 'A four-digit code hospitals commonly use to say which department or kind of charge a line belongs to, such as pharmacy or room and board.' },
  gfe: { t: 'Good Faith Estimate', d: 'An estimate of expected charges that providers and facilities are generally asked to give people who are uninsured or paying themselves, before scheduled care. Whether one applies to you depends on your situation.', link: ['https://www.cms.gov/medical-bill-rights/help/dispute-a-bill', 'CMS: dispute a bill'] },
};
const term = (k, label) => `<button type="button" class="term" data-act="term" data-k="${k}" aria-expanded="false">${label}</button>`;
const rich = s => s.replace(/\[\[(\w+)\|([^\]]+)\]\]/g, (m, k, l) => term(k, l));

const LOOKS = {
  'line-math': 'It multiplies each line’s quantity by its unit price and compares the result with the amount printed.',
  'bill-total': 'It adds up every line and compares the sum with the total printed on the bill.',
  'eob-balance': 'It compares the amount due on the bill with the share your [[eob|EOB]] says you owe.',
  duplicate: 'It looks for lines that match exactly on date, code, description, quantity and amount. Some repeats are real; this only asks.',
  'outside-stay': 'It looks for charges dated outside the visit dates on the bill.',
  'room-nights': 'It compares room days billed with the nights between admission and discharge. Hospitals commonly count by midnights.',
  'good-faith-estimate': 'It compares the bill’s total with the [[gfe|Good Faith Estimate]] you entered. A difference is a question, not a verdict.',
  itemize: 'It looks for lines whose description is a general category, such as “PHARMACY”, rather than a specific item.',
};

/* ---------- statement rows ---------- */
const refNums = id => (refs()[id] || []).map(r => `<span class="qn">${r.n}</span>`).join('');
const refSr = id => { const r = refs()[id]; return r ? `<span class="sr">${r.length === 1 ? 'Question' : 'Questions'} ${r.map(x => x.n).join(', ')}.</span>` : ''; };

function wideRow(l, cls = '') {
  return `<div class="wrow ${cls}"><span class="w-date">${H.date(l.date)}</span><span class="w-code">${esc(l.code)}</span><span class="w-desc">${esc(l.description)}</span><span class="w-qp">${fmtQP(l)}</span><span class="w-amt">${money(l.amount)}</span></div>`;
}

function stmtRow(l, interactive) {
  const inner = `<span class="s-q">${refNums(l.id)}${refSr(l.id)}</span><span class="s-date">${H.date(l.date)}</span><span class="s-code">${esc(l.code)}</span><span class="s-desc"><span class="s-print">${esc(l.description)}</span><span class="s-sub"><span class="s-qp">${fmtQP(l)}</span>${l.plainName ? `<span class="s-plain">${esc(l.plainName)}</span>` : ''}</span></span><span class="s-amt">${money(l.amount)}</span>`;
  if (!interactive) return `<li class="srow" data-line="${l.id}"><div class="srow-btn">${inner}</div></li>`;
  const qs = refs()[l.id] || [];
  const detail = `<div class="sdetail" id="ld-${l.id}" hidden>
      <p class="sd-plain">${esc(l.plainName || 'No plain-English name for this line')}</p>
      <p class="sd-code"><span class="sd-sys">${esc(l.codeSystem)}</span> <span class="sd-codeval">${esc(l.code)}</span></p>
      ${l.codeNote ? `<p class="sd-note">${esc(l.codeNote)}</p>` : ''}
      <div class="sd-qs">${qs.length ? `<p class="sd-h">${qs.length === 1 ? 'Question on this line' : 'Questions on this line'}</p><ul>${qs.map(r => `<li><button type="button" class="link" data-act="goq" data-n="${r.n}"><span class="qn">${r.n}</span> ${lvl(r.level)} ${esc(F()[r.n - 1].title)}</button></li>`).join('')}</ul>` : '<p class="sd-none">No questions on this line.</p>'}</div>
    </div>`;
  return `<li class="srow" data-line="${l.id}"><button type="button" class="srow-btn" data-act="line" data-id="${l.id}" aria-expanded="false" aria-controls="ld-${l.id}">${inner}</button>${detail}</li>`;
}

function totalsRows() {
  const b = B();
  const rows = [{ k: 'sum', label: `Sum of the ${b.lineItems.length} lines`, amt: A().lineSum, calc: true }, { k: 'total', label: 'Total charges', amt: b.statedTotal }, { k: 'due', label: 'Amount due', amt: b.amountDue }];
  if (b.eobResponsibility != null) rows.push({ k: 'eob', label: 'Your share per your EOB', amt: b.eobResponsibility, entered: true });
  if (b.goodFaithEstimate != null) rows.push({ k: 'gfe', label: 'Good Faith Estimate', amt: b.goodFaithEstimate, entered: true });
  return rows;
}
const TOTAL_TARGETS = { 'eob-balance': ['due', 'eob'], 'bill-total': ['total', 'sum'], 'good-faith-estimate': ['total', 'gfe'] };

/* ---------- evidence figures ---------- */
function figDup(f) {
  const ls = f.lineIds.map(line);
  const a = ls[0];
  return `<div class="fig-dup" role="img" aria-label="${ls.length} statement lines that match on date, code, description, quantity and amount">
    <div class="dup-stack">${wideRow(a, 'dup-a')}${wideRow(a, 'dup-b')}</div>
    <p class="dup-copies">${ls.length} copies</p>
    <ul class="dup-match"><li>Same date</li><li>Same code</li><li>Same description</li><li>Same quantity</li><li>Same amount</li></ul>
  </div>`;
}

function figMath(f) {
  const l = line(f.lineIds[0]);
  const exp = l.quantity * l.unitPrice, got = l.amount, max = Math.max(exp, got);
  const segs = l.quantity <= 8 ? Array.from({ length: l.quantity }, () => `<span class="seg">${money(l.unitPrice)}</span>`).join('') : `<span class="seg">${l.quantity} × ${money(l.unitPrice)}</span>`;
  const common = Math.min(exp, got), diff = Math.abs(exp - got);
  const second = got >= exp
    ? `<span class="mbar" style="width:${(got / max) * 100}%"><span class="seg seg--print" style="flex:${common}"></span><span class="seg seg--diff" style="flex:${diff}"></span></span>`
    : `<span class="mbar" style="width:${(got / max) * 100}%"><span class="seg seg--print" style="flex:1"></span></span>`;
  return `<div class="fig-math" role="img" aria-label="${l.quantity} times ${money(l.unitPrice)} is ${money(exp)}. The bill prints ${money(got)}.">
    <div class="mrow"><span class="mlabel">${l.quantity} × ${money(l.unitPrice)}</span><span class="mval">= ${money(exp)}</span>
      <span class="mbar" style="width:${(exp / max) * 100}%">${segs}</span></div>
    <div class="mrow"><span class="mlabel">Printed on the bill</span><span class="mval">${money(got)}</span>${second}</div>
    <p class="mdiff"><span class="hatch-key"></span>${money(diff)} ${got >= exp ? 'more than the multiplication gives' : 'less than the multiplication gives'}</p>
  </div>`;
}

function figOutside(f) {
  const b = B(), l = line(f.lineIds[0]);
  const s = b.admitDate, e = b.dischargeDate || b.admitDate;
  const from = addDays(s < l.date ? s : l.date, -1), to = addDays(e > l.date ? e : l.date, 1);
  const n = Math.round((toD(to) - toD(from)) / dayMs) + 1;
  const cells = Array.from({ length: n }, (_, i) => {
    const d = addDays(from, i), inV = d >= s && d <= e, ch = d === l.date;
    return `<li class="day${inV ? ' day--visit' : ''}${ch ? ' day--charge' : ''}"><span class="day-w">${dow(d)}</span><span class="day-n">${dom(d)}</span>${dom(d) === 1 || i === 0 ? `<span class="day-m">${H.date(d, { month: 'short' })}</span>` : ''}</li>`;
  }).join('');
  const span = s === e ? H.date(s) : `${H.date(s)} to ${H.date(e)}`;
  return `<div class="fig-cal" role="img" aria-label="Calendar from ${H.date(from)} to ${H.date(to)}. Your visit: ${span}. ${l.description}, ${money(l.amount)}, is dated ${H.date(l.date)}, outside it.">
    <ol class="days" style="--n:${n}">${cells}</ol>
    <ul class="cal-key"><li><span class="key key--visit"></span>Your visit, ${span}</li><li><span class="key key--charge"></span>${esc(l.description)}, ${money(l.amount)}, dated ${H.date(l.date)}</li></ul>
  </div>`;
}

function figBars(rows, noteLabel, aria) {
  const max = Math.max(...rows.map(r => r.v));
  const lo = Math.min(...rows.map(r => r.v));
  return `<div class="fig-bars" role="img" aria-label="${esc(aria)}">${rows.map(r => `<div class="brow"><span class="blabel">${r.label}</span><span class="bval">${money(r.v)}</span>
      <span class="btrack"><span class="bbar" style="width:${(r.v / max) * 100}%">${r.v === max && max !== lo ? `<span class="bdiff" style="width:${((max - lo) / max) * 100}%"></span>` : ''}</span></span></div>`).join('')}
    <p class="mdiff"><span class="hatch-key"></span>${money(max - lo)} ${noteLabel}</p></div>`;
}

function figRoom(f) {
  const b = B(), l = line(f.lineIds[0]);
  const days = [];
  for (let d = b.admitDate; d <= b.dischargeDate; d = addDays(d, 1)) days.push(d);
  const nights = days.length - 1, billed = l.quantity;
  const cell = (d, i) => `<li><span class="day-w">${dow(d)}</span><span class="day-n">${dom(d)}</span></li>`;
  const bl = days.map((d, i) => `<li class="${i < Math.min(billed, nights) ? 'rb rb--on' : i < billed ? 'rb rb--extra' : 'rb'}"></li>`).join('');
  const mids = days.slice(0, -1).map(() => '<li><i></i></li>').join('');
  return `<div class="fig-room" role="img" aria-label="${days.length} calendar days from ${H.date(b.admitDate)} to ${H.date(b.dischargeDate)} make ${nights} nights. Room days billed: ${billed}.">
    <div class="rgrid" style="--n:${days.length}">
      <ol class="rdays">${days.map(cell).join('')}</ol>
      <ol class="rmids">${mids}</ol>
      <p class="rlabel">${nights} midnights, ${nights} nights</p>
      <ol class="rbilled">${bl}</ol>
      <p class="rlabel">${billed} room days billed</p>
    </div>
    <p class="mdiff"><span class="hatch-key"></span>${billed > nights ? `The extra day falls on the day of discharge, ${H.date(b.dischargeDate)}` : 'Room days match nights'}</p>
  </div>`;
}

function figItem(f, open) {
  const l = line(f.lineIds[0]);
  const id = `item-${f.id.replace(/\W/g, '')}-${open ? 'o' : 'c'}`;
  return `<div class="fig-item" role="group" aria-label="${esc(l.description)} opened into its missing detail">
    <button type="button" class="item-box" data-act="item" aria-expanded="${open}" aria-controls="${id}">
      <span class="item-line"><span class="w-code">${esc(l.code)}</span><span class="w-desc">${esc(l.description)}</span><span class="w-amt">${money(l.amount)}</span></span>
      <span class="item-tog">${open ? 'Close the box' : 'Open the box'}</span></button>
    <ul class="item-rows" id="${id}"${open ? '' : ' hidden'}>${[1, 2, 3].map(() => '<li><span class="q">?</span><span>item</span><span>qty</span><span>price</span></li>').join('')}</ul>
  </div>`;
}

function figure(f, { openItem = true } = {}) {
  const b = B(), a = A();
  switch (f.rule) {
    case 'duplicate': return figDup(f);
    case 'line-math': return figMath(f);
    case 'outside-stay': return figOutside(f);
    case 'room-nights': return figRoom(f);
    case 'itemize': return figItem(f, openItem);
    case 'eob-balance': return figBars([{ label: 'Amount due on this bill', v: b.amountDue }, { label: 'Your share on the EOB', v: b.eobResponsibility }], 'between the two', `Amount due ${money(b.amountDue)} against EOB share ${money(b.eobResponsibility)}`);
    case 'bill-total': return figBars([{ label: 'Total printed on the bill', v: b.statedTotal }, { label: `Sum of the ${b.lineItems.length} lines`, v: a.lineSum }], 'between the two', `Printed total ${money(b.statedTotal)} against line sum ${money(a.lineSum)}`);
    case 'good-faith-estimate': return figBars([{ label: 'Total charges on the bill', v: b.statedTotal }, { label: 'Your Good Faith Estimate', v: b.goodFaithEstimate }], 'between the two', `Bill total ${money(b.statedTotal)} against estimate ${money(b.goodFaithEstimate)}`);
    default: return '';
  }
}
const caption = f => `<figcaption><strong>What this check looks for.</strong> ${rich(LOOKS[f.rule] || '')}</figcaption>`;

/* ---------- question inclusion control ---------- */
const incGroup = n => `<div class="inc" role="group" aria-label="Question ${n} in your letter">
  <button type="button" class="inc-b" data-act="inc" data-n="${n}" data-v="1" aria-pressed="true">Include</button><button type="button" class="inc-b" data-act="inc" data-n="${n}" data-v="0" aria-pressed="false">Set aside</button></div>`;

/* ============================================================
   FRONT
   ============================================================ */
function hiFinding() { return F().find(f => f.lineIds.length) || F()[0]; }

function buildFront() {
  const b = B(), fs = F(), lines = b.lineItems;
  const hi = hiFinding(), hiLine = line(hi.lineIds[0]), hiIdx = lines.indexOf(hiLine);
  const start = Math.max(0, Math.min(hiIdx - 3, lines.length - 8));
  const crop = lines.slice(start, start + 8);
  const rules = [...new Set(fs.map(f => f.rule))];
  const sheet = `<div class="sheet-crop">
      <p class="cover-cap"><strong>Fig. 1.</strong> Line ${hiIdx + 1} of ${lines.length}, as printed. ${esc(hi.why)}</p>
      <div class="cover-sheet" aria-hidden="true">
        <p class="cs-head">${esc(b.provider)} · Itemized statement · Account ${esc(b.accountNumber)}</p>
        <div class="wrow wrow--head"><span>Date</span><span>Code</span><span>Description</span><span>Units × price</span><span>Charge</span></div>
        ${crop.map(l => wideRow(l, l.id === hiLine.id ? 'wrow--hl' : '')).join('')}
      </div></div>`;

  const sys = [...new Set(lines.map(l => l.codeSystem))];
  const sysTerms = sys.map(s => (s === 'CPT' ? term('cpt', 'CPT') : s === 'HCPCS' ? term('hcpcs', 'HCPCS') : term('rev', 'revenue codes')));
  const sysList = sysTerms.length > 1 ? `${sysTerms.slice(0, -1).join(', ')} and ${sysTerms.at(-1)}` : sysTerms[0];
  const cols = [
    { k: 'date', h: 'Date of service', t: 'The day each item or service was provided. A date outside your visit is worth a second look.' },
    { k: 'code', h: 'Code', t: `A standard code for the service. This bill uses ${sysList}.` },
    { k: 'desc', h: 'Description', t: 'The hospital’s own words. A general word like “PHARMACY” doesn’t say what was given.' },
    { k: 'qp', h: 'Units × price', t: 'How many, times the price of one. The two should multiply to the charge.' },
    { k: 'amt', h: 'Charge', t: 'What the hospital lists for the line. A large number is not, by itself, a mistake.' },
  ];

  /* the target row for each question (rows or totals) */
  const qTarget = f => (f.lineIds.length ? `l-${f.lineIds[0]}` : `t-${(TOTAL_TARGETS[f.rule] || ['total'])[0]}`);
  const markedLines = new Set(fs.flatMap(f => f.lineIds));
  const markedTotals = new Set(fs.filter(f => !f.lineIds.length).flatMap(f => TOTAL_TARGETS[f.rule] || []));
  const arow = l => `<div class="arow${markedLines.has(l.id) ? ' is-pointed' : ''}" data-row="l-${l.id}"><span class="a-q">${refNums(l.id)}</span><span class="w-date">${H.date(l.date)}</span><span class="w-code">${esc(l.code)}</span><span class="w-desc">${esc(l.description)}</span><span class="w-qp">${fmtQP(l)}</span><span class="w-amt">${money(l.amount)}</span></div>`;
  const trow = t => `<div class="arow arow--tot${markedTotals.has(t.k) ? ' is-pointed' : ''}" data-row="t-${t.k}"><span class="a-q"></span><span class="a-tl">${esc(t.label)}${t.entered ? ' (entered by you)' : t.calc ? ' (added up)' : ''}</span><span class="w-amt">${money(t.amt)}</span></div>`;

  const phoneAny = `<ol class="ph-any">${cols.map((c, i) => {
    const v = [H.date(hiLine.date), `${hiLine.code}`, hiLine.description, fmtQP(hiLine), money(hiLine.amount)][i];
    return `<li><span class="cn">${i + 1}</span><div><h3>${c.h}</h3><p class="ph-val">${esc(v)}</p><p>${c.t}</p></div></li>`;
  }).join('')}</ol>`;
  const phoneYour = `<ol class="ph-your">${fs.map((f, i) => {
    const ls = f.lineIds.map(line);
    return `<li><span class="cn">${i + 1}</span><div>${lvl(f.level)}<h3>${esc(f.title)}</h3>${ls.length ? `<div class="ph-ex">${ls.map(l => wideRow(l, 'wrow--hl-static')).join('')}</div>` : ''}<button type="button" class="link" data-act="goq" data-n="${i + 1}">Open question ${i + 1}</button></div></li>`;
  }).join('')}</ol>`;

  const checksSection = rules.map((r, i) => {
    const f = fs.find(x => x.rule === r);
    const chk = A().checks.find(c => c.rule === r);
    const nQ = fs.filter(x => x.rule === r).length;
    return `<article class="chk chk--${i % 2 ? 'r' : 'l'}">
      <div class="chk-fig"><figure class="fig">${figure(f, { openItem: false })}${caption(f)}</figure></div>
      <div class="chk-txt"><p class="chk-n" aria-hidden="true">${i + 1}</p><h3>${esc(chk ? chk.label : r)}</h3>
        <p>${esc(f.why)}</p>
        <p class="chk-link"><button type="button" class="link" data-act="goq" data-n="${fs.indexOf(f) + 1}">${nQ > 1 ? `See the ${word(nQ).toLowerCase()} questions from this check` : `See question ${fs.indexOf(f) + 1}`}</button></p></div>
    </article>`;
  }).join('');

  return `
  <div class="cover">
    <div class="wrap cover-grid">
      <h1 id="h-front" class="cover-title" tabindex="-1">Your hospital bill,<br class="d"> read line by line.</h1>
      <div class="cover-copy">
        <p class="cover-stand">Second Opinion explains each charge in plain English, points to the few worth asking about, and drafts a calm letter to the billing office.</p>
        <div class="cover-actions"><a class="btn btn--onGreen btn--xl" href="#review">Open the example bill <span aria-hidden="true">→</span></a><button type="button" class="textbtn" data-act="own">Use your own bill</button></div>
        <p class="cover-line"><strong>In this issue:</strong> ${esc(b.provider)}, ${lines.length} charges, ${fs.length} ${fs.length === 1 ? 'question' : 'questions'}, synthetic example.</p>
      </div>
      ${sheet}
    </div>
  </div>

  <section class="anat" aria-labelledby="h-anat" data-mode="${ui.anat}">
    <div class="wrap">
      <div class="anat-head g12">
        <h2 id="h-anat">Anatomy of your bill</h2>
        <div class="anat-intro">
          <p>Every itemized statement is built from the same five columns. Learn them once and any bill gets easier to read.</p>
          <div class="seg-toggle" role="group" aria-label="What the callouts show">
            <button type="button" data-act="anat" data-m="any" aria-pressed="${ui.anat === 'any'}">Any bill</button>
            <button type="button" data-act="anat" data-m="your" aria-pressed="${ui.anat === 'your'}">Your bill</button>
          </div>
        </div>
      </div>
      <p class="anat-note" id="anat-note">${ui.anat === 'any' ? 'The five columns, with what each one tells you.' : `The same statement, with the ${word(fs.length).toLowerCase()} questions pinned to the lines they point at.`}</p>
      <figure class="anat-fig">
        <div class="anat-stage">
          <div class="anat-top" aria-hidden="false">${cols.map((c, i) => `<div class="callout callout--${c.k}"><span class="cn">${i + 1}</span><h3>${c.h}</h3><p>${c.t}</p></div>`).join('')}</div>
          <div class="anat-sheet" aria-hidden="true">
            <div class="arow arow--head"><span class="a-q"></span><span>Date</span><span>Code</span><span>Description</span><span>Units × price</span><span>Charge</span></div>
            ${lines.map(arow).join('')}
            <div class="arow-tots">${totalsRows().map(trow).join('')}</div>
          </div>
          <div class="anat-margin">${fs.map((f, i) => `<div class="cq" data-n="${i + 1}" data-row="${qTarget(f)}"><span class="cn">${i + 1}</span><div>${lvl(f.level)}<h3>${esc(f.title)}</h3>${f.amountInQuestion != null ? `<p class="cq-amt">Amount in question <span class="num">${money(f.amountInQuestion)}</span></p>` : ''}<button type="button" class="link" data-act="goq" data-n="${i + 1}">Open question ${i + 1}</button></div></div>`).join('')}</div>
          <svg class="anat-leaders" aria-hidden="true"></svg>
        </div>
        <div class="anat-phone">${ui.anat === 'any' ? phoneAny : phoneYour}</div>
        <figcaption class="anat-cap">Fig. 2. ${lines.length} lines from the ${esc(b.provider)} statement, as printed. Synthetic example: fictional hospital, account and prices.</figcaption>
      </figure>
    </div>
  </section>

  <section class="open2" aria-labelledby="h-checks">
    <div class="wrap g12">
      <h2 id="h-checks">${word(rules.length)} ${rules.length === 1 ? 'check' : 'checks'}, ${word(fs.length).toLowerCase()} ${fs.length === 1 ? 'question' : 'questions'}.</h2>
      <p class="open2-lede">Each figure below is drawn from this bill. It shows what a check looks for. A check raises a question, never a verdict.</p>
    </div>
  </section>

  <section class="checks wrap" aria-label="The checks, illustrated">${checksSection}</section>

  <section class="wont" aria-labelledby="h-wont">
    <div class="wrap g12">
      <h2 id="h-wont">A big number is not a mistake.</h2>
      <ol class="wont-list">
        <li><strong>Price is never a finding.</strong> Hospital list prices are routinely far above what insurers pay, so the largest line is not the suspect line.</li>
        <li><strong>We only compare your own papers.</strong> The bill against its total, your EOB, your estimate and your visit dates. No other hospital’s prices, no savings claims.</li>
        <li><strong>Amounts in question can overlap.</strong> So we never add them into one scary total.</li>
        <li><strong>The letter asks, it doesn’t accuse.</strong> Every question comes with the innocent explanation next to the reason.</li>
      </ol>
    </div>
  </section>

  <section class="final" aria-labelledby="h-final">
    <div class="wrap final-grid">
      <h2 id="h-final">See the ${word(fs.length).toLowerCase()} questions on the lines they point at.</h2>
      <div class="final-actions"><a class="btn btn--onGreen btn--xl" href="#review">Open the example bill <span aria-hidden="true">→</span></a><button type="button" class="textbtn" data-act="own">Use your own bill</button></div>
    </div>
  </section>`;
}

/* ---- anatomy leader lines (desktop, "Your bill") ---- */
function layoutLeaders() {
  const root = $('.anat'); if (!root) return;
  const svg = $('.anat-leaders', root), stage = $('.anat-stage', root), margin = $('.anat-margin', root);
  svg.innerHTML = '';
  $$('.cq', margin).forEach(c => (c.style.top = ''));
  margin.style.minHeight = '';
  if (ui.anat !== 'your' || innerWidth < 1100) return;
  const sr = stage.getBoundingClientRect(), sheet = $('.anat-sheet', stage).getBoundingClientRect(), mr = margin.getBoundingClientRect();
  const items = $$('.cq', margin).map(el => {
    const row = $(`[data-row="${el.dataset.row}"]`, $('.anat-sheet', stage));
    const r = row.getBoundingClientRect();
    return { el, y: r.top + r.height / 2 - sr.top };
  }).sort((a, b) => a.y - b.y);
  let cursor = 0;
  items.forEach(it => { const top = Math.max(it.y - 16, cursor); it.top = top; it.el.style.top = `${top}px`; cursor = top + it.el.offsetHeight + 14; });
  margin.style.minHeight = `${cursor}px`;
  const x0 = sheet.right - sr.left, x1 = mr.left - sr.left;
  let d = '';
  items.forEach((it, i) => {
    const xm = x0 + 14 + ((i * 7) % 28), y1 = it.top + 16;
    d += `<circle cx="${x0 - 9}" cy="${it.y}" r="4"/><path d="M${x0 - 9} ${it.y}H${xm}V${y1}H${x1 - 4}" />`;
  });
  svg.setAttribute('width', sr.width);
  svg.setAttribute('height', Math.max(sr.height, cursor));
  svg.innerHTML = d;
}

/* ============================================================
   REVIEW
   ============================================================ */
function buildReview() {
  const b = B(), fs = F(), lines = b.lineItems, s = S();
  const n = fs.length;
  const markLabel = f => (f.lineIds.length ? `Marked on the statement: ${f.lineIds.length === 1 ? '1 line' : `${f.lineIds.length} lines`}` : 'Marked on the statement: the totals');

  const articles = fs.map((f, i) => {
    const q = i + 1;
    const ex = f.lineIds.map(line);
    return `<article class="art" id="q${q}" data-n="${q}" data-level="${f.level}" aria-labelledby="qt${q}">
      <div class="art-num" aria-hidden="true">${q}</div>
      <div class="art-body">
        <p class="art-meta">${lvl(f.level)}<span class="art-state inc-state" data-n="${q}">In your letter</span>${f.amountInQuestion != null ? `<span class="amtq">Amount in question <span class="num">${money(f.amountInQuestion)}</span></span>` : ''}</p>
        <h2 class="art-title" id="qt${q}"><span class="sr">Question ${q}: </span><button type="button" data-act="select" data-n="${q}" aria-pressed="false">${esc(f.title)}</button></h2>
        <p class="art-why">${esc(f.why)}</p>
        <figure class="fig">${figure(f)}${caption(f)}</figure>
        ${ex.length ? `<div class="art-onbill"><h3>On your bill</h3><ul class="stmt-list">${ex.map(l => stmtRow(l, false)).join('')}</ul></div>` : ''}
        <dl class="facts">${f.facts.map(x => `<div><dt>${esc(x.label)}</dt><dd class="num">${esc(x.value)}</dd></div>`).join('')}</dl>
        <blockquote class="pull"><h3>Why it might be fine</h3><p>${esc(f.innocent)}</p></blockquote>
        <div class="ask"><h3>What to ask</h3><p>${esc(f.ask)}</p>${f.next ? `<p class="next"><strong>Good to know.</strong> ${esc(f.next)}</p>` : ''}</div>
        <div class="art-actions">${incGroup(q)}<span class="mark-chip"><span class="hl-sw" aria-hidden="true"></span>${markLabel(f)}</span></div>
      </div></article>`;
  }).join('');

  const table = `<table class="qtable"><caption class="sr">The ${n} questions about this bill</caption>
    <thead><tr><th scope="col">No.</th><th scope="col">Level</th><th scope="col">Question</th><th scope="col" class="r">Amount in question</th><th scope="col">In your letter</th></tr></thead>
    <tbody>${fs.map((f, i) => { const q = i + 1; return `<tr class="trow" id="tq${q}" data-n="${q}"><td class="tn">${q}</td><td>${lvl(f.level)}</td><td><button type="button" class="tlink" data-act="select" data-n="${q}" aria-pressed="false">${esc(f.title)}</button></td><td class="r num">${f.amountInQuestion != null ? money(f.amountInQuestion) : '–'}</td><td class="tinc">${incGroup(q)}</td></tr>
      <tr class="tdetail" data-n="${q}"><td></td><td colspan="4"><p>${esc(f.why)}</p><p class="td-fine"><strong>Why it might be fine.</strong> ${esc(f.innocent)}</p><p><strong>What to ask.</strong> ${esc(f.ask)}</p></td></tr>`; }).join('')}</tbody></table>`;

  const checks = A().checks.map(c => {
    const qs = fs.map((f, i) => ({ f, i })).filter(x => x.f.rule === c.rule);
    return `<tr class="ck ck--${c.status}"><th scope="row">${esc(c.label)}</th><td><span class="st st--${c.status}"><i aria-hidden="true"></i>${c.status === 'clear' ? 'Clear' : c.status === 'flagged' ? 'Flagged' : 'Not run'}</span></td><td>${esc(c.detail)}${qs.length ? ` <span class="ck-qs">${qs.map(x => `<button type="button" class="link" data-act="goq" data-n="${x.i + 1}">Question ${x.i + 1}</button>`).join(' ')}</span>` : ''}</td></tr>`;
  }).join('');

  const tot = totalsRows();
  return `
  <div class="wrap rev-grid">
    <header class="rev-head">
      <h1 id="h-review" tabindex="-1">${word(n)} ${n === 1 ? 'question' : 'questions'} for the billing office.</h1>
      <p class="rev-stand">We read all ${lines.length} lines. These are the ones worth a call to the billing office. Each shows why we raised it, and why it may be fine.</p>
      <div class="lvl-key" aria-label="How we word it">
        <p>${lvl('discrepancy')} two figures that should match don’t.</p>
        <p>${lvl('ask')} it may be fine, and a question is reasonable.</p>
        <p>${lvl('detail')} the bill doesn’t say enough to explain it.</p>
      </div>
      <p class="rev-fine">Amounts in question can overlap, so they are never added together.</p>
      <div class="rev-tools">
        <div class="seg-toggle" role="group" aria-label="How to read the questions">
          <button type="button" data-act="read" data-m="story" aria-pressed="${ui.read === 'story'}">Read as story</button>
          <button type="button" data-act="read" data-m="table" aria-pressed="${ui.read === 'table'}">Read as table</button>
        </div>
        <a class="btn btn--solid" href="#letter" data-count-label="Write the letter"><span>Write the letter (<span data-count>${n}</span>&nbsp;<span data-count-word>questions</span>)</span></a>
      </div>
    </header>

    <div class="rev-arts" data-read="${ui.read}">
      <div class="arts-story">${articles}</div>
      <div class="arts-table">${table}</div>
    </div>

    <aside class="rev-side" aria-label="Your statement">
      <div class="stmt" data-open="false">
        <div class="stmt-top">
          <p class="stmt-syn">Synthetic example: fictional hospital, account and prices</p>
          <h2 class="stmt-h">Your statement</h2>
          <button type="button" class="stmt-toggle" data-act="stmt" aria-expanded="false" aria-controls="stmt-body"><span>Your statement</span><span class="stmt-n">${lines.length} lines</span></button>
          <p class="stmt-meta">${esc(b.provider)}<br>Account ${esc(b.accountNumber)} · Statement ${H.date(b.statementDate, { month: 'short', day: 'numeric', year: 'numeric' })}<br>${b.admitDate === b.dischargeDate ? `Service ${H.longDate(b.admitDate)}` : `Service ${H.longDate(b.admitDate)} to ${H.longDate(b.dischargeDate)}`}</p>
        </div>
        <div class="stmt-body" id="stmt-body">
          <p class="stmt-hint">Select a line to see what it is. Numbers on the left are the questions that point at it.</p>
          <div class="stmt-scroll">
            <ul class="stmt-list">${lines.map(l => stmtRow(l, true)).join('')}</ul>
            <dl class="stmt-tots">${tot.map(t => `<div class="trow2" data-tot="${t.k}"><dt>${esc(t.label)}${t.entered ? ' <span class="ent">entered by you</span>' : t.calc ? ' <span class="ent">added up</span>' : ''}</dt><dd class="num">${money(t.amt)}</dd></div>`).join('')}</dl>
          </div>
        </div>
      </div>
    </aside>
  </div>

  <section class="checked" aria-labelledby="h-checked">
    <div class="wrap g12">
      <div class="checked-intro"><h2 id="h-checked">What was checked</h2><p>Every check ran against the numbers on your own papers. A check that is clear tells you something too.</p><p class="checked-fine">Nothing here is flagged for being expensive. Prices are never compared with other hospitals.</p></div>
      <table class="ctable"><caption class="sr">Checks and their results</caption><thead><tr><th scope="col">Check</th><th scope="col">Result</th><th scope="col">Detail</th></tr></thead><tbody>${checks}</tbody></table>
    </div>
  </section>
  <section class="rev-end wrap"><a class="btn btn--solid btn--xl" href="#letter"><span>Write the letter (<span data-count>${n}</span>&nbsp;<span data-count-word>questions</span>)</span></a><p>You can set questions aside first. The letter only asks what you keep.</p></section>`;
}

/* ============================================================
   LETTER
   ============================================================ */
function buildLetter() {
  const fs = F(), s = S(), g = globals;
  const opt = (k, label, hint) => `<label class="chk-row"><input type="checkbox" data-opt="${k}"${g.options[k] ? ' checked' : ''}><span class="box" aria-hidden="true"></span><span>${label}${hint ? `<small>${hint}</small>` : ''}</span></label>`;
  return `
  <div class="wrap g12 lt-grid">
    <div class="lt-rail">
      <h1 id="h-letter" tabindex="-1">Your letter to the billing office</h1>
      <p class="lt-lede">It asks questions and requests a corrected statement. It does not accuse anyone. Edit any word before you send it.</p>
      <form class="lt-form" onsubmit="return false">
        <fieldset><legend>Questions in the letter <span class="lt-count" data-count-text></span></legend>
          ${fs.map((f, i) => `<label class="chk-row"><input type="checkbox" data-q="${i + 1}"${s.aside.has(f.id) ? '' : ' checked'}><span class="box" aria-hidden="true"></span><span><span class="lt-qn">${i + 1}.</span> ${esc(f.title)}<small>${esc(SO.levelLabel[f.level])}${f.amountInQuestion != null ? ` · ${money(f.amountInQuestion)} in question` : ''}</small></span></label>`).join('')}
        </fieldset>
        <fieldset><legend>Also ask for</legend>
          ${opt('requestItemized', 'A complete itemized statement', 'Left out automatically when a question already asks for one.')}
          ${opt('requestHold', 'A hold on the account while it’s reviewed', 'Asks that it not go to collections meanwhile.')}
          ${opt('askFinancialAssistance', 'The financial assistance policy and application')}
        </fieldset>
        <fieldset class="lt-me"><legend>Your details</legend>
          <label class="fld"><span>Your name</span><input type="text" data-sender="name" value="${esc(g.sender.name)}" autocomplete="name"></label>
          <label class="fld"><span>Mailing address <em>optional</em></span><textarea data-sender="address" rows="2" autocomplete="street-address">${esc(g.sender.address)}</textarea></label>
          <div class="fld-2"><label class="fld"><span>Phone <em>optional</em></span><input type="tel" data-sender="phone" value="${esc(g.sender.phone)}" autocomplete="tel"></label>
          <label class="fld"><span>Email <em>optional</em></span><input type="email" data-sender="email" value="${esc(g.sender.email)}" autocomplete="email"></label></div>
        </fieldset>
      </form>
    </div>
    <div class="lt-main">
      <div class="lt-banner" id="lt-banner" hidden></div>
      <div class="lt-actions">
        <button type="button" class="btn btn--onGreen" data-act="copy">Copy letter</button>
        <button type="button" class="btn btn--ghost" data-act="download">Download .txt</button>
        <a class="textbtn" href="#review">Back to the questions</a>
      </div>
      <div class="sheet"><label class="sr" for="letter-text">Letter text. You can edit it.</label><textarea id="letter-text" spellcheck="true"></textarea></div>
      <p class="lt-fine">Synthetic example: fictional hospital, account and prices. Nothing is sent from here; copy the text or download it.</p>
    </div>
  </div>`;
}

function composeNow() { return H.composeLetter({ bill: B(), findings: includedFindings(), sender: globals.sender, options: globals.options }); }
function letterKey() { return JSON.stringify([caseKey, includedFindings().map(f => f.id), globals.options, globals.sender]); }
function fitLetter() { const ta = $('#letter-text'); if (!ta) return; ta.style.height = 'auto'; ta.style.height = `${ta.scrollHeight + 4}px`; }

function renderBanner() {
  const el = $('#lt-banner'); if (!el) return;
  const L = S().letter, stale = L.dirty && L.key !== letterKey();
  if (!L.dirty) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  el.innerHTML = stale
    ? `<p><strong>Your questions or options changed after you edited this letter.</strong> Rebuild it from what you’ve kept? Your edits will be replaced, and you can undo.</p><div><button type="button" class="btn btn--onGreen btn--sm" data-act="rebuild">Rebuild the letter</button> <button type="button" class="btn btn--ghost btn--sm" data-act="keep">Keep my edits</button></div>`
    : `<p>You’ve edited this letter by hand.</p><div><button type="button" class="btn btn--ghost btn--sm" data-act="rebuild">Start over from the questions</button></div>`;
}

function syncLetter({ announce = false } = {}) {
  const ta = $('#letter-text'); if (!ta) return;
  const L = S().letter, composed = composeNow();
  if (!L.dirty) {
    L.text = composed; L.key = letterKey(); ta.value = composed;
    if (announce) say(`Letter rebuilt with ${includedFindings().length} of ${F().length} questions.`);
  } else if (announce) say('Your edited letter is unchanged. Choose Rebuild to replace it.');
  fitLetter(); renderBanner(); updateCounts();
}

/* ============================================================
   state appliers
   ============================================================ */
function updateCounts() {
  const n = includedFindings().length, total = F().length;
  $$('[data-count]').forEach(e => (e.textContent = n));
  $$('[data-count-word]').forEach(e => (e.textContent = n === 1 ? 'question' : 'questions'));
  $$('[data-count-text]').forEach(e => (e.textContent = `${n} of ${total}`));
}

function applyInclusion() {
  const s = S();
  F().forEach((f, i) => {
    const q = i + 1, on = !s.aside.has(f.id);
    $$(`.art[data-n="${q}"], .trow[data-n="${q}"], .tdetail[data-n="${q}"]`).forEach(e => e.classList.toggle('is-aside', !on));
    $$(`.inc-b[data-n="${q}"]`).forEach(b => b.setAttribute('aria-pressed', String((b.dataset.v === '1') === on)));
    $$(`.inc-state[data-n="${q}"]`).forEach(e => (e.textContent = on ? 'In your letter' : 'Set aside'));
    const cb = $(`input[data-q="${q}"]`); if (cb) cb.checked = on;
  });
  updateCounts();
}

function setIncluded(q, on, { quiet = false } = {}) {
  const f = F()[q - 1], s = S();
  if (!f || (!s.aside.has(f.id)) === on) return;
  on ? s.aside.delete(f.id) : s.aside.add(f.id);
  applyInclusion();
  const n = includedFindings().length;
  const msg = `Question ${q} ${on ? 'included' : 'set aside'}. ${n} of ${F().length} in your letter.`;
  if (ui.view === 'letter') { const dirty = s.letter.dirty; syncLetter(); say(dirty ? `${msg} Your edited letter has not changed.` : `${msg} Letter rebuilt.`, quiet ? null : () => setIncluded(q, !on, { quiet: true })); }
  else say(msg, quiet ? null : () => setIncluded(q, !on, { quiet: true }));
}

function applySelection({ scroll = true } = {}) {
  const s = S(), f = s.sel ? F()[s.sel - 1] : null;
  $$('.art, .trow').forEach(e => e.classList.toggle('is-sel', +e.dataset.n === s.sel));
  $$('[data-act="select"]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.n === s.sel)));
  const ids = new Set(f ? f.lineIds : []);
  const tots = new Set(f && !f.lineIds.length ? TOTAL_TARGETS[f.rule] || [] : []);
  $$('.rev-side .srow').forEach(r => r.classList.toggle('is-marked', ids.has(r.dataset.line)));
  $$('.art .srow').forEach(r => r.classList.toggle('is-marked', ids.has(r.dataset.line)));
  $$('.rev-side .trow2').forEach(r => r.classList.toggle('is-marked', tots.has(r.dataset.tot)));
  if (scroll && f) {
    const first = $('.rev-side .srow.is-marked') || $('.rev-side .trow2.is-marked');
    scrollStmt(first);
  }
}

function scrollStmt(el) {
  const sc = $('.stmt-scroll'); if (!sc || !el || !sc.offsetParent) return;
  const top = el.offsetTop - sc.clientHeight * 0.28;
  sc.scrollTo({ top: Math.max(0, top), behavior: smooth() });
}

function select(q, { reveal = false } = {}) {
  const s = S(); s.sel = q;
  applySelection();
  if (q) {
    const f = F()[q - 1];
    say(`Question ${q} selected. ${f.lineIds.length ? `${f.lineIds.length === 1 ? 'One line is' : `${f.lineIds.length} lines are`} marked on your statement.` : 'The totals are marked on your statement.'}`);
    if (reveal) {
      const t = ui.read === 'story' ? $(`#q${q}`) : $(`#tq${q}`);
      if (t) t.scrollIntoView({ block: 'start', behavior: smooth() });
    }
  }
}

function openLine(id) {
  const s = S(); s.openLine = s.openLine === id ? null : id;
  $$('.rev-side .srow').forEach(r => {
    const open = r.dataset.line === s.openLine, btn = $('.srow-btn', r), d = $('.sdetail', r);
    if (!d) return;
    btn.setAttribute('aria-expanded', String(open)); d.hidden = !open; r.classList.toggle('is-open', open);
  });
}

/* ============================================================
   announcements and toast
   ============================================================ */
let toastTimer = 0, undoFn = null;
function say(msg, undo) {
  const st = $('#status'); st.textContent = ''; requestAnimationFrame(() => (st.textContent = msg));
  const t = $('#toast'), u = $('.toast-undo', t);
  $('.toast-msg', t).textContent = msg; t.hidden = false; undoFn = undo || null; u.hidden = !undo;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), undo ? 9000 : 4200);
}

/* ============================================================
   glossary popover and misc handlers
   ============================================================ */
let glossTrigger = null;
function closeGloss(refocus) {
  const el = $('#gloss'); if (el.hidden) return;
  el.hidden = true;
  if (glossTrigger) { glossTrigger.setAttribute('aria-expanded', 'false'); if (refocus && document.contains(glossTrigger)) glossTrigger.focus(); }
  glossTrigger = null;
}
function openGloss(btn) {
  if (glossTrigger === btn) return closeGloss(true);
  closeGloss(false);
  const g = GLOSS[btn.dataset.k], el = $('#gloss');
  el.setAttribute('aria-label', g.t);
  el.innerHTML = `<p class="g-t">${esc(g.t)}</p><p>${esc(g.d)}</p>${g.link ? `<p><a href="${g.link[0]}" target="_blank" rel="noopener noreferrer">${esc(g.link[1])}</a></p>` : ''}<button type="button" class="g-x" data-act="gclose">Close</button>`;
  el.hidden = false; btn.setAttribute('aria-expanded', 'true'); glossTrigger = btn;
  const r = btn.getBoundingClientRect(), w = el.offsetWidth;
  el.style.top = `${r.bottom + scrollY + 8}px`;
  el.style.left = `${Math.min(Math.max(12, r.left + scrollX), document.documentElement.clientWidth - w - 12)}px`;
  el.focus({ preventScroll: true });
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* ignore */ } ta.remove(); return ok;
}

function click(e) {
  const t = e.target;
  if (!t.closest('#gloss, .term')) closeGloss(false);
  const el = t.closest('[data-act]');
  if (!el) {
    const art = t.closest('.art');
    if (art && !t.closest('a,button,input,textarea,label') && !String(getSelection()).length) select(+art.dataset.n);
    return;
  }
  const act = el.dataset.act, n = +el.dataset.n;
  switch (act) {
    case 'term': openGloss(el); break;
    case 'gclose': closeGloss(true); break;
    case 'own': $('#own').showModal(); break;
    case 'anat': ui.anat = el.dataset.m; applyAnat(); break;
    case 'read': ui.read = el.dataset.m; $$('[data-act="read"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === ui.read))); $('.rev-arts').dataset.read = ui.read; say(ui.read === 'story' ? 'Reading as story.' : 'Reading as table.'); break;
    case 'select': select(S().sel === n ? null : n); break;
    case 'inc': setIncluded(n, el.dataset.v === '1'); break;
    case 'line': openLine(el.dataset.id); break;
    case 'stmt': { const st = $('.stmt'), open = st.dataset.open !== 'true'; st.dataset.open = open; el.setAttribute('aria-expanded', String(open)); break; }
    case 'item': { const open = el.getAttribute('aria-expanded') !== 'true'; el.setAttribute('aria-expanded', String(open)); $('#' + el.getAttribute('aria-controls')).hidden = !open; $('.item-tog', el).textContent = open ? 'Close the box' : 'Open the box'; break; }
    case 'goq': {
      if (ui.view !== 'review') { S().sel = n; ui.reveal = n; location.hash = '#review'; } else select(n, { reveal: true });
      break;
    }
    case 'copy': {
      const text = $('#letter-text').value;
      (navigator.clipboard ? navigator.clipboard.writeText(text).then(() => true, () => fallbackCopy(text)) : Promise.resolve(fallbackCopy(text))).then(ok => say(ok ? 'Letter copied to the clipboard.' : 'Copy was blocked. Select the text and copy it by hand.'));
      break;
    }
    case 'download': {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([$('#letter-text').value], { type: 'text/plain' })); a.download = 'letter-to-billing-office.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 500); say('Letter downloaded as a text file.'); break;
    }
    case 'rebuild': {
      const L = S().letter, prev = L.text, prevKey = L.key;
      L.dirty = false; syncLetter();
      say(`Letter rebuilt with ${includedFindings().length} of ${F().length} questions.`, () => { L.text = prev; L.dirty = true; L.key = letterKey(); const ta = $('#letter-text'); ta.value = prev; fitLetter(); renderBanner(); say('Your edits are back.'); });
      break;
    }
    case 'keep': S().letter.key = letterKey(); renderBanner(); say('Keeping your edits.'); break;
  }
}

function applyAnat() {
  const root = $('.anat'); if (!root) return;
  root.dataset.mode = ui.anat;
  $$('[data-act="anat"]', root).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === ui.anat)));
  const fs = F();
  $('#anat-note').textContent = ui.anat === 'any' ? 'The five columns, with what each one tells you.' : `The same statement, with the ${word(fs.length).toLowerCase()} questions pinned to the lines they point at.`;
  rebuildPhoneAnat();
  requestAnimationFrame(layoutLeaders);
  say(ui.anat === 'any' ? 'Showing what each column means on any bill.' : 'Showing the questions pinned to your bill.');
}
function rebuildPhoneAnat() {
  /* the phone list is regenerated from a fresh front build fragment to keep markup in one place */
  const tmp = document.createElement('div'); tmp.innerHTML = buildFront();
  $('.anat-phone').innerHTML = $('.anat-phone', tmp).innerHTML;
}

function keydown(e) {
  if (e.key === 'Escape') { if (!$('#gloss').hidden) { closeGloss(true); e.preventDefault(); } }
}

function input(e) {
  const t = e.target;
  if (t.dataset.opt) { globals.options[t.dataset.opt] = t.checked; syncLetter({ announce: true }); }
  else if (t.dataset.sender) { globals.sender[t.dataset.sender] = t.value; syncLetter(); }
  else if (t.id === 'letter-text') { const L = S().letter; L.text = t.value; L.dirty = t.value !== composeNow(); fitLetter(); renderBanner(); }
}
function change(e) {
  const t = e.target;
  if (t.dataset.q) setIncluded(+t.dataset.q, t.checked);
}

/* ============================================================
   shell: routing, sample switch, view building
   ============================================================ */
const BUILD = { front: buildFront, review: buildReview, letter: buildLetter };
const TITLES = { front: 'Second Opinion, your bill read line by line', review: 'Review, the questions on your bill', letter: 'Your letter to the billing office' };

function ensureBuilt(v) {
  const key = `${caseKey}`;
  if (built[v] === key) return;
  $(`#view-${v}`).innerHTML = BUILD[v]();
  built[v] = key;
  if (v === 'review') { applyInclusion(); applySelection({ scroll: false }); const o = S().openLine; S().openLine = null; if (o) openLine(o); }
  if (v === 'letter') { syncLetter(); }
  if (v === 'front') { requestAnimationFrame(layoutLeaders); }
}

function go(fn) {
  if (document.startViewTransition && !H.reducedMotion()) { try { document.startViewTransition(fn); return; } catch (e) { /* fall through */ } }
  fn();
}

function route(first) {
  const raw = location.hash.replace('#', '');
  const v = BUILD[raw] ? raw : 'front';
  const show = () => {
    ui.view = v;
    ensureBuilt(v);
    $$('.view').forEach(s => (s.hidden = s.dataset.view !== v));
    document.body.dataset.view = v;
    document.title = TITLES[v];
    $$('[data-nav]').forEach(a => (a.dataset.nav === v ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    if (!first) { scrollTo(0, 0); const h = $(`#view-${v} h1`); if (h) h.focus({ preventScroll: true }); }
    if (v === 'review' && S().sel) requestAnimationFrame(() => { applySelection(); if (ui.reveal) { const t = ui.read === 'story' ? $(`#q${ui.reveal}`) : $(`#tq${ui.reveal}`); ui.reveal = 0; if (t) t.scrollIntoView({ block: 'start' }); } });
    if (v === 'front') requestAnimationFrame(layoutLeaders);
  };
  first ? show() : go(show);
}

function setSample(k) {
  if (k === caseKey) return;
  caseKey = k;
  try { history.replaceState(null, '', `?sample=${k}${location.hash}`); } catch (e) { /* file:// may refuse */ }
  Object.keys(built).forEach(x => delete built[x]);
  go(() => { syncSampleButtons(); route(true); });
  say(`Showing the ${SAMPLE_NAME[k]}: ${B().provider}.`);
}
function syncSampleButtons() { $$('[data-sample]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sample === caseKey))); }

document.addEventListener('click', click);
document.addEventListener('keydown', keydown);
document.addEventListener('input', input);
document.addEventListener('change', change);
$$('[data-sample]').forEach(b => b.addEventListener('click', () => setSample(b.dataset.sample)));
$('.toast-undo').addEventListener('click', () => { const f = undoFn; $('#toast').hidden = true; if (f) f(); });
$('#own').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });
window.addEventListener('hashchange', () => route(false));
let rz = 0; window.addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { layoutLeaders(); fitLetter(); }); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layoutLeaders(); fitLetter(); });

syncSampleButtons();
route(true);
})();
