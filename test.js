// Money Life — balance and regression harness.
// Runs the real game script from money-life.html under a tiny DOM stub, plays hundreds of lives, and fails loudly
// if anything throws or the balance drifts out of the ranges that make the game fair.
//   node test.js            full run
//   node test.js quick      fewer seeds
'use strict';
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/money-life.html', 'utf8');
const js = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));

// ---------- DOM stub: every element is a permissive object; reads come back undefined, writes are absorbed ----------
function el() {
  const t = { classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, style: { setProperty() {} }, dataset: {}, children: [] };
  return new Proxy(t, {
    get(o, k) {
      if (k in o) return o[k];
      if (['querySelectorAll', 'getElementsByClassName'].includes(k)) return () => [];
      if (['querySelector', 'closest', 'appendChild', 'prepend', 'insertBefore', 'getContext'].includes(k)) return () => el();
      if (['addEventListener', 'removeEventListener', 'remove', 'click', 'focus', 'scrollIntoView', 'setAttribute', 'toBlob', 'fill', 'fillRect', 'beginPath', 'roundRect', 'fillText', 'stroke', 'moveTo', 'lineTo'].includes(k)) return () => {};
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'toDataURL') return () => 'data:,';
      if (['parentElement', 'nextElementSibling', 'body', 'documentElement'].includes(k)) return el();
      if (k === 'offsetWidth') return 1;
      return undefined;
    },
    set(o, k, v) { o[k] = v; return true; },
  });
}
const root = el();
global.document = new Proxy({}, { get(_, k) { if (k === 'getElementById' || k === 'createElement' || k === 'querySelector') return () => el(); if (k === 'querySelectorAll') return () => []; if (['addEventListener', 'dispatchEvent'].includes(k)) return () => {}; return root[k]; } });
global.window = { matchMedia: () => ({ matches: true }), innerWidth: 1200, scrollTo() {}, addEventListener() {}, claude: undefined };
global.localStorage = { getItem() { throw new Error('no storage'); }, setItem() { throw new Error('no storage'); }, removeItem() {} };
global.requestAnimationFrame = () => 0; global.cancelAnimationFrame = () => {}; global.performance = { now: () => 0 };
try { Object.defineProperty(global, 'navigator', { value: {}, configurable: true }); } catch (e) {}

// ---------- load the game ----------
const ctx = {};
new Function('exportsTo', js + '\nObject.assign(exportsTo, { PERSONAS, newState, makeDraws, cardFor, applyCard, simulateYear, ghostYear, evaluate, netWorth, money, START_AGE, END_AGE, RETIRE_AGE, freedomOf, setG: g => { G = g; }, setPlayers: p => { players = p; }, setPersona: (id, a) => { personaId = id; startAgeSel = a; }, setSeed: v => { seed = v; draws = makeDraws(v); }, getG: () => G, updateDreams, DREAMS });')(ctx);
const E = ctx;

