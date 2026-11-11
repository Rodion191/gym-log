'use strict';
/* =====================================================================
   Правила «тренера». Всё считается на самом телефоне, без сервера и без ИИ.
   Основа — общепринятые принципы силовой подготовки: двойная прогрессия (сначала повторы,
   потом вес), запас повторов, чистая техника, осторожность после перерыва и при боли,
   разгрузочные недели. Часть правил взята из реальных разборов тренировок (перерыв, отказ,
   раскачка, боль). Это справочные советы, а не медицинские рекомендации.
   Файл можно показать тренеру или врачу и поправить.
   ===================================================================== */
const COACH = (function () {
  const fmt = v => (Math.round(v * 100) / 100).toString().replace('.', ',');
  const roundTo = (x, b) => b ? Math.round(x / b) * b : x;
  const e1 = (w, r) => w * (1 + Math.min(r, 15) / 30);
  const predReps = (e, w) => Math.max(1, Math.min(15, Math.floor(30 * (e / w - 1))));
  const median = a => { const s = a.slice().sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0; };
  const parse = d => { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd, 12); };
  const iso = dt => dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
  const shiftDay = (d, n) => { const dt = parse(d); dt.setDate(dt.getDate() + n); return iso(dt); };
  const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
  const mondayOf = d => { const dt = parse(d); const wd = (dt.getDay() + 6) % 7; dt.setDate(dt.getDate() - wd); return iso(dt); };
  const stepFor = kind => (kind === 'load' || kind === 'side' || kind === 'assist') ? 2.5 : kind === 'db' ? 1 : 0;

  /* ---------- классы упражнений, шаги, диапазоны повторов ---------- */
  const RE = {
    legm: /жим ногами|гакк|разгибание ног|сгибание ног|икр|аддуктор|абдуктор|ягодичн|мост|сведение ног|разведение ног/i,
    lower: /присед|станов|мёртв|румын|прямых ногах|гуд морнинг|наклоны со штангой/i,
    iso: /бицепс|молот|трицепс|француз|разгибание рук|махи|разведен|задняя дельта|шраг|сведение рук|бабочк|кикбэк|канат|брусья|отжим/i
  };
  function classOf(name, kind) {
    if (kind === 'assist') return 'assist';
    if (kind === 'band') return 'band';
    if (RE.legm.test(name)) return 'legm';
    if (RE.lower.test(name)) return 'lower';
    if (RE.iso.test(name)) return 'iso';
    return 'comp';
  }
  function defaultStep(name, kind) {
    if (kind === 'band') return 0;
    if (kind === 'assist') return 5;
    if (kind === 'db') return 2;
    if (/жим ногами|гакк/i.test(name)) return 10;
    if (RE.legm.test(name)) return 5;
    if (RE.lower.test(name)) return 5;
    if (kind === 'side') return 2.5;
    if (/блок|тренажёр|тренажер|тяга т-гриф|рычаж/i.test(name)) return 5;
    return 2.5;
  }
  function rangeFor(cls, user) {
    const a = user[0], b = user[1];
    if (cls === 'legm' || cls === 'iso') return [Math.min(a + 2, 12), b + 3];
    return [a, b];
  }
  function learnStep(hist, def, kind) {
    if (!def) return 0;
    const ws = [];
    (hist || []).forEach(h => (h.sets || []).forEach(s => { if (s.w > 0 && ws.indexOf(s.w) < 0) ws.push(s.w); }));
    ws.sort((a, b) => a - b);
    const diffs = [];
    for (let i = 1; i < ws.length; i++) { const d = ws[i] - ws[i - 1]; if (d >= 0.5) diffs.push(d); }
    if (diffs.length < 2) return def;
    const m = Math.round(median(diffs) * 2) / 2;
    return Math.min(def * 3, Math.max(def / 2, m));
  }

  /* ---------- заметки пользователя: «грязно», «отказ», «болит» ---------- */
  function noteFlags(text) {
    const t = (text || '').toLowerCase();
    const noPain = /без боли|боли нет|нет боли|не болит|не болело|дискомфорта нет|дискомфорта не|боль.{0,12}не (был|появл)/.test(t);
    return {
      fail: /отказ|на пределе|в предел|еле |едва|не смог дожать|не дожал/.test(t),
      cheat: /читинг|раскач|грязн|инерци|с помощью ног|ноги подключ|подкинул|подбрасыв|жульнич/.test(t),
      pain: !noPain && /боль|болит|болело|заныл|ныл|ноет|дискомфорт|кольн|тянущ|стрельн|прострел/.test(t)
    };
  }

  /* ---------- перерыв: насколько просела сила ---------- */
  function gapTier(days) {
    if (days <= 9) return {tier: 'none', mult: 1};
    if (days <= 14) return {tier: 'short', mult: 0.95};
    if (days <= 28) return {tier: 'medium', mult: 0.92};
    if (days <= 56) return {tier: 'long', mult: 0.87};
    if (days <= 120) return {tier: 'verylong', mult: 0.8};
    return {tier: 'ancient', mult: 0.7};
  }

  /* ---------- боль ---------- */
  const AREAS = {shoulder: 'Плечо', elbow: 'Локоть', wrist: 'Запястье / кисть', neck: 'Шея', upper_back: 'Верх спины', lower_back: 'Поясница', hip: 'Бедро / таз / пах', knee: 'Колено', ankle: 'Голеностоп / стопа', other: 'Другое'};
  const AFFECT = {
    shoulder: /жим|брусья|отжим|разведен|сведен|махи|подтяг|армейск|подбородк|бабочк/i,
    elbow: /француз|разгиб|трицепс|жим|брусья|бицепс|молот|супинац|отжим/i,
    wrist: /бицепс|жим|отжим|молот|штанг/i,
    neck: /шраг|подбородк|станов|мёртв|румын|подтяг/i,
    upper_back: /тяга|подтяг|шраг/i,
    lower_back: /присед|станов|мёртв|румын|тяга штанги|наклон|гиперэкстенз/i,
    hip: /присед|жим ногами|выпад|станов|мёртв|румын|аддуктор|абдуктор|сведение ног|разведение ног/i,
    knee: /присед|жим ногами|выпад|разгибание ног|сгибание ног|зашаг/i,
    ankle: /присед|икр|жим ногами|выпад/i
  };
  const AREA_TIPS = {
    shoulder: 'Для плеча: временно уберите жимы из-за головы, глубокие отжимания на брусьях и широкие разведения; попробуйте нейтральный хват (гантели ладонями друг к другу), меньшую амплитуду и более лёгкий вес.',
    elbow: 'Для локтя: временно замените французский жим и разгибания из-за головы на блок с канатом, берите EZ-гриф вместо прямого, снизьте вес на 20–30% и тщательнее разминайтесь.',
    wrist: 'Для запястья: EZ-гриф или гантели с нейтральным хватом вместо прямой штанги, держите кисть ровно, при необходимости используйте кистевые бинты.',
    neck: 'Для шеи: держите голову нейтрально (не запрокидывайте на становой и тягах), временно уберите шраги и тягу к подбородку, снизьте рабочие веса.',
    upper_back: 'Для верха спины: уменьшите вес в тягах, делайте их медленнее и без рывков, добавьте разминку лопаток.',
    lower_back: 'Для поясницы: не округляйте спину, временно замените становую и наклоны тягами с упором грудью (тренажёр, Т-гриф с упором) и жимом ногами в комфортной амплитуде.',
    hip: 'Для бедра/паха: сократите глубину приседа и жима ногами, уберите узкие позиции и выпады, начинайте с лёгкой разминки; ходьба обычно переносится лучше, чем нагрузка на ноги.',
    knee: 'Для колена: сократите глубину, колени направляйте по линии носков, временно уберите разгибание ног с большим весом; жим ногами — в комфортной амплитуде.',
    ankle: 'Для голеностопа/стопы: уберите прыжки и выпады, уменьшите вес в приседаниях и жиме ногами, добавьте разминку для голеностопа.',
    other: 'Снизьте вес, сократите амплитуду и замените упражнение, которое вызывает боль.'
  };
  const affects = (area, ex) => !!(AFFECT[area] && AFFECT[area].test(ex || ''));
  const isRed = p => p.level >= 7 || p.kind === 'burn' || !!(p.flags && (p.flags.numb || p.flags.swelling || p.flags.trauma || p.flags.night));

  function painAdvice(p, all, today) {
    const f = p.flags || {};
    const sameArea = (all || []).filter(x => x.area === p.area && x.id !== p.id && daysBetween(x.d, today) <= 14 && daysBetween(x.d, today) >= 0);
    const lines = [];
    const red = f.numb || f.swelling || f.trauma || f.night || p.level >= 7 || p.kind === 'burn';
    if (red) {
      lines.push('Остановите упражнения, нагружающие эту зону, и не «разрабатывайте» боль.');
      lines.push('Эти признаки (' + [f.numb ? 'онемение или слабость' : null, f.swelling ? 'отёк или покраснение' : null, f.trauma ? 'недавний удар или травма' : null, f.night ? 'боль в покое или по ночам' : null, p.level >= 7 ? 'сильная боль' : null, p.kind === 'burn' ? 'жгучая боль' : null].filter(Boolean).join(', ') + ') лучше показать врачу — ортопеду или спортивному врачу. Особенно если не проходят за 2–3 дня.');
      lines.push(AREA_TIPS[p.area] || AREA_TIPS.other);
      return {level: 'stop', title: 'Остановитесь и покажите врачу', lines: lines, doctor: true};
    }
    if (sameArea.length >= 2) {
      lines.push('За последние 2 недели боль в этой зоне записана уже ' + (sameArea.length + 1) + ' раза(-а). Повторяющаяся боль — повод записаться к врачу, а не продолжать «обходить» её.');
      lines.push('Пока снизьте нагрузку на зону: вес минус 20–30%, меньше амплитуда, замените проблемное упражнение.');
      lines.push(AREA_TIPS[p.area] || AREA_TIPS.other);
      return {level: 'caution', title: 'Боль повторяется', lines: lines, doctor: true};
    }
    if (p.level >= 4) {
      lines.push('Снизьте вес на 20–30%, сократите амплитуду или замените упражнение (кнопка «Подобрать замену»).');
      lines.push('Если боль нарастает во время подходов или сохраняется на следующий день — прекратите нагрузку на зону.');
      lines.push(AREA_TIPS[p.area] || AREA_TIPS.other);
      return {level: 'caution', title: 'Нагрузку лучше снизить', lines: lines, doctor: false};
    }
    lines.push('Лёгкий дискомфорт: хорошо разогрейтесь, снизьте вес примерно на 10% и следите за ощущениями.');
    lines.push('Если боль усиливается, держится после тренировки или появляется в покое — снижайте нагрузку и обратитесь к врачу.');
    lines.push(AREA_TIPS[p.area] || AREA_TIPS.other);
    return {level: 'mild', title: 'Пока без тревоги, но осторожно', lines: lines, doctor: false};
  }
  function painWarnFor(pains, ex, today) {
    return (pains || []).filter(p => p.status !== 'resolved' && p.level >= 3 && daysBetween(p.d, today) >= 0 && daysBetween(p.d, today) <= 10 && affects(p.area, ex));
  }

  /* ---------- ПЛАН НА ТРЕНИРОВКУ ПО ОДНОМУ УПРАЖНЕНИЮ ----------
     Вход: name, kind, hist (прошлые разы этого упражнения в этом зале, новые первыми:
     {d, sets:[{w,r,rir,dirty}], note}), alt (история в другом зале), today, range [мин, макс],
     deload, pains, sleepH (сон прошлой ночи), sessionHard (тяжёлых подходов на ту же мышцу сегодня).
     Выход: {w, targets:[{w,r}], sets, action, level, headline, reasons[], warm, step, range, delta} */
  function plan(o) {
    const kind = o.kind, name = o.name, cls = classOf(name, kind), user = o.range || [8, 12];
    const rng = rangeFor(cls, user), rmin = rng[0], rmax = rng[1];
    const hist = (o.hist || []).filter(h => h.sets && h.sets.length);
    const def = defaultStep(name, kind), step = learnStep(hist, def, kind);
    const rb = kind === 'db' ? 1 : (step >= 5 ? 5 : (step || 2.5));
    const today = o.today, down = kind === 'assist';
    const R = {cls: cls, range: rng, step: step, action: 'hold', level: 'info', reasons: [], sets: 3, targets: [], warm: null, w: null, headline: '', delta: null};
    const why = R.reasons;
    const unit = down ? 'помощь ' : '';

    const mine = (o.pains || []).filter(p => affects(p.area, name));
    const act = mine.filter(p => p.status !== 'resolved' && daysBetween(p.d, today) >= 0 && daysBetween(p.d, today) <= 10 && p.level >= 3);
    const red = act.filter(isRed);
    const healed = mine.filter(p => p.status === 'resolved' && daysBetween(p.d, today) >= 0 && daysBetween(p.d, today) <= 14);
    const pn = p => (AREAS[p.area] || p.area).toLowerCase() + ' ' + p.level + '/10';

    if (red.length) {
      R.action = 'skip'; R.level = 'stop'; R.sets = 0;
      R.headline = 'Лучше пропустить это упражнение сегодня';
      why.push('Недавно записана боль с тревожными признаками (' + red.map(pn).join(', ') + '): это упражнение её нагружает. Не «проверяйте», пройдёт ли.');
      why.push('Замените другим упражнением на те же мышцы (кнопка «⇄ Заменить») и покажите боль врачу, если она не проходит за 2–3 дня.');
      return R;
    }

    /* --- первый раз --- */
    const last = hist[0];
    if (!last) {
      const alt = (o.alt || []).filter(h => h.sets && h.sets.length)[0];
      R.action = 'start'; R.sets = 3;
      if (alt && kind !== 'band') {
        const aTop = down ? Math.min.apply(null, alt.sets.map(s => s.w)) : Math.max.apply(null, alt.sets.map(s => s.w));
        const w0 = roundTo(aTop * (down ? 1.05 : 0.9), rb);
        R.w = w0;
        R.headline = 'Новый тренажёр: в другом зале вы делали ' + fmt(aTop) + ' кг. Здесь начните примерно с ' + fmt(w0) + ' кг';
        why.push('Тренажёры в разных залах отличаются, прямого перевода килограммов нет. Сделайте первый подход как контрольный и подберите вес по ощущениям.');
      } else {
        R.headline = 'Первый раз: подберите вес на ' + rmin + '–' + rmax + ' повторов с запасом 1–2';
        why.push('Начните с лёгкого подхода, затем подберите вес.');
      }
      why.push('Отметьте «запас повторов» после первого подхода: 4 и больше — прибавьте шаг (≈' + fmt(step || 2.5) + ' кг), 2–3 — оставьте вес, 0–1 — сделайте чуть легче.');
      if (act.length) { R.level = 'warn'; why.push('Недавняя боль (' + act.map(pn).join(', ') + '): начните легче и остановитесь при боли.'); }
      return R;
    }

    /* --- что было в прошлый раз --- */
    const g = daysBetween(last.d, today), tier = gapTier(g);
    const lsets = last.sets;
    const topW = down ? Math.min.apply(null, lsets.map(s => s.w)) : Math.max.apply(null, lsets.map(s => s.w));
    const at = lsets.filter(s => s.w === topW), reps = at.map(s => s.r);
    const flags = noteFlags(last.note);
    const dirty = flags.cheat || lsets.some(s => s.dirty);
    const failN = lsets.filter(s => s.rir === 0).length;
    const failNote = flags.fail && failN === 0;
    const drop = reps.length >= 2 ? (reps[0] - reps[reps.length - 1]) / Math.max(1, reps[0]) : 0;
    const bestE = Math.max.apply(null, lsets.map(s => e1(s.w, s.r)));
    const prevGap = hist[1] ? daysBetween(hist[1].d, last.d) : 0;
    const recovering = prevGap >= 14 && g < 10;
    const lastRir = lsets[lsets.length - 1].rir;

    if (hist[1]) { const pe = Math.max.apply(null, hist[1].sets.map(s => e1(s.w, s.r))); R.delta = (bestE - pe) / pe * 100; }

    let mult = 1, freeze = false, tag = null;
    if (tier.mult < 1) {
      mult *= tier.mult; freeze = true; tag = 'return'; R.level = 'warn'; R.sets = g > 28 ? 2 : 3;
      why.push('Перерыв ' + g + ' дн. с последнего раза. За это время сила обычно немного снижается, поэтому вес примерно ' + Math.round(tier.mult * 100) + '% от прошлого. Старые веса вернутся за 2–4 недели, не гонитесь за ними.');
      why.push('Первый подход сделайте контрольным: оставьте 2 повтора в запасе' + (g > 28 ? ', подходов меньше (2)' : '') + '.');
    }
    if (act.length) {
      mult *= 0.8; freeze = true; tag = tag || 'caution'; R.level = 'warn'; R.sets = Math.min(R.sets, 2);
      why.push('Недавняя боль (' + act.map(pn).join(', ') + '), упражнение её нагружает: вес примерно на 20% ниже, без отказа. При боли в подходе — остановитесь.');
    } else if (healed.length) {
      mult *= 0.9; freeze = true; tag = tag || 'caution'; R.level = 'warn';
      why.push('Боль (' + healed.map(pn).join(', ') + ') недавно прошла: вес на 10% ниже, прибавлять рано.');
    } else if (flags.pain && g <= 10) {
      mult *= 0.9; freeze = true; tag = tag || 'caution'; R.level = 'warn';
      why.push('В заметке прошлого раза есть упоминание боли или дискомфорта: сегодня на 10% легче, следите за ощущениями.');
    }
    if (o.deload) { if (tier.mult === 1) mult *= 0.9; freeze = true; tag = 'deload'; R.sets = 2; R.level = 'ok'; why.push('Разгрузочная неделя: вес примерно −10%, 2 подхода, запас 3–4 повтора.'); }
    if (o.sleepH != null && o.sleepH < 6) { freeze = true; R.level = R.level === 'info' ? 'warn' : R.level; why.push('Сон прошлой ночи ' + fmt(o.sleepH) + ' ч: сегодня не прибавляйте вес и оставляйте 2–3 повтора в запасе.'); }
    if (o.sessionHard >= 6) { freeze = true; why.push('Сегодня уже много подходов на ту же мышцу (' + o.sessionHard + '): рекорды пробовать не стоит, оставьте запас повторов.'); }

    const scaled = x => down ? x * (2 - mult) : x * mult;
    const medReps = Math.max(rmin, Math.min(rmax, Math.round(median(reps))));
    let w = topW, rt;

    if (mult < 1) {
      w = roundTo(scaled(topW), rb);
      if (w === topW) w = down ? topW + rb : Math.max(0, topW - rb);
      R.action = tag || 'return';
      rt = reps.map(() => medReps);
    } else if (freeze) {
      R.action = 'hold'; rt = reps.map(r => Math.max(1, r));
    } else if (dirty) {
      R.action = 'hold'; R.level = 'warn';
      why.push('В прошлый раз повторы были «грязными» (раскачка, помощь ног или инерция). Прибавлять вес рано: сначала сделайте чистые повторы с тем же весом.');
      rt = reps.map(r => Math.min(rmax, r));
    } else if (failN >= 2 || ((failN >= 1 || failNote) && drop >= 0.35)) {
      R.action = 'hold'; R.level = 'warn';
      why.push('В прошлый раз подходы шли «в отказ»' + (drop >= 0.35 ? ' (повторов стало заметно меньше: ' + reps.join(' → ') + ')' : '') + '. Держите тот же вес и оставляйте 1–2 повтора в запасе: несколько отказов подряд дают резкое падение.');
      rt = reps.map(() => medReps);
    } else if (recovering && !(reps.length >= 2 && Math.min.apply(null, reps) >= rmax && lsets.some(s => s.rir >= 2))) {
      R.action = 'hold';
      why.push('Прошлый раз был первым после перерыва: сначала закрепите вес, прибавлять вес рано.');
      rt = reps.map(r => Math.min(rmax, r + 1));
    } else if (reps.length >= 2 && Math.min.apply(null, reps) >= rmax && (lastRir === undefined || lastRir >= 1)) {
      const nw = down ? Math.max(0, topW - step) : topW + step;
      const p = predReps(bestE, nw), tr = Math.max(3, Math.min(rmax, p));
      w = nw; R.action = 'add'; R.level = 'ok';
      why.push('В прошлый раз все подходы были на верхней границе диапазона (' + rmax + '+): пора ' + (down ? 'уменьшить помощь' : 'прибавить вес') + ' на один шаг вашего тренажёра (' + fmt(step) + ' кг).');
      if (p < rmin) why.push('Шаг ' + fmt(step) + ' кг — это примерно ' + Math.round(step / Math.max(topW, 1) * 100) + '% веса, повторов будет около ' + p + ': это нормально. Цель — закрепить, потом добавлять по повтору (' + p + ' → ' + (p + 1) + ' → …).');
      else why.push('По вашему расчётному максимуму на новом весе ожидается около ' + p + ' повторов.');
      rt = reps.map(() => tr);
    } else if (reps[0] < rmin) {
      w = roundTo(down ? topW * 1.05 : topW * 0.95, rb); if (w === topW) w = down ? topW + rb : Math.max(0, topW - rb);
      R.action = 'back'; R.level = 'warn';
      why.push('В первом подходе прошлый раз было меньше ' + rmin + ' повторов: вес тяжеловат для рабочего диапазона. Чуть легче или тот же вес с отдыхом 3 минуты.');
      rt = reps.map(() => rmin);
    } else {
      R.action = 'hold';
      why.push('Закрепляйте вес: цель — на повтор больше в каждом подходе, до ' + rmax + '. Когда все подходы дойдут до ' + rmax + ' (с запасом 1–2 и чисто), прибавьте шаг.');
      rt = reps.map(r => Math.min(rmax, r + 1));
    }
    while (rt.length < R.sets) rt.push(rt[rt.length - 1]);
    rt = rt.slice(0, Math.max(1, R.sets));
    R.w = w; R.targets = rt.map(r => ({w: w, r: r}));

    /* --- тренд по нескольким последним разам --- */
    const es = hist.slice(0, 4).map(h => Math.max.apply(null, h.sets.map(s => e1(s.w, s.r)))).reverse();
    const noGaps = hist.slice(0, 4).every((h, i) => i === 0 || daysBetween(h.d, hist[i - 1].d) <= 14);
    if (es.length >= 4 && noGaps && R.action !== 'add' && !tag) {
      if ((es[3] - es[0]) / es[0] < 0.01 && Math.max.apply(null, es) / Math.min.apply(null, es) < 1.03) {
        why.push('Застой: сила почти не меняется 4 тренировки подряд. Попробуйте добавить повторы в последнем подходе, сменить вариант упражнения или сделать разгрузочную неделю; проверьте сон и питание.');
      } else if (es[3] < es[2] * 0.97 && es[2] < es[1] * 0.97) {
        R.level = 'warn';
        why.push('Сила падает две тренировки подряд. Проверьте сон, питание и боли; возможно, нужна разгрузочная неделя.');
      }
    }
    if (R.delta != null && Math.abs(R.delta) >= 1) why.push('К прошлому разу сила (расчётный максимум) ' + (R.delta > 0 ? 'выше' : 'ниже') + ' на ' + Math.abs(Math.round(R.delta)) + '%.');

    /* --- разминка --- */
    if ((cls === 'comp' || cls === 'lower' || cls === 'legm') && kind !== 'band' && !down && w >= 30 && R.action !== 'skip') {
      R.warm = 'Разминка: ' + fmt(roundTo(w * 0.5, rb)) + ' × 10, потом ' + fmt(roundTo(w * 0.75, rb)) + ' × 5';
    }

    const rtext = R.targets.every(t => t.r === R.targets[0].r) ? String(R.targets[0].r) : R.targets.map(t => t.r).join('–');
    const lead = {return: 'Сегодня', caution: 'Сегодня осторожно', deload: 'Разгрузка', add: 'Пора прибавить', hold: 'Цель', back: 'Чуть легче'}[R.action] || 'Цель';
    R.headline = lead + ': ' + unit + fmt(w) + ' кг × ' + rtext + (R.sets ? ' (' + R.sets + ' подх.)' : '');
    return R;
  }

  /* ---------- совет после введённого подхода ---------- */
  function setAdvice(o) {
    const cur = o.sets[o.j];
    if (!cur || cur.t === 'w' || !(cur.r > 0) || o.kind === 'band') return null;
    const works = o.sets.filter(s => s.t !== 'w' && s.r > 0);
    const idx = o.sets.slice(0, o.j + 1).filter(s => s.t !== 'w' && s.r > 0).length - 1;
    const before = idx > 0 ? works[idx - 1] : null;
    const pl = o.plan || null;
    const rng = (pl && pl.range) || o.range || [8, 12], rmin = rng[0], rmax = rng[1];
    const step = (pl && pl.step) || stepFor(o.kind), assist = o.kind === 'assist';
    const rb = o.kind === 'db' ? 1 : (step >= 5 ? 5 : (step || 2.5));
    const w = cur.w, r = cur.r, rir = cur.rir, pv = (o.prev || [])[idx] || null;
    const lowW = assist ? null : roundTo(w * 0.93, rb) === w ? Math.max(0, w - rb) : roundTo(w * 0.93, rb);
    const lowTxt = assist ? 'добавьте помощь на 2,5–5 кг' : 'снизьте вес на один шаг' + (step ? ' (до ' + fmt(lowW) + ' кг)' : '');
    const nf = noteFlags(o.note);
    const total = (pl && pl.sets) || 3, ask = rir === undefined ? ' Отметьте запас повторов — тогда совет будет точнее.' : '';
    if (cur.dirty || nf.cheat) {
      return {level: 'warn', text: 'Повторы с раскачкой, помощью ног или инерцией не считаются чистыми. Вес не прибавляйте, пока не получатся чистые повторы; в следующем подходе сосредоточьтесь на технике.'};
    }
    if (rir === 0) {
      return {level: 'warn', text: idx < total - 1
        ? 'Это был отказ. В следующем подходе оставьте 1–2 повтора в запасе и отдохните 3 минуты: несколько отказов подряд дают резкое падение повторов' + (w > 0 && !assist && before && r <= before.r - 3 ? '; если упадёт снова — ' + lowTxt : '') + '.'
        : 'Закончили отказом. В следующий раз держите тот же вес, цель — те же повторы с запасом 1–2.'};
    }
    if (before && before.w === w && (r <= before.r - 3 || r <= before.r * 0.7)) {
      return {level: 'warn', text: (before.rir === 0 ? 'Падение после отказа — ожидаемо. ' : 'Повторов заметно меньше, чем в прошлом подходе (' + before.r + ' → ' + r + ') — это усталость. ') + 'Следующий подход: оставьте вес и отдохните 2–3 минуты; если снова упадёт так же — ' + lowTxt + '. Идти в отказ в каждом подходе не нужно.'};
    }
    if (r < rmin) {
      return {level: 'warn', text: 'Меньше ' + rmin + ' повторов — вес тяжеловат для рабочего диапазона' + (rir >= 2 ? ' (хотя запас был — возможно, мешает техника или усталость)' : '') + '. Следующий подход: ' + lowTxt + ', чтобы сделать ' + rmin + '–' + rmax + ' с чистой техникой.'};
    }
    if (rir >= 4 && !assist && step) {
      return {level: 'info', text: 'Запас большой — вес лёгкий. В следующем подходе можно прибавить шаг (' + fmt(w + step) + ' кг) и остаться в диапазоне ' + rmin + '–' + rmax + '.'};
    }
    if (pv && pv.w === w && r <= pv.r - 2) {
      return {level: 'warn', text: 'Меньше, чем в прошлый раз (' + pv.r + ' → ' + r + '). Следующий подход: если техника была чистой и оставался ещё повтор — можно довести до отказа; если вы на пределе или техника портится — уменьшите вес на 5%.' + ask};
    }
    if (r >= rmax) {
      return {level: 'ok', text: rir !== undefined && rir <= 1
        ? 'Верх диапазона (' + r + '), но запас мал. Закрепите ещё раз, прибавлять вес рано.'
        : 'Верх диапазона (' + r + ' повторов). Если запас ещё есть — в следующий раз ' + (assist ? 'уменьшите помощь' : 'добавьте вес' + (step ? ' (' + fmt(w + step) + ' кг)' : '')) + ' и начните с ' + rmin + '.' + ask};
    }
    const tgt = pl && pl.targets && pl.targets[idx];
    if (tgt && tgt.w === w && r >= tgt.r + 2 && (rir === undefined || rir >= 2)) return {level: 'ok', text: 'Лучше плана (' + r + ' при цели ' + tgt.r + '). Если запас ещё есть, следующий подход можно сделать на 1–2 повтора больше.'};
    if (pv && pv.w === w && r > pv.r) return {level: 'ok', text: 'Лучше, чем в прошлый раз (+' + (r - pv.r) + ') 💪'};
    if (pv && pv.w === w && r === pv.r) return {level: 'info', text: 'Как в прошлый раз ✓. Если последний повтор давался легко — в следующем подходе постарайтесь сделать на 1 больше.' + ask};
    return null;
  }

  /* ---------- разгрузочная неделя ---------- */
  function deloadStatus(dates, today, deload) {
    if (deload && deload.until && deload.until >= today) return {state: 'active', until: deload.until, streak: 0, reasons: []};
    const cnt = {};
    dates.forEach(d => { const w = mondayOf(d); cnt[w] = (cnt[w] || 0) + 1; });
    let w = mondayOf(today), streak = 0;
    if ((cnt[w] || 0) < 2) w = shiftDay(w, -7);
    const lastDeload = deload && deload.last ? mondayOf(deload.last) : null;
    while ((cnt[w] || 0) >= 2) {
      if (lastDeload && w <= lastDeload) break;
      streak++; w = shiftDay(w, -7);
    }
    const reasons = streak ? [streak + ' нед. подряд с двумя и более тренировками без разгрузки'] : [];
    const state = streak >= 6 ? 'due' : streak === 5 ? 'soon' : 'ok';
    return {state: state, streak: streak, reasons: reasons};
  }

  /* ---------- вес и цель ---------- */
  function avgWeight(ws, from, to) { const a = ws.filter(x => x.d >= from && x.d <= to); return a.length ? a.reduce((s, x) => s + x.kg, 0) / a.length : null; }
  function weightAdvice(goal, ws, today) {
    if (!goal || !ws || !ws.length) return null;
    const cur = avgWeight(ws, shiftDay(today, -6), today), prev = avgWeight(ws, shiftDay(today, -34), shiftDay(today, -28));
    if (cur == null || prev == null) return null;
    const perWeek = (cur - prev) / 4;
    const base = 'За последний месяц: ' + (perWeek >= 0 ? '+' : '') + fmt(perWeek) + ' кг в неделю (среднее ' + fmt(prev) + ' → ' + fmt(cur) + ' кг). ';
    if (goal.type === 'mass') {
      if (perWeek > 0.75) return {level: 'warn', perWeek: perWeek, text: base + 'Набор быстрее обычного ориентира 0,25–0,5 кг в неделю: заметная часть может уйти в жир. Рассмотрите чуть меньше калорий.'};
      if (perWeek < 0.1) return {level: 'info', perWeek: perWeek, text: base + 'Масса почти не растёт. Если цель — набор, добавьте примерно 200–300 ккал в день и следите за белком; смотрите и на силу в упражнениях.'};
      return {level: 'ok', perWeek: perWeek, text: base + 'Темп набора в пределах ориентира 0,25–0,5 кг в неделю.'};
    }
    if (goal.type === 'cut') {
      const pct = -perWeek / cur * 100;
      if (pct > 1.2) return {level: 'warn', perWeek: perWeek, text: base + 'Снижение быстрее ориентира 0,5–1% веса в неделю: растёт риск потерять мышцы и силу. Лучше слегка добавить калории.'};
      if (pct < 0.2) return {level: 'info', perWeek: perWeek, text: base + 'Вес почти не снижается. Если цель — снижение, чуть уменьшите калории или добавьте ходьбу.'};
      return {level: 'ok', perWeek: perWeek, text: base + 'Темп снижения в пределах ориентира 0,5–1% веса в неделю.'};
    }
    if (Math.abs(perWeek) > 0.3) return {level: 'info', perWeek: perWeek, text: base + 'Для поддержания вес лучше держать стабильным (±0,3 кг в неделю).'};
    return {level: 'ok', perWeek: perWeek, text: base + 'Вес стабилен ✓'};
  }

  /* ---------- сон ---------- */
  function sleepAdvice(sleeps, today) {
    const recent = (sleeps || []).filter(s => daysBetween(s.d, today) >= 0 && daysBetween(s.d, today) <= 4).sort((a, b) => a.d.localeCompare(b.d));
    if (!recent.length) return null;
    const avg = recent.reduce((a, s) => a + s.h, 0) / recent.length;
    const last = recent[recent.length - 1];
    if (recent.length >= 2 && avg < 6) return {level: 'warn', text: 'Сон за последние дни в среднем ' + fmt(avg) + ' ч. Этого мало для восстановления: сегодня работайте легче, оставляйте 2–3 повтора в запасе и не идите в отказ.'};
    if (last.h < 5) return {level: 'warn', text: 'Прошлой ночью всего ' + fmt(last.h) + ' ч сна. Сегодня лучше снизить нагрузку и не гнаться за рекордами.'};
    if (avg < 7) return {level: 'info', text: 'Сон в среднем ' + fmt(avg) + ' ч — на нижней границе. Для набора силы и мышц обычно стремятся к 7–9 часам.'};
    return {level: 'ok', text: 'Сон в среднем ' + fmt(avg) + ' ч — хорошо для восстановления.'};
  }

  /* ---------- кардио и калории ---------- */
  const CARDIO = {strength: ['Силовая тренировка', 4.5], walk: ['Ходьба', 4.5], incline: ['Ходьба в горку', 6], bike: ['Велотренажёр', 6], ellip: ['Эллипс', 5.5], run: ['Бег', 9], row: ['Гребля', 7], other: ['Другое', 5]};
  const kcalPerMin = (type, kg) => ((CARDIO[type] || CARDIO.other)[1]) * (kg || 90) / 60;
  function cardioAdvice(o) {
    const today = o.today, cardio = o.cardio || [], goal = o.goal, kg = o.kg || 90;
    const week = cardio.filter(c => daysBetween(c.d, today) >= 0 && daysBetween(c.d, today) <= 6);
    const wmin = week.filter(c => c.type !== 'strength').reduce((a, c) => a + (c.min || 0), 0);
    const dayC = cardio.filter(c => c.d === today);
    const watch = (o.kcalDays || []).find(k => k.d === today);
    const dayKcal = watch ? watch.kcal : dayC.reduce((a, c) => a + (c.kcal || Math.round(kcalPerMin(c.type, kg) * c.min)), 0);
    const type = goal && goal.type || 'maintain';
    const lowImpact = (o.pains || []).some(p => p.status !== 'resolved' && p.level >= 3 && daysBetween(p.d, today) >= 0 && daysBetween(p.d, today) <= 14 && /^(hip|knee|ankle|lower_back)$/.test(p.area));
    const pick = lowImpact ? 'велотренажёр или быстрая ходьба (бег и прыжки пока лучше убрать: недавно болели бедро, колено, стопа или поясница)' : 'быстрая ходьба в горку или велотренажёр';
    const lines = [];
    const target = type === 'cut' ? 500 : type === 'mass' ? 200 : 300;
    const wTarget = type === 'cut' ? 150 : type === 'mass' ? 60 : 100;
    let level = 'info', text = '';
    if (dayKcal != null && (watch || dayC.length)) {
      const need = target - dayKcal;
      if (need > 40) {
        const mins = Math.min(45, Math.max(10, Math.round(need / kcalPerMin(lowImpact ? 'bike' : 'incline', kg) / 5) * 5));
        level = type === 'cut' ? 'warn' : 'info';
        text = 'Активных калорий сегодня ' + Math.round(dayKcal) + ' при ориентире около ' + target + (type === 'cut' ? ' для снижения веса' : '') + '. Можно добавить примерно ' + mins + ' мин лёгкого кардио (' + pick + ').';
      } else {
        level = 'ok'; text = 'Активных калорий сегодня ' + Math.round(dayKcal) + ': ориентир около ' + target + ' достигнут ✓';
      }
    }
    if (type === 'cut' && wmin < wTarget) text += (text ? ' ' : '') + 'За 7 дней кардио ' + wmin + ' мин из ориентира ' + wTarget + '. Лучше набирать понемногу: 3–4 раза по 30–40 мин в низком темпе (можно говорить фразами).';
    else if (type !== 'cut' && wmin < wTarget && wmin >= 0) text += (text ? ' ' : '') + 'Кардио за 7 дней: ' + wmin + ' мин (для сердца и восстановления хватит ~' + wTarget + ' мин в неделю).';
    else if (wmin >= wTarget) text += (text ? ' ' : '') + 'Кардио за 7 дней: ' + wmin + ' мин — ориентир выполнен ✓';
    if (type === 'cut' && o.weightLevel === 'info') text += ' Вес почти не снижается: первым делом проверьте калорийность питания, кардио — дополнение, а не замена.';
    if (type === 'mass' && dayKcal > 800) { level = 'warn'; text += ' Очень много активных калорий для набора массы — следите за тем, чтобы хватало еды.'; }
    if (!text) return null;
    return {level: level, text: text, wmin: wmin, dayKcal: dayKcal};
  }

  return {fmt, CARDIO, kcalPerMin, cardioAdvice, stepFor, shiftDay, daysBetween, mondayOf, roundTo, e1, predReps, classOf, defaultStep, rangeFor, learnStep, noteFlags, gapTier, plan, setAdvice, AREAS, AREA_TIPS, affects, painAdvice, painWarnFor, deloadStatus, weightAdvice, sleepAdvice};
})();
