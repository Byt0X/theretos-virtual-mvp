/* ═══════════════════════════════════════════
   GLOBAL STATE + SIMPLE ANALYTICS EVENTS
═══════════════════════════════════════════ */
const STORAGE_KEY = 'theretos_arcade_state_v2';

let saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
let eTickets = saved?.eTickets ?? 15;
let tapBest = saved?.tapBest ?? 0;
let coinBest = saved?.coinBest ?? 0;
let gameHistory = saved?.gameHistory ?? [];

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      eTickets,
      tapBest,
      coinBest,
      gameHistory: gameHistory.slice(0, 30)
    })
  );
}

function track(eventName, params = {}) {
  const payload = { ...params, time: new Date().toISOString() };

  if (typeof gtag === 'function') {
    gtag('event', eventName, payload);
  }

  const events = JSON.parse(localStorage.getItem('theretos_events') || '[]');
  events.push({ eventName, ...payload });
  localStorage.setItem('theretos_events', JSON.stringify(events.slice(-120)));
}

function addTickets(n, gameName, score) {
  eTickets += n;
  gameHistory.unshift({
    game: gameName,
    score,
    earned: n,
    ts: new Date().toISOString()
  });

  saveState();
  updateAllTicketDisplays();
  renderHistory();

  track('tickets_earned', {
    game: gameName,
    score,
    tickets: n,
    wallet: eTickets
  });
}

function updateAllTicketDisplays() {
  const vals = {
    'home-ticket-count': eTickets,
    'tap-header-tickets': '🎟️ ' + eTickets,
    'balloons-header-tickets': '🎟️ ' + eTickets,
    'moles-header-tickets': '🎟️ ' + eTickets,
    'coins-header-tickets': '🎟️ ' + eTickets,
    'tix-header': '🎟️ ' + eTickets,
    'tix-big-count': eTickets,
    'prizes-header': '🎟️ ' + eTickets,
    'tap-tickets-home': '🎟️ ' + eTickets,
    'progress-ticket-count': eTickets,
    'tap-record': tapBest,
    'tap-best-home': '🏆 ' + tapBest,
    'coin-record': coinBest
  };

  for (const [id, val] of Object.entries(vals)) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = val;
    }
  }

  const bar = document.getElementById('progress-fill-bar');
  if (bar) {
    bar.style.width = Math.min(eTickets, 100) + '%';
  }
}

function bumpTickets() {
  const ids = ['home-ticket-count', 'progress-ticket-count', 'tix-big-count'];

  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  });
}

function renderHistory() {
  const hist = document.getElementById('tix-history');
  if (!hist) return;

  const icons = {
    'Tap Frenético': '⚡',
    'Revienta Globos': '🎈',
    'Golpea el Objetivo': '🔨',
    'Atrapa Monedas': '🪙',
    'Recompensa diaria': '🎁'
  };

  let html = `
    <div style="background:#2d1b69;border-radius:12px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:24px;">🎮</span>
        <div>
          <div style="color:white;font-weight:800;font-size:14px;">Saldo inicial</div>
          <div style="color:#a78bfa;font-size:11px;">Bienvenido a THERETOS</div>
        </div>
      </div>
      <div style="color:#fcd34d;font-weight:900;font-size:18px;">+15</div>
    </div>
  `;

  gameHistory.slice(0, 12).forEach(item => {
    html += `
      <div style="background:#2d1b69;border-radius:12px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:24px;">${icons[item.game] || '🎮'}</span>
          <div>
            <div style="color:white;font-weight:800;font-size:14px;">${item.game}</div>
            <div style="color:#a78bfa;font-size:11px;">Puntaje: ${item.score}</div>
          </div>
        </div>
        <div style="color:#fcd34d;font-weight:900;font-size:18px;">+${item.earned}</div>
      </div>
    `;
  });

  hist.innerHTML = html;
}

/* ═══════════════════════════════════════════
   SCREEN NAVIGATION
═══════════════════════════════════════════ */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });

  const target = document.getElementById(id);
  if (target) {
    target.classList.add('active');
  }

  window.scrollTo(0, 0);
  updateAllTicketDisplays();
  renderHistory();

  track('view_screen', { screen: id });
}

