// Headless balance check. Run: node tools/sim.js
// Loads the real game logic (no drawing/DOM) and lets simple bots play runs.
// "casual" mimics a new player (random spots next to the path, random upgrades);
// "smart" picks the best spots and upgrades sensibly.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const files = ['config.js', 'save.js', 'map.js', 'enemies.js', 'towers.js', 'waves.js', 'game.js'];
const code = files.map((f) => fs.readFileSync(path.join(root, 'js', f), 'utf8')).join('\n') +
  '\n;globalThis.__api = { CONFIG, Save, GameMap, createRun, buildTower, upgradeTower, startWave, updateRun, towerAt, canBuildAt, nextUpgrade, gemsForRun };';

function makeApi(saveData) {
  const store = {};
  const ctx = { localStorage: { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = v; } }, Math, console };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  const api = ctx.__api;
  api.Save.load();
  Object.assign(api.Save.data, JSON.parse(JSON.stringify(saveData)));
  return api;
}

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function buildSpots(api) {
  const { GameMap } = api;
  const spots = [];
  for (let c = 0; c < GameMap.cols; c++) for (let r = 0; r < GameMap.rows; r++) {
    if (GameMap.isPath(c, r)) continue;
    // how many path cells within ~2 cells
    let near = 0;
    for (let dc = -2; dc <= 2; dc++) for (let dr = -2; dr <= 2; dr++) if (GameMap.isPath(c + dc, r + dr)) near++;
    spots.push({ c, r, near });
  }
  return spots;
}

function playRun(saveData, style, seed) {
  const api = makeApi(saveData);
  const rand = rng(seed);
  const run = api.createRun();
  const spots = buildSpots(api).filter((s) => s.near >= (style === 'smart' ? 6 : 3));
  if (style === 'smart') spots.sort((a, b) => b.near - a.near);
  else spots.sort(() => rand() - 0.5);

  const types = Object.keys(api.CONFIG.towers).filter((t) => api.Save.data.unlocked[t]);

  function spend() {
    for (let guard = 0; guard < 50; guard++) {
      // Decide: build or upgrade
      const wantBuild = run.towers.length < (style === 'smart' ? 3 + run.wave : 2 + run.wave * 0.8) || rand() < 0.4;
      if (wantBuild) {
        const spot = spots.find((s) => api.canBuildAt(run, s.c, s.r));
        let type;
        if (style === 'smart') {
          const gens = run.towers.filter((t) => t.type === 'generator').length;
          if (types.includes('generator') && gens < 2 && run.wave >= 1 && run.wave <= 8) type = 'generator';
          else if (types.includes('tracker') && rand() < 0.4) type = 'tracker';
          else type = rand() < 0.55 ? 'cannon' : 'burst';
        } else {
          type = types.filter((t) => t !== 'generator' || rand() < 0.3)[Math.floor(rand() * types.length)] || 'cannon';
        }
        if (spot && run.coins >= api.CONFIG.towers[type].cost) {
          api.buildTower(run, type, spot.c, spot.r);
          continue;
        }
      }
      // Upgrade cheapest available
      let best = null;
      for (const t of run.towers) t.levels.forEach((_, pi) => {
        const up = api.nextUpgrade(t, pi);
        if (up && (!best || up.cost < best.up.cost)) best = { t, pi, up };
      });
      if (best && run.coins >= best.up.cost && (style === 'smart' || rand() < 0.6)) { api.upgradeTower(run, best.t, best.pi); continue; }
      break;
    }
  }

  let revived = false;
  while (true) {
    spend();
    api.startWave(run);
    while (run.phase === 'wave') api.updateRun(run, 1 / 30);
    if (run.phase === 'lost') {
      if (!revived) { revived = true; run.revived = true; run.lives = api.CONFIG.run.reviveLives; run.phase = 'wave'; while (run.phase === 'wave') api.updateRun(run, 1 / 30); if (run.phase === 'lost') break; }
      else break;
    }
    if (run.phase === 'won') break;
  }
  return { reached: run.wave, cleared: run.wavesCleared, won: run.phase === 'won', gems: api.gemsForRun(run.wavesCleared, run.phase === 'won') };
}

function report(label, saveData, style, n = Number(process.env.N || 16)) {
  const res = [];
  for (let i = 0; i < n; i++) res.push(playRun(saveData, style, i * 7919 + 1));
  const reached = res.map((r) => r.reached).sort((a, b) => a - b);
  const wins = res.filter((r) => r.won).length;
  const avgGems = res.reduce((a, r) => a + r.gems, 0) / n;
  console.log(`${label.padEnd(34)} ${style.padEnd(6)} median wave ${reached[n >> 1]}  range ${reached[0]}-${reached[n - 1]}  wins ${wins}/${n}  avg gems ${avgGems.toFixed(1)}`);
}

const fresh = { workshop: { damage: 0, speed: 0, coins: 0, lives: 0 }, unlocked: { cannon: true, burst: true, tracker: false, generator: false } };
const some = { workshop: { damage: 2, speed: 2, coins: 1, lives: 1 }, unlocked: { cannon: true, burst: true, tracker: true, generator: false } };
const more = { workshop: { damage: 4, speed: 4, coins: 3, lives: 2 }, unlocked: { cannon: true, burst: true, tracker: true, generator: true } };
const lots = { workshop: { damage: 6, speed: 6, coins: 4, lives: 4 }, unlocked: { cannon: true, burst: true, tracker: true, generator: true } };

for (const style of ['casual', 'smart']) {
  report('fresh save (first run)', fresh, style);
  report('a little workshop (~2-3 runs)', some, style);
  report('more workshop (~5 runs)', more, style);
  report('lots of workshop (~8 runs)', lots, style);
}
