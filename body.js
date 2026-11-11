'use strict';
/* ===== Вкладка «Тело»: цель, вес, замеры, фото, сон, боли + подсказки тренера ===== */
const BODY_TABS = [['goal', 'Цель'], ['weight', 'Вес'], ['measure', 'Замеры'], ['photo', 'Фото'], ['sleep', 'Сон'], ['cardio', 'Кардио'], ['pain', 'Боли']];
const GOALS = {mass: 'Набор мышечной массы', cut: 'Снижение веса', maintain: 'Поддержание формы'};
const MEAS = [['waist', 'Талия'], ['chest', 'Грудь'], ['hips', 'Бёдра'], ['arm', 'Рука (бицепс)'], ['thigh', 'Бедро']];
const KINDS = {ache: 'ноющая', sharp: 'острая, «стреляющая»', burn: 'жгучая или с онемением', stiff: 'скованность, тянет'};
const WHENS = {during: 'во время упражнения', after: 'после тренировки', rest: 'в покое, днём', night: 'ночью'};

const RANGE = () => [D.repMin || 8, D.repMax || 12];
const deloadActive = () => !!(D.deload && D.deload.until && D.deload.until >= todayStr());
const dm = d => d.slice(8) + '.' + d.slice(5, 7);
function ensureBody() {
  D.weights = D.weights || []; D.pains = D.pains || []; D.sleeps = D.sleeps || []; D.measures = D.measures || [];
  D.cardio = D.cardio || []; D.kcalDays = D.kcalDays || [];
  if (!D.deload) D.deload = {start: null, until: null, last: null};
}
function addCardio(d, type, min, kcal) {
  ensureBody(); min = num(min); kcal = num(kcal);
  if (!okDate(d) || !(min >= 1 && min <= 600) || !COACH.CARDIO[type]) return false;
  D.cardio.push({id: uid(), d: d, type: type, min: Math.round(min), kcal: kcal > 0 && kcal <= 5000 ? Math.round(kcal) : null});
  save(); return true;
}
function addKcalDay(d, kcal) {
  ensureBody(); kcal = num(kcal);
  if (!okDate(d) || !(kcal >= 1 && kcal <= 5000)) return false;
  const e = D.kcalDays.find(x => x.d === d);
  if (e) e.kcal = Math.round(kcal); else D.kcalDays.push({d: d, kcal: Math.round(kcal)});
  save(); return true;
}
function curKg() { const w = bSort(D.weights); return w.length ? w[w.length - 1].kg : 90; }
function cardioCoach() {
  const wa = COACH.weightAdvice(D.goal, bSort(D.weights), todayStr());
  return COACH.cardioAdvice({goal: D.goal, cardio: D.cardio, kcalDays: D.kcalDays, kg: curKg(), today: todayStr(), pains: D.pains, weightLevel: wa && wa.level});
}
function cardioView() {
  const cs = (D.cardio || []).slice().sort((a, b) => b.d.localeCompare(a.d)), adv = cardioCoach();
  const k = D.kcalDays.find(x => x.d === todayStr());
  let h = '<div class="card"><b>Записать кардио</b><div class="row" style="margin-top:8px"><input type="date" id="cdate" value="' + todayStr() + '" style="max-width:160px"><select id="ctype">'
    + Object.keys(COACH.CARDIO).map(x => '<option value="' + x + '">' + COACH.CARDIO[x][0] + '</option>').join('') + '</select></div>'
    + '<div class="row" style="margin-top:8px"><input id="cmin" inputmode="numeric" placeholder="минут"><input id="ckcal" inputmode="numeric" placeholder="ккал с часов"></div>'
    + '<button class="btn pri block" data-act="csave">Записать кардио</button><div class="muted">Для силовой тренировки выберите «Силовая тренировка» и впишите её калории с часов (в недельные минуты кардио она не входит). Если не вписать, приложение прикинет их по вашему весу (приблизительно).</div></div>';
  h += '<div class="card"><b>Активные калории за сегодня (с часов)</b><div class="row" style="margin-top:8px"><input id="kday" inputmode="numeric" placeholder="например, 420" value="' + (k ? k.kcal : '') + '"><button class="btn" data-act="ksave">' + (k ? 'Изменить' : 'Записать') + '</button></div>'
    + '<div class="muted">Откройте «Активность» на Apple Watch или «Здоровье» на iPhone и впишите «Активные ккал». Приложение скажет, хватает ли и сколько кардио добавить.</div></div>';
  h += tipHTML(adv) || '<div class="muted">Запишите калории или кардио — и тренер подскажет, сколько ещё добавить.</div>';
  if (cs.length) h += '<div class="card" style="padding:0 6px">' + cs.slice(0, 30).map(c => '<div class="li"><div class="sp"><b>' + esc(dFmt(c.d)) + ' · ' + esc(COACH.CARDIO[c.type][0]) + '</b><div class="muted">' + c.min + ' мин' + (c.kcal ? ' · ' + c.kcal + ' ккал' : '') + '</div></div><button class="x" data-act="cdel" data-id="' + esc(c.id) + '" aria-label="Удалить кардио">✕</button></div>').join('') + '</div>';
  return h;
}
const bSort = arr => (arr || []).slice().sort((a, b) => a.d.localeCompare(b.d));
const okDate = d => /^\d{4}-\d\d-\d\d$/.test(d || '');