function goHome() {
  stopAllGames();
  showScreen('screen-home');
}

function stopAllGames() {
  stopTap();
  stopBalloons();
  stopMoles();
  stopCoins();
  hideResult();
}

function showResult(opts) {
  const emoji = document.getElementById('res-emoji');
  const title = document.getElementById('res-title');
  const score = document.getElementById('res-score');
  const tickets = document.getElementById('res-tickets');
  const playAgain = document.getElementById('res-play-again');
  const overlay = document.getElementById('result-overlay');

  if (emoji) emoji.textContent = opts.emoji;
  if (title) title.textContent = opts.title;
  if (score) score.textContent = (opts.scoreLabel || 'Puntaje') + ': ' + opts.score;
  if (tickets) tickets.textContent = '+' + opts.tickets;

  if (playAgain) {
    playAgain.onclick = () => {
      hideResult();
      if (opts.onPlayAgain) opts.onPlayAgain();
    };
  }

  if (overlay) {
    overlay.classList.add('show');
  }

  addTickets(opts.tickets, opts.game, opts.score);
  bumpTickets();

  track('end_game', {
    game: opts.game,
    score: opts.score,
    tickets: opts.tickets
  });
}

function hideResult() {
  const overlay = document.getElementById('result-overlay');
  if (overlay) {
    overlay.classList.remove('show');
  }
}

/* ═══════════════════════════════════════════
   GAME 1 — TAP FRENÉTICO
═══════════════════════════════════════════ */
let tapRunning = false;
let tapCount = 0;
let tapTimer = null;
let tapTimeLeft = 15;

const TAP_DURATION = 15;
const CIRC = 2 * Math.PI * 54;

function startTap() {
  if (tapRunning) return;

  tapRunning = true;
  tapCount = 0;
  tapTimeLeft = TAP_DURATION;

  document.getElementById('tap-btn').className = '';
  document.getElementById('tap-btn').textContent = '👆';
  document.getElementById('tap-score-display').textContent = '¡Toca rápido!';
  document.getElementById('tap-start-btn').style.display = 'none';

  updateTapUI();

  track('start_game', { game: 'Tap Frenético' });

  tapTimer = setInterval(() => {
    tapTimeLeft--;
    updateTapUI();

    if (tapTimeLeft <= 0) {
      endTap();
    }
  }, 1000);
}

function updateTapUI() {
  document.getElementById('tap-time').textContent = tapTimeLeft;
  document.getElementById('tap-timer-num').textContent = tapTimeLeft;
  document.getElementById('tap-count-display').textContent = tapCount;

  const offset = CIRC * (1 - tapTimeLeft / TAP_DURATION);

  document.getElementById('tap-timer-circle').style.strokeDashoffset = offset;
  document.getElementById('tap-timer-circle').style.stroke =
    tapTimeLeft <= 5 ? '#ef4444' : '#7c3aed';
}

function doTap(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (!tapRunning) {
    startTap();
    return;
  }

  tapCount++;

  document.getElementById('tap-count-display').textContent = tapCount;

  const btn = document.getElementById('tap-btn');
  btn.classList.add('tapped');

  setTimeout(() => {
    btn.classList.remove('tapped');
  }, 80);

  const arena = document.getElementById('tap-arena');
  const particle = document.createElement('span');

  particle.className = 'tap-particle';
  particle.textContent = '+1';
  particle.style.cssText = `left:${40 + Math.random() * 40}%;bottom:40%;`;

  arena.appendChild(particle);

  setTimeout(() => {
    particle.remove();
  }, 600);

  document.getElementById('tap-score-display').textContent = tapCount + ' taps 🔥';
}

