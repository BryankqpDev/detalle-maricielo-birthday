/* ==========================================================================
   MAIN: escena interactiva, cámara, casetera, TV, pastel, carta y modales
   ========================================================================== */

import { CONFIG } from './config.js';
import {
  initAudio, getAnalysers, setMuted, isMuted, setHiss,
  sfx, MediaTrack, BlankTrack, SynthTrack,
} from './audio.js';
import { initSky } from './sky.js';
import { initConfetti } from './confetti.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtTime = (sec) => {
  if (!isFinite(sec) || sec <= 0) return '--:--';
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/* ------------------------------ estado global ------------------------------ */
const stage = $('#stage');
const viewport = $('#viewport');
const confetti = initConfetti($('#confetti'));

let started = false;
let currentShot = 'room';
let pointer = { x: 0, y: 0 }, pointerSm = { x: 0, y: 0 };

// Encuadres de cámara sobre el lienzo de 1600 × 1000
const SHOTS = {
  room:   { cx: 810,  cy: 444, w: 1490, h: 805 },
  music:  { cx: 945,  cy: 690, w: 690,  h: 400 },
  tv:     { cx: 865,  cy: 510, w: 540,  h: 390 },
  cake:   { cx: 567,  cy: 655, w: 460,  h: 340 },
  photos: { cx: 195,  cy: 345, w: 440,  h: 560 },
};

/* ------------------------------ decoración inicial ------------------------------ */
function buildCassetteHTML(song, idx = 0, extraClass = '') {
  const side = `A${idx + 1}`;
  const shell = `shell-${song.shell || 'smoke'}`;
  return `
    <div class="cassette ${shell} ${extraClass}" style="--label:${esc(song.label || '#f6c453')}">
      <i class="screw s1"></i><i class="screw s2"></i><i class="screw s3"></i><i class="screw s4"></i>
      <div class="cs-label">
        <span class="cs-side">${side}</span>
        <span class="cs-title">${esc(song.title)}</span>
        <span class="cs-art">${esc(song.artist || 'MIX 2026')}</span>
        <div class="cs-window">
          <div class="reel l"><i class="tape"></i><i class="hub"></i></div>
          <div class="cs-midwin"></div>
          <div class="reel r"><i class="tape"></i><i class="hub"></i></div>
        </div>
      </div>
      <div class="cs-bottom"></div>
    </div>
  `;
}

function setupDecor() {
  // Bokeh de la pantalla de inicio
  const bokeh = $('.intro-bokeh');
  const bCols = ['#ff7aa8', '#ffd166', '#7fe0d2', '#b79cff', '#ff9a6b'];
  for (let i = 0; i < 22; i++) {
    const el = document.createElement('i');
    const sz = 14 + Math.random() * 56;
    el.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random() * 100}%;top:${Math.random() * 100}%;background:${bCols[i % bCols.length]};animation-duration:${9 + Math.random() * 12}s;animation-delay:${-Math.random() * 12}s;`;
    bokeh.appendChild(el);
  }
  $('#introTape').innerHTML = buildCassetteHTML(CONFIG.songs[0], 0, 'spin');

  // Banderines "¡FELIZ CUMPLE MARI!"
  const buntText = `FELIZ CUMPLE ${CONFIG.shortName.toUpperCase()}`;
  const buntCols = ['#ff7aa8', '#ffd166', '#7fe0d2', '#b79cff', '#ff9a6b', '#9ec9ff'];
  const bunt = $('#bunting');
  const nFlags = buntText.length;
  for (let i = 0; i < nFlags; i++) {
    const ch = buntText[i];
    if (ch === ' ') continue;
    const u = i / (nFlags - 1);
    const x = 350 + u * 900;
    const sag = Math.sin(u * Math.PI) * 58;
    const y = 44 + sag;
    const slope = Math.cos(u * Math.PI) * 10;
    const f = document.createElement('div');
    f.className = 'flag';
    f.style.cssText = `left:${x}px;top:${y}px;--c:${buntCols[i % buntCols.length]};--a:${slope.toFixed(1)}deg;--dl:${(-i * 0.22).toFixed(2)}s`;
    f.innerHTML = `<b>${esc(ch)}</b>`;
    bunt.appendChild(f);
  }

  // Guirnalda de luces cálidas
  const fairy = $('#fairy');
  const fCols = ['#ffe39f', '#ffb3c6', '#ffd166', '#b8f2e6', '#dec9ff'];
  const nBulbs = 22;
  let pathD = 'M 330 40';
  for (let i = 0; i < nBulbs; i++) {
    const u = i / (nBulbs - 1);
    const x = 330 + u * 940;
    const y = 38 + Math.sin(u * Math.PI * 3) * 20 + Math.sin(u * Math.PI) * 24;
    pathD += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    const b = document.createElement('i');
    b.className = 'bulb-f on';
    b.style.cssText = `left:${x}px;top:${y}px;--c:${fCols[i % fCols.length]};--t:${(2.1 + (i % 5) * 0.45).toFixed(2)}s;--dl:${(-i * 0.3).toFixed(2)}s`;
    fairy.appendChild(b);
  }
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 1600 1000');
  svg.innerHTML = `<path d="${pathD}" fill="none" stroke="rgba(40,26,16,.65)" stroke-width="1.5"/>`;
  fairy.prepend(svg);

  // Polaroids
  CONFIG.photos.forEach((p, i) => {
    const fig = $(`#pol${i}`);
    if (!fig) return;
    $('img', fig).src = p.src;
    $('figcaption', fig).textContent = p.caption;
  });

  // Calendario (Octubre 2026)
  const cal = $('#calendar');
  const { year, month, day } = CONFIG.birthday;
  const monthNames = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
  const firstDow = (new Date(year, month - 1, 1).getDay() + 6) % 7; // Lunes = 0
  const daysInMonth = new Date(year, month, 0).getDate();
  let cells = ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d) => `<span class="dow">${d}</span>`).join('');
  for (let i = 0; i < firstDow; i++) cells += `<span></span>`;
  for (let d = 1; d <= daysInMonth; d++) {
    cells += `<span class="${d === day ? 'bday' : ''}">${d}</span>`;
  }
  cal.innerHTML = `
    <div class="cal-head">${monthNames[month - 1]}<small>${year}</small></div>
    <div class="cal-grid">${cells}</div>
    <div class="cal-note">¡Hoy cumple ${esc(CONFIG.shortName)}! ♥</div>
  `;

  // Velas del pastel
  const candlesEl = $('#candles');
  const cCols = ['#ff7aa8', '#ffd166', '#7fe0d2', '#b79cff', '#ff9a6b'];
  const cPos = [
    { x: 70, y: 40 }, { x: 88, y: 36 }, { x: 105, y: 34 }, { x: 122, y: 36 }, { x: 140, y: 40 },
  ];
  const glow = document.createElement('div');
  glow.className = 'cake-glow';
  $('#cake').prepend(glow);
  cPos.forEach((pos, i) => {
    const c = document.createElement('div');
    c.className = 'candle';
    c.style.cssText = `left:${pos.x}px;top:${pos.y}px;--c:${cCols[i % cCols.length]}`;
    c.innerHTML = `<i class="flame"></i>`;
    c.addEventListener('click', (e) => {
      e.stopPropagation();
      blowOneCandle(c);
    });
    candlesEl.appendChild(c);
  });

  // Vale de regalo
  $('#tkK').textContent = CONFIG.coupon.kicker;
  $('#tkT').textContent = CONFIG.coupon.title;
  $('#tkL').innerHTML = CONFIG.coupon.lines.map((l) => `<li>${esc(l)}</li>`).join('');
}

