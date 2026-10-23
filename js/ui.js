// ============================================================
// UI — screens, HUD, build/tower panels and touch input.
// ============================================================

const $ = (sel) => document.querySelector(sel);

const UI = {
  screen: 'home',
  run: null,
  paused: false,
  speedIndex: 0,
  pending: null,        // empty cell chosen for building {c, r}
  pendingType: null,    // tower type being previewed
  lastBuiltType: null,
  selected: null,       // placed tower being inspected
  result: null,         // last finishRun() result
  workshopTab: 'general',
  panelSig: '',
  panelLockUntil: 0,
  toastTimer: null,

  init() {
    Render.init($('#game-canvas'));

    // Generic navigation buttons
    document.body.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-nav]');
      if (b) this.show(b.dataset.nav);
    });

    $('#btn-play').addEventListener('click', () => { Sfx.unlock(); this.startRun(); });
    document.querySelectorAll('[data-setting]').forEach((b) => b.addEventListener('click', () => {
      const key = b.dataset.setting;
      Save.data.settings[key] = !Save.data.settings[key];
      Save.save();
      Sfx.unlock();
      if (key === 'sound') Sfx.play('pop');
      if (key === 'vibrate') Sfx.buzz(40);
      this.renderSettings();
    }));
    $('#btn-pause').addEventListener('click', () => this.setPaused(true));
    $('#btn-resume').addEventListener('click', () => this.setPaused(false));
    $('#btn-quit').addEventListener('click', () => { $('#overlay-pause').classList.add('hidden'); this.endRun(); });
    $('#btn-revive').addEventListener('click', () => this.watchRevive());
    $('#btn-giveup').addEventListener('click', () => { $('#overlay-lost').classList.add('hidden'); this.endRun(); });
    $('#btn-double').addEventListener('click', () => this.watchDouble());
    $('#btn-reset').addEventListener('click', () => {
      if (confirm('Reset all progress (Golden Forks, upgrades, best wave)?')) { Save.reset(); this.renderWorkshop(); this.toast('Progress reset'); }
    });

    $('#game-canvas').addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      Sfx.unlock();
      const p = Render.toMap(ev.clientX, ev.clientY);
      this.tapMap(p.x, p.y);
    });

    $('#panel').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-act]');
      if (!b || b.disabled) return;
      // Right after building, the tower panel's upgrade/sell buttons appear under the finger: ignore them briefly
      if ((b.dataset.act === 'upgrade' || b.dataset.act === 'sell') && performance.now() < this.panelLockUntil) return;
      Sfx.unlock();
      this.panelAction(b.dataset.act, b.dataset.arg);
    });

    $('#workshop-list').addEventListener('click', (ev) => {
      const tabBtn = ev.target.closest('[data-tab]');
      if (tabBtn) { this.workshopTab = tabBtn.dataset.tab; this.renderWorkshop(); return; }
      const b = ev.target.closest('[data-buy]');
      if (!b) return;
      const [kind, section, id] = b.dataset.buy.split(':');
      const ok = kind === 'unlock' ? Save.unlockTower(section) : Save.buyWorkshop(section, id);
      if (!ok) this.toast('Not enough Golden Forks');
      this.renderWorkshop();
    });
    $('#btn-refund').addEventListener('click', () => {
      const gems = Save.refundableGems();
      if (!gems) { this.toast('Nothing to refund'); return; }
      if (confirm('Refund all Workshop upgrades for ' + gems + ' Golden Forks? Unlocked towers stay unlocked.')) {
        Save.refundAll();
        this.renderWorkshop();
        this.toast('Refunded ' + gems + ' Golden Forks');
      }
    });

    $('#shop-list').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-product]');
      if (!b) return;
      Monetization.purchase(b.dataset.product).then((r) => {
        this.toast(r.ok ? 'Purchased!' : 'Coming soon');
      });
    });

    // Re-fit the canvas whenever its area changes (rotation, panel height, browser bars)
    if (window.ResizeObserver) new ResizeObserver(() => Render.resize()).observe($('#canvas-wrap'));
    window.addEventListener('resize', () => Render.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.screen === 'game' && this.run && this.run.phase === 'wave') this.setPaused(true);
    });

    this.show('home');
    if (Save.data.migratedNote) {
      delete Save.data.migratedNote;
      Save.save();
      this.toast('Workshop is now per tower — Golden Forks refunded');
    }
  },

  show(name) {
    this.screen = name;
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + name));
    if (name === 'home') this.renderHome();
    if (name === 'workshop') this.renderWorkshop();
    if (name === 'shop') this.renderShop();
    if (name === 'game') { this.panelSig = ''; this.renderPanel(); Render.resize(); }
  },

  toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.remove('show'), 1600);
  },

  speed() { return CONFIG.run.gameSpeeds[this.speedIndex]; },

  // ---------------- Screens ----------------

  renderHome() {
    $('#home-gems').textContent = Save.data.gems;
    $('#home-best').textContent = Save.data.bestWave;
    this.renderSettings();
  },

  renderSettings() {
    document.querySelectorAll('[data-setting]').forEach((b) => {
      const on = Save.data.settings[b.dataset.setting];
      b.textContent = (b.dataset.setting === 'sound' ? (on ? '🔊 Sound on' : '🔇 Sound off') : (on ? '📳 Vibration on' : '📴 Vibration off'));
    });
  },

  renderWorkshop() {
    document.querySelectorAll('.gems-count').forEach((el) => (el.textContent = Save.data.gems));
    const sections = Object.keys(CONFIG.meta.workshop);
    if (!sections.includes(this.workshopTab)) this.workshopTab = 'general';
    const tab = this.workshopTab;

    let html = '<div class="tabs">';
    for (const sec of sections) {
      const label = sec === 'general' ? 'General' : CONFIG.towers[sec].name;
      const locked = sec !== 'general' && !Save.data.unlocked[sec];
      html += '<button class="tab' + (sec === tab ? ' sel' : '') + '" data-tab="' + sec + '">' + label + (locked ? ' 🔒' : '') + '</button>';
    }
    html += '</div>';

    if (tab === 'general') {
      html += '<p class="tab-note">Bonuses for every run.</p>';
    } else {
      const t = CONFIG.towers[tab];
      html += '<p class="tab-note">' + t.icon + ' ' + t.desc + ' These upgrades only affect ' + t.name + '.</p>';
      if (!Save.data.unlocked[tab]) {
        const cost = CONFIG.meta.unlockCosts[tab];
        html += '<div class="row"><div class="row-info"><div class="row-title">Unlock ' + t.name + '</div>' +
          '<div class="row-desc">Unlock to build it in runs and upgrade it here.</div></div>' +
          '<button class="btn small ' + (Save.data.gems >= cost ? 'primary' : 'dim') + '" data-buy="unlock:' + tab + '"><span class="fork">🍴</span> ' + cost + '</button></div>';
        $('#workshop-list').innerHTML = html;
        return;
      }
    }

    for (const [id, w] of Object.entries(CONFIG.meta.workshop[tab])) {
      const lvl = Save.level(tab, id);
      const cost = Save.workshopCost(tab, id);
      const fx = workshopEffectText(w, lvl);
      html +=
        '<div class="row">' +
          '<div class="row-info"><div class="row-title">' + w.name + ' <span class="muted">Lv ' + lvl + '/' + w.maxLevel + '</span></div>' +
          '<div class="row-desc">' + fx.per + ' per level · Now: ' + fx.now + '</div></div>' +
          (cost === null
            ? '<button class="btn small" disabled>MAX</button>'
            : '<button class="btn small ' + (Save.data.gems >= cost ? 'primary' : 'dim') + '" data-buy="up:' + tab + ':' + id + '"><span class="fork">🍴</span> ' + cost + '</button>') +
        '</div>';
    }
    $('#workshop-list').innerHTML = html;
  },

  renderShop() {
    let html = '';
    for (const p of Monetization.products) {
      html +=
        '<div class="row">' +
          '<div class="row-info"><div class="row-title">' + p.name + '</div><div class="row-desc">' + p.desc + '</div></div>' +
          '<button class="btn small dim" data-product="' + p.id + '">' + (p.comingSoon ? 'Coming soon' : 'Buy') + '</button>' +
        '</div>';
    }
    $('#shop-list').innerHTML = html;
  },

  // ---------------- Run lifecycle ----------------

  startRun() {
    this.run = createRun();
    this.speedIndex = 0;
    this.run.onEvent = (name, data) => this.onRunEvent(name, data);
    this.paused = false;
    this.pending = null;
    this.pendingType = null;
    this.selected = null;
    this.show('game');
    this.toast('Tap the blanket to place a snack');
  },

  onRunEvent(name, data) {
    if (name === 'kill') {
      Render.burst(data.x, data.y, data.def.color);
      Sfx.play('squish');
      if (data.type === 'boss') { Sfx.play('bossDown'); Sfx.buzz([60, 40, 120]); this.toast('Big Bandit squished! Watch out for his beetles!'); }
    } else if (name === 'fire') {
      Sfx.play(data.type === 'burst' ? 'pop' : data.type === 'tracker' ? 'squirt' : 'fling');
    } else if (name === 'leak') {
      Sfx.play('leak');
      Sfx.buzz(80);
    } else if (name === 'waveCleared') {
      Sfx.play('coin');
      this.toast('Wave ' + this.run.wave + ' cleared! +' + (data.bonus + data.genTotal) + ' crumbs');
    } else if (name === 'lost') {
      Sfx.play('lose');
      $('#lost-wave').textContent = this.run.wave;
      $('#btn-revive').classList.toggle('hidden', this.run.revived);
      $('#overlay-lost').classList.remove('hidden');
    } else if (name === 'won') {
      Sfx.play('win');
      this.endRun();
    }
  },

  setPaused(p) {
    this.paused = p;
    if (p) this.renderSettings();
    $('#overlay-pause').classList.toggle('hidden', !p);
  },

  watchRevive() {
    $('#btn-revive').disabled = true;
    Monetization.showRewardedAd('revive').then((ok) => {
      $('#btn-revive').disabled = false;
      if (ok && revive(this.run)) {
        $('#overlay-lost').classList.add('hidden');
        this.toast('Back with ' + CONFIG.run.reviveLives + ' fresh pies!');
      }
    });
  },

  endRun() {
    this.paused = false;
    this.result = finishRun(this.run);
    const r = this.result;
    $('#ro-title').textContent = r.won ? 'Picnic Saved!' : 'Picnic Over';
    $('#ro-title').className = r.won ? 'win' : '';
    $('#ro-results').innerHTML =
      '<div>Waves cleared: <b>' + r.wavesCleared + '</b> of ' + CONFIG.run.totalWaves + '</div>' +
      '<div>Pests squished: <b>' + r.kills + '</b></div>' +
      (r.newBest ? '<div class="new-best">New best!</div>' : '<div class="muted">Best: ' + Save.data.bestWave + ' waves cleared</div>');
    $('#ro-gems').textContent = r.gems;
    $('#btn-double').classList.toggle('hidden', r.gems <= 0);
    $('#btn-double').disabled = false;
    this.show('runover');
  },

  watchDouble() {
    const r = this.result;
    if (!r || r.doubled) return;
    $('#btn-double').disabled = true;
    Monetization.showRewardedAd('double_gems').then((ok) => {
      if (!ok) { $('#btn-double').disabled = false; return; }
      r.doubled = true;
      Save.data.gems += r.gems;
      Save.save();
      $('#ro-gems').textContent = r.gems * 2 + ' (doubled!)';
      $('#btn-double').classList.add('hidden');
    });
  },

  // ---------------- Map taps ----------------

  tapMap(x, y) {
    const run = this.run;
    if (!run || this.paused || run.phase === 'lost' || run.phase === 'over') return;
    const c = Math.floor(x / GameMap.cell), r = Math.floor(y / GameMap.cell);
    const t = towerAt(run, c, r);
    if (t) {
      this.pending = null;
      this.selected = this.selected === t ? null : t;
    } else if (canBuildAt(run, c, r)) {
      this.selected = null;
      if (this.pending && this.pending.c === c && this.pending.r === r) {
        this.pending = null;
      } else {
        this.pending = { c, r };
        const last = this.lastBuiltType;
        this.pendingType = last && Save.data.unlocked[last] ? last : null;
      }
    } else {
      this.pending = null;
      this.selected = null;
    }
  },

  panelAction(act, arg) {
    const run = this.run;
    switch (act) {
      case 'start':
        if (startWave(run)) {
          const boss = waveHasBoss(run.wave);
          this.toast(boss ? 'Big Bandit is coming for the basket!' : 'Wave ' + run.wave + '!');
          Sfx.play(boss ? 'boss' : 'wave');
        }
        break;
      case 'speed':
        this.speedIndex = (this.speedIndex + 1) % CONFIG.run.gameSpeeds.length;
        break;
      case 'pick':
        if (!Save.data.unlocked[arg]) { this.toast('Unlock in the Workshop'); break; }
        this.pendingType = arg;
        break;
      case 'build': {
        if (!this.pending || !this.pendingType) break;
        if (run.coins < towerCost(this.pendingType)) { this.toast('Not enough crumbs'); break; }
        const t = buildTower(run, this.pendingType, this.pending.c, this.pending.r);
        if (!t) { this.toast("Can't build there"); break; }
        // The tower panel appears where Build was; ignore taps briefly so a double-tap doesn't buy an upgrade
        this.panelLockUntil = performance.now() + 400;
        Sfx.play('build');
        this.lastBuiltType = this.pendingType;
        this.pending = null;
        this.selected = t;
        break;
      }
      case 'cancel':
        this.pending = null;
        this.selected = null;
        break;
      case 'upgrade':
        if (upgradeTower(run, this.selected, Number(arg))) Sfx.play('upgrade');
        else this.toast('Not enough crumbs');
        break;
      case 'target':
        cycleTargeting(this.selected);
        break;
      case 'sell':
        sellTower(run, this.selected);
        Sfx.play('sell');
        this.selected = null;
        break;
    }
    this.panelSig = '';
  },

  // ---------------- Per-frame updates ----------------

  tick() {
    const run = this.run;
    $('#hud-lives').textContent = run.lives;
    $('#hud-coins').textContent = run.coins;
    const shownWave = run.phase === 'build' ? Math.min(run.wave + 1, CONFIG.run.totalWaves) : run.wave;
    $('#hud-wave').textContent = shownWave + '/' + CONFIG.run.totalWaves;

    if (this.selected && !run.towers.includes(this.selected)) this.selected = null;

    // Rebuild the panel only when its layout changes; just refresh affordability otherwise
    const t = this.selected;
    const sig = [
      run.phase, run.wave, this.speedIndex,
      this.pending ? this.pending.c + ',' + this.pending.r : '', this.pendingType,
      t ? t.id + ':' + t.levels.join('.') + ':' + t.targeting : '',
    ].join('|');
    if (sig !== this.panelSig) {
      this.panelSig = sig;
      this.renderPanel();
    }
    this.refreshAffordability();
    if (run.phase === 'wave') {
      const left = run.enemies.length + run.schedule.length;
      const el = $('#enemies-left');
      if (el) el.textContent = left;
    }
  },

  refreshAffordability() {
    const coins = this.run.coins;
    document.querySelectorAll('#panel [data-cost]').forEach((el) => {
      el.classList.toggle('cant', coins < Number(el.dataset.cost));
    });
  },

  renderPanel() {
    const run = this.run;
    let ctx = '';
    if (this.pending) ctx = this.buildMenuHTML();
    else if (this.selected) ctx = this.towerMenuHTML(this.selected);
    else ctx = '<div class="hint">' + (run.phase === 'wave'
      ? 'Wave ' + run.wave + ' — <span id="enemies-left"></span> pests left'
      : 'Tap the blanket to place a snack.<br>Tap a snack to upgrade or sell it.') + '</div>';

    const canStart = run.phase === 'build';
    const startLabel = canStart
      ? 'Start Wave ' + (run.wave + 1) + (waveHasBoss(run.wave + 1) ? ' (BOSS)' : '')
      : 'Wave ' + run.wave + '…';
    const actions =
      '<div class="actions">' +
        '<button class="btn big primary grow" data-act="start"' + (canStart ? '' : ' disabled') + '>' + startLabel + '</button>' +
        '<button class="btn big speed" data-act="speed">⏩ ' + this.speed() + 'x</button>' +
      '</div>';
    $('#panel').innerHTML = '<div class="context">' + ctx + '</div>' + actions;
  },

  buildMenuHTML() {
    let cards = '';
    for (const [id, def] of Object.entries(CONFIG.towers)) {
      const locked = !Save.data.unlocked[id];
      const cost = towerCost(id);
      cards +=
        '<button class="card' + (this.pendingType === id ? ' sel' : '') + (locked ? ' locked' : '') + '" data-act="pick" data-arg="' + id + '"' +
        (locked ? '' : ' data-cost="' + cost + '"') + '>' +
          '<span class="card-icon">' + def.icon + '</span>' +
          '<span class="card-name">' + def.name + '</span>' +
          '<span class="card-cost">' + (locked ? '🔒' : '🍪' + cost) + '</span>' +
        '</button>';
    }
    const def = this.pendingType ? CONFIG.towers[this.pendingType] : null;
    const footer = def
      ? '<div class="sub-row"><div class="desc">' + def.desc + '</div>' +
        '<button class="btn small primary" data-act="build" data-cost="' + towerCost(this.pendingType) + '">Build 🍪' + towerCost(this.pendingType) + '</button>' +
        '<button class="btn small" data-act="cancel">✕</button></div>'
      : '<div class="sub-row"><div class="desc">Pick a snack to see its range.</div><button class="btn small" data-act="cancel">✕</button></div>';
    return '<div class="cards">' + cards + '</div>' + footer;
  },

  towerMenuHTML(t) {
    const def = t.def;
    let tools = '';
    if (usesTargeting(t)) tools += '<button class="btn small" data-act="target">🎯 ' + TARGETING_LABELS[t.targeting] + '</button>';
    tools += '<button class="btn small sell" data-act="sell">Sell +' + sellValue(t) + '</button>';
    tools += '<button class="btn small close" data-act="cancel">✕</button>';

    let ups = '';
    def.paths.forEach((p, pi) => {
      const lvl = t.levels[pi];
      const pips = p.tiers.map((_, i) => (i < lvl ? '●' : '○')).join('');
      const up = nextUpgrade(t, pi);
      ups += up
        ? '<button class="upgrade" data-act="upgrade" data-arg="' + pi + '" data-cost="' + up.cost + '">' +
            '<span class="up-path">' + p.name + ' <span class="pips">' + pips + '</span></span>' +
            '<span class="up-line"><span class="up-name">' + up.name + '</span><span class="up-cost">🍪' + up.cost + '</span></span>' +
            '<span class="up-desc">' + up.desc + '</span>' +
          '</button>'
        : '<button class="upgrade maxed" disabled>' +
            '<span class="up-path">' + p.name + ' <span class="pips">' + pips + '</span></span>' +
            '<span class="up-name">MAXED</span></button>';
    });

    const info = t.type === 'generator'
      ? '+' + Math.round(t.stats.coinsPerWave) + ' crumbs/wave'
      : 'Dmg ' + fmt(t.stats.damage) + ' · Rng ' + Math.round(t.stats.range) + ' · ' + fmt(1 / t.stats.interval) + '/s';

    return '<div class="tower-head">' +
        '<span class="tower-icon">' + def.icon + '</span>' +
        '<div class="tower-name"><div>' + def.name + '</div><div class="muted small-text">' + info + '</div></div>' +
        tools +
      '</div>' +
      '<div class="upgrades' + (def.paths.length === 1 ? ' single' : '') + '">' + ups + '</div>';
  },
};

// "+10% damage" style text for a Workshop upgrade: per level and current total
function workshopEffectText(w, lvl) {
  const pct = (v) => Math.round(v * 100) + '%';
  const total = w.perLevel * lvl;
  switch (w.effect) {
    case 'startCoins': return { per: '+' + w.perLevel + ' starting crumbs', now: '+' + total };
    case 'startLives': return { per: '+' + w.perLevel + ' extra pies', now: '+' + total };
    case 'speed':      return { per: '+' + pct(w.perLevel) + ' attack speed', now: '+' + pct(total) };
    case 'discount':   return { per: '-' + pct(w.perLevel) + ' build cost', now: total ? '-' + pct(total) : '0%' };
    default: {
      const label = { damage: 'damage', range: 'range', coinsPerWave: 'crumbs per wave' }[w.stat] || w.stat;
      return { per: '+' + pct(w.perLevel) + ' ' + label, now: '+' + pct(total) };
    }
  }
}

function fmt(n) {
  return Math.round(n * 10) / 10;
}