function endTap() {
  tapRunning = false;
  clearInterval(tapTimer);

  document.getElementById('tap-btn').className = 'inactive';
  document.getElementById('tap-start-btn').style.display = 'block';
  document.getElementById('tap-start-btn').textContent = '🔄 JUGAR DE NUEVO';

  if (tapCount > tapBest) {
    tapBest = tapCount;
    saveState();
  }

  updateAllTicketDisplays();

  const tickets = calcTapTickets(tapCount);

  showResult({
    emoji: tapCount >= 80 ? '🏆' : tapCount >= 50 ? '🎉' : tapCount >= 30 ? '👏' : '💪',
    title:
      tapCount >= 80
        ? '¡LEYENDA!'
        : tapCount >= 50
          ? '¡INCREÍBLE!'
          : tapCount >= 30
            ? '¡BIEN HECHO!'
            : '¡SIGUE PRACTICANDO!',
    score: tapCount + ' taps',
    scoreLabel: 'Taps',
    tickets,
    game: 'Tap Frenético',
    onPlayAgain: () => {
      resetTap();
      startTap();
    }
  });
}

function calcTapTickets(taps) {
  if (taps >= 100) return 10;
  if (taps >= 80) return 8;
  if (taps >= 60) return 6;
  if (taps >= 40) return 4;
  if (taps >= 20) return 2;
  return 1;
}

function resetTap() {
  tapCount = 0;
  tapTimeLeft = TAP_DURATION;

  const circle = document.getElementById('tap-timer-circle');
  if (circle) {
    circle.style.strokeDashoffset = 0;
    circle.style.stroke = '#7c3aed';
  }

  const tapTime = document.getElementById('tap-time');
  const timerNum = document.getElementById('tap-timer-num');
  const countDisplay = document.getElementById('tap-count-display');
  const scoreDisplay = document.getElementById('tap-score-display');

  if (tapTime) tapTime.textContent = TAP_DURATION;
  if (timerNum) timerNum.textContent = TAP_DURATION;
  if (countDisplay) countDisplay.textContent = 0;
  if (scoreDisplay) scoreDisplay.textContent = '¡Toca para empezar!';
}

function stopTap() {
  tapRunning = false;
  clearInterval(tapTimer);

  resetTap();

  const btn = document.getElementById('tap-start-btn');
  if (btn) {
    btn.style.display = 'block';
    btn.textContent = '🚀 ¡INICIAR JUEGO!';
  }

  const tapBtn = document.getElementById('tap-btn');
  if (tapBtn) {
    tapBtn.className = 'inactive';
  }
}

/* ═══════════════════════════════════════════
   GAME 2 — REVIENTA GLOBOS
═══════════════════════════════════════════ */
const BALLOON_COLORS = [
  '#ef4444',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#a855f7',
  '#f97316',
  '#ec4899',
  '#f59e0b'
];

let balRunning = false;
let balPopped = 0;
let balEscaped = 0;
let balTimeLeft = 30;
let balTimer = null;
let balSpawnTimer = null;
let balId = 0;

function startBalloons() {
  if (balRunning) return;

  balRunning = true;
  balPopped = 0;
  balEscaped = 0;
  balTimeLeft = 30;

  document.getElementById('bal-popped').textContent = 0;
  document.getElementById('bal-escaped').textContent = 0;
  document.getElementById('bal-time').textContent = 30;
  document.getElementById('bal-start-btn').style.display = 'none';
  document.getElementById('balloons-arena').innerHTML = '';

  track('start_game', { game: 'Revienta Globos' });

  balTimer = setInterval(() => {
    balTimeLeft--;
    document.getElementById('bal-time').textContent = balTimeLeft;

    if (balTimeLeft <= 0) {
      endBalloons();
    }
  }, 1000);

  spawnBalloon();
  balSpawnTimer = setInterval(spawnBalloon, 800);
}

function spawnBalloon() {
  if (!balRunning) return;

  const arena = document.getElementById('balloons-arena');
  const color = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
  const duration = 3 + Math.random() * 3;
  const id = 'bal-' + balId++;

  const balloon = document.createElement('div');
  balloon.className = 'balloon';
  balloon.id = id;
  balloon.style.cssText = `left:${5 + Math.random() * 80}%;animation-duration:${duration}s;`;

  balloon.innerHTML = `
    <svg width="44" height="56" viewBox="0 0 44 56">
      <ellipse cx="22" cy="22" rx="20" ry="22" fill="${color}" opacity=".9"/>
      <ellipse cx="16" cy="14" rx="6" ry="7" fill="white" opacity=".25"/>
      <polygon points="22,44 18,50 26,50" fill="${color}"/>
      <line x1="22" y1="50" x2="22" y2="56" stroke="${color}" stroke-width="1.5"/>
    </svg>
  `;

  balloon.ontouchstart = e => {
    e.preventDefault();
    popBalloon(id);
  };

  balloon.onclick = () => popBalloon(id);

  arena.appendChild(balloon);

  balloon.addEventListener('animationend', () => {
    if (document.getElementById(id) && !balloon.classList.contains('pop')) {
      balloon.remove();
      balEscaped++;
      document.getElementById('bal-escaped').textContent = balEscaped;
    }
  });
}