/* ------------------------------ cielo y ventana ------------------------------ */
const fwFlash = $('#fwFlash');
const roomFlash = $('#roomFlash');
let flashTimer = null;

const sky = initSky($('#sky'), {
  onBurst(rgb) {
    if (started && Math.random() < 0.45) sfx.pop();
    fwFlash.style.setProperty('--fw', `rgba(${rgb},.42)`);
    roomFlash.style.setProperty('--fw', `rgba(${rgb},.22)`);
    fwFlash.style.opacity = '1';
    roomFlash.style.opacity = '1';
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => {
      fwFlash.style.opacity = '0';
      roomFlash.style.opacity = '0';
    }, 180);
  },
});

$('#window').addEventListener('click', () => {
  if (!started) return;
  sfx.launch();
});

/* ------------------------------ cámara y parallax ------------------------------ */
let cam = { scale: 1, x: 0, y: 0 };
const layerMid = $('#layerMid');
const layerNear = $('#layerNear');

function computeShotTransform(shotName) {
  const s = SHOTS[shotName] || SHOTS.room;
  const vw = window.innerWidth, vh = window.innerHeight;
  const isRoom = shotName === 'room';
  const padX = vw < 640 ? 0.98 : (isRoom ? 0.985 : 0.92);
  const padY = vw < 640 ? 0.88 : (isRoom ? 0.97 : 0.88);
  const scale = Math.min((vw * padX) / s.w, (vh * padY) / s.h);
  const x = vw / 2 - s.cx * scale;
  const y = vh / 2 - s.cy * scale;
  return { scale, x, y };
}

function applyCamera(animate = true) {
  cam = computeShotTransform(currentShot);
  if (animate) stage.classList.add('anim');
  else stage.classList.remove('anim');
  stage.style.transform = `translate3d(${cam.x.toFixed(1)}px, ${cam.y.toFixed(1)}px, 0) scale(${cam.scale.toFixed(4)})`;
}

function goShot(shotName, { silent = false } = {}) {
  if (!SHOTS[shotName]) return;
  const changed = currentShot !== shotName;
  currentShot = shotName;
  $$('#dock button[data-shot]').forEach((b) => b.classList.toggle('on', b.dataset.shot === shotName));
  applyCamera(true);
  if (changed && !silent && started) sfx.whoosh();
  $('#cakeSheet').classList.toggle('show', shotName === 'cake');
  if (shotName !== 'cake') stopMicBlow();
}

window.addEventListener('resize', () => applyCamera(false));

window.addEventListener('pointermove', (e) => {
  pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
  pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
  sky.setPointer(pointer.x, pointer.y);
  const tip = $('#tooltip');
  if (tip.classList.contains('show')) {
    tip.style.left = `${e.clientX}px`;
    tip.style.top = `${e.clientY}px`;
  }
});

function bindTooltips() {
  const tip = $('#tooltip');
  $$('[data-tip]').forEach((el) => {
    el.addEventListener('pointerenter', () => {
      tip.textContent = el.dataset.tip;
      tip.classList.add('show');
    });
    el.addEventListener('pointerleave', () => tip.classList.remove('show'));
  });
}

let toastTimer = null;
function showToast(msg, ms = 3200) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

