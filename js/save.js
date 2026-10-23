// ============================================================
// SAVE — permanent progress stored in localStorage.
// ============================================================

const Save = {
  KEY: 'defensive_save_v1',
  data: null,

  defaults() {
    const unlocked = {};
    for (const [id, t] of Object.entries(CONFIG.towers)) unlocked[id] = !!t.unlockedByDefault;
    return {
      gems: 0, bestWave: 0, runs: 0,
      workshop: this.emptyWorkshop(), unlocked, adsRemoved: false,
      settings: { sound: true, vibrate: true },
    };
  },

  emptyWorkshop() {
    const ws = {};
    for (const [section, ups] of Object.entries(CONFIG.meta.workshop)) {
      ws[section] = {};
      for (const id of Object.keys(ups)) ws[section][id] = 0;
    }
    return ws;
  },

  // Stored data is untrusted (it can be edited or corrupted): copy only known keys,
  // force numbers to whole values within limits, force flags to true/false.
  load() {
    const d = this.defaults();
    let s = null;
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) s = JSON.parse(raw);
    } catch (e) { /* storage blocked or corrupt — start fresh */ }

    if (s && typeof s === 'object' && !Array.isArray(s)) {
      const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
      d.gems = wholeNumber(s.gems, 1e9);
      d.bestWave = wholeNumber(s.bestWave, CONFIG.run.totalWaves);
      d.runs = wholeNumber(s.runs, 1e9);
      d.adsRemoved = s.adsRemoved === true;
      const unlocked = obj(s.unlocked);
      for (const id of Object.keys(d.unlocked)) if (unlocked[id] === true) d.unlocked[id] = true;
      const settings = obj(s.settings);
      d.settings.sound = settings.sound !== false;
      d.settings.vibrate = settings.vibrate !== false;

      const old = obj(s.workshop);
      if (typeof old.damage === 'number' || typeof old.coins === 'number') {
        this.migrateFlatWorkshop(d, old);
      } else {
        for (const [section, ups] of Object.entries(CONFIG.meta.workshop)) {
          const src = obj(old[section]);
          for (const id of Object.keys(ups)) d.workshop[section][id] = wholeNumber(src[id], ups[id].maxLevel);
        }
      }
    }
    this.data = d;
    return d;
  },

  // v1 had one flat workshop where damage/speed boosted every tower.
  // Refund those gems; starting coins/lives carry over to "general" (same costs).
  migrateFlatWorkshop(d, old) {
    const oldCost = (base, growth, lvl) => { let g = 0; for (let l = 0; l < lvl; l++) g += Math.round(base * Math.pow(growth, l)); return g; };
    d.gems += oldCost(8, 1.45, wholeNumber(old.damage, 10)) + oldCost(8, 1.45, wholeNumber(old.speed, 10));
    d.workshop.general.coins = wholeNumber(old.coins, CONFIG.meta.workshop.general.coins.maxLevel);
    d.workshop.general.lives = wholeNumber(old.lives, CONFIG.meta.workshop.general.lives.maxLevel);
    d.migratedNote = true;
  },

  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) { /* ignore */ }
  },

  reset() {
    this.data = this.defaults();
    this.save();
  },

  // --- Workshop helpers ---
  level(section, id) {
    return (this.data.workshop[section] || {})[id] || 0;
  },

  costAt(section, id, lvl) {
    const w = CONFIG.meta.workshop[section][id];
    return Math.round(w.baseCost * Math.pow(w.costGrowth, lvl));
  },

  workshopCost(section, id) {
    const lvl = this.level(section, id);
    if (lvl >= CONFIG.meta.workshop[section][id].maxLevel) return null;
    return this.costAt(section, id, lvl);
  },

  buyWorkshop(section, id) {
    const cost = this.workshopCost(section, id);
    if (cost === null || this.data.gems < cost) return false;
    this.data.gems -= cost;
    this.data.workshop[section][id]++;
    this.save();
    return true;
  },

  // Gems that "Refund all" would return (unlocks are kept)
  refundableGems() {
    let total = 0;
    for (const [section, ups] of Object.entries(CONFIG.meta.workshop)) {
      for (const id of Object.keys(ups)) {
        for (let l = 0; l < this.level(section, id); l++) total += this.costAt(section, id, l);
      }
    }
    return total;
  },

  refundAll() {
    this.data.gems += this.refundableGems();
    this.data.workshop = this.emptyWorkshop();
    this.save();
  },

  unlockTower(id) {
    const cost = CONFIG.meta.unlockCosts[id];
    if (this.data.unlocked[id] || this.data.gems < cost) return false;
    this.data.gems -= cost;
    this.data.unlocked[id] = true;
    this.save();
    return true;
  },

  // Total bonus from all upgrades in a section with this effect (and stat, if given)
  bonus(section, effect, stat) {
    let total = 0;
    for (const [id, w] of Object.entries(CONFIG.meta.workshop[section] || {})) {
      if (w.effect === effect && (!stat || w.stat === stat)) total += this.level(section, id) * w.perLevel;
    }
    return total;
  },
};

// A whole number from 0 to max; anything else (text, NaN, negative) becomes 0.
function wholeNumber(v, max) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0;
}

function gemsForRun(wavesCleared, won) {
  const m = CONFIG.meta;
  let gems = 0;
  for (let w = 1; w <= wavesCleared; w++) gems += m.gemsPerWave + Math.floor(w / m.gemsBonusEvery);
  if (won) gems += m.winBonusGems;
  return gems;
}