/* ---------- данные ---------- */
function addSleep(d, h, qlt) {
  h = num(h); ensureBody();
  if (!okDate(d) || !(h >= 0.5 && h <= 16)) return false;
  const e = D.sleeps.find(x => x.d === d), q = qlt ? +qlt : null;
  if (e) { e.h = h; e.q = q; } else D.sleeps.push({d: d, h: h, q: q});
  save(); return true;
}
function addMeasure(d, vals) {
  ensureBody();
  if (!okDate(d)) return false;
  const rec = {d: d}; let any = false;
  MEAS.forEach(([k]) => { const v = num(vals[k]); if (v >= 10 && v <= 250) { rec[k] = v; any = true; } });
  if (!any) return false;
  const e = D.measures.find(x => x.d === d);
  if (e) Object.assign(e, rec); else D.measures.push(rec);
  save(); return true;
}
function addPain(o) {
  ensureBody();
  const p = {id: uid(), d: o.d || todayStr(), area: o.area || 'other', side: o.side || '', level: Math.max(1, Math.min(10, +o.level || 1)), kind: o.kind || 'ache', when: o.when || 'during',
    flags: o.flags || {}, ex: o.ex || '', note: o.note || '', status: 'active'};
  D.pains.push(p); save();
  return {p: p, adv: COACH.painAdvice(p, D.pains, todayStr())};
}
function mergeBody(o) {
  ensureBody(); if (!o || typeof o !== 'object') return;
  (Array.isArray(o.pains) ? o.pains : []).forEach(p => { if (p && p.id && okDate(p.d) && !D.pains.some(x => x.id === p.id)) D.pains.push(p); });
  (Array.isArray(o.sleeps) ? o.sleeps : []).forEach(s => { if (s && okDate(s.d) && s.h > 0 && s.h <= 16 && !D.sleeps.some(x => x.d === s.d)) D.sleeps.push({d: s.d, h: +s.h, q: s.q || null}); });
  (Array.isArray(o.measures) ? o.measures : []).forEach(m => { if (m && okDate(m.d) && !D.measures.some(x => x.d === m.d)) D.measures.push(m); });
  (Array.isArray(o.cardio) ? o.cardio : []).forEach(c => { if (c && c.id && okDate(c.d) && COACH.CARDIO[c.type] && c.min > 0 && !D.cardio.some(x => x.id === c.id)) D.cardio.push(c); });
  (Array.isArray(o.kcalDays) ? o.kcalDays : []).forEach(k => { if (k && okDate(k.d) && k.kcal > 0 && !D.kcalDays.some(x => x.d === k.d)) D.kcalDays.push({d: k.d, kcal: +k.kcal}); });
  if (o.goal && o.goal.type && !D.goal) D.goal = o.goal;
}
function applyUrlParams() {
  try {
    const sp = new URLSearchParams(location.search), d = okDate(sp.get('date')) ? sp.get('date') : todayStr(), msg = [];
    if (sp.has('sleep') && addSleep(d, sp.get('sleep'), null)) msg.push('сон ' + fmtN(num(sp.get('sleep'))) + ' ч');
    if (sp.has('weight') && addWeight(d, sp.get('weight'))) msg.push('вес ' + fmtN(num(sp.get('weight'))) + ' кг');
    if (sp.has('kcal') && addKcalDay(d, sp.get('kcal'))) msg.push('активные ' + Math.round(num(sp.get('kcal'))) + ' ккал');
    if (sp.has('cardio') && addCardio(d, 'other', sp.get('cardio'), sp.get('cardiokcal'))) msg.push('кардио ' + Math.round(num(sp.get('cardio'))) + ' мин');
    if (msg.length) { toast('Записано из ссылки: ' + msg.join(', '), 4000); history.replaceState(null, '', location.pathname); }
  } catch (e) {}
}

