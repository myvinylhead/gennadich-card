(() => {
  const W = 1024, H = 1536;
  const root = document.documentElement;
  const tilt = document.getElementById('tilt');
  const stage = document.getElementById('stage');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // отладка: ?ref — наложить референс, ?ref&x=0&y=230&z=2 — увеличить участок
  const qs = new URLSearchParams(location.search);
  const debug = qs.has('ref');
  if (debug) document.body.classList.add('show-ref');
  if (debug && !qs.has('noref')) {
    const ref = new Image();
    ref.className = 'ref';
    ref.src = 'ref.png';
    stage.appendChild(ref);
  }

  /* ---------- Музыка ---------- */
  // обычный <audio loop>: работает везде; на стыке петли возможна крошечная пауза
  const music = (() => {
    const btn = document.getElementById('soundBtn');
    const audio = new Audio();
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = .6;
    audio.setAttribute('playsinline', '');
    audio.src = 'assets/music.mp3';
    let muted = false;
    try { muted = localStorage.getItem('card-muted') === '1'; } catch {}

    const playing = () => !audio.paused;
    function paint() {
      btn.classList.toggle('is-muted', muted);
      btn.setAttribute('aria-pressed', String(!muted));
      btn.setAttribute('aria-label', muted ? 'Включить музыку' : 'Выключить музыку');
      btn.classList.toggle('is-waiting', !muted && !playing());
    }
    ['play', 'playing', 'pause'].forEach(t => audio.addEventListener(t, paint));

    // для прелоадера: ждём, пока трек можно проиграть целиком (но не дольше 8 с)
    function load() {
      return new Promise(resolve => {
        if (audio.readyState >= 4) return resolve();
        const done = () => resolve();
        audio.addEventListener('canplaythrough', done, { once: true });
        audio.addEventListener('error', done, { once: true });
        setTimeout(done, 8000);
        audio.load();
      });
    }
    function play() {
      if (muted) return paint();
      const p = audio.play();
      if (p) p.catch(() => paint()); // браузер не разрешил без касания — ждём касания
    }
    function toggle() {
      muted = !muted;
      try { localStorage.setItem('card-muted', muted ? '1' : '0'); } catch {}
      if (muted) audio.pause(); else play();
      paint();
    }
    btn.addEventListener('click', e => {
      e.stopPropagation();
      // музыка ещё не заиграла — кнопка её запускает, а не выключает
      if (!muted && !playing()) return play();
      toggle();
    });
    // первое касание где угодно включает звук (так требуют браузеры)
    const unlock = e => { if (!btn.contains(e.target) && !muted && !playing()) play(); };
    ['pointerdown', 'touchend', 'keydown', 'click'].forEach(t => addEventListener(t, unlock, { passive: true }));
    // свернули вкладку — тишина
    let wasPlaying = false;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { wasPlaying = playing(); audio.pause(); }
      else if (wasPlaying && !muted) play();
    });
    paint();
    return { load, play };
  })();

  /* ---------- Прелоадер ---------- */
  const loaderMsgs = [
    'Дискомбобулирую поздравление…',
    'Прогреваю реактор меха…',
    'Будим кота. Аккуратно…',
    'Уговариваю Клода выйти на смену…',
    'Раздуваю контекст до неприличия…',
    'Сдуваю пыль с дискет DOS…',
    'Кормлю агентов токенами…',
    'Провожу гриллинг пожеланий…',
    'Синхронизируюсь с Санярой…',
    'Вайбкожу торт…',
    'Калибрую конфетти…',
    'Вставляю картридж до щелчка…',
    'Собираю архитектуру с первого раза…',
    'Геннадичизирую интерфейс…',
    'Зажигаю свечи. Тушу пожарную тревогу…',
    'Ищу, куда Клод положил шарики…',
    'Деплою праздник в прод…',
    'Перевожу тикет «поздравить» в In Progress…',
  ];
  const spinFrames = ['·', '✢', '✳', '✶', '✻', '✽', '✻', '✶', '✳', '✢'];

  function runLoader() {
    const box = document.getElementById('loader');
    const msgEl = document.getElementById('loaderMsg');
    const spinEl = document.getElementById('loaderSpin');
    const barEl = document.getElementById('loaderBar');
    const pctEl = document.getElementById('loaderPct');

    // фразы — в случайном порядке без повторов
    const order = loaderMsgs.map((m, i) => [Math.random(), m]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    let mi = 0;
    const showMsg = text => { msgEl.textContent = text; msgEl.classList.remove('is-in'); void msgEl.offsetWidth; msgEl.classList.add('is-in'); };
    showMsg(order[mi]);
    const msgTimer = setInterval(() => showMsg(order[++mi % order.length]), 1300);
    let fi = 0;
    const spinTimer = setInterval(() => { spinEl.textContent = spinFrames[fi++ % spinFrames.length]; }, 110);

    // прогресс: картинки по байтам, шрифты — фиксированной долей
    const imgs = [...document.querySelectorAll('img[data-src]')];
    const sizes = { 'assets/bg.png': 832000, 'assets/logo.png': 78000 }; // если сервер не скажет размер
    const FONT_SHARE = .12;
    const got = imgs.map(() => 0), total = imgs.map(im => sizes[im.dataset.src] || 100000);
    let fontsDone = false, target = 0, shown = 0;
    const recalc = () => {
      const bytes = got.reduce((a, b) => a + b, 0) / total.reduce((a, b) => a + b, 0);
      target = Math.min(1, bytes) * (1 - FONT_SHARE) + (fontsDone ? FONT_SHARE : 0);
    };
    // таймер, а не requestAnimationFrame: так прогресс идёт и в фоновой вкладке
    const barTimer = setInterval(() => {
      shown += (target - shown) * .18;
      const p = Math.round(shown * 100);
      barEl.style.width = p + '%';
      pctEl.textContent = p + '%';
    }, 50);

    // ставим src и ждём настоящего события загрузки (или ошибки)
    const setSrc = (im, url) => new Promise(resolve => {
      const done = () => { im.removeEventListener('load', done); im.removeEventListener('error', done); resolve(); };
      im.addEventListener('load', done);
      im.addEventListener('error', done);
      im.src = url;
      if (im.complete && im.naturalWidth) done();
    });
    async function loadImg(im, i) {
      const src = im.dataset.src;
      try {
        const res = await fetch(src);
        if (!res.ok || !res.body) throw new Error('no stream');
        const len = +res.headers.get('content-length');
        if (len) total[i] = len;
        const reader = res.body.getReader(), parts = [];
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          parts.push(value); got[i] += value.length; recalc();
        }
        await setSrc(im, URL.createObjectURL(new Blob(parts, { type: 'image/png' })));
      } catch {
        // например, открыто как файл — грузим обычным способом
      }
      if (!im.naturalWidth) await setSrc(im, src);
      // декодируем заранее, чтобы картинка не «проявлялась» уже после показа
      if (im.decode) await Promise.race([im.decode().catch(() => {}), sleep(4000)]);
      got[i] = total[i]; recalc();
    }
    const fonts = document.fonts
      ? Promise.all(['700 20px Oswald', '500 20px Oswald', '500 16px "Roboto Condensed"', '700 16px "Roboto Condensed"', '500 12px "JetBrains Mono"', '700 12px "JetBrains Mono"']
          .map(f => document.fonts.load(f, 'АБВ abc'))).catch(() => {})
      : Promise.resolve();
    fonts.then(() => { fontsDone = true; recalc(); });

    const loaded = Promise.all([...imgs.map(loadImg), fonts, music.load()]);
    const minTime = sleep(1800);                 // чтобы успеть прочитать шутку
    const maxTime = sleep(20000);                // если сеть совсем плохая — показываем как есть
    return Promise.race([Promise.all([loaded, minTime]), maxTime]).then(async () => {
      target = 1;
      clearInterval(msgTimer);
      showMsg('Поздравление собрано с\u00a0первого\u00a0раза\u00a0✓');
      await sleep(650);
      clearInterval(spinTimer);
      clearInterval(barTimer);
      barEl.style.width = '100%';
      pctEl.textContent = '100%';
      // два кадра, чтобы фон точно был нарисован под прелоадером
      await Promise.race([new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))), sleep(300)]);
      box.classList.add('is-done');
      document.body.classList.remove('loading');
      setTimeout(() => box.remove(), 600);
    });
  }

  /* ---------- Масштаб под экран ---------- */
  function fit() {
    const pad = innerWidth < 600 ? 0 : 24;
    const s = Math.min((innerWidth - pad * 2) / W, (innerHeight - pad * 2) / H);
    root.style.setProperty('--s', s);
    if (debug && qs.has('z')) {
      const z = +qs.get('z');
      root.style.setProperty('--s', z);
      document.getElementById('zoom').style.placeItems = 'start';
      tilt.style.transition = 'none';
      tilt.style.transform = `translate(${-(+qs.get('x') || 0) * z}px, ${-(+qs.get('y') || 0) * z}px)`;
    }
  }
  addEventListener('resize', () => { fit(); zoomFix(); fitLines(); });
  fit();

  /* ---------- 3D-наклон и блик за курсором ---------- */
  // px, py — положение «взгляда» от 0 до 1, центр — 0.5
  function applyTilt(px, py) {
    if (zoom.z > 1.01) return; // в приближении открытка не качается
    tilt.style.transform = `rotateY(${(px - .5) * 8}deg) rotateX(${(.5 - py) * 6}deg)`;
    stage.style.setProperty('--gx', px * 100 + '%');
    stage.style.setProperty('--gy', py * 100 + '%');
  }
  function onMove(x, y) {
    const r = tilt.getBoundingClientRect();
    applyTilt((x - r.left) / r.width, (y - r.top) / r.height);
  }
  if (matchMedia('(hover: hover)').matches && !reduced) {
    addEventListener('pointermove', e => onMove(e.clientX, e.clientY));
    document.addEventListener('pointerleave', () => { tilt.style.transform = ''; });
  }

  /* ---------- Зум: щипок, колёсико, кнопки, перетаскивание ---------- */
  const zoomEl = document.getElementById('zoom');
  const viewport = document.getElementById('viewport');
  const ZMIN = 1, ZMAX = 4;
  const zoom = { z: 1, x: 0, y: 0 };
  const zclamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // не даём открытке уехать за край: если она меньше экрана — центрируем
  function zoomFix() {
    const vw = innerWidth, vh = innerHeight;
    const L = tilt.offsetLeft, T = tilt.offsetTop, cw = tilt.offsetWidth, ch = tilt.offsetHeight;
    const z = zoom.z;
    zoom.x = cw * z <= vw ? (vw - cw * z) / 2 - L * z : zclamp(zoom.x, vw - (L + cw) * z, -L * z);
    zoom.y = ch * z <= vh ? (vh - ch * z) / 2 - T * z : zclamp(zoom.y, vh - (T + ch) * z, -T * z);
    if (z <= 1.001) { zoom.x = 0; zoom.y = 0; }
    zoomEl.style.transform = `translate(${zoom.x}px, ${zoom.y}px) scale(${z})`;
    document.body.classList.toggle('is-zoomed', z > 1.01);
  }
  // приблизить так, чтобы точка экрана (px, py) осталась под пальцем/курсором
  function zoomTo(z, px = innerWidth / 2, py = innerHeight / 2, animate = false) {
    z = zclamp(z, ZMIN, ZMAX);
    zoom.x = px - (px - zoom.x) * (z / zoom.z);
    zoom.y = py - (py - zoom.y) * (z / zoom.z);
    zoom.z = z;
    if (z > 1.01) tilt.style.transform = '';
    zoomEl.classList.toggle('is-anim', animate);
    zoomFix();
    if (animate) setTimeout(() => zoomEl.classList.remove('is-anim'), 380);
  }

  // колёсико мыши и щипок на тачпаде (приходит как wheel с ctrlKey)
  viewport.addEventListener('wheel', e => {
    e.preventDefault();
    const k = e.ctrlKey ? .012 : .0018;
    zoomTo(zoom.z * Math.exp(-e.deltaY * k), e.clientX, e.clientY);
  }, { passive: false });
  // Safari на iOS/macOS: не даём браузеру зумить страницу целиком
  ['gesturestart', 'gesturechange'].forEach(t => document.addEventListener(t, e => e.preventDefault()));

  const pts = new Map();
  let gesture = null, moved = 0;
  const mid = () => { const [a, b] = [...pts.values()]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) }; };
  function startGesture() {
    if (pts.size >= 2) {
      const m = mid();
      gesture = { type: 'pinch', z0: zoom.z, x0: zoom.x, y0: zoom.y, m0: m };
    } else if (pts.size === 1) {
      const p = [...pts.values()][0];
      gesture = { type: 'pan', x0: zoom.x, y0: zoom.y, p0: { ...p } };
    } else gesture = null;
  }
  // браузер не должен утаскивать картинки как файлы — иначе перетаскивание не работает
  viewport.addEventListener('dragstart', e => e.preventDefault());
  viewport.querySelectorAll('img').forEach(im => { im.draggable = false; });
  viewport.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.pointerType === 'mouse') e.preventDefault(); // без выделения и drag-n-drop
    try { viewport.setPointerCapture(e.pointerId); } catch {}
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) moved = 0;
    startGesture();
  });
  addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId) || !gesture) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (gesture.type === 'pinch' && pts.size >= 2) {
      const m = mid(), g = gesture;
      const z = zclamp(g.z0 * m.d / g.m0.d, ZMIN, ZMAX);
      // точка между пальцами «прилипает» к контенту и едет вместе с ними
      zoom.x = m.x - (g.m0.x - g.x0) * (z / g.z0);
      zoom.y = m.y - (g.m0.y - g.y0) * (z / g.z0);
      zoom.z = z;
      moved = 99;
      tilt.style.transform = '';
      zoomFix();
    } else if (gesture.type === 'pan') {
      const p = pts.get(e.pointerId), g = gesture;
      moved = Math.max(moved, Math.hypot(p.x - g.p0.x, p.y - g.p0.y));
      if (zoom.z > 1.01) {
        zoom.x = g.x0 + (p.x - g.p0.x);
        zoom.y = g.y0 + (p.y - g.p0.y);
        document.body.classList.add('is-panning');
        zoomFix();
      }
    }
  });
  function endPointer(e) {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    document.body.classList.remove('is-panning');
    startGesture();
  }
  addEventListener('pointerup', endPointer);
  addEventListener('pointercancel', endPointer);

  document.querySelector('.zoom-ui').addEventListener('click', e => {
    const b = e.target.closest('[data-zoom]');
    if (!b) return;
    const k = b.dataset.zoom;
    if (k === 'in') zoomTo(zoom.z * 1.5, undefined, undefined, true);
    else if (k === 'out') zoomTo(zoom.z / 1.5, undefined, undefined, true);
    else zoomTo(1, undefined, undefined, true);
  });
  addEventListener('keydown', e => {
    if (e.key === '+' || e.key === '=') zoomTo(zoom.z * 1.5, undefined, undefined, true);
    else if (e.key === '-' || e.key === '_') zoomTo(zoom.z / 1.5, undefined, undefined, true);
    else if (e.key === '0' || e.key === 'Escape') zoomTo(1, undefined, undefined, true);
  });

  /* ---------- Гироскоп на телефоне ---------- */
  // Положение телефона в первый момент считаем «ровным», наклон — относительно него.
  // На iOS доступ к датчику даётся только после тапа и только по https.
  let gyroBase = null, gyroOn = false;
  const clamp = v => Math.max(-.5, Math.min(.5, v));
  function onOrient(e) {
    if (e.beta == null || e.gamma == null) return;
    if (!gyroBase) gyroBase = { b: e.beta, g: e.gamma };
    // плавно подтягиваем базу, чтобы при смене позы открытка возвращалась к центру
    gyroBase.b += (e.beta - gyroBase.b) * .003;
    gyroBase.g += (e.gamma - gyroBase.g) * .003;
    applyTilt(.5 + clamp((e.gamma - gyroBase.g) / 40), .5 + clamp((e.beta - gyroBase.b) / 40));
  }
  function startGyro() {
    if (gyroOn || reduced || !('DeviceOrientationEvent' in window)) return;
    gyroOn = true;
    tilt.style.transition = 'transform .12s linear';
    addEventListener('deviceorientation', onOrient);
  }
  const needsGyroPermission = typeof DeviceOrientationEvent !== 'undefined'
    && typeof DeviceOrientationEvent.requestPermission === 'function';
  if (!matchMedia('(hover: hover)').matches && !needsGyroPermission) startGyro();
  function askGyro() {
    if (gyroOn || !needsGyroPermission) return;
    DeviceOrientationEvent.requestPermission()
      .then(state => { if (state === 'granted') startGyro(); })
      .catch(() => {});
  }

  /* ---------- Подзаголовок: печатаем по кругу ---------- */
  const sub = document.getElementById('sub');
  const phrases = [
    'технолидер нового поколения',
    'укротитель агентов',
    'инженер невозможного',
    'хранитель ретроигр',
    'ускоритель команды',
    'сохраняет прошлое, строит будущее',
  ];
  async function subLoop() {
    let i = 0;
    await sleep(5000);
    while (true) {
      const cur = phrases[i];
      for (let n = cur.length; n >= 0; n--) { sub.textContent = cur.slice(0, n); await sleep(28); }
      i = (i + 1) % phrases.length;
      const next = phrases[i];
      await sleep(250);
      for (let n = 1; n <= next.length; n++) { sub.textContent = next.slice(0, n); await sleep(55 + Math.random() * 40); }
      await sleep(i === 0 ? 5000 : 3200);
    }
  }

  /* ---------- Центральный терминал ---------- */
  const termRows = [...document.querySelectorAll('#term [data-type]')];
  // экраны терминала чередуются; заголовок общий
  const termScreens = [
    termRows.map(r => r.dataset.type),
    [
      termRows[0].dataset.type,
      '> ГЕННАДИЧ: СПОКОЕН',
      '> КЛОД: ВЫШЕЛ НА СМЕНУ',
      '> ГРИЛЛИНГ: ПРОЙДЕН',
      '> КОНТЕКСТ: РАЗДУТ ДО НЕПРИЛИЧИЯ',
    ],
  ];
  const TERM_FIT = 28; // столько символов влезает до зелёных полосок
  async function termLoop() {
    await sleep(1600);
    let screen = 0;
    while (true) {
      const lines = termScreens[screen];
      termRows.forEach(r => { r.textContent = ''; r.classList.remove('caret'); r.style.fontSize = ''; });
      for (const [i, row] of termRows.entries()) {
        const t = lines[i];
        if (i > 0 && t.length > TERM_FIT) row.style.fontSize = (12.2 * TERM_FIT / t.length).toFixed(2) + 'px';
        row.classList.add('caret');
        for (let n = 1; n <= t.length; n++) { row.textContent = t.slice(0, n); await sleep(32 + Math.random() * 30); }
        await sleep(220);
        row.classList.remove('caret');
      }
      termRows.at(-1).classList.add('caret');
      await sleep(7000);
      // мигнуть экраном перед сменой
      for (let k = 0; k < 3; k++) { termRows.forEach(r => r.style.opacity = .2); await sleep(70); termRows.forEach(r => r.style.opacity = ''); await sleep(90); }
      screen = (screen + 1) % termScreens.length;
    }
  }

  /* ---------- Счёт в DOS ZONE ---------- */
  const scoreEl = document.getElementById('score');
  let score = 1337;
  setInterval(() => {
    score += [10, 50, 100, 100, 200, 1000][Math.floor(Math.random() * 6)];
    if (score > 999999) score = 1337;
    scoreEl.textContent = String(score).padStart(6, '0');
  }, 900);

  /* ---------- Космос: звёзды и метеоры ---------- */
  const space = document.getElementById('space');
  const sctx = space.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  [space, document.getElementById('embers')].forEach(c => { c.width = W * dpr; c.height = H * dpr; c.getContext('2d').scale(dpr, dpr); });

  // области открытого космоса на фоне
  const zones = [
    { x: 380, y: 10,   w: 270, h: 150, n: 40 },  // верхнее окно
    { x: 50,  y: 1210, w: 925, h: 140, n: 90 },  // нижняя панель
  ];
  const stars = zones.flatMap(z => Array.from({ length: z.n }, () => ({
    x: z.x + Math.random() * z.w, y: z.y + Math.random() * z.h,
    r: Math.random() * 1.3 + .3, p: Math.random() * Math.PI * 2, sp: .6 + Math.random() * 2,
    big: Math.random() < .08,
  })));
  const meteors = [];
  function spawnMeteor() {
    const z = zones[Math.random() < .5 ? 0 : 1];
    meteors.push({ x: z.x + Math.random() * z.w * .6, y: z.y + Math.random() * z.h * .3, vx: 5 + Math.random() * 3, vy: 2 + Math.random() * 1.5, life: 1, z });
  }
  setInterval(() => { if (!document.hidden) spawnMeteor(); }, 2600);

  function drawSpace(t) {
    sctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      const a = .25 + .75 * (.5 + .5 * Math.sin(t / 1000 * s.sp + s.p));
      sctx.globalAlpha = a;
      sctx.fillStyle = s.big ? '#ffe2b0' : '#ffffff';
      sctx.beginPath(); sctx.arc(s.x, s.y, s.r, 0, 7); sctx.fill();
      if (s.big && a > .8) {
        sctx.strokeStyle = 'rgba(255,220,160,.7)'; sctx.lineWidth = .8;
        sctx.beginPath(); sctx.moveTo(s.x - 6, s.y); sctx.lineTo(s.x + 6, s.y); sctx.moveTo(s.x, s.y - 6); sctx.lineTo(s.x, s.y + 6); sctx.stroke();
      }
    }
    sctx.globalAlpha = 1;
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.x += m.vx; m.y += m.vy; m.life -= .018;
      const { z } = m;
      if (m.life <= 0 || m.x > z.x + z.w || m.y > z.y + z.h) { meteors.splice(i, 1); continue; }
      const g = sctx.createLinearGradient(m.x, m.y, m.x - m.vx * 10, m.y - m.vy * 10);
      g.addColorStop(0, `rgba(255,240,210,${m.life})`); g.addColorStop(1, 'rgba(255,150,60,0)');
      sctx.strokeStyle = g; sctx.lineWidth = 2;
      sctx.beginPath(); sctx.moveTo(m.x, m.y); sctx.lineTo(m.x - m.vx * 10, m.y - m.vy * 10); sctx.stroke();
    }
  }

  /* ---------- Угольки + конфетти ---------- */
  const embers = document.getElementById('embers');
  const ectx = embers.getContext('2d');
  const parts = Array.from({ length: 45 }, () => newEmber(true));
  function newEmber(anywhere) {
    return {
      x: Math.random() * W, y: anywhere ? Math.random() * H : H + 10,
      vy: -(.25 + Math.random() * .6), vx: (Math.random() - .5) * .3,
      r: Math.random() * 1.8 + .6, p: Math.random() * 6, a: .3 + Math.random() * .6,
    };
  }
  const confetti = [];
  const colors = ['#ff9a2e', '#ffd65a', '#fff3d6', '#8fd8ff', '#6dff8a', '#ff6a4a'];
  function burst(x, y) {
    for (let i = 0; i < 90; i++) {
      const ang = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 9;
      confetti.push({
        x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 4,
        w: 5 + Math.random() * 7, h: 3 + Math.random() * 5,
        rot: Math.random() * 6, vr: (Math.random() - .5) * .4,
        c: colors[i % colors.length], life: 1, star: Math.random() < .25,
      });
    }
  }
  function drawEmbers(t) {
    ectx.clearRect(0, 0, W, H);
    ectx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.y += p.vy; p.x += p.vx + Math.sin(t / 900 + p.p) * .25;
      if (p.y < -10) parts[i] = newEmber(false);
      const fl = p.a * (.6 + .4 * Math.sin(t / 200 + p.p));
      ectx.fillStyle = `rgba(255,${140 + (p.p * 15 | 0)},60,${fl})`;
      ectx.beginPath(); ectx.arc(p.x, p.y, p.r, 0, 7); ectx.fill();
    }
    ectx.globalCompositeOperation = 'source-over';
    for (let i = confetti.length - 1; i >= 0; i--) {
      const c = confetti[i];
      c.vy += .25; c.vx *= .985; c.vy *= .985;
      c.x += c.vx; c.y += c.vy; c.rot += c.vr; c.life -= .008;
      if (c.life <= 0 || c.y > H + 20) { confetti.splice(i, 1); continue; }
      ectx.save();
      ectx.globalAlpha = Math.min(1, c.life * 2);
      ectx.translate(c.x, c.y); ectx.rotate(c.rot);
      ectx.fillStyle = c.c;
      if (c.star) { ectx.font = 'bold 18px sans-serif'; ectx.fillText('✦', -6, 6); }
      else ectx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h * Math.abs(Math.cos(c.rot * 2)));
      ectx.restore();
    }
  }

  function frame(t) {
    drawSpace(t);
    drawEmbers(t);
    requestAnimationFrame(frame);
  }

  viewport.addEventListener('click', e => {
    if (moved > 8) return; // это было перетаскивание, а не тап
    const r = stage.getBoundingClientRect();
    const s = r.width / W; // учитывает и подгонку под экран, и зум
    burst((e.clientX - r.left) / s, (e.clientY - r.top) / s);
    document.querySelector('.hint')?.remove();
    askGyro();
  });

  // страховка: если строка где-то шире своего места (другой шрифт, другой рендер) — ужимаем её
  function fitLines() {
    const boxes = [
      ['.ticker__words', 744], ['.ticker__motto', 744],
      ...[...document.querySelectorAll('.wish span')].map(el => [el, 744]),
    ];
    for (const [sel, max] of boxes) {
      const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
      if (!el) continue;
      el.style.scale = '';
      const r = document.createRange();
      r.selectNodeContents(el);
      const w = r.getBoundingClientRect().width / (stage.getBoundingClientRect().width / W);
      if (w > max) {
        el.style.scale = `${(max / w).toFixed(3)} 1`; // отдельно от transform, чтобы не спорить с анимациями
      }
    }
  }

  // открытка показывается и анимации стартуют только после загрузки
  runLoader().then(() => {
    fit();
    fitLines();
    music.play();
    document.fonts?.ready.then(fitLines);
    setTimeout(fitLines, 1500);
    if (!reduced) {
      requestAnimationFrame(frame);
      subLoop();
      termLoop();
      setTimeout(() => { burst(W * .3, 180); burst(W * .7, 180); }, 1300);
    } else {
      termRows.forEach(r => r.textContent = r.dataset.type);
    }
  });
})();
