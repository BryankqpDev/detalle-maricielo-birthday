/* ==========================================================================
   CONFETI a pantalla completa
   ========================================================================== */

const COLORS = ['#ff7aa8', '#ffd166', '#7fe0d2', '#b79cff', '#ff9a6b', '#9ec9ff', '#ffffff'];

export function initConfetti(canvas) {
  const c = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const ps = [];
  let raf = null;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
  }
  resize();
  window.addEventListener('resize', resize);

  function spawn(x, y, vx, vy) {
    const shape = Math.random();
    ps.push({
      x, y, vx, vy,
      w: 6 + Math.random() * 7, h: 4 + Math.random() * 6,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      tilt: Math.random() * Math.PI, vt: 0.05 + Math.random() * 0.12,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      shape: shape < 0.6 ? 'rect' : shape < 0.85 ? 'circle' : 'heart',
      life: 1,
    });
  }

  function burst(x = W / 2, y = H / 2, n = 140, spread = 1) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3 * spread;
      const sp = 6 + Math.random() * 11;
      spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp);
    }
    run();
  }

  function rain(n = 180) {
    for (let i = 0; i < n; i++) {
      setTimeout(() => spawn(Math.random() * W, -20, (Math.random() - 0.5) * 2, 2 + Math.random() * 3), Math.random() * 1800);
    }
    run();
  }

  function heart(ctx, s) {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.3);
    ctx.bezierCurveTo(-s, -s * 0.4, -s * 0.4, -s, 0, -s * 0.35);
    ctx.bezierCurveTo(s * 0.4, -s, s, -s * 0.4, 0, s * 0.3);
    ctx.fill();
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(2.5, (now - last) / 16.67); last = now;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.vx *= Math.pow(0.985, dt); p.vy = p.vy * Math.pow(0.985, dt) + 0.22 * dt;
      if (p.vy > 4.2) p.vy = 4.2;
      p.x += (p.vx + Math.sin(p.tilt) * 0.6) * dt; p.y += p.vy * dt;
      p.r += p.vr * dt; p.tilt += p.vt * dt;
      if (p.y > H + 30) { ps.splice(i, 1); continue; }
      c.save();
      c.translate(p.x, p.y); c.rotate(p.r);
      c.scale(1, Math.cos(p.tilt));
      c.fillStyle = p.color;
      if (p.shape === 'rect') c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      else if (p.shape === 'circle') { c.beginPath(); c.arc(0, 0, p.h / 2, 0, 7); c.fill(); }
      else heart(c, p.w * 0.9);
      c.restore();
    }
    if (ps.length) raf = requestAnimationFrame(frame);
    else { raf = null; c.clearRect(0, 0, W, H); }
  }
  function run() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  return { burst, rain };
}