function popBalloon(id) {
  const balloon = document.getElementById(id);

  if (!balloon || balloon.classList.contains('pop')) return;

  balloon.classList.add('pop');
  balPopped++;

  document.getElementById('bal-popped').textContent = balPopped;

  setTimeout(() => {
    balloon.remove();
  }, 300);
}

function endBalloons() {
  balRunning = false;
  clearInterval(balTimer);
  clearInterval(balSpawnTimer);

  document.getElementById('bal-start-btn').style.display = 'block';
  document.getElementById('bal-start-btn').textContent = '🔄 JUGAR DE NUEVO';

  const tickets = calcBalTickets(balPopped);

  showResult({
    emoji: balPopped >= 25 ? '🏆' : balPopped >= 15 ? '🎉' : '🎈',
    title:
      balPopped >= 25
        ? '¡GLOBERO ÉLITE!'
        : balPopped >= 15
          ? '¡EXCELENTE!'
          : balPopped >= 8
            ? '¡BIEN!'
            : '¡SIGUE PRACTICANDO!',
    score: balPopped + ' globos',
    scoreLabel: 'Globos reventados',
    tickets,
    game: 'Revienta Globos',
    onPlayAgain: startBalloons
  });
}

function calcBalTickets(popped) {
  if (popped >= 30) return 10;
  if (popped >= 20) return 7;
  if (popped >= 12) return 5;
  if (popped >= 6) return 3;
  return 1;
}

function stopBalloons() {
  balRunning = false;
  clearInterval(balTimer);
  clearInterval(balSpawnTimer);

  const arena = document.getElementById('balloons-arena');
  if (arena) {
    arena.innerHTML = '';
  }

  const btn = document.getElementById('bal-start-btn');
  if (btn) {
    btn.style.display = 'block';
    btn.textContent = '🚀 ¡INICIAR JUEGO!';
  }
}

/* ═══════════════════════════════════════════
   GAME 3 — GOLPEA EL OBJETIVO
═══════════════════════════════════════════ */
const MOLE_EMOJIS = ['🐹'];

let molRunning = false;
let molHits = 0;
let molMiss = 0;
let molTimeLeft = 30;
let molTimer = null;
let molShowTimers = [];
let molActiveHoles = new Set();

function buildMolesGrid() {
  const grid = document.getElementById('moles-grid');
  if (!grid) return;

  grid.innerHTML = '';

  for (let i = 0; i < 9; i++) {
    const hole = document.createElement('div');
    hole.className = 'mole-hole';
    hole.id = 'hole-' + i;

    const emoji = document.createElement('span');
    emoji.className = 'mole-emoji';
    emoji.textContent = MOLE_EMOJIS[Math.floor(Math.random() * MOLE_EMOJIS.length)];

    hole.appendChild(emoji);

    hole.ontouchstart = e => {
      e.preventDefault();
      hitMole(i);
    };

    hole.onclick = () => hitMole(i);

    grid.appendChild(hole);
  }
}

function startMoles() {
  if (molRunning) return;

  buildMolesGrid();

  molRunning = true;
  molHits = 0;
  molMiss = 0;
  molTimeLeft = 30;
  molActiveHoles.clear();

  document.getElementById('mol-hits').textContent = 0;
  document.getElementById('mol-miss').textContent = 0;
  document.getElementById('mol-time').textContent = 30;
  document.getElementById('mol-start-btn').style.display = 'none';

  track('start_game', { game: 'Golpea el Objetivo' });

  molTimer = setInterval(() => {
    molTimeLeft--;
    document.getElementById('mol-time').textContent = molTimeLeft;

    if (molTimeLeft <= 0) {
      endMoles();
    }
  }, 1000);

  scheduleMole();
}

