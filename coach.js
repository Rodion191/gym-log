'use strict';
/* =====================================================================
   Правила «тренера». Всё считается на самом телефоне, без сервера и без ИИ.
   Тексты написаны по общепринятым принципам силовой подготовки (двойная прогрессия,
   запас повторов, разгрузочные недели, осторожность с болью). Это справочные советы,
   а не медицинские рекомендации. Файл можно показать тренеру или врачу и поправить.
   ===================================================================== */
const COACH = (function () {
  const fmt = v => (Math.round(v * 100) / 100).toString().replace('.', ',');
  const roundStep = (x, step) => step ? Math.round(x / step) * step : x;
  const stepFor = kind => (kind === 'load' || kind === 'side' || kind === 'assist') ? 2.5 : kind === 'db' ? 1 : 0;
  const parse = d => { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd, 12); };
  const iso = dt => dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
  const shiftDay = (d, n) => { const dt = parse(d); dt.setDate(dt.getDate() + n); return iso(dt); };
  const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
  const mondayOf = d => { const dt = parse(d); const wd = (dt.getDay() + 6) % 7; dt.setDate(dt.getDate() - wd); return iso(dt); };

  /* ---------- цель на тренировку (двойная прогрессия) ---------- */
  function nextTarget(prev, kind, range, deload) {
    const rmin = range[0], rmax = range[1], step = stepFor(kind);
    if (!prev || !prev.length) return {action: 'none', text: 'Первый раз: подберите вес, с которым получится ' + rmin + '–' + rmax + ' повторов, оставив 1–2 повтора в запасе.'};
    if (kind === 'band') return {action: 'hold', text: 'Цель: на 1–2 повтора больше, чем в прошлый раз. Когда станет легко — резинка полегче.'};
    // для гравитрона «основной» подход — с наименьшей помощью (самый трудный), а не лёгкая добивка
    const top = kind === 'assist' ? Math.min.apply(null, prev.map(s => s.w)) : Math.max.apply(null, prev.map(s => s.w));
    const at = prev.filter(s => s.w === top);
    const minR = Math.min.apply(null, at.map(s => s.r)), first = at[0];
    if (deload) {
      const w = kind === 'assist' ? top : roundStep(top * 0.9, step);
      return {action: 'deload', w: w, r: Math.min(rmax, Math.max(rmin, first.r)), text: 'Разгрузка: ' + fmt(w) + ' кг, 2 подхода, с запасом 3–4 повтора. Цель — восстановиться, а не побить рекорд.'};
    }
    if (kind === 'assist') {
      if (at.length >= 2 && minR >= rmax) { const w = Math.max(0, top - step); return {action: 'add', w: w, r: rmin, text: 'Все подходы по ' + rmax + '+. Уменьшите помощь до ' + fmt(w) + ' кг и начните с ' + rmin + ' повторов.'}; }
      if (first.r < rmin) { const w = top + step; return {action: 'back', w: w, r: first.r, text: 'В прошлый раз вышло меньше ' + rmin + '. Добавьте помощь до ' + fmt(w) + ' кг.'}; }
      return {action: 'hold', w: top, r: first.r, text: 'Цель: ' + fmt(top) + ' кг помощи, на 1 повтор больше в каждом подходе (до ' + rmax + ').'};
    }
    if (at.length >= 2 && minR >= rmax) {
      const w = top + step;
      return {action: 'add', w: w, r: rmin, text: 'Все подходы по ' + rmax + '+ — пора добавить вес: ' + fmt(w) + ' кг, начните с ' + rmin + ' повторов.'};
    }
    if (first.r < rmin) {
      const w = roundStep(top * 0.95, step);
      return {action: 'back', w: w, r: Math.min(rmax, Math.max(rmin, first.r)), text: 'В прошлый раз в первом подходе было меньше ' + rmin + ' повторов. Сегодня ' + fmt(w) + ' кг (чуть легче) или тот же вес с отдыхом 3 минуты.'};
    }
    return {action: 'hold', w: top, r: first.r, text: 'Цель: ' + fmt(top) + ' кг, на 1 повтор больше в каждом подходе (до ' + rmax + ').'};
  }

  /* ---------- совет после введённого подхода ---------- */
  function setAdvice(o) {
    const cur = o.sets[o.j];
    if (!cur || cur.t === 'w' || !(cur.r > 0) || o.kind === 'band') return null;
    const work = o.sets.filter(s => s.t !== 'w' && s.r > 0);
    const idx = o.sets.slice(0, o.j + 1).filter(s => s.t !== 'w' && s.r > 0).length - 1;
    const before = idx > 0 ? work[idx - 1] : null;
    const pv = (o.prev || [])[idx] || null;
    const rmin = o.range[0], rmax = o.range[1], r = cur.r, w = cur.w, k = o.kind, step = stepFor(k);
    const lower = step && k !== 'assist' ? fmt(Math.max(0, roundStep(w * 0.93, step))) : null;
    if (before && before.w === w && (r <= before.r - 3 || r <= before.r * 0.7)) {
      return {level: 'warn', text: 'Повторов заметно меньше, чем в прошлом подходе (' + before.r + ' → ' + r + ') — это усталость. Следующий подход: оставьте вес и отдохните 2–3 минуты; если снова упадёт так же — ' + (k === 'assist' ? 'добавьте помощь на 2,5–5 кг' : 'снизьте вес на 5–10%' + (lower ? ' (до ' + lower + ' кг)' : '')) + '. Идти в отказ в каждом подходе не нужно.'};
    }
    if (r < rmin) {
      return {level: 'warn', text: 'Меньше ' + rmin + ' повторов — вес тяжеловат для рабочего диапазона. Следующий подход: ' + (k === 'assist' ? 'добавьте помощь на 2,5–5 кг' : 'снизьте вес на 5–10%' + (lower ? ' (до ' + lower + ' кг)' : '')) + ', чтобы сделать ' + rmin + '–' + rmax + ' с чистой техникой.'};
    }
    if (pv && pv.w === w && r <= pv.r - 2) {
      return {level: 'warn', text: 'Меньше, чем в прошлый раз (' + pv.r + ' → ' + r + '). Следующий подход: если техника была чистой и в запасе оставался ещё повтор — можно довести до отказа; если вы на пределе или техника портится — уменьшите вес на 5%.'};
    }
    if (r >= rmax) {
      return {level: 'ok', text: 'Верх диапазона (' + r + ' повторов). Если запас ещё есть — в следующий раз добавьте вес' + (step && k !== 'assist' ? ' (' + fmt(w + step) + ' кг)' : '') + ' и начните с ' + rmin + '.'};
    }
    if (pv && pv.w === w && r > pv.r) return {level: 'ok', text: 'Лучше, чем в прошлый раз (+' + (r - pv.r) + ') 💪'};
    if (pv && pv.w === w && r === pv.r) return {level: 'info', text: 'Как в прошлый раз ✓. Если последний повтор давался легко — в следующем подходе постарайтесь сделать на 1 больше.'};
    return null;
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
    hip: /присед|жим ногами|выпад|станов|мёртв|румын|адуктор|аддуктор|абдуктор|сведение ног|разведение ног/i,
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

  /* ---------- разгрузочная неделя ---------- */
  function deloadStatus(dates, today, deload) {
    if (deload && deload.until && deload.until >= today) return {state: 'active', until: deload.until, streak: 0, reasons: []};
    const cnt = {};
    dates.forEach(d => { const w = mondayOf(d); cnt[w] = (cnt[w] || 0) + 1; });
    let w = mondayOf(today), streak = 0;
    if ((cnt[w] || 0) < 2) w = shiftDay(w, -7);              // текущая неделя ещё не «накопилась»
    const lastDeload = deload && deload.last ? mondayOf(deload.last) : null;
    while ((cnt[w] || 0) >= 2) {
      if (lastDeload && w <= lastDeload) break;               // после разгрузки счётчик идёт с нуля
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

  return {fmt, stepFor, shiftDay, daysBetween, mondayOf, nextTarget, setAdvice, AREAS, AREA_TIPS, affects, painAdvice, painWarnFor, deloadStatus, weightAdvice, sleepAdvice};
})();