/* ---------- графики ---------- */
function simpleChart(pts) {
  const W = 360, H = 180, PL = 34, PR = 12, PT = 14, PB = 22;
  const t0 = new Date(pts[0].d).getTime(), t1 = Math.max(new Date(pts[pts.length - 1].d).getTime(), t0 + 7 * 864e5);
  const vs = pts.map(p => p.v), lo = Math.min(...vs), hi = Math.max(...vs), pd = Math.max((hi - lo) * 0.2, hi * 0.01, 0.5);
  const a = lo - pd, b = hi + pd;
  const xs = d => PL + (new Date(d).getTime() - t0) / (t1 - t0) * (W - PL - PR), ys = v => PT + (1 - (v - a) / (b - a)) * (H - PT - PB);
  let s = '<svg viewBox="0 0 ' + W + ' ' + H + '">';
  for (let i = 0; i <= 3; i++) { const v = a + (b - a) * i / 3; s += '<line x1="' + PL + '" x2="' + (W - PR) + '" y1="' + ys(v) + '" y2="' + ys(v) + '" stroke="var(--line)"/><text x="' + (PL - 4) + '" y="' + (ys(v) + 4) + '" text-anchor="end">' + Math.round(v * 10) / 10 + '</text>'; }
  s += '<path d="' + pts.map((p, i) => (i ? 'L' : 'M') + xs(p.d).toFixed(1) + ' ' + ys(p.v).toFixed(1)).join(' ') + '" fill="none" stroke="var(--blue)" stroke-width="2.5"/>';
  pts.forEach(p => { s += '<circle cx="' + xs(p.d).toFixed(1) + '" cy="' + ys(p.v).toFixed(1) + '" r="3.5" fill="var(--blue)" stroke="var(--card)" stroke-width="2"/>'; });
  const l = pts[pts.length - 1];
  s += '<text x="' + xs(l.d) + '" y="' + (ys(l.v) - 9) + '" text-anchor="end" style="font-weight:700;fill:var(--ink)">' + fmtN(l.v) + '</text>';
  s += '<text x="' + PL + '" y="' + (H - 4) + '">' + dm(pts[0].d) + '</text><text x="' + (W - PR) + '" y="' + (H - 4) + '" text-anchor="end">' + dm(l.d) + '</text></svg>';
  return s;
}

/* ---------- вкладка «Тело» ---------- */
function bodyView() {
  ensureBody();
  const cur = UI.body || 'goal', on = 'background:var(--blue);color:#fff;border-color:var(--blue)';
  let h = '<h1>Тело и самочувствие</h1><div style="margin:2px 0 10px">'
    + BODY_TABS.map(([k, l]) => '<button class="btn sm" style="margin:3px 4px 3px 0;' + (cur === k ? on : '') + '" data-act="btab" data-k="' + k + '">' + l + '</button>').join('') + '</div>';
  if (cur === 'goal') h += goalView(); else if (cur === 'weight') h += weightView(); else if (cur === 'measure') h += measureView();
  else if (cur === 'photo') h += photoView(); else if (cur === 'sleep') h += sleepView(); else if (cur === 'cardio') h += cardioView(); else h += painView();
  return h;
}
function tipHTML(adv) { return adv ? '<div class="tip ' + adv.level + '">' + esc(adv.text) + '</div>' : ''; }

function goalView() {
  const g = D.goal, ws = bSort(D.weights), last = ws[ws.length - 1];
  let h = '';
  if (g) {
    const adv = COACH.weightAdvice(g, ws, todayStr());
    h += '<div class="card"><div class="muted">Ваша цель</div><div style="font-size:20px;font-weight:700">' + esc(GOALS[g.type]) + '</div>'
      + (g.target ? '<div>Целевой вес: <b>' + fmtN(g.target) + ' кг</b>' + (last ? ' · сейчас ' + fmtN(last.kg) + ' кг (осталось ' + fmtN(Math.abs(g.target - last.kg)) + ' кг)' : '') + '</div>' : '')
      + (g.start && g.start.kg ? '<div class="muted">Старт: ' + fmtN(g.start.kg) + ' кг, ' + dm(g.start.d) + '</div>' : '')
      + (adv ? tipHTML(adv) : '<div class="muted" style="margin-top:6px">Совет по темпу появится, когда будут записаны взвешивания за последнюю неделю и за неделю месяц назад.</div>') + '</div>';
  } else h += '<div class="card" style="border-color:var(--blue)"><b>Зачем цель</b><div class="muted">От цели зависят советы: какой темп набора или снижения считать нормальным. Выберите ниже.</div></div>';
  h += '<div class="card"><b>' + (g ? 'Изменить цель' : 'Поставьте цель') + '</b>'
    + '<div class="muted" style="margin:6px 0 4px">Что вы хотите?</div><select id="gtype">' + Object.keys(GOALS).map(k => '<option value="' + k + '"' + (g && g.type === k ? ' selected' : '') + '>' + GOALS[k] + '</option>').join('') + '</select>'
    + '<div class="muted" style="margin:8px 0 4px">Целевой вес, кг (необязательно)</div><input id="gtarget" inputmode="decimal" value="' + (g && g.target ? fmtN(g.target) : '') + '" placeholder="например, 98">'
    + '<button class="btn pri block" data-act="gsave">Сохранить цель</button>'
    + '<div class="muted">Ориентиры: при наборе массы около 0,25–0,5 кг в неделю, при снижении 0,5–1% веса в неделю. Это общие ориентиры, не медицинская рекомендация.</div></div>';
  return h;
}

