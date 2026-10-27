"use strict";
/* ============================================================
   Vic Metro team feedback survey. Public, no login, name optional (blank = anonymous).
   One step per section (name -> business -> leadership -> me as a leader -> final). Answers -> public.team_survey_responses
   (Supabase, anon INSERT only, RLS). Same calm send as the careers pages: draft saved on the phone, cleared on submit,
   queued + quiet retries with the same id (duplicate = already in = success), never an error shown.
   Built by build.py from src/questions.json. ?test=1 = TEST banner + is_test=true.
   ============================================================ */
const SUPA_URL = "https://kxnrfzddfcivgjrilnnc.supabase.co";
const SUPA_KEY = "%%SUPA_KEY%%"; // public anon key: INSERT only on team_survey_responses (RLS)
const TABLE = "team_survey_responses";
const CFG = %%CFG%%;
const IS_TEST = /[?&]test=1\b/.test(location.search);
const KEY = `vm-team-survey${IS_TEST ? ":test" : ""}`;
const QKEY = "vm-team-survey-q";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => (self.crypto && crypto.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c => (c ^ Math.random() * 16 >> c / 4).toString(16)));
const st = (() => { try { const s = localStorage; s.setItem("_t", "1"); s.removeItem("_t"); return s; } catch { return null; } })();
const mem = {};
const lsGet = (k, fb) => { try { const r = st ? st.getItem(k) : mem[k]; return r ? JSON.parse(r) : fb; } catch { return fb; } };
const lsSet = (k, v) => { const s = v == null ? null : JSON.stringify(v); try { if (st) { if (s == null) st.removeItem(k); else st.setItem(k, s); return; } } catch { } if (s == null) delete mem[k]; else mem[k] = s; };

const SECS = CFG.sections, ALLQ = SECS.flatMap(s => s.questions), REQ = ALLQ.filter(q => !q.optional);
const NSTEPS = SECS.length + 1; // step 0 = intro + name
const blank = () => ({ step: 0, name: "", hp: "", a: {} });
let F = Object.assign(blank(), lsGet(`${KEY}:draft`, {})); F.a = F.a || {};
if (!(F.step >= 0 && F.step < NSTEPS)) F.step = 0;
let tried = false;
const save = () => lsSet(`${KEY}:draft`, F);
const has = q => String(F.a[q.id] || "").trim() !== "";
const stepIssues = i => i === 0 ? [] : SECS[i - 1].questions.filter(q => !q.optional && !has(q)).map(q => [q.id, `Question ${q.n}`]);