// ---------- policies ----------
const PICKS = {
  sensible: { insure: 0, car: 2, crypto: 1, marry: 0, job: 1, term: 0, house: 0, kid: s => s.kids.length ? 1 : 0, chit: 1, mba: 1, mlm: 1, vacation: 1, rental: 1, coop: 1, side: 1, parents: 0, cosign: 1, adviser: 1, glide: 0, dreamcar: 1, downsize: 0, crash: 1, college: 0, wedding: 1, hike: 1, retire: 0, kidhouse: 1, move: 1, crunch: 0, hop31: 1, hop47: 1, early: 2 },
  family:   { insure: 0, car: 0, crypto: 1, marry: 1, job: 1, term: 0, house: 0, kid: 0, chit: 0, mba: 1, mlm: 1, vacation: 0, rental: 0, coop: 1, side: 1, parents: 0, cosign: 1, adviser: 1, glide: 0, dreamcar: 0, downsize: 1, crash: 1, college: 1, wedding: 0, hike: 0, retire: 1, kidhouse: 0, move: 1, crunch: 1, hop31: 0, hop47: 1, early: 2 },
  yolo:     { insure: 1, car: 0, crypto: 0, marry: 1, job: 0, term: 1, house: 0, kid: 0, chit: 0, mba: 0, mlm: 0, vacation: 0, rental: 0, coop: 0, side: 0, parents: 1, cosign: 0, adviser: 0, glide: 2, dreamcar: 0, downsize: 1, crash: 0, college: 1, wedding: 0, hike: 0, retire: 1, kidhouse: 0, move: 1, crunch: 1, hop31: 0, hop47: 0, early: 0 },
  careful:  { insure: 0, car: 2, crypto: 1, marry: 0, job: 1, term: 0, house: 0, kid: 0, chit: 1, mba: 1, mlm: 1, vacation: 0, rental: 1, coop: 1, side: 1, parents: 0, cosign: 1, adviser: 1, glide: 0, dreamcar: 1, downsize: 0, crash: 1, college: 0, wedding: 1, hike: 1, retire: 0, kidhouse: 1, move: 1, crunch: 0, hop31: 0, hop47: 1, early: 2 },
  early:    { insure: 0, car: 2, crypto: 1, marry: 0, job: 1, term: 0, house: 1, kid: 1, chit: 1, mba: 1, mlm: 1, vacation: 1, rental: 1, coop: 1, side: 1, parents: 0, cosign: 1, adviser: 1, glide: 0, dreamcar: 1, downsize: 0, crash: 1, college: 0, wedding: 1, hike: 1, retire: 0, kidhouse: 1, move: 1, crunch: 0, hop31: 0, hop47: 1, early: 0 },
};
const HABITS = {
  sensible: { lifestyle: 'normal', investPct: 75, equityPct: 70, goldPct: 10, payDebt: true, c80: true, npsOn: true, selfCare: true },
  family:   { lifestyle: 'normal', investPct: 60, equityPct: 60, goldPct: 10, payDebt: true, c80: true, npsOn: false, selfCare: false },
  yolo:     { lifestyle: 'lavish', investPct: 20, equityPct: 100, goldPct: 0, payDebt: false, c80: false, npsOn: false, selfCare: false },
  careful:  { lifestyle: 'normal', investPct: 60, equityPct: 60, goldPct: 10, payDebt: true, c80: true, npsOn: false, selfCare: true },
  early:    { lifestyle: 'frugal', investPct: 90, equityPct: 80, goldPct: 10, payDebt: true, c80: true, npsOn: true, selfCare: true },
};

// ---------- play one life, engine only (no render) ----------
function life(persona, startAge, seed, policy) {
  E.setPersona(persona, startAge); E.setSeed(seed);
  const s = E.newState(persona, startAge), G = E.newState(persona, startAge); E.setG(G);
  const p = { name: 'T', s, log: [], decisions: [], dreams: ['house', 'free55', 'trip'], dreamState: {}, call: 'beat' };
  E.setPlayers([p]);
  const draws = E.makeDraws(seed);
  const picks = PICKS[policy], habits = HABITS[policy];
  let years = 0;
  while (s.age < E.END_AGE && !s.dead && years < 80) {
    if (!s.retired) Object.assign(s, habits);
    const d = draws[s.age - E.START_AGE];
    const c = E.cardFor(s, d);
    if (c) {
      let i = picks[c.id] ?? 1; if (typeof i === 'function') i = i(s); const o = c.opts[i];
      if (o.can && !o.can(s)) i = c.ghostFallback ?? 1;
      if (i >= c.opts.length) i = c.opts.length - 1;
      const vars = c.vars ? c.vars(s) : {};
      const m = E.applyCard(s, c, i, d); if (m) p.log.push({ age: s.age, t: m, k: 'choice' });
      p.decisions.push({ age: s.age, id: c.id, key: c.key, opt: i, label: '' });
    }
    const msgs = E.simulateYear(s, d);
    E.ghostYear(G, d);
    msgs.filter(m => m.k === 'neg' || m.k === 'pos').forEach(m => p.log.push({ age: s.age - 1, t: m.t, k: m.k }));
    E.updateDreams(p);
    years++;
  }
  const ev = E.evaluate(p);
  return { grade: ev.letter, nw: ev.nw, gnw: ev.gnw, broke: s.brokeAt, dead: s.dead, retiredAt: s.retiredAt, happy: s.happy, health: s.health, bk: s.bankruptcies, years, ghostDead: G.dead, ghostBroke: G.brokeAt };
}