function measureView() {
  const ms = bSort(D.measures);
  let h = '<div class="card"><b>Новые замеры, см</b><div class="muted" style="margin:4px 0 8px">Раз в 1–2 недели, утром, одинаково. Талия — на уровне пупка на выдохе. Заполните то, что хотите отслеживать.</div>'
    + '<div class="muted">Дата</div><input type="date" id="mdate" value="' + todayStr() + '" style="margin-bottom:8px">'
    + MEAS.map(([k, l]) => '<div class="row" style="margin:4px 0"><span class="sp">' + l + '</span><input id="m_' + k + '" inputmode="decimal" placeholder="см" style="max-width:110px"></div>').join('')
    + '<button class="btn pri block" data-act="msave">Записать замеры</button></div>';
  if (!ms.length) return h + '<p class="muted">Замеров пока нет.</p>';
  const w = ms.filter(m => m.waist);
  if (w.length >= 2) h += '<div class="card"><div class="muted">Талия, см</div>' + simpleChart(w.map(m => ({d: m.d, v: m.waist}))) + '</div>';
  const first = ms[0], last = ms[ms.length - 1];
  h += '<div class="card"><b>Изменения с первого замера (' + dm(first.d) + ')</b>' + MEAS.map(([k, l]) => (first[k] && last[k]) ? '<div class="row"><span class="sp">' + l + '</span><span>' + fmtN(first[k]) + ' → ' + fmtN(last[k]) + ' (' + (last[k] - first[k] >= 0 ? '+' : '') + fmtN(last[k] - first[k]) + ')</span></div>' : '').join('') + '</div>'
    + '<div class="card" style="padding:0 6px">' + ms.slice().reverse().map(m => '<div class="li"><div class="sp"><b>' + esc(dFmt(m.d)) + '</b><div class="muted">' + MEAS.filter(([k]) => m[k]).map(([k, l]) => l + ' ' + fmtN(m[k])).join(' · ') + '</div></div><button class="x" data-act="mdel" data-d="' + m.d + '" aria-label="Удалить замер">✕</button></div>').join('') + '</div>';
  return h;
}

function sleepView() {
  const ss = bSort(D.sleeps), adv = COACH.sleepAdvice(D.sleeps, todayStr());
  const link = (location.origin && location.origin !== 'null' ? location.origin : '') + location.pathname + '?sleep=7.5';
  let h = '<div class="card"><b>Записать сон</b><div class="row" style="margin-top:8px"><input type="date" id="sldate" value="' + todayStr() + '" style="max-width:160px"><input id="slh" inputmode="decimal" placeholder="часов, напр. 7,5"></div>'
    + '<div class="muted" style="margin:8px 0 4px">Как выспались? (необязательно)</div><select id="slq"><option value="">—</option><option value="1">1 — плохо</option><option value="2">2</option><option value="3">3 — нормально</option><option value="4">4</option><option value="5">5 — отлично</option></select>'
    + '<button class="btn pri block" data-act="ssave">Записать сон</button>'
    + '<div class="muted">Дата — день, когда проснулись. Часы сна видны в «Здоровье» на iPhone или в часах.</div></div>';
  h += tipHTML(adv);
  if (ss.length >= 2) h += '<div class="card"><div class="muted">Сон, часов</div>' + simpleChart(ss.slice(-30).map(s => ({d: s.d, v: s.h}))) + '</div>';
  h += '<div class="card"><b>Apple Watch и «Здоровье»</b><div class="muted" style="margin-top:6px">Веб-приложение не может само читать данные «Здоровья»: iOS не даёт такой доступ сайтам. Два способа не вводить вручную:'
    + '<ol class="how"><li>Записывать сон вручную (10 секунд утром).</li><li>Настроить на iPhone «Быстрые команды»: команда берёт часы сна из «Здоровья» и открывает ссылку вида <b style="word-break:break-all">' + esc(link) + '</b>, подставляя число часов вместо 7.5. Приложение само запишет сон. Я не мог проверить это на настоящем iPhone, поэтому попробуйте сначала открыть такую ссылку вручную.</li></ol>Так же можно передавать вес: <b>?weight=103.2</b>.</div></div>';
  if (ss.length) h += '<div class="card" style="padding:0 6px">' + ss.slice().reverse().slice(0, 30).map(s => '<div class="li"><div class="sp"><b>' + esc(dFmt(s.d)) + '</b></div><div>' + fmtN(s.h) + ' ч' + (s.q ? ' · ' + s.q + '/5' : '') + '</div><button class="x" data-act="sdel" data-d="' + s.d + '" aria-label="Удалить">✕</button></div>').join('') + '</div>';
  return h;
}

