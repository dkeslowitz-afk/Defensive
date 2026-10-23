// ============================================================
// SAVE — permanent progress stored in localStorage.
// ============================================================

const Save = {
  KEY: 'defensive_save_v1',
  data: null,

  defaults() {
    const unlocked = {};
    for (const [id, t] of Object.entries(CONFIG.towers)) unlocked[id] = !!t.unlockedByDefault;
    const workshop = {};
    for (const id of Object.keys(CONFIG.meta.workshop)) workshop[id] = 0;
    return { gems: 0, bestWave: 0, runs: 0, workshop, unlocked, adsRemoved: false };
  },

  load() {
    const d = this.defaults();
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) {
        const s = JSON.parse(raw);
        Object.assign(d, s);
        // Merge nested objects so new config keys get defaults
        d.workshop = Object.assign(this.defaults().workshop, s.workshop);
        d.unlocked = Object.assign(this.defaults().unlocked, s.unlocked);
      }
    } catch (e) { /* storage blocked or corrupt — start fresh */ }
    this.data = d;
    return d;
  },

  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) { /* ignore */ }
  },

  reset() {
    this.data = this.defaults();
    this.save();
  },

  // --- Workshop helpers ---
  workshopCost(id) {
    const w = CONFIG.meta.workshop[id];
    const lvl = this.data.workshop[id];
    if (lvl >= w.maxLevel) return null;
    return Math.round(w.baseCost * Math.pow(w.costGrowth, lvl));
  },

  buyWorkshop(id) {
    const cost = this.workshopCost(id);
    if (cost === null || this.data.gems < cost) return false;
    this.data.gems -= cost;
    this.data.workshop[id]++;
    this.save();
    return true;
  },

  unlockTower(id) {
    const cost = CONFIG.meta.unlockCosts[id];
    if (this.data.unlocked[id] || this.data.gems < cost) return false;
    this.data.gems -= cost;
    this.data.unlocked[id] = true;
    this.save();
    return true;
  },

  // Bonuses applied at the start of each run
  bonus(id) {
    return this.data.workshop[id] * CONFIG.meta.workshop[id].perLevel;
  },
};

function gemsForRun(wavesCleared, won) {
  const m = CONFIG.meta;
  let gems = 0;
  for (let w = 1; w <= wavesCleared; w++) gems += m.gemsPerWave + Math.floor(w / m.gemsBonusEvery);
  if (won) gems += m.winBonusGems;
  return gems;
}