const VMARK = `%%VMARK%%`;
function header() {
  return `${IS_TEST ? `<div class="testbar"><span>TEST MODE · NOT A REAL RESPONSE</span></div>` : ""}<header class="hd">${VMARK}<div class="logo" aria-label="Vic Metro">%%LOGO%%</div>
  <div class="ttl"><h1>Team <b>·</b> Feedback</h1><span class="dt">Vic Metro Brick &amp; Block · VM Construction Services</span></div></header>`;
}
function progress() {
  const n = REQ.filter(has).length;
  return `<div class="prog"><div class="row"><span>Step ${F.step + 1} of ${NSTEPS}</span><span>${n} of ${REQ.length} answered</span></div><div class="bar"><i style="width:${Math.round(100 * n / REQ.length)}%"></i></div></div>`;
}
function card(q) {
  const v = F.a[q.id] || "";
  const body = q.type === "scale"
    ? `<div class="chips wide radio" role="radiogroup">${q.options.map(o => `<button type="button" class="chip${v === o ? " on" : ""}" data-q="${esc(q.id)}" data-v="${esc(o)}" aria-pressed="${v === o}"><span class="t">${esc(o)}</span></button>`).join("")}</div>`
    : `<textarea class="in" data-a="${esc(q.id)}" maxlength="3000" rows="4" placeholder="Type your answer">${esc(v)}</textarea>`;
  return `<div class="qc" id="f-${esc(q.id)}"><div class="qn">${q.n}<span>/${ALLQ.length}</span></div><div class="qt">${esc(q.text)}${q.optional ? ' <span class="opt">(optional)</span>' : ""}</div>${body}</div>`;
}
function stepHtml() {
  if (F.step === 0) return `<section class="sec"><div class="kick">Before you start</div><h2 class="q">${esc(CFG.title)}</h2><p class="intro">${esc(CFG.intro)}</p>
    <div class="col"><div class="fld" id="f-name"><label class="lbl" for="i-name">${esc(CFG.name.label)}</label>
    <input class="in" id="i-name" data-f="name" type="text" autocomplete="off" maxlength="120" placeholder="Your name" value="${esc(F.name)}"><div class="hint">${esc(CFG.name.hint)}</div></div>
    <div class="hpf" aria-hidden="true"><label>Leave this box empty<input data-f="hp" tabindex="-1" autocomplete="off" data-lpignore="true" data-1p-ignore value=""></label></div></div></section>`;
  const s = SECS[F.step - 1];
  return `<section class="sec"><div class="kick">Section ${F.step} of ${SECS.length}</div><h2 class="q">${esc(s.title)}</h2><div class="col">${s.questions.map(card).join("")}<div id="iss"></div>
    ${F.step === NSTEPS - 1 ? `<p class="priv">Your answers are confidential and go only to the Vic Metro leadership team.${F.name.trim() ? "" : " You haven't put a name in, so this goes in as anonymous."}</p>` : ""}</div></section>`;
}
const app = document.getElementById("app");
function paint(top = true) {
  const last = F.step === NSTEPS - 1;
  app.innerHTML = header() + progress() + `<main>${stepHtml()}<div class="foot">Vic Metro · Melbourne</div></main>
    <div class="nav"><div class="in2${F.step ? "" : " one"}">${F.step ? `<button type="button" class="btn s" id="back">Back</button>` : ""}<button type="button" class="btn p" id="next">${last ? "Send my answers" : F.step ? "Next" : "Start"}</button></div></div>`;
  showIssues(); if (top) scrollTo(0, 0);
}
function showIssues() {
  const box = document.getElementById("iss"); if (!box) return;
  document.querySelectorAll(".need").forEach(e => e.classList.remove("need"));
  if (!tried) { box.innerHTML = ""; return; }
  const L = stepIssues(F.step); L.forEach(([k]) => { const e = document.getElementById(`f-${k}`); if (e) e.classList.add("need"); });
  box.innerHTML = L.length ? `<div class="iss"><b>Nearly there. Still to answer:</b>${L.map(([k, m]) => `<button type="button" class="lnk" data-go="${k}">${esc(m)}</button>`).join("")}</div>` : "";
}
function upd() { const p = document.querySelector(".prog"); if (p) p.outerHTML = progress(); }
function clearNeed(k) { if (!tried || stepIssues(F.step).some(x => x[0] === k)) return; const e = document.getElementById(`f-${k}`); if (e) e.classList.remove("need"); }
function next() {
  tried = true; const L = stepIssues(F.step); showIssues();
  if (L.length) { const el = document.getElementById(`f-${L[0][0]}`); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
  tried = false;
  if (F.step === NSTEPS - 1) return submit();
  F.step++; save(); paint();
}
app.addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.id === "next") return next();
  if (b.id === "back") { tried = false; F.step = Math.max(0, F.step - 1); save(); return paint(); }
  if (b.dataset.go) { const el = document.getElementById(`f-${b.dataset.go}`); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
  if (b.dataset.q) { F.a[b.dataset.q] = b.dataset.v; b.parentElement.querySelectorAll(".chip").forEach(c => { const on = c === b; c.classList.toggle("on", on); c.setAttribute("aria-pressed", on); }); save(); upd(); clearNeed(b.dataset.q); }
});
app.addEventListener("input", e => {
  const t = e.target;
  if (t.dataset.f) F[t.dataset.f] = t.value; else if (t.dataset.a) F.a[t.dataset.a] = t.value; else return;
  save(); upd(); if (t.dataset.a) clearNeed(t.dataset.a);
});