/* ------------------------------ casetera y pila de casetes ------------------------------ */
const stackEl = $('#stack');
const flyLayer = $('#flyLayer');
const deckDoor = $('#deckDoor');
const deckTape = $('#deckTape');
const dispState = $('#dispState');
const dispCounter = $('#dispCounter');
const dispTitle = $('#dispTitle');
const ddMarquee = $('.dd-marquee');
const needleL = $('#needleL');
const needleR = $('#needleR');
const pled = $('#pled');
const mini = $('#mini');
const miniTitle = $('#miniTitle');
const miniArtist = $('#miniArtist');
const miniPlay = $('#miniPlay');

let tracks = [];
let loadedIdx = -1;
let currentTrack = null;
let deckBusy = false;

function buildTracksAndStack() {
  tracks = CONFIG.songs.map((s) => {
    if (s.src) return new MediaTrack(s.src);
    if (s.synth) return new SynthTrack(s.synth);
    return new BlankTrack();
  });

  stackEl.innerHTML = '';
  const baseLeft = 1094;
  const baseTop = 736;

  CONFIG.songs.forEach((song, i) => {
    const col = i < 6 ? 0 : 1;
    const row = i % 6;
    const x = baseLeft + col * 198 + ((i * 7) % 9 - 4);
    const y = baseTop - row * 27;
    const rot = ((i * 13) % 7 - 3) * 0.6;
    const btn = document.createElement('button');
    btn.className = `spine shell-${song.shell || 'smoke'}`;
    btn.dataset.idx = i;
    btn.dataset.tip = `Casete A${i + 1} · ${song.title}`;
    btn.style.cssText = `left:${x}px;top:${y}px;--r:${rot.toFixed(2)}deg;--label:${esc(song.label || '#f6c453')}`;
    btn.innerHTML = `
      <span class="sp-num">A${i + 1}</span>
      <span class="sp-title">${esc(song.title)}</span>
    `;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectCassette(i);
    });
    stackEl.appendChild(btn);
  });

  // Cinta VHS especial para poner el video casero en la tele
  const vhs = document.createElement('button');
  vhs.className = 'spine vhs';
  vhs.dataset.tip = `VHS · ${CONFIG.video.title}`;
  vhs.style.cssText = `left:${baseLeft - 10}px;top:${baseTop - Math.min(CONFIG.songs.length, 6) * 27 - 6}px;--r:1.2deg`;
  vhs.innerHTML = `
    <span class="sp-num">VHS</span>
    <span class="sp-title">${esc(CONFIG.video.title)}</span>
    <i class="sp-rec"></i>
  `;
  vhs.addEventListener('click', (e) => {
    e.stopPropagation();
    sfx.clunk();
    setTvChannel(1); // canal de video
    goShot('tv');
    showToast('📼 Reproduciendo cinta VHS en la tele…');
  });
  stackEl.appendChild(vhs);
}

function setDeckTitle(text) {
  dispTitle.textContent = text;
  ddMarquee.classList.toggle('scroll', text.length > 18);
}

function updatePlayUI(playing) {
  const playBtn = $('.dk[data-key="play"]');
  playBtn.classList.toggle('lock', playing);
  pled.classList.toggle('play', playing);
  pled.classList.toggle('on', !playing);
  const cas = $('.cassette', deckTape);
  if (cas) cas.classList.toggle('spin', playing);
  mini.classList.toggle('playing', playing);
  miniPlay.textContent = playing ? '❚❚' : '▶';
  setHiss(playing);
}

async function animateTapeFlight(song, idx, fromRect, toRect, reverse = false) {
  return new Promise((resolve) => {
    const flyer = document.createElement('div');
    flyer.className = 'flyer';
    flyer.innerHTML = buildCassetteHTML(song, idx);
    flyLayer.appendChild(flyer);

    const start = reverse ? toRect : fromRect;
    const end = reverse ? fromRect : toRect;
    const anim = flyer.animate([
      { transform: `translate(${start.x}px, ${start.y}px) scale(${start.s}) rotate(${start.r}deg)`, opacity: 1 },
      { transform: `translate(${(start.x + end.x) / 2}px, ${Math.min(start.y, end.y) - 90}px) scale(${Math.max(start.s, end.s) * 1.08}) rotate(${reverse ? 8 : -8}deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${end.x}px, ${end.y}px) scale(${end.s}) rotate(${end.r}deg)`, opacity: 1 },
    ], { duration: 560, easing: 'cubic-bezier(.34, 1.56, .64, 1)', fill: 'forwards' });
    anim.onfinish = () => {
      flyer.remove();
      resolve();
    };
  });
}

function spineCoords(idx) {
  const sp = $(`.spine[data-idx="${idx}"]`, stackEl);
  const x = parseFloat(sp?.style.left || 1100) - 4;
  const y = parseFloat(sp?.style.top || 700) - 50;
  return { x, y, s: 0.72, r: -4 };
}
const DECK_COORDS = { x: 650, y: 634, s: 0.63, r: 0 };