/* ---------- боли ---------- */
function painFormHTML(prefillEx) {
  const sel = (id, obj, cur) => '<select id="' + id + '">' + Object.keys(obj).map(k => '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + esc(obj[k]) + '</option>').join('') + '</select>';
  const s = curSession() || sortedSessions()[0];
  const names = [...new Set((s ? s.entries.map(e => e.ex) : []))];
  const exOpts = '<option value="">— не связано с упражнением —</option>' + names.map(n => '<option' + (n === prefillEx ? ' selected' : '') + '>' + esc(n) + '</option>').join('');
  const lv = '<select id="pl">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => '<option value="' + n + '"' + (n === 3 ? ' selected' : '') + '>' + n + (n === 1 ? ' — еле заметно' : n === 5 ? ' — заметная' : n === 10 ? ' — невыносимая' : '') + '</option>').join('') + '</select>';
  return '<div class="muted">Где болит?</div>' + sel('pa', COACH.AREAS, 'shoulder')
    + '<div class="muted" style="margin-top:8px">Сторона</div><select id="ps"><option value="">не важно</option><option>левая</option><option>правая</option><option>обе</option></select>'
    + '<div class="muted" style="margin-top:8px">Насколько сильно, от 1 до 10</div>' + lv
    + '<div class="muted" style="margin-top:8px">Какая боль?</div>' + sel('pk', KINDS, 'ache')
    + '<div class="muted" style="margin-top:8px">Когда появляется?</div>' + sel('pw', WHENS, 'during')
    + '<div class="muted" style="margin-top:8px">Отметьте, если есть:</div>'
    + '<label class="row" style="margin:4px 0"><input type="checkbox" id="pf_numb" style="width:auto"> онемение, покалывание или слабость</label>'
    + '<label class="row" style="margin:4px 0"><input type="checkbox" id="pf_swelling" style="width:auto"> отёк или покраснение</label>'
    + '<label class="row" style="margin:4px 0"><input type="checkbox" id="pf_trauma" style="width:auto"> недавний удар, падение или травма</label>'
    + '<div class="muted" style="margin-top:8px">Связано с упражнением?</div><select id="pe">' + exOpts + '</select>'
    + '<div class="muted" style="margin-top:8px">Заметка</div><input id="pn" placeholder="необязательно">'
    + '<button class="btn pri block" data-act="psave">Записать и получить совет</button>';
}
function painView() {
  const ps = bSort(D.pains).reverse();
  let h = '<div class="card"><b>Записать боль</b><div class="muted" style="margin:4px 0 8px">Запись поможет заметить повторяющиеся боли. Советы общие и не заменяют врача.</div>' + painFormHTML('') + '</div>';
  if (ps.length) h += '<div class="card" style="padding:0 6px"><div class="muted" style="padding:8px 8px 0">История болей</div>' + ps.map(p =>
    '<div class="li"><div class="sp"><b>' + esc(dFmt(p.d)) + ' · ' + esc(COACH.AREAS[p.area] || p.area) + (p.side ? ' (' + esc(p.side) + ')' : '') + '</b><div class="muted">' + p.level + '/10 · ' + esc(KINDS[p.kind] || '') + (p.ex ? ' · ' + esc(p.ex) : '') + (p.status === 'resolved' ? ' · прошла ✓' : '') + '</div></div>'
    + (p.status === 'resolved' ? '' : '<button class="btn sm" data-act="pres" data-id="' + p.id + '">Прошла</button>') + '<button class="x" data-act="pdel" data-id="' + p.id + '" aria-label="Удалить запись">✕</button></div>').join('') + '</div>';
  return h;
}
function readPainForm() {
  const v = id => { const e = document.getElementById(id); return e ? e.value : ''; }, c = id => { const e = document.getElementById(id); return !!(e && e.checked); };
  return {area: v('pa'), side: v('ps'), level: v('pl'), kind: v('pk'), when: v('pw'), ex: v('pe'), note: v('pn'),
    flags: {numb: c('pf_numb'), swelling: c('pf_swelling'), trauma: c('pf_trauma'), night: v('pw') === 'night' || v('pw') === 'rest' && +v('pl') >= 4}};
}
function painAdviceModal(p, adv) {
  const col = adv.level === 'stop' ? 'var(--bad)' : adv.level === 'caution' ? '#b45309' : 'var(--good)';
  const s = curSession(), i = s && p.ex ? s.entries.findIndex(e => e.ex === p.ex) : -1;
  $('modalhost').innerHTML = '<div class="modal" data-act="closepick"><div class="sheet"><h2 style="margin:0 0 8px;color:' + col + '">' + esc(adv.title) + '</h2>'
    + adv.lines.map(l => '<p style="margin:8px 0">' + esc(l) + '</p>').join('')
    + (i >= 0 ? '<button class="btn pri block" data-act="pswap" data-ex="' + esc(p.ex) + '">⇄ Подобрать замену упражнения</button>' : '')
    + '<div class="muted" style="margin:8px 0">Запись сохранена. Эти советы общие и не заменяют врача.</div><button class="btn block" data-act="closepick">Закрыть</button></div></div>';
}

/* ---------- фото (хранятся только в телефоне, IndexedDB) ---------- */
let _urls = [];
let _pdb = null; /* одно общее подключение к базе фото (раньше каждый вызов открывал новое и не закрывал) */
function pdb() {
  if (_pdb) return _pdb;
  _pdb = new Promise((res, rej) => { const r = indexedDB.open('gymlog-photos', 1); r.onupgradeneeded = () => r.result.createObjectStore('p', {keyPath: 'id'}); r.onsuccess = () => { r.result.onversionchange = () => { r.result.close(); _pdb = null; }; res(r.result); }; r.onerror = () => rej(r.error); r.onblocked = () => {}; });
  _pdb.catch(() => { _pdb = null; });
  return _pdb;
}
async function pAll() { const db = await pdb(); return new Promise((res, rej) => { const q = db.transaction('p').objectStore('p').getAll(); q.onsuccess = () => res(q.result || []); q.onerror = () => rej(q.error); }); }
async function pPut(o) { const db = await pdb(); return new Promise((res, rej) => { const tx = db.transaction('p', 'readwrite'); tx.objectStore('p').put(o); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }); }
async function pDel(id) { const db = await pdb(); return new Promise((res, rej) => { const tx = db.transaction('p', 'readwrite'); tx.objectStore('p').delete(id); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }); }
function compressImage(file, max) {
  max = max || 900;
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const sc = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * sc)); c.height = Math.max(1, Math.round(img.height * sc));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => { URL.revokeObjectURL(url); b ? res(b) : rej(new Error('blob')); }, 'image/jpeg', 0.8);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('image')); };
    img.src = url;
  });
}
function photoView() {
  return '<div class="card"><b>Фото прогресса</b><div class="muted" style="margin:4px 0 8px">Снимайте раз в месяц при одинаковом свете и позе. Фото хранятся только на этом телефоне и никуда не отправляются. В обычную резервную копию они не входят — сохраняйте их отдельно кнопкой ниже.</div>'
    + '<div class="row"><input type="date" id="phdate" value="' + todayStr() + '" style="max-width:150px"><select id="phpose"><option>спереди</option><option>сбоку</option><option>сзади</option></select></div>'
    + '<label class="btn pri block" style="margin-top:10px">📷 Сфотографировать или выбрать<input type="file" id="pfile" accept="image/*" style="display:none"></label></div>'
    + '<div id="pgrid" class="pgrid"></div>'
    + '<button class="btn block" data-act="pcmp">Сравнить первое и последнее</button>'
    + '<button class="btn block" data-act="psaveall">Сохранить все фото в «Файлы»</button>';
}
async function loadPhotos() {
  const host = $('pgrid'); if (!host) return;
  _urls.forEach(u => URL.revokeObjectURL(u)); _urls = [];
  let ph = [];
  try { ph = await pAll(); } catch (e) { host.innerHTML = '<p class="muted">В этом браузере фото сохранить нельзя (хранилище недоступно).</p>'; return; }
  ph.sort((a, b) => b.d.localeCompare(a.d) || b.id.localeCompare(a.id));
  host.innerHTML = ph.length ? ph.map(p => { const u = URL.createObjectURL(p.blob); _urls.push(u); return '<div class="ph" data-act="pview" data-id="' + esc(p.id) + '"><img src="' + u + '" alt="Фото ' + esc(p.d) + '"><div class="muted">' + esc(dFmt(p.d)) + ' · ' + esc(p.pose || '') + '</div></div>'; }).join('') : '<p class="muted">Фото пока нет.</p>';
}
async function addPhotoFile(file) {
  try {
    const blob = await compressImage(file, 900);
    await pPut({id: uid(), d: ($('phdate') && okDate($('phdate').value)) ? $('phdate').value : todayStr(), pose: $('phpose') ? $('phpose').value : '', blob: blob});
    toast('Фото сохранено на телефоне'); loadPhotos();
  } catch (e) { toast('Не удалось сохранить фото'); }
}
async function sharePhotos() {
  let ph = []; try { ph = await pAll(); } catch (e) {}
  if (!ph.length) { toast('Фото пока нет'); return; }
  const files = ph.sort((a, b) => a.d.localeCompare(b.d)).map((p, i) => new File([p.blob], 'foto-' + p.d + '-' + (i + 1) + '.jpg', {type: 'image/jpeg'}));
  try { if (navigator.canShare && navigator.canShare({files: files})) { await navigator.share({files: files}); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  files.forEach(f => { const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); });
}
async function photoModal(id, compare) {
  let ph = []; try { ph = await pAll(); } catch (e) { return; }
  ph.sort((a, b) => a.d.localeCompare(b.d) || a.id.localeCompare(b.id));
  const url = b => { const u = URL.createObjectURL(b); _urls.push(u); return u; };
  let h = '<div class="modal" data-act="closepick"><div class="sheet">';
  if (compare) {
    if (ph.length < 2) { toast('Нужно хотя бы два фото'); return; }
    const a = ph[0], b = ph[ph.length - 1];
    h += '<h2 style="margin:0 0 8px">Было и стало</h2><div class="row" style="gap:6px;align-items:flex-start"><div style="width:50%"><img src="' + url(a.blob) + '" style="width:100%;border-radius:10px"><div class="muted">' + esc(dFmt(a.d)) + '</div></div><div style="width:50%"><img src="' + url(b.blob) + '" style="width:100%;border-radius:10px"><div class="muted">' + esc(dFmt(b.d)) + '</div></div></div>';
  } else {
    const p = ph.find(x => x.id === id); if (!p) return;
    h += '<img src="' + url(p.blob) + '" style="width:100%;border-radius:10px"><div class="muted" style="margin:6px 0">' + esc(dFmt(p.d)) + ' · ' + esc(p.pose || '') + '</div><button class="btn danger block" data-act="pdelphoto" data-id="' + esc(p.id) + '">Удалить это фото</button>';
  }
  $('modalhost').innerHTML = h + '<button class="btn block" data-act="closepick">Закрыть</button></div></div>';
}

function sleepQuickCard() {
  ensureBody();
  const t = D.sleeps.find(x => x.d === todayStr());
  return '<div class="card"><div class="row"><b class="sp">Сон прошлой ночи</b><span class="muted">' + (t ? 'записано ✓' : 'часов') + '</span></div>'
    + '<div class="row" style="margin-top:8px"><input id="stoday" inputmode="decimal" placeholder="Например, 7,5" value="' + (t ? fmtN(t.h) : '') + '"><button class="btn" data-act="ssavetoday">' + (t ? 'Изменить' : 'Записать') + '</button></div>'
    + '<div class="muted" style="margin-top:6px">Смотрите в «Здоровье» на iPhone или в часах. Подробнее — «Тело» → «Сон».</div></div>';
}

/* ---------- подсказки тренера на главном экране ---------- */
function coachNoticesHTML() {
  ensureBody(); let h = '';
  const today = todayStr();
  const dates = [...new Set(D.sessions.filter(s => s.entries.some(e => e.sets.length)).map(s => s.date))];
  const st = COACH.deloadStatus(dates, today, D.deload);
  if (st.state === 'active') h += '<div class="tip ok"><b>Разгрузочная неделя до ' + dm(st.until) + '.</b> Подходов вдвое меньше, вес около −10%, запас 3–4 повтора, без отказа. <button class="btn sm" data-act="dend">Закончить</button></div>';
  else if (st.state === 'due' || st.state === 'soon') h += '<div class="tip warn"><b>' + (st.state === 'due' ? 'Пора на разгрузочную неделю' : 'Скоро нужна разгрузочная неделя') + '.</b> ' + esc(st.reasons.join('; ')) + '. Неделя с разгрузкой: вдвое меньше подходов и на ~10% легче, без отказа. <button class="btn sm" data-act="dstart">Начать разгрузочную неделю</button></div>';
  const sa = COACH.sleepAdvice(D.sleeps, today); if (sa && sa.level !== 'ok') h += tipHTML(sa);
  const wa = COACH.weightAdvice(D.goal, bSort(D.weights), today); if (wa && wa.level !== 'ok') h += tipHTML(wa);
  if (D.goal && D.goal.type === 'cut' || D.cardio.length || D.kcalDays.length) { const ca = cardioCoach(); if (ca && ca.level !== 'ok') h += tipHTML(ca) + '<button class="btn sm" data-act="gocardio" style="margin-bottom:6px">Записать кардио / ккал</button>'; }
  const act = D.pains.filter(p => p.status !== 'resolved' && p.level >= 3 && COACH.daysBetween(p.d, today) >= 0 && COACH.daysBetween(p.d, today) <= 10);
  if (act.length) h += '<div class="tip warn"><b>Недавние боли:</b> ' + act.map(p => esc((COACH.AREAS[p.area] || p.area) + ' ' + p.level + '/10')).join(', ') + '. Упражнения, которые её нагружают, помечены в тренировке.</div>';
  const lastS = sortedSessions().find(s => s.entries.some(e => e.sets.length));
  if (lastS) { const gap = COACH.daysBetween(lastS.date, today); if (gap >= 10) h += '<div class="tip info">Перерыв ' + gap + ' дн. Вернитесь с 80–85% прежних весов и оставляйте 1–2 повтора в запасе первые 2 недели.</div>'; }
  return h;
}

/* ---------- обработка нажатий вкладки «Тело» (возвращает true, если обработано) ---------- */
function bodyAct(act, t) {
  switch (act) {
    case 'gocardio': UI.body = 'cardio'; UI.tab = 'body'; UI.edit = null; render(); window.scrollTo(0, 0); return true;
    case 'btab': UI.body = t.dataset.k; render(); return true;
    case 'gsave': {
      const ws = bSort(D.weights), last = ws[ws.length - 1], target = num($('gtarget').value);
      D.goal = {type: $('gtype').value, target: target >= 30 && target <= 300 ? target : null, start: last ? {d: last.d, kg: last.kg} : null};
      save(); render(); toast('Цель сохранена'); return true;
    }
    case 'msave': {
      const vals = {}; MEAS.forEach(([k]) => { vals[k] = $('m_' + k).value; });
      if (addMeasure($('mdate').value || todayStr(), vals)) { render(); toast('Замеры записаны'); } else toast('Введите хотя бы один замер в сантиметрах (10–250)');
      return true;
    }
    case 'mdel': if (confirm('Удалить замер за ' + t.dataset.d + '?')) { D.measures = D.measures.filter(x => x.d !== t.dataset.d); save(); render(); } return true;
    case 'ssave': {
      if (addSleep($('sldate').value || todayStr(), $('slh').value, $('slq').value)) { render(); toast('Сон записан'); } else toast('Введите часы сна, например 7,5');
      return true;
    }
    case 'ssavetoday': {
      if (addSleep(todayStr(), $('stoday').value, null)) { render(); toast('Сон записан'); } else toast('Введите часы сна, например 7,5');
      return true;
    }
    case 'sdel': if (confirm('Удалить запись сна?')) { D.sleeps = D.sleeps.filter(x => x.d !== t.dataset.d); save(); render(); } return true;
    case 'csave': {
      if (addCardio($('cdate').value || todayStr(), $('ctype').value, $('cmin').value, $('ckcal').value)) { render(); toast('Кардио записано'); } else toast('Введите минуты, например 20');
      return true;
    }
    case 'cdel': if (confirm('Удалить запись кардио?')) { D.cardio = D.cardio.filter(x => x.id !== t.dataset.id); save(); render(); } return true;
    case 'ksave': { if (addKcalDay(todayStr(), $('kday').value)) { render(); toast('Калории записаны'); } else toast('Введите число ккал, например 420'); return true; }
    case 'psave': { const r = addPain(readPainForm()); render(); painAdviceModal(r.p, r.adv); return true; }
    case 'popen': {
      $('modalhost').innerHTML = '<div class="modal" data-act="closepick"><div class="sheet"><div class="row"><h2 style="margin:0" class="sp">Что болит?</h2><button class="btn sm" data-act="closepick">Закрыть</button></div>' + painFormHTML('') + '</div></div>';
      return true;
    }
    case 'pres': { const p = D.pains.find(x => x.id === t.dataset.id); if (p) { p.status = 'resolved'; save(); render(); } return true; }
    case 'pdel': if (confirm('Удалить запись о боли?')) { D.pains = D.pains.filter(x => x.id !== t.dataset.id); save(); render(); } return true;
    case 'pswap': { const s = curSession(); const i = s ? s.entries.findIndex(e => e.ex === t.dataset.ex) : -1; if (i >= 0) openSwap(s, i, false); return true; }
    case 'dstart': D.deload = {start: todayStr(), until: COACH.shiftDay(todayStr(), 6), last: D.deload && D.deload.last}; save(); render(); toast('Разгрузочная неделя началась'); return true;
    case 'dend': D.deload = {start: null, until: null, last: todayStr()}; save(); render(); toast('Разгрузка закончена'); return true;
    case 'pview': photoModal(t.dataset.id, false); return true;
    case 'pcmp': photoModal(null, true); return true;
    case 'pdelphoto': if (confirm('Удалить это фото безвозвратно?')) { pDel(t.dataset.id).then(() => { $('modalhost').innerHTML = ''; loadPhotos(); }); } return true;
    case 'psaveall': sharePhotos(); return true;
  }
  return false;
}
function bodyChange(t) {
  if (t.id === 'pfile') { const f = t.files && t.files[0]; if (f) addPhotoFile(f); t.value = ''; return true; }
  if (t.id === 'repmin' || t.id === 'repmax') {
    let a = Math.round(num($('repmin').value)) || 8, b = Math.round(num($('repmax').value)) || 12;
    a = Math.max(3, Math.min(20, a)); b = Math.max(a + 1, Math.min(30, b));
    D.repMin = a; D.repMax = b; save(); toast('Диапазон повторов: ' + a + '–' + b); return true;
  }
  return false;
}
