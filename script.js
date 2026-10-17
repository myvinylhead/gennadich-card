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
    ref.src = 'assets/ref.png';
    stage.appendChild(ref);
  }

  /* ---------- Масштаб под экран ---------- */
  function fit() {
    const pad = innerWidth < 600 ? 0 : 24;
    const s = Math.min((innerWidth - pad * 2) / W, (innerHeight - pad * 2) / H);
    root.style.setProperty('--s', s);
    if (debug && qs.has('z')) {
      const z = +qs.get('z');
      root.style.setProperty('--s', z);
      document.getElementById('viewport').style.placeItems = 'start';
      tilt.style.transition = 'none';
      tilt.style.transform = `translate(${-(+qs.get('x') || 0) * z}px, ${-(+qs.get('y') || 0) * z}px)`;
    }
  }
  addEventListener('resize', fit);
  fit();

  /* ---------- 3D-наклон и блик за курсором ---------- */
  // px, py — положение «взгляда» от 0 до 1, центр — 0.5
  function applyTilt(px, py) {
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

  tilt.addEventListener('click', e => {
    const r = stage.getBoundingClientRect();
    const s = parseFloat(getComputedStyle(root).getPropertyValue('--s')) || 1;
    burst((e.clientX - r.left) / s, (e.clientY - r.top) / s);
    document.querySelector('.hint')?.remove();
    askGyro();
  });

  if (!reduced) {
    requestAnimationFrame(frame);
    subLoop();
    termLoop();
    setTimeout(() => { burst(W * .3, 180); burst(W * .7, 180); }, 1300);
  } else {
    termRows.forEach(r => r.textContent = r.dataset.type);
  }
})();