export async function selectCassette(idx, { autoPlay = true } = {}) {
  if (deckBusy || idx < 0 || idx >= CONFIG.songs.length) return;
  initAudio();
  $('#deck').classList.remove('hint');

  if (loadedIdx === idx) {
    togglePlay();
    return;
  }

  deckBusy = true;
  if (loadedIdx !== -1) {
    await ejectCassette({ silent: true });
  }

  const song = CONFIG.songs[idx];
  const sp = $(`.spine[data-idx="${idx}"]`, stackEl);
  if (sp) sp.classList.add('out');

  sfx.door();
  deckDoor.classList.add('open');
  dispState.textContent = 'LOAD';
  setDeckTitle(`A${idx + 1} · ${song.title.toUpperCase()}`);

  await animateTapeFlight(song, idx, spineCoords(idx), DECK_COORDS, false);

  deckTape.innerHTML = buildCassetteHTML(song, idx);
  deckTape.classList.add('in');
  sfx.clunk();
  deckDoor.classList.remove('open');

  loadedIdx = idx;
  currentTrack = tracks[idx];
  currentTrack.onended = () => handleTrackEnd();

  // Mini reproductor
  mini.hidden = false;
  mini.style.setProperty('--label', song.label || '#f6c453');
  miniTitle.textContent = `A${idx + 1} · ${song.title}`;
  miniArtist.textContent = song.artist || 'Mix de cumpleaños';
  updateTvMusicMeta();

  deckBusy = false;

  if (!song.src && !song.synth) {
    showToast(`📼 "${song.title}" está listo para grabar — pásame la canción para unirla ♥`);
  } else {
    showToast(`📼 Casete A${idx + 1}: ${song.title}`);
  }

  if (autoPlay) playCassette({ spinUp: true });
}

async function ejectCassette({ silent = false } = {}) {
  if (loadedIdx === -1 || deckBusy) return;
  deckBusy = true;
  const idx = loadedIdx;
  const song = CONFIG.songs[idx];

  if (currentTrack) currentTrack.stop();
  updatePlayUI(false);

  if (!silent) sfx.key();
  sfx.door();
  deckDoor.classList.add('open');
  deckTape.classList.remove('in');
  dispState.textContent = 'EJECT';
  setDeckTitle('INSERTA UN CASETE ♥');

  await animateTapeFlight(song, idx, spineCoords(idx), DECK_COORDS, true);

  const sp = $(`.spine[data-idx="${idx}"]`, stackEl);
  if (sp) sp.classList.remove('out');
  deckDoor.classList.remove('open');
  deckTape.innerHTML = '';
  dispState.textContent = 'NO TAPE';
  dispCounter.textContent = '000';
  loadedIdx = -1;
  currentTrack = null;
  mini.hidden = true;
  deckBusy = false;
}

function playCassette({ spinUp = false } = {}) {
  if (loadedIdx === -1) {
    selectCassette(0, { autoPlay: true });
    return;
  }
  sfx.key();
  if (spinUp) sfx.motor(true);
  currentTrack.play({ spinUp });
  dispState.textContent = '▶ PLAY';
  updatePlayUI(true);
  updateTvMusicMeta();
}

function pauseCassette() {
  if (!currentTrack) return;
  sfx.key();
  currentTrack.pause({ tapeStop: true });
  dispState.textContent = '❚❚ PAUSE';
  updatePlayUI(false);
  updateTvMusicMeta();
}

function stopCassette() {
  if (!currentTrack) return;
  sfx.key();
  sfx.motor(false);
  currentTrack.stop();
  dispState.textContent = '■ STOP';
  updatePlayUI(false);
  updateTvMusicMeta();
}

function togglePlay() {
  if (loadedIdx === -1) {
    selectCassette(0, { autoPlay: true });
    return;
  }
  if (currentTrack && currentTrack.playing) pauseCassette();
  else playCassette();
}

function stepCassette(dir) {
  const n = CONFIG.songs.length;
  const next = loadedIdx === -1 ? 0 : (loadedIdx + dir + n) % n;
  selectCassette(next, { autoPlay: true });
}

function handleTrackEnd() {
  sfx.clunk();
  updatePlayUI(false);
  dispState.textContent = 'END';
  // Pasa al siguiente casete que tenga música grabada
  const nextIdx = (loadedIdx + 1) % CONFIG.songs.length;
  const nextSong = CONFIG.songs[nextIdx];
  if (nextSong && (nextSong.src || nextSong.synth) && nextIdx !== loadedIdx) {
    setTimeout(() => selectCassette(nextIdx, { autoPlay: true }), 700);
  }
}

// Botones de la casetera
$$('.dk').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    initAudio();
    const k = btn.dataset.key;
    if (k === 'play') togglePlay();
    else if (k === 'stop') stopCassette();
    else if (k === 'eject') ejectCassette();
    else if (k === 'prev') stepCassette(-1);
    else if (k === 'next') stepCassette(1);
  });
});

$('#deck').addEventListener('click', () => {
  if (currentShot !== 'music') goShot('music');
  else if (loadedIdx === -1) selectCassette(0);
});

miniPlay.addEventListener('click', () => togglePlay());
$('#miniNext').addEventListener('click', () => stepCassette(1));

/* ------------------------------ televisión ------------------------------ */
const tv = $('#tv');
const tvStatic = $('#tvStatic');
const stCtx = tvStatic.getContext('2d');
const tvOsd = $('#tvOsd');
const tvVideo = $('#tvVideo');
const vidPlay = $('#vidPlay');
const tvViz = $('#tvViz');
const vizCtx = tvViz.getContext('2d');

const CHANNELS = [
  { id: 'title',  code: 'CH 26', glow: 'rgba(60, 90, 255, .32)' },
  { id: 'video',  code: 'CH 01', glow: 'rgba(255, 160, 110, .28)' },
  { id: 'photos', code: 'CH 02', glow: 'rgba(255, 180, 120, .28)' },
  { id: 'news',   code: 'CH 03', glow: 'rgba(60, 210, 255, .28)' },
  { id: 'music',  code: 'CH 04', glow: 'rgba(180, 120, 255, .30)' },
  { id: 'msg',    code: 'CH 05', glow: 'rgba(255, 110, 170, .34)' },
];