function scheduleMole() {
  if (!molRunning) return;

  setTimeout(() => {
    if (!molRunning) return;
    showMole();
    scheduleMole();
  }, 400 + Math.random() * 600);
}

function showMole() {
  const available = [];

  for (let i = 0; i < 9; i++) {
    if (!molActiveHoles.has(i)) {
      available.push(i);
    }
  }

  if (!available.length) return;

  const idx = available[Math.floor(Math.random() * available.length)];

  molActiveHoles.add(idx);

  const hole = document.getElementById('hole-' + idx);
  if (!hole) return;

  hole.classList.add('has-mole');

  const timer = setTimeout(() => {
    if (molActiveHoles.has(idx)) {
      hole.classList.remove('has-mole');
      molActiveHoles.delete(idx);
      molMiss++;
      document.getElementById('mol-miss').textContent = molMiss;
    }
  }, 950 + Math.random() * 700);

  molShowTimers.push(timer);
}

function hitMole(idx) {
  if (!molRunning || !molActiveHoles.has(idx)) return;

  const hole = document.getElementById('hole-' + idx);
  if (!hole) return;

  molActiveHoles.delete(idx);
  hole.classList.remove('has-mole');
  hole.classList.add('hit');

  molHits++;
  document.getElementById('mol-hits').textContent = molHits;

  const star = document.createElement('div');
  star.className = 'hit-star';
  star.textContent = '✨';

  hole.appendChild(star);

  setTimeout(() => {
    star.remove();
    hole.classList.remove('hit');
  }, 400);
}

function endMoles() {
  molRunning = false;

  clearInterval(molTimer);
  molShowTimers.forEach(clearTimeout);
  molShowTimers = [];
  molActiveHoles.clear();

  for (let i = 0; i < 9; i++) {
    const hole = document.getElementById('hole-' + i);
    if (hole) {
      hole.classList.remove('has-mole', 'hit');
    }
  }

  document.getElementById('mol-start-btn').style.display = 'block';
  document.getElementById('mol-start-btn').textContent = '🔄 JUGAR DE NUEVO';

  const tickets = calcMolTickets(molHits);

  showResult({
    emoji: molHits >= 30 ? '🏆' : molHits >= 20 ? '🎉' : '🔨',
    title:
      molHits >= 30
        ? '¡MAESTRO GOLPEADOR!'
        : molHits >= 20
          ? '¡EXCELENTE PUNTERÍA!'
          : molHits >= 10
            ? '¡BUEN TRABAJO!'
            : '¡SIGUE ENTRENANDO!',
    score: molHits + ' golpes',
    scoreLabel: 'Golpes',
    tickets,
    game: 'Golpea el Objetivo',
    onPlayAgain: startMoles
  });
}

function calcMolTickets(hits) {
  if (hits >= 35) return 10;
  if (hits >= 25) return 7;
  if (hits >= 15) return 5;
  if (hits >= 8) return 3;
  return 1;
}

function stopMoles() {
  molRunning = false;

  clearInterval(molTimer);
  molShowTimers.forEach(clearTimeout);
  molShowTimers = [];

  const btn = document.getElementById('mol-start-btn');
  if (btn) {
    btn.style.display = 'block';
    btn.textContent = '🚀 ¡INICIAR JUEGO!';
  }
}

/* ═══════════════════════════════════════════
   GAME 4 — ATRAPA MONEDAS
═══════════════════════════════════════════ */
let coinRunning = false;
let coinScore = 0;
let coinTimeLeft = 30;
let coinTimer = null;
let coinAF = null;
let basketMoveDir = 0;
let basketMoveTimer = null;
let coinObjects = [];
let coinId2 = 0;

let basket = {
  x: 0,
  y: 0,
  w: 70,
  h: 30
};

function getCanvas() {
  return document.getElementById('coins-canvas');
}