/* ---------- send: queued on the phone first, quiet retries, same id ---------- */
const sHdrs = () => ({ apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" });
const transient = s => !s || s === 408 || s === 425 || s === 429 || s >= 500;
async function post(row) {
  let r; try { const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 15000);
    r = await fetch(`${SUPA_URL}/rest/v1/${TABLE}`, { method: "POST", headers: sHdrs(), body: JSON.stringify(row), signal: ctl.signal }); clearTimeout(tm); }
  catch (e) { throw Object.assign(new Error(`no connection (${e && e.message})`), { status: 0 }); }
  if (r.ok) return;
  const t = await r.text().catch(() => "");
  if (r.status === 409 || /duplicate key/i.test(t)) return;
  throw Object.assign(new Error(`insert ${r.status} ${t.slice(0, 300)}`), { status: r.status });
}
// refused outright (4xx): send a slim, flagged copy so nothing is lost
const rescue = (row, err) => ({ id: row.id, is_test: row.is_test, source: "web-rescue", name: row.name ? String(row.name).slice(0, 120) : null,
  details: { survey_version: row.details && row.details.survey_version, send_rescue: { status: err.status, error: String(err.message).slice(0, 300) } },
  answers: Object.fromEntries(Object.entries(row.answers || {}).map(([k, v]) => [k, String(v).slice(0, 1500)])) });
const qAll = () => lsGet(QKEY, []);
const qSet = q => lsSet(QKEY, q.length ? q : null);
async function sendOne(item) { try { await post(item.row); } catch (e) { if (transient(e.status)) throw e; console.warn("refused, sending a flagged copy", e); await post(rescue(item.row, e)); } }
let flushing = false, timer = null, tries = 0;
async function flush() {
  if (flushing) return []; flushing = true; clearTimeout(timer);
  const left = [], sentNow = [];
  for (const item of qAll()) { try { await sendOne(item); sentNow.push(item.sid); } catch (e) { item.tries = (item.tries || 0) + 1; item.lastError = String(e.message); left.push(item); } }
  qSet(qAll().filter(x => !sentNow.includes(x.sid)).map(x => left.find(l => l.sid === x.sid) || x));
  flushing = false;
  if (qAll().length) timer = setTimeout(() => flush().then(onFlushed), Math.min(30000, 3000 * Math.pow(2, tries++))); else tries = 0;
  return sentNow;
}
addEventListener("online", () => { tries = 0; flush().then(onFlushed); });
addEventListener("pageshow", e => { if (e.persisted) flush().then(onFlushed); });
let waiting = null;
function onFlushed(sent) { if (waiting && (sent || []).includes(waiting.sid)) { const n = waiting.name; waiting = null; paintThanks(n); } }
function paintSending(slow) { app.innerHTML = header() + `<main><div class="done"><div class="spin big"></div><h2>Sending…</h2><p>${slow ? "Still sending. It'll finish by itself when you've got signal. Keep this page open for a minute." : "Won't be a sec."}</p></div></main>`; }
function paintThanks(name) {
  const first = String(name || "").trim().split(/\s+/)[0];
  app.innerHTML = header() + `<main><div class="done"><svg class="ck" viewBox="0 0 132 132" aria-hidden="true"><circle class="c0" cx="66" cy="66" r="58"/><circle class="c1" cx="66" cy="66" r="58"/><path class="m" d="M40 68l18 18 34-38"/></svg>
    <h2>Thanks${first ? `, ${esc(first)}` : ""}!</h2><p>We've got your answers. Thanks for being honest, it helps us make Vic Metro a better place to work.</p><p class="hint">You can close this page now.</p></div></main>`;
}
let submitting = false;
async function submit() {
  if (submitting) return; submitting = true;
  const now = new Date(), sid = uid();
  const answers = {}; ALLQ.forEach(q => { const t = String(F.a[q.id] || "").trim(); if (t) answers[q.id] = t.slice(0, 3000); });
  const name = F.name.trim().slice(0, 120) || null;
  const details = { survey_version: CFG.survey_version, submitted_at_local: now.toLocaleString("sv-SE", { timeZone: "Australia/Melbourne" }) };
  const row = { id: sid, is_test: IS_TEST, source: "web", name, answers, details };
  if (F.hp) { details.honeypot = String(F.hp).slice(0, 200); row.source = "web-hp"; } // hidden box filled: still sent, flagged, never dropped
  qSet([...qAll(), { sid, row, queuedAt: now.toISOString() }]);
  F = blank(); lsSet(`${KEY}:draft`, null); tried = false;
  waiting = { sid, name };
  paintSending(false); scrollTo(0, 0);
  const slow = setTimeout(() => { if (waiting && waiting.sid === sid) paintSending(true); }, 8000);
  const sent = await flush(); submitting = false;
  if ((sent || []).includes(sid)) { clearTimeout(slow); waiting = null; paintThanks(name); }
  else { const iv = setInterval(() => { if (!waiting) { clearInterval(iv); clearTimeout(slow); } else flush().then(onFlushed); }, 4000); }
}
paint();
if (qAll().length) flush();
window.__vm = { cfg: CFG, get F() { return F; }, flush, qAll, next };