const MESSAGES = [
  { k: 'CANAL ESPECIAL', t: `¡FELIZ DÍA, ${CONFIG.name.toUpperCase()}!`, s: 'Hoy todo el universo celebra contigo ✨' },
  { k: 'DEDICATORIA', t: 'LA MEJOR PRIMA', s: 'Gracias por tantas risas y aventuras ♥' },
  { k: 'RECORDATORIO', t: 'PIDE UN DESEO 🎂', s: 'Las velitas del pastel te están esperando' },
];

let chIdx = 0;
let msgIdx = 0;
let slideIdx = 0;
let newsIdx = 0;
let osdTimer = null;
let staticUntil = 0;
let wasMusicPlayingBeforeVideo = false;

function setupTvContent() {
  // Diapositivas VHS
  const slides = $('#tvSlides');
  slides.innerHTML = CONFIG.photos.map((p, i) => `<img src="${esc(p.src)}" alt="${esc(p.caption)}" class="${i === 0 ? 'on' : ''}">`).join('');
  setInterval(() => {
    const imgs = $$('img', slides);
    if (!imgs.length) return;
    slideIdx = (slideIdx + 1) % imgs.length;
    imgs.forEach((im, i) => im.classList.toggle('on', i === slideIdx));
  }, 5000);

  // Teletexto
  $('#txTicker').textContent = CONFIG.news.map((n) => `✦ ${n}`).join('   ·   ') + '   ·   ';
  const rotateNews = () => {
    $('#txBig').textContent = CONFIG.news[newsIdx % CONFIG.news.length];
    newsIdx++;
  };
  rotateNews();
  setInterval(rotateNews, 4800);
  const updateClock = () => {
    const d = new Date();
    $('#txClock').textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  updateClock();
  setInterval(updateClock, 15000);

  // Video casero
  tvVideo.addEventListener('play', () => {
    vidPlay.classList.add('hide');
    if (currentTrack && currentTrack.playing) {
      wasMusicPlayingBeforeVideo = true;
      currentTrack.pause();
      updatePlayUI(false);
    }
  });
  tvVideo.addEventListener('pause', () => vidPlay.classList.remove('hide'));
  tvVideo.addEventListener('ended', () => {
    vidPlay.classList.remove('hide');
    if (wasMusicPlayingBeforeVideo && currentTrack) {
      wasMusicPlayingBeforeVideo = false;
      playCassette();
    }
  });
}

function showOsd(text) {
  tvOsd.textContent = text;
  tvOsd.classList.add('show');
  clearTimeout(osdTimer);
  osdTimer = setTimeout(() => tvOsd.classList.remove('show'), 1800);
}

function drawStatic() {
  const w = tvStatic.width, h = tvStatic.height;
  const img = stCtx.createImageData(w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = (Math.random() * 255) | 0;
    d[i] = v; d[i + 1] = v; d[i + 2] = v + 20; d[i + 3] = 235;
  }
  stCtx.putImageData(img, 0, 0);
}

function setTvChannel(nextIdx, { silent = false } = {}) {
  const n = CHANNELS.length;
  chIdx = (nextIdx + n) % n;
  const ch = CHANNELS[chIdx];
  tv.classList.remove('hint');

  if (!silent && started) {
    sfx.click();
    sfx.staticBurst(0.24);
  }

  // Parpadeo de estática
  staticUntil = performance.now() + 220;
  tvStatic.classList.add('on');

  // Pausar video si salimos del canal 01
  if (ch.id !== 'video' && !tvVideo.paused) tvVideo.pause();

  $$('.ch', tv).forEach((el) => el.classList.toggle('active', el.dataset.ch === ch.id));
  tv.style.setProperty('--glow', ch.glow);
  showOsd(ch.code);

  if (ch.id === 'video') {
    tvVideo.currentTime = 0;
    tvVideo.play().catch(() => {});
  } else if (ch.id === 'msg') {
    const m = MESSAGES[msgIdx % MESSAGES.length];
    msgIdx++;
    $('#msgK').textContent = m.k;
    $('#msgT').textContent = m.t;
    $('#msgS').textContent = m.s;
  } else if (ch.id === 'music') {
    updateTvMusicMeta();
  }
}

function updateTvMusicMeta() {
  const song = CONFIG.songs[loadedIdx] || CONFIG.songs[0];
  const idx = loadedIdx === -1 ? 0 : loadedIdx;
  $('#muSide').textContent = `A${idx + 1}`;
  $('#muTitle').textContent = song.title;
  $('#muArtist').textContent = song.artist || (song.src || song.synth ? 'Casete' : 'Cinta lista para grabar');
  $('#muState').textContent = currentTrack && currentTrack.playing ? '▶ PLAY' : '❚❚ STOP';
}

$$('[data-tv]').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    initAudio();
    setTvChannel(chIdx + (btn.dataset.tv === 'up' ? 1 : -1));
  });
});

$('#tvScreen').addEventListener('click', (e) => {
  e.stopPropagation();
  initAudio();
  if (CHANNELS[chIdx].id === 'video') {
    if (tvVideo.paused) tvVideo.play();
    else tvVideo.pause();
  } else {
    setTvChannel(chIdx + 1);
  }
});