function initCanvas() {
  const wrap = document.getElementById('coins-canvas-wrap');
  const canvas = getCanvas();

  if (!wrap || !canvas) return;

  const dpr = window.devicePixelRatio || 1;

  canvas.width = (wrap.clientWidth || 360) * dpr;
  canvas.height = (wrap.clientHeight || 320) * dpr;
  canvas.style.width = (wrap.clientWidth || 360) + 'px';
  canvas.style.height = (wrap.clientHeight || 320) + 'px';

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  basket.x = (wrap.clientWidth || 360) / 2 - basket.w / 2;
  basket.y = (wrap.clientHeight || 320) - 50;
}

function startCoins() {
  if (coinRunning) return;

  initCanvas();

  coinRunning = true;
  coinScore = 0;
  coinTimeLeft = 30;
  coinObjects = [];

  document.getElementById('coin-score').textContent = 0;
  document.getElementById('coin-time').textContent = 30;
  document.getElementById('coin-start-btn').style.display = 'none';

  track('start_game', { game: 'Atrapa Monedas' });

  coinTimer = setInterval(() => {
    coinTimeLeft--;
    document.getElementById('coin-time').textContent = coinTimeLeft;

    if (coinTimeLeft <= 0) {
      endCoins();
    }
  }, 1000);

  coinLoop();
}

function coinLoop() {
  if (!coinRunning) return;

  const canvas = getCanvas();
  const ctx = canvas.getContext('2d');
  const wrap = document.getElementById('coins-canvas-wrap');

  const W = wrap.clientWidth || 360;
  const H = wrap.clientHeight || 320;

  if (basketMoveDir) {
    basket.x += basketMoveDir * 12;
    basket.x = Math.max(0, Math.min(W - basket.w, basket.x));
  }

  if (Math.random() < 0.045) {
    coinObjects.push({
      id: coinId2++,
      x: 20 + Math.random() * (W - 40),
      y: -20,
      vy: 2.7 + Math.random() * 2.7,
      type: Math.random() < 0.15 ? 'bomb' : 'coin',
      r: 18
    });
  }

  for (let i = coinObjects.length - 1; i >= 0; i--) {
    const coin = coinObjects[i];

    coin.y += coin.vy;

    if (
      coin.y + coin.r > basket.y &&
      coin.y - coin.r < basket.y + basket.h &&
      coin.x > basket.x &&
      coin.x < basket.x + basket.w
    ) {
      if (coin.type === 'coin') {
        coinScore++;
        document.getElementById('coin-score').textContent = coinScore;

        coinObjects.push({
          id: coinId2++,
          x: coin.x,
          y: coin.y,
          vy: -3,
          type: 'spark',
          r: 8,
          life: 20
        });
      } else if (coin.type === 'bomb') {
        coinScore = Math.max(0, coinScore - 3);
        document.getElementById('coin-score').textContent = coinScore;
      }

      coinObjects.splice(i, 1);
      continue;
    }

    if (coin.y > H + 30) {
      coinObjects.splice(i, 1);
      continue;
    }

    if (coin.type === 'spark') {
      coin.life--;
      if (coin.life <= 0) {
        coinObjects.splice(i, 1);
        continue;
      }
    }
  }

  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,0.05)';

  for (let i = 0; i < 32; i++) {
    ctx.beginPath();
    ctx.arc((i * 47 + 10) % W, (i * 37 + 10) % H, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  coinObjects.forEach(coin => {
    if (coin.type === 'coin') {
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, coin.r, 0, Math.PI * 2);

      const grd = ctx.createRadialGradient(
        coin.x - 5,
        coin.y - 5,
        2,
        coin.x,
        coin.y,
        coin.r
      );

      grd.addColorStop(0, '#fcd34d');
      grd.addColorStop(1, '#d97706');

      ctx.fillStyle = grd;
      ctx.fill();
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#92400e';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', coin.x, coin.y);
    } else if (coin.type === 'bomb') {
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, coin.r, 0, Math.PI * 2);

      ctx.fillStyle = '#1f2937';
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💣', coin.x, coin.y);
    } else if (coin.type === 'spark') {
      ctx.globalAlpha = coin.life / 20;
      ctx.fillStyle = '#fcd34d';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✨', coin.x, coin.y);
      ctx.globalAlpha = 1;
    }
  });

  ctx.beginPath();

  if (ctx.roundRect) {
    ctx.roundRect(basket.x, basket.y, basket.w, basket.h, 8);
  } else {
    ctx.rect(basket.x, basket.y, basket.w, basket.h);
  }

  const bGrd = ctx.createLinearGradient(
    basket.x,
    basket.y,
    basket.x,
    basket.y + basket.h
  );

  bGrd.addColorStop(0, '#f97316');
  bGrd.addColorStop(1, '#c2410c');

  ctx.fillStyle = bGrd;
  ctx.fill();
  ctx.strokeStyle = '#7c2d12';
  ctx.lineWidth = 2;
  ctx.stroke();

  coinAF = requestAnimationFrame(coinLoop);
}

