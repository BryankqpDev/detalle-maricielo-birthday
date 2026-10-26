/* ==========================================================================
   CIELO NOCTURNO DE LA VENTANA: estrellas, luna, cerros andinos con luces
   de la ciudad, estrellas fugaces y fuegos artificiales.
   ========================================================================== */

export function initSky(canvas, { onBurst } = {}) {
  const W = 700, H = 460, DPR = Math.min(2, (window.devicePixelRatio || 1) * 1.25);
  canvas.width = W * DPR; canvas.height = H * DPR;
  const c = canvas.getContext('2d');

  let rnd = mulberry(26102026);
  const rand = (a = 1, b) => (b === undefined ? rnd() * a : a + rnd() * (b - a));

  /* ----------------------------- capas estáticas ----------------------------- */
  const PAD = 40; // margen extra para el parallax
  const layer = (w, h) => { const cv = document.createElement('canvas'); cv.width = w * DPR; cv.height = h * DPR; const x = cv.getContext('2d'); x.scale(DPR, DPR); return [cv, x]; };

  // Fondo de cielo
  const [skyCv, sx] = layer(W, H);
  const g = sx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#070a24');
  g.addColorStop(0.45, '#141a4a');
  g.addColorStop(0.75, '#3a2a5e');
  g.addColorStop(1, '#6b3b5c');
  sx.fillStyle = g; sx.fillRect(0, 0, W, H);
  // Vía láctea sutil
  sx.save();
  sx.translate(W * 0.15, H * 0.05); sx.rotate(0.35);
  for (let i = 0; i < 900; i++) {
    const x = rand(0, W * 1.1), y = gauss() * 38;
    sx.fillStyle = `rgba(200,210,255,${rand(0.03, 0.18)})`;
    sx.fillRect(x, y, rand(0.4, 1.1), rand(0.4, 1.1));
  }
  const mw = sx.createLinearGradient(0, -60, 0, 60);
  mw.addColorStop(0, 'rgba(120,110,200,0)'); mw.addColorStop(0.5, 'rgba(150,130,220,0.08)'); mw.addColorStop(1, 'rgba(120,110,200,0)');
  sx.fillStyle = mw; sx.fillRect(-50, -60, W * 1.3, 120);
  sx.restore();

  // Estrellas que titilan
  const stars = Array.from({ length: 190 }, () => ({
    x: rand(W), y: rand(H * 0.72) ** 1.0, r: rand() < 0.08 ? rand(1.1, 1.7) : rand(0.35, 1.0),
    p: rand(Math.PI * 2), s: rand(0.6, 2.2), hue: rand() < 0.2 ? 'rgba(255,220,190,' : rand() < 0.3 ? 'rgba(190,210,255,' : 'rgba(255,255,255,',
  }));

  // Luna
  const [moonCv, mx] = layer(140, 140);
  {
    const cx = 70, cy = 70, r = 24;
    const glow = mx.createRadialGradient(cx, cy, r * 0.8, cx, cy, 70);
    glow.addColorStop(0, 'rgba(255,240,210,0.35)'); glow.addColorStop(1, 'rgba(255,240,210,0)');
    mx.fillStyle = glow; mx.fillRect(0, 0, 140, 140);
    const [tmp, tx] = layer(140, 140);
    const mg = tx.createRadialGradient(cx - 6, cy - 6, 2, cx, cy, r);
    mg.addColorStop(0, '#fffaf0'); mg.addColorStop(1, '#f1dfb8');
    tx.fillStyle = mg; tx.beginPath(); tx.arc(cx, cy, r, 0, Math.PI * 2); tx.fill();
    tx.fillStyle = 'rgba(180,160,130,0.25)';
    [[-8, -4, 5], [6, 8, 4], [4, -10, 3], [-4, 10, 2.5]].forEach(([a, b, s]) => { tx.beginPath(); tx.arc(cx + a, cy + b, s, 0, 7); tx.fill(); });
    tx.globalCompositeOperation = 'destination-out';
    tx.beginPath(); tx.arc(cx + 13, cy - 9, r * 0.92, 0, Math.PI * 2); tx.fill();
    mx.drawImage(tmp, 0, 0, 140, 140);
  }

  // Cerros (tres capas) + luces de la ciudad
  function ridge(w, base, amp, rough, seedShift) {
    const n = 129, pts = new Array(n).fill(0);
    pts[0] = rand(-1, 1); pts[n - 1] = rand(-1, 1);
    let step = n - 1, a = 1;
    while (step > 1) {
      const half = step / 2;
      for (let i = half; i < n; i += step) pts[i] = (pts[i - half] + pts[i + half]) / 2 + rand(-a, a);
      step = half; a *= rough;
    }
    return pts.map((v, i) => [(i / (n - 1)) * w, base - v * amp + seedShift * Math.sin(i / 9)]);
  }
  function mountainLayer(base, amp, rough, color, lights, haze) {
    const w = W + PAD * 2;
    const [cv, x] = layer(w, H);
    const pts = ridge(w, base, amp, rough, 4);
    x.beginPath(); x.moveTo(0, H);
    pts.forEach(([px, py]) => x.lineTo(px, py));
    x.lineTo(w, H); x.closePath();
    const gr = x.createLinearGradient(0, base - amp, 0, H);
    gr.addColorStop(0, color[0]); gr.addColorStop(1, color[1]);
    x.fillStyle = gr; x.fill();
    if (haze) {
      const hz = x.createLinearGradient(0, base, 0, H);
      hz.addColorStop(0, 'rgba(255,150,120,0)'); hz.addColorStop(1, haze);
      x.fillStyle = hz; x.fill();
    }
    const ys = (px) => { const i = Math.min(pts.length - 1, Math.max(0, Math.round((px / w) * (pts.length - 1)))); return pts[i][1]; };
    for (let i = 0; i < lights; i++) {
      const px = rand(w);
      const top = ys(px) + 6;
      if (top >= H) continue;
      const k = rand() ** 0.55; // más denso abajo
      const py = top + (H - top) * k;
      const warm = rand();
      const col = warm < 0.6 ? [255, 196, 110] : warm < 0.85 ? [255, 236, 200] : warm < 0.95 ? [255, 140, 80] : [170, 210, 255];
      const s = rand(0.5, 1.3) * (0.6 + k * 0.7);
      x.fillStyle = `rgba(${col},${rand(0.12, 0.25)})`;
      x.beginPath(); x.arc(px, py, s * 3, 0, 7); x.fill();
      x.fillStyle = `rgba(${col},${rand(0.7, 1)})`;
      x.fillRect(px, py, s, s);
    }
    return { cv, pts, ys };
  }
  const far = mountainLayer(250, 95, 0.55, ['#2c2a62', '#3b2f63'], 60, 'rgba(120,70,110,0.5)');
  const mid = mountainLayer(320, 70, 0.52, ['#1b1940', '#251c45'], 380, 'rgba(110,60,90,0.45)');
  const near = mountainLayer(385, 45, 0.5, ['#0f0c22', '#140f26'], 1300, 'rgba(70,40,60,0.6)');

  // Luces que titilan (en el cerro cercano)
  const twinkles = Array.from({ length: 70 }, () => {
    const px = rand(W + PAD * 2);
    const top = near.ys(px) + 8;
    return { x: px, y: top + (H - top) * rand() ** 0.6, p: rand(7), s: rand(1, 3), c: rand() < 0.5 ? '255,210,140' : '255,240,220' };
  });

  // Nubes
  const clouds = Array.from({ length: 5 }, () => ({ x: rand(-100, W), y: rand(30, 220), w: rand(120, 260), h: rand(14, 30), v: rand(0.03, 0.09), a: rand(0.05, 0.12) }));

  /* ----------------------------- dinámico ----------------------------- */
  const rockets = [], parts = [], shooters = [];
  let flash = 0, flashColor = '255,200,150';
  let pointer = { x: 0, y: 0 }, pSm = { x: 0, y: 0 };
  let celebrateUntil = 0, nextAuto = performance.now() + 2500, nextShooter = performance.now() + 5000;
  let running = true;

  const PALETTE = ['255,120,170', '255,210,110', '140,230,255', '200,160,255', '255,150,110', '160,255,200', '255,255,255'];

  function launch(xN = rand(0.1, 0.9), opts = {}) {
    const x = xN * W;
    rockets.push({
      x, y: H + 5, vx: rand(-0.4, 0.4), vy: -rand(5.2, 6.4) * (opts.power || 1),
      ty: opts.ty ?? rand(70, 200), color: opts.color || PALETTE[(rand() * PALETTE.length) | 0],
      type: opts.type || pickType(), trail: [],
    });
  }
  function pickType() { const r = rand(); return r < 0.14 ? 'heart' : r < 0.32 ? 'willow' : r < 0.45 ? 'ring' : 'peony'; }

  function explode(r) {
    const n = r.type === 'heart' ? 90 : r.type === 'ring' ? 70 : r.type === 'willow' ? 90 : 110;
    const col2 = PALETTE[(rand() * PALETTE.length) | 0];
    for (let i = 0; i < n; i++) {
      let vx, vy;
      if (r.type === 'heart') {
        const t = (i / n) * Math.PI * 2;
        vx = 16 * Math.sin(t) ** 3 / 16 * 2.6;
        vy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16 * 2.6;
      } else if (r.type === 'ring') {
        const t = (i / n) * Math.PI * 2; const sp = 2.6;
        vx = Math.cos(t) * sp; vy = Math.sin(t) * sp * 0.55;
      } else {
        const t = rand(Math.PI * 2), sp = r.type === 'willow' ? rand(0.6, 2.2) : rand(0.8, 3.2);
        vx = Math.cos(t) * sp; vy = Math.sin(t) * sp;
      }
      parts.push({
        x: r.x, y: r.y, px: r.x, py: r.y, vx, vy,
        life: 1, decay: r.type === 'willow' ? rand(0.006, 0.009) : rand(0.011, 0.018),
        g: r.type === 'willow' ? 0.028 : 0.04, drag: r.type === 'willow' ? 0.975 : 0.965,
        color: r.type === 'willow' ? '255,205,120' : (rand() < 0.75 ? r.color : col2),
        sparkle: rand() < 0.3,
      });
    }
    flash = 1; flashColor = r.color;
    onBurst && onBurst(r.color, r.x / W);
  }

  function shootingStar() {
    shooters.push({ x: rand(W * 0.2, W), y: rand(10, 120), vx: -rand(5, 8), vy: rand(1.8, 3), life: 1 });
  }

  let last = performance.now();
  function frame(now) {
    if (!running) return;
    const dt = Math.min(2.5, (now - last) / 16.67); last = now;
    pSm.x += (pointer.x - pSm.x) * 0.06; pSm.y += (pointer.y - pSm.y) * 0.06;
    const t = now / 1000;

    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.drawImage(skyCv, 0, 0, W, H);

    // estrellas
    for (const s of stars) {
      const a = 0.45 + 0.55 * Math.sin(t * s.s + s.p) ** 2;
      c.fillStyle = s.hue + a + ')';
      const ox = -pSm.x * 2, oy = -pSm.y * 1.5;
      if (s.r > 1.05) {
        c.beginPath(); c.arc(s.x + ox, s.y + oy, s.r, 0, 7); c.fill();
        c.fillStyle = s.hue + a * 0.15 + ')';
        c.beginPath(); c.arc(s.x + ox, s.y + oy, s.r * 3.5, 0, 7); c.fill();
      } else c.fillRect(s.x + ox, s.y + oy, s.r * 1.4, s.r * 1.4);
    }

    // luna
    c.drawImage(moonCv, 520 - pSm.x * 3, 20 - pSm.y * 2, 140, 140);

    // nubes
    for (const cl of clouds) {
      cl.x += cl.v * dt; if (cl.x > W + 50) cl.x = -cl.w - 50;
      const gr = c.createRadialGradient(cl.x + cl.w / 2, cl.y, 1, cl.x + cl.w / 2, cl.y, cl.w / 2);
      gr.addColorStop(0, `rgba(170,150,210,${cl.a})`); gr.addColorStop(1, 'rgba(170,150,210,0)');
      c.fillStyle = gr;
      c.save(); c.translate(cl.x + cl.w / 2, cl.y); c.scale(1, cl.h / (cl.w / 2)); c.translate(-(cl.x + cl.w / 2), -cl.y);
      c.beginPath(); c.arc(cl.x + cl.w / 2, cl.y, cl.w / 2, 0, 7); c.fill(); c.restore();
    }

    // estrellas fugaces
    if (now > nextShooter) { shootingStar(); nextShooter = now + rand(6000, 14000); }
    for (let i = shooters.length - 1; i >= 0; i--) {
      const s = shooters[i];
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= 0.012 * dt;
      const gr = c.createLinearGradient(s.x, s.y, s.x - s.vx * 12, s.y - s.vy * 12);
      gr.addColorStop(0, `rgba(255,255,255,${s.life})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.strokeStyle = gr; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(s.x - s.vx * 12, s.y - s.vy * 12); c.stroke();
      if (s.life <= 0 || s.x < -100) shooters.splice(i, 1);
    }

    // fuegos artificiales (detrás de los cerros cercanos, delante de los lejanos)
    c.drawImage(far.cv, -PAD - pSm.x * 4, -pSm.y * 2, W + PAD * 2, H);

    if (now > nextAuto) {
      const x1 = rand(0.12, 0.44);
      const x2 = rand(0.56, 0.88);
      launch(x1, { ty: rand(65, 175) });
      setTimeout(() => launch(x2, { ty: rand(70, 185) }), rand(60, 220));
      if (now < celebrateUntil || rand() < 0.35) {
        setTimeout(() => launch(rand(0.28, 0.72), { ty: rand(55, 160) }), rand(180, 380));
      }
      nextAuto = now + (now < celebrateUntil ? rand(450, 900) : rand(2000, 3600));
    }
    c.globalCompositeOperation = 'lighter';
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.trail.push([r.x, r.y]); if (r.trail.length > 10) r.trail.shift();
      r.x += r.vx * dt; r.y += r.vy * dt; r.vy += 0.045 * dt;
      for (let k = 0; k < r.trail.length; k++) {
        const [tx, ty] = r.trail[k];
        c.fillStyle = `rgba(255,220,180,${(k / r.trail.length) * 0.6})`;
        c.fillRect(tx, ty, 1.3, 1.3);
      }
      if (r.y <= r.ty || r.vy >= -0.4) { explode(r); rockets.splice(i, 1); }
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.px = p.x; p.py = p.y;
      p.vx *= Math.pow(p.drag, dt); p.vy = p.vy * Math.pow(p.drag, dt) + p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.life -= p.decay * dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      let a = p.life;
      if (p.sparkle && p.life < 0.5) a *= Math.random() < 0.5 ? 1 : 0.15;
      c.strokeStyle = `rgba(${p.color},${a})`;
      c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(p.px, p.py); c.lineTo(p.x, p.y); c.stroke();
    }
    c.globalCompositeOperation = 'source-over';

    c.drawImage(mid.cv, -PAD - pSm.x * 9, -pSm.y * 4, W + PAD * 2, H);
    c.drawImage(near.cv, -PAD - pSm.x * 16, -pSm.y * 6, W + PAD * 2, H);

    // luces titilantes
    for (const tw of twinkles) {
      const a = 0.3 + 0.7 * Math.abs(Math.sin(t * tw.s + tw.p));
      c.fillStyle = `rgba(${tw.c},${a})`;
      c.fillRect(tw.x - PAD - pSm.x * 16, tw.y - pSm.y * 6, 1.4, 1.4);
    }

    // destello del cielo
    if (flash > 0.01) {
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = `rgba(${flashColor},${flash * 0.08})`;
      c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'source-over';
      flash *= Math.pow(0.9, dt);
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  canvas.addEventListener('click', (e) => {
    const r = canvas.getBoundingClientRect();
    const xN = (e.clientX - r.left) / r.width;
    const yN = (e.clientY - r.top) / r.height;
    launch(xN, { ty: Math.max(40, yN * H) });
  });

  return {
    launch,
    shootingStar,
    setPointer(x, y) { pointer.x = x; pointer.y = y; },
    celebrate(ms = 9000) {
      celebrateUntil = performance.now() + ms;
      nextAuto = performance.now();
      for (let i = 0; i < 4; i++) setTimeout(() => launch(0.2 + i * 0.2, { type: i % 2 ? 'heart' : 'peony' }), i * 180);
    },
    pause() { running = false; },
    resume() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } },
  };
}

function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