tv.addEventListener('click', () => {
  if (currentShot !== 'tv') goShot('tv');
});

/* ------------------------------ loop de medidores VU y TV ------------------------------ */
const freqBuf = new Uint8Array(256);
const timeL = new Uint8Array(256);
const timeR = new Uint8Array(256);
let vuSmL = -48, vuSmR = -48;

function rms(buf) {
  let s = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = (buf[i] - 128) / 128;
    s += v * v;
  }
  return Math.sqrt(s / buf.length);
}

function updateMetersAndViz(now) {
  // Estática temporal de cambio de canal
  if (now < staticUntil) {
    drawStatic();
  } else if (tvStatic.classList.contains('on')) {
    tvStatic.classList.remove('on');
  }

  // Parallax suave para las capas del cuarto
  pointerSm.x += (pointer.x - pointerSm.x) * 0.08;
  pointerSm.y += (pointer.y - pointerSm.y) * 0.08;
  layerMid.style.transform = `translate3d(${(-pointerSm.x * 7).toFixed(2)}px, ${(-pointerSm.y * 4).toFixed(2)}px, 0)`;
  layerNear.style.transform = `translate3d(${(-pointerSm.x * 16).toFixed(2)}px, ${(-pointerSm.y * 8).toFixed(2)}px, 0)`;

  const { analyser, analyserL, analyserR } = getAnalysers();
  const playing = !!(currentTrack && currentTrack.playing);

  let targetL = -48, targetR = -48;
  if (analyser && playing) {
    analyserL.getByteTimeDomainData(timeL);
    analyserR.getByteTimeDomainData(timeR);
    const lv = Math.min(1, rms(timeL) * 4.2);
    const rv = Math.min(1, rms(timeR) * 4.2);
    targetL = -48 + lv * 82 + Math.sin(now * 0.02) * 3;
    targetR = -48 + rv * 82 + Math.cos(now * 0.019) * 3;
  }
  vuSmL += (targetL - vuSmL) * 0.25;
  vuSmR += (targetR - vuSmR) * 0.25;
  needleL.style.transform = `rotate(${vuSmL.toFixed(1)}deg)`;
  needleR.style.transform = `rotate(${vuSmR.toFixed(1)}deg)`;

  // Contador de cinta y carretes
  if (currentTrack) {
    const ct = currentTrack.currentTime || 0;
    const dur = currentTrack.duration || 0;
    dispCounter.textContent = String(Math.floor(ct * 1.8) % 1000).padStart(3, '0');
    const prog = dur > 0 ? Math.min(1, ct / dur) : (ct % 60) / 60;
    const lSize = (26 - prog * 10).toFixed(1) + 'px';
    const rSize = (16 + prog * 10).toFixed(1) + 'px';
    const cas = $('.cassette', deckTape);
    if (cas) {
      $('.reel.l .tape', cas)?.style.setProperty('--tw', lSize);
      $('.reel.r .tape', cas)?.style.setProperty('--tw', rSize);
    }
    $('#muProg').style.width = `${(prog * 100).toFixed(1)}%`;
    $('#muCur').textContent = fmtTime(ct);
    $('#muDur').textContent = fmtTime(dur);
  }

  // Visualizador de barras en el canal de música
  if (CHANNELS[chIdx].id === 'music') {
    const w = tvViz.width, h = tvViz.height;
    vizCtx.clearRect(0, 0, w, h);
    if (analyser && playing) analyser.getByteFrequencyData(freqBuf);
    const bars = 28, bw = w / bars;
    for (let i = 0; i < bars; i++) {
      const v = playing && analyser ? freqBuf[i * 2] / 255 : 0.06 + Math.sin(now * 0.004 + i * 0.4) * 0.03;
      const bh = Math.max(4, v * (h - 8));
      const grad = vizCtx.createLinearGradient(0, h, 0, 0);
      grad.addColorStop(0, '#7fe0d2');
      grad.addColorStop(0.6, '#ff7aa8');
      grad.addColorStop(1, '#ffd166');
      vizCtx.fillStyle = grad;
      vizCtx.fillRect(i * bw + 2, h - bh, bw - 4, bh);
    }
  }

  requestAnimationFrame(updateMetersAndViz);
}
requestAnimationFrame(updateMetersAndViz);

/* ------------------------------ pastel y velas ------------------------------ */
const cake = $('#cake');
let micStream = null, micCtx = null, micRaf = null;

function blowOneCandle(candleEl, { silent = false } = {}) {
  if (candleEl.classList.contains('out')) return;
  initAudio();
  candleEl.classList.add('out');
  const sm = document.createElement('i');
  sm.className = 'smoke';
  sm.style.setProperty('--sx', `${(Math.random() * 24 - 12).toFixed(1)}px`);
  candleEl.appendChild(sm);
  setTimeout(() => sm.remove(), 2200);
  if (!silent) sfx.blow();

  const remaining = $$('.candle:not(.out)', cake).length;
  if (remaining === 0) onAllCandlesBlown();
}

function blowAllCandles() {
  initAudio();
  sfx.blow();
  const list = $$('.candle:not(.out)', cake);
  list.forEach((c, i) => setTimeout(() => blowOneCandle(c, { silent: true }), i * 95));
}

function relightCandles() {
  initAudio();
  sfx.sparkle();
  $$('.candle', cake).forEach((c) => c.classList.remove('out'));
  cake.classList.remove('blown');
  $('#sheetWish').hidden = false;
  $('#sheetDone').hidden = true;
}