function moveBasket(dir) {
  basketMoveDir = dir;

  if (basketMoveTimer) {
    clearTimeout(basketMoveTimer);
  }

  basketMoveTimer = setTimeout(() => {
    basketMoveDir = 0;
  }, 300);
}

document.addEventListener('touchend', () => {
  basketMoveDir = 0;
});

document.addEventListener('mouseup', () => {
  basketMoveDir = 0;
});

function endCoins() {
  coinRunning = false;

  cancelAnimationFrame(coinAF);
  clearInterval(coinTimer);

  if (coinScore > coinBest) {
    coinBest = coinScore;
    saveState();
  }

  updateAllTicketDisplays();

  document.getElementById('coin-start-btn').style.display = 'block';
  document.getElementById('coin-start-btn').textContent = '🔄 JUGAR DE NUEVO';

  const tickets = calcCoinTickets(coinScore);

  showResult({
    emoji: coinScore >= 20 ? '🏆' : coinScore >= 12 ? '🎉' : '🪙',
    title:
      coinScore >= 20
        ? '¡COLECCIONISTA ÉLITE!'
        : coinScore >= 12
          ? '¡EXCELENTE!'
          : coinScore >= 6
            ? '¡BIEN HECHO!'
            : '¡SIGUE INTENTANDO!',
    score: coinScore + ' monedas',
    scoreLabel: 'Monedas',
    tickets,
    game: 'Atrapa Monedas',
    onPlayAgain: startCoins
  });
}

function calcCoinTickets(score) {
  if (score >= 25) return 10;
  if (score >= 18) return 7;
  if (score >= 10) return 5;
  if (score >= 5) return 3;
  return 1;
}

function stopCoins() {
  coinRunning = false;

  cancelAnimationFrame(coinAF);
  clearInterval(coinTimer);

  const btn = document.getElementById('coin-start-btn');
  if (btn) {
    btn.style.display = 'block';
    btn.textContent = '🚀 ¡INICIAR JUEGO!';
  }

  const canvas = getCanvas();
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

/* ═══════════════════════════════════════════
   PUBLIC ACTIONS FOR HTML BUTTONS
═══════════════════════════════════════════ */
function startGame(game) {
  stopAllGames();

  const routes = {
    tap: 'screen-tap',
    balloons: 'screen-balloons',
    moles: 'screen-moles',
    coins: 'screen-coins'
  };

  const screenId = routes[game];

  if (screenId) {
    showScreen(screenId);
  }

  if (game === 'tap') startTap();
  if (game === 'balloons') startBalloons();
  if (game === 'moles') startMoles();
  if (game === 'coins') startCoins();
}

function tapButton(e) {
  doTap(e);
}

function claimReward() {
  addTickets(1, 'Recompensa diaria', 'Bonus');
  alert('¡Ganaste 1 eTicket!');
}

function redeemPrize(cost = 10) {
  if (eTickets < cost) {
    alert('No tienes suficientes eTickets.');
    return;
  }

  eTickets -= cost;

  saveState();
  updateAllTicketDisplays();
  renderHistory();

  track('prize_redeemed', {
    cost,
    wallet: eTickets
  });

  alert('Premio canjeado correctamente.');
}

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
buildMolesGrid();
updateAllTicketDisplays();
renderHistory();

track('page_loaded', {
  page: 'home'
});

window.startGame = startGame;
window.tapButton = tapButton;
window.claimReward = claimReward;
window.showScreen = showScreen;
window.redeemPrize = redeemPrize;
window.goHome = goHome;
window.moveBasket = moveBasket;