// ---------- scenarios and assertions ----------
const quick = process.argv.includes('quick');
const SEEDS = Array.from({ length: quick ? 6 : 16 }, (_, i) => i + 1);
const failures = [], rows = [];
const dist = arr => 'SABCDF'.split('').map(g => g + arr.filter(r => r.grade === g).length).filter(x => !/0$/.test(x)).join(' ');
const share = (arr, f) => arr.filter(f).length / arr.length;
function scenario(name, persona, startAge, policy, expect) {
  const res = [];
  for (const sd of SEEDS) {
    try { res.push(life(persona, startAge, sd, policy)); }
    catch (e) { failures.push(`${name} seed ${sd}: THREW ${e.message}\n${e.stack.split('\n').slice(1, 3).join('\n')}`); }
  }
  if (!res.length) return;
  const good = share(res, r => 'SA'.includes(r.grade)), bad = share(res, r => 'DF'.includes(r.grade));
  const line = `${name.padEnd(28)} ${dist(res).padEnd(20)} broke ${Math.round(share(res, r => r.broke) * 100)}%  early ${Math.round(share(res, r => r.retiredAt && r.retiredAt < 60) * 100)}%  died<85 ${Math.round(share(res, r => r.dead) * 100)}%  avg happy ${Math.round(res.reduce((a, r) => a + r.happy, 0) / res.length)}  health ${Math.round(res.reduce((a, r) => a + r.health, 0) / res.length)}`;
  rows.push(line);
  for (const [k, [lo, hi]] of Object.entries(expect)) {
    const v = k === 'good' ? good : k === 'bad' ? bad : k === 'broke' ? share(res, r => r.broke) : k === 'early' ? share(res, r => r.retiredAt && r.retiredAt < 60) : 0;
    if (v < lo || v > hi) failures.push(`${name}: ${k} share ${(v * 100).toFixed(0)}% outside [${lo * 100}%, ${hi * 100}%]`);
  }
  if (res.some(r => r.ghostDead)) failures.push(`${name}: the ghost died (it must not)`);
  if (res.some(r => r.years > 64)) failures.push(`${name}: a life ran more than 64 years`);
}

scenario('grad · textbook', 'grad', 22, 'sensible', { good: [0.7, 1], broke: [0, 0.1] });
scenario('grad · normal family', 'grad', 22, 'family', { bad: [0.1, 0.9] });
scenario('grad · careful, two kids', 'grad', 22, 'careful', { good: [0.3, 1], broke: [0, 0.5] });
scenario('grad · lavish yolo', 'grad', 22, 'yolo', { bad: [0.7, 1] });
scenario('grad · frugal early-retire', 'grad', 22, 'early', { early: [0.3, 1], broke: [0, 0.4] });
scenario('tier2 · textbook', 'tier2', 22, 'sensible', { good: [0.3, 1] });
scenario('topper · textbook', 'topper', 22, 'sensible', { good: [0.6, 1] });
scenario('govt · textbook', 'govt', 22, 'sensible', { good: [0.6, 1] });
scenario('heir · family', 'heir', 22, 'family', {});
scenario('parent · textbook', 'parent', 30, 'sensible', {});
scenario('grad @35 · textbook', 'grad', 35, 'sensible', { good: [0.4, 1] });
scenario('topper @40 · family', 'topper', 40, 'family', {});
// play-as-yourself
Object.assign(E.PERSONAS.you, { salary: 90000 / 0.8, cash: 1200000 / 12, loan: 400000 / 12, married: true, kidsAges: [29], scale: 1.5, startAge: 34 });
scenario('yourself @34 · family', 'you', 34, 'family', {});

console.log('\nMoney Life balance — ' + SEEDS.length + ' seeds per row\n');
rows.forEach(r => console.log('  ' + r));
console.log('');
if (failures.length) { console.log('FAILURES:\n' + failures.map(f => '  ✗ ' + f).join('\n') + '\n'); process.exit(1); }
console.log('  ✓ all scenarios within range, no errors\n');