function onAllCandlesBlown() {
  stopMicBlow();
  cake.classList.add('blown');
  cake.classList.remove('hint');
  $('#sheetWish').hidden = true;
  $('#sheetDone').hidden = false;

  sfx.horn();
  setTimeout(() => sfx.chime(), 320);
  confetti.burst(window.innerWidth / 2, window.innerHeight * 0.55, 160);
  confetti.rain(150);
  sky.celebrate(10000);
  stage.classList.add('party');
  setTimeout(() => stage.classList.remove('party'), 9000);
  showToast(`✨ ¡Feliz cumpleaños, ${CONFIG.name}! Que se cumplan todos tus deseos ♥`, 5000);
}

async function startMicBlow() {
  initAudio();
  const btn = $('#blowMic');
  const st = $('#micState');
  if (micStream) {
    stopMicBlow();
    return;
  }
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const AC = window.AudioContext || window.webkitAudioContext;
    micCtx = new AC();
    const src = micCtx.createMediaStreamSource(micStream);
    const an = micCtx.createAnalyser();
    an.fftSize = 512;
    src.connect(an);
    const buf = new Uint8Array(an.fftSize);
    btn.classList.add('listening');
    btn.textContent = '🎤 ¡Sopla fuerte ahora!';
    st.textContent = 'Escuchando tu soplido…';

    const check = () => {
      if (!micStream) return;
      an.getByteTimeDomainData(buf);
      const level = rms(buf);
      if (level > 0.16) {
        const lit = $$('.candle:not(.out)', cake);
        if (lit.length) blowOneCandle(lit[0]);
      }
      if ($$('.candle:not(.out)', cake).length > 0) {
        micRaf = requestAnimationFrame(check);
      }
    };
    micRaf = requestAnimationFrame(check);
  } catch (e) {
    st.textContent = 'No se pudo usar el micrófono — usa el botón "Soplar" ♥';
  }
}

function stopMicBlow() {
  cancelAnimationFrame(micRaf);
  if (micStream) {
    micStream.getTracks().forEach((t) => t.stop());
    micStream = null;
  }
  if (micCtx) {
    micCtx.close().catch(() => {});
    micCtx = null;
  }
  const btn = $('#blowMic');
  btn.classList.remove('listening');
  btn.textContent = '🎤 Soplar al micrófono';
  $('#micState').textContent = 'También puedes tocar cada vela.';
}

cake.addEventListener('click', () => {
  if (currentShot !== 'cake') goShot('cake');
  else blowAllCandles();
});
$('#blowTap').addEventListener('click', () => blowAllCandles());
$('#blowMic').addEventListener('click', () => startMicBlow());
$('#relight').addEventListener('click', () => relightCandles());

/* ------------------------------ carta con máquina de escribir ------------------------------ */
const letterModal = $('#letterModal');
const paperBody = $('#paperBody');
const paperSign = $('#paperSign');
let typeTimer = null;

function openLetter() {
  initAudio();
  sfx.paper();
  $('#envelope').classList.remove('hint');
  letterModal.hidden = false;
  clearInterval(typeTimer);
  paperBody.innerHTML = '';
  paperSign.classList.remove('show');
  paperSign.innerHTML = `${esc(CONFIG.letterSign[0] || '')}<b>${esc(CONFIG.letterSign[1] || '')}</b>`;

  const paras = CONFIG.letter;
  let pIdx = 0, cIdx = 0;
  let pEl = document.createElement('p');
  const cur = document.createElement('i');
  cur.className = 'cur';
  paperBody.appendChild(pEl);

  typeTimer = setInterval(() => {
    if (pIdx >= paras.length) {
      clearInterval(typeTimer);
      cur.remove();
      paperSign.classList.add('show');
      sfx.chime();
      return;
    }
    const line = paras[pIdx];
    if (cIdx < line.length) {
      pEl.textContent = line.slice(0, cIdx + 1);
      pEl.appendChild(cur);
      if (cIdx % 3 === 0) sfx.tick();
      cIdx++;
    } else {
      pIdx++;
      cIdx = 0;
      if (pIdx < paras.length) {
        pEl = document.createElement('p');
        paperBody.appendChild(pEl);
      }
    }
  }, 24);
}

$('#envelope').addEventListener('click', (e) => {
  e.stopPropagation();
  openLetter();
});

/* ------------------------------ galería (polaroids + video) ------------------------------ */
const photoModal = $('#photoModal');
const lbMedia = $('#lbMedia');
const lbCap = $('#lbCap');
const lbNote = $('#lbNote');
const lbDots = $('#lbDots');
let gallery = [];
let lbIdx = 0;

function setupGallery() {
  gallery = [
    ...CONFIG.photos.map((p) => ({ type: 'img', src: p.src, caption: p.caption, note: p.note })),
    { type: 'video', src: CONFIG.video.src, poster: CONFIG.video.poster, caption: CONFIG.video.title, note: 'Un clásico nuestro 😂' },
  ];
  lbDots.innerHTML = gallery.map((_, i) => `<i data-i="${i}"></i>`).join('');
}

