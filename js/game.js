// ============================================================
// GAME — run state and update logic. No drawing, no DOM.
// Phases: 'build' (between waves), 'wave', 'lost' (waiting on revive/give up), 'won', 'over'
// ============================================================

function createRun() {
  return {
    phase: 'build',
    wave: 0,              // last wave started
    wavesCleared: 0,
    lives: CONFIG.run.startLives + Save.bonus('lives'),
    coins: CONFIG.run.startCoins + Save.bonus('coins'),
    towers: [],
    enemies: [],
    projectiles: [],
    floaters: [],         // floating "+coins" text
    schedule: [],
    waveTime: 0,
    revived: false,
    kills: 0,
    time: 0,
    onEvent: () => {},    // UI hooks in: 'lost', 'won', 'waveCleared', 'leak'
  };
}

// ---------- Player actions ----------

function towerAt(run, c, r) {
  return run.towers.find((t) => t.c === c && t.r === r) || null;
}

function canBuildAt(run, c, r) {
  return GameMap.inBounds(c, r) && !GameMap.isPath(c, r) && !towerAt(run, c, r);
}

function buildTower(run, type, c, r) {
  const def = CONFIG.towers[type];
  if (!canBuildAt(run, c, r) || !Save.data.unlocked[type] || run.coins < def.cost) return null;
  run.coins -= def.cost;
  const t = createTower(type, c, r);
  run.towers.push(t);
  return t;
}

function upgradeTower(run, t, pathIndex) {
  const up = nextUpgrade(t, pathIndex);
  if (!up || run.coins < up.cost) return false;
  run.coins -= up.cost;
  t.spent += up.cost;
  t.levels[pathIndex]++;
  t.stats = towerStats(t);
  return true;
}

function sellTower(run, t) {
  run.coins += sellValue(t);
  run.towers = run.towers.filter((x) => x !== t);
}

function cycleTargeting(t) {
  const i = TARGETING_MODES.indexOf(t.targeting);
  t.targeting = TARGETING_MODES[(i + 1) % TARGETING_MODES.length];
}

function startWave(run) {
  if (run.phase !== 'build' || run.wave >= CONFIG.run.totalWaves) return false;
  run.wave++;
  run.schedule = buildWaveSchedule(run.wave);
  run.waveTime = 0;
  run.phase = 'wave';
  return true;
}

function revive(run) {
  if (run.revived || run.phase !== 'lost') return false;
  run.revived = true;
  run.lives = CONFIG.run.reviveLives;
  run.phase = 'wave';
  return true;
}

// ---------- Combat ----------

function damageEnemy(run, e, dmg) {
  if (!e.alive) return;
  e.hp -= dmg;
  e.hitFlash = 0.08;
  if (e.hp <= 0) {
    e.alive = false;
    run.coins += e.def.reward;
    run.kills++;
    for (const kid of enemyChildren(e)) run.enemies.push(kid);
  }
}

function addFloater(run, x, y, text, color) {
  run.floaters.push({ x, y, text, color, ttl: 1.2 });
}

function endWave(run) {
  run.wavesCleared = run.wave;
  const bonus = CONFIG.run.waveClearBonusBase + CONFIG.run.waveClearBonusPerWave * run.wave;
  run.coins += bonus;
  let genTotal = 0;
  for (const t of run.towers) {
    if (t.type === 'generator') {
      const amt = Math.round(t.stats.coinsPerWave);
      genTotal += amt;
      addFloater(run, t.x, t.y - 10, '+' + amt, '#ffd54a');
    }
  }
  run.coins += genTotal;
  run.projectiles = [];
  if (run.wave >= CONFIG.run.totalWaves) {
    run.phase = 'won';
    run.onEvent('won');
  } else {
    run.phase = 'build';
    run.onEvent('waveCleared', { bonus, genTotal });
  }
}

// One simulation step. Keep dt small (main loop sub-steps).
function updateRun(run, dt) {
  run.time += dt;

  for (const f of run.floaters) { f.ttl -= dt; f.y -= 20 * dt; }
  run.floaters = run.floaters.filter((f) => f.ttl > 0);

  if (run.phase !== 'wave') {
    for (const t of run.towers) if (t.beam) { t.beam.ttl -= dt; if (t.beam.ttl <= 0) t.beam = null; }
    return;
  }

  // Spawn
  run.waveTime += dt;
  while (run.schedule.length && run.schedule[0].time <= run.waveTime) {
    const s = run.schedule.shift();
    run.enemies.push(createEnemy(s.type, run.wave, 0));
  }

  // Move enemies, handle leaks
  for (const e of run.enemies) {
    if (!e.alive) continue;
    updateEnemy(e, dt);
    if (enemyReachedEnd(e)) {
      e.alive = false;
      run.lives = Math.max(0, run.lives - e.def.lives);
      run.onEvent('leak', e);
    }
  }

  for (const t of run.towers) updateTower(run, t, dt);
  for (const p of run.projectiles) if (p.alive) updateProjectile(run, p, dt);

  run.enemies = run.enemies.filter((e) => e.alive);
  run.projectiles = run.projectiles.filter((p) => p.alive);

  if (run.lives <= 0) {
    run.phase = 'lost';
    run.onEvent('lost');
    return;
  }

  if (!run.schedule.length && !run.enemies.length) endWave(run);
}

// Results for the Run Over screen; also saves best wave + gems.
function finishRun(run) {
  const won = run.phase === 'won';
  run.phase = 'over';
  const reached = run.wave; // wave the run ended on (best wave tracks this)
  const gems = gemsForRun(run.wavesCleared, won);
  const prevBest = Save.data.bestWave;
  Save.data.gems += gems;
  Save.data.bestWave = Math.max(prevBest, reached);
  Save.data.runs++;
  Save.save();
  return { won, reached, wavesCleared: run.wavesCleared, gems, kills: run.kills, newBest: reached > prevBest };
}