function showGalleryItem(idx) {
  initAudio();
  sfx.paper();
  lbIdx = (idx + gallery.length) % gallery.length;
  const it = gallery[lbIdx];
  photoModal.hidden = false;
  if (it.type === 'video') {
    if (currentTrack && currentTrack.playing) pauseCassette();
    lbMedia.innerHTML = `<video src="${esc(it.src)}" poster="${esc(it.poster)}" controls autoplay playsinline></video>`;
  } else {
    lbMedia.innerHTML = `<img src="${esc(it.src)}" alt="${esc(it.caption)}">`;
  }
  lbCap.textContent = it.caption;
  lbNote.textContent = it.note || '';
  $$('i', lbDots).forEach((d, i) => d.classList.toggle('on', i === lbIdx));
}

$$('.polaroid').forEach((pol) => {
  pol.addEventListener('click', (e) => {
    e.stopPropagation();
    showGalleryItem(Number(pol.dataset.photo || 0));
  });
});
$('#lbPrev').addEventListener('click', () => showGalleryItem(lbIdx - 1));
$('#lbNext').addEventListener('click', () => showGalleryItem(lbIdx + 1));

/* ------------------------------ regalo y póster ------------------------------ */
const gift = $('#gift');
const giftModal = $('#giftModal');

function openGift() {
  initAudio();
  gift.classList.remove('hint');
  gift.classList.add('open');
  sfx.pop();
  sfx.sparkle();
  const r = gift.getBoundingClientRect();
  confetti.burst(r.left + r.width / 2, r.top + r.height / 2, 110);
  setTimeout(() => {
    giftModal.hidden = false;
    sfx.chime();
  }, 380);
}

gift.addEventListener('click', (e) => {
  e.stopPropagation();
  openGift();
});

$('#poster')?.addEventListener('click', () => {
  initAudio();
  sfx.sparkle();
  confetti.rain(80);
  showToast(`✦ ${CONFIG.name} · Edición especial 26 de octubre ✦`);
});

$('#calendar').addEventListener('click', () => {
  initAudio();
  sfx.chime();
  sky.celebrate(4500);
  showToast('📅 26 de octubre: ¡el mejor día del calendario!');
});

/* ------------------------------ cierre de modales ------------------------------ */
function closeModals() {
  clearInterval(typeTimer);
  const v = $('video', lbMedia);
  if (v) v.pause();
  lbMedia.innerHTML = '';
  letterModal.hidden = true;
  photoModal.hidden = true;
  giftModal.hidden = true;
}

$$('[data-close]').forEach((el) => el.addEventListener('click', () => {
  sfx.click();
  closeModals();
}));

/* ------------------------------ lámpara, HUD, dock y teclado ------------------------------ */
function toggleLamp() {
  initAudio();
  sfx.click();
  const off = stage.classList.toggle('lights-off');
  $('#btnLamp').classList.toggle('off', off);
}

$('#lamp').addEventListener('click', (e) => {
  e.stopPropagation();
  toggleLamp();
});
$('#btnLamp').addEventListener('click', () => toggleLamp());

$('#btnSound').addEventListener('click', () => {
  initAudio();
  const m = !isMuted();
  setMuted(m);
  $('#btnSound').textContent = m ? '🔇' : '🔊';
  $('#btnSound').classList.toggle('off', m);
});

$('#btnFull').addEventListener('click', () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
});

$$('#dock button[data-shot]').forEach((btn) => {
  btn.addEventListener('click', () => goShot(btn.dataset.shot));
});
$$('#dock button[data-open]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const k = btn.dataset.open;
    if (k === 'letter') openLetter();
    else if (k === 'gift') openGift();
  });
});

// Clic en el fondo regresa a la vista general si estábamos en zoom
stage.addEventListener('click', (e) => {
  if (e.target === stage || e.target.classList.contains('wall') || e.target.classList.contains('desk-top')) {
    if (currentShot !== 'room') goShot('room');
  }
});

window.addEventListener('keydown', (e) => {
  if (!started) return;
  if (!letterModal.hidden || !photoModal.hidden || !giftModal.hidden) {
    if (e.key === 'Escape') closeModals();
    if (!photoModal.hidden && e.key === 'ArrowLeft') showGalleryItem(lbIdx - 1);
    if (!photoModal.hidden && e.key === 'ArrowRight') showGalleryItem(lbIdx + 1);
    return;
  }
  if (e.key === ' ') { e.preventDefault(); togglePlay(); }
  else if (e.key === 'Escape') goShot('room');
  else if (e.key === 'l' || e.key === 'L') toggleLamp();
  else if (e.key === 'm' || e.key === 'M') $('#btnSound').click();
  else if (e.key >= '1' && e.key <= '6') selectCassette(Number(e.key) - 1);
});

/* ------------------------------ secuencia de inicio ------------------------------ */
function startExperience() {
  if (started) return;
  started = true;
  initAudio();
  sfx.key();

  const intro = $('#intro');
  intro.classList.add('crt');
  setTimeout(() => intro.classList.add('gone'), 520);

  // Encender el cuarto, la tele y poner el primer casete
  setTimeout(() => {
    stage.classList.remove('is-dark');
    document.body.classList.add('started');
    sfx.tvOn();
    tv.classList.add('on');
    setTvChannel(0, { silent: true });
    sky.celebrate(4500);
    confetti.rain(90);
  }, 420);

  setTimeout(() => {
    selectCassette(0, { autoPlay: true });
  }, 1150);
}

$('#startBtn').addEventListener('click', startExperience);
$('#introTape').addEventListener('click', startExperience);

/* ------------------------------ inicialización ------------------------------ */
setupDecor();
buildTracksAndStack();
setupTvContent();
setupGallery();
bindTooltips();
applyCamera(false);
