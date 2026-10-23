// ============================================================
// RENDER — draws the picnic onto the canvas. All art is drawn in code
// (no image files): gingham blanket, crumb trail, the Snack Squad, picnic pests.
// ============================================================

const COLORS = {
  blanket: '#fbf3e4',
  gingham: 'rgba(214, 84, 72, 0.13)',
  trail: '#ead7b0',
  trailEdge: '#cfb383',
  crumb: '#b98a4e',
  range: 'rgba(255, 255, 255, 0.35)',
  rangeEdge: 'rgba(120, 70, 30, 0.6)',
  select: '#7a4a1e',
  ink: '#2b1d14',
};

const Render = {
  canvas: null,
  ctx: null,
  scale: 1,
  bg: null,          // pre-drawn blanket + trail (redrawn only on resize)
  particles: [],     // squish bursts; purely visual, real-time
  time: 0,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  },

  // Fit canvas to its container, keeping the map's aspect ratio, crisp on high-DPI screens.
  resize() {
    const wrap = this.canvas.parentElement;
    const availW = wrap.clientWidth, availH = wrap.clientHeight;
    if (!availW || !availH) return;
    const s = Math.min(availW / GameMap.width, availH / GameMap.height);
    const cssW = Math.floor(GameMap.width * s), cssH = Math.floor(GameMap.height * s);
    const dpr = window.devicePixelRatio || 1;
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.scale = s;
    this.ctx.setTransform(s * dpr, 0, 0, s * dpr, 0, 0);
    this.buildBackground(s * dpr);
  },

  // Screen point -> map coordinates
  toMap(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    return { x: (clientX - r.left) / this.scale, y: (clientY - r.top) / this.scale };
  },

  buildBackground(pxScale) {
    const c = document.createElement('canvas');
    c.width = Math.round(GameMap.width * pxScale);
    c.height = Math.round(GameMap.height * pxScale);
    const ctx = c.getContext('2d');
    ctx.scale(pxScale, pxScale);
    const cell = GameMap.cell;

    // Soft gingham: cream base with faint red bands each way (overlaps get darker)
    ctx.fillStyle = COLORS.blanket;
    ctx.fillRect(0, 0, GameMap.width, GameMap.height);
    ctx.fillStyle = COLORS.gingham;
    for (let i = 0; i < GameMap.cols; i += 2) ctx.fillRect(i * cell, 0, cell, GameMap.height);
    for (let j = 0; j < GameMap.rows; j += 2) ctx.fillRect(0, j * cell, GameMap.width, cell);

    // Crumb trail
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = COLORS.trailEdge;
    ctx.lineWidth = cell * 0.84;
    this.pathStroke(ctx);
    ctx.strokeStyle = COLORS.trail;
    ctx.lineWidth = cell * 0.7;
    this.pathStroke(ctx);
    // Scattered crumbs (fixed pseudo-random so they don't jump around)
    let seed = 7;
    const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    ctx.fillStyle = COLORS.crumb;
    for (let d = 0; d < GameMap.length; d += 9) {
      const p = GameMap.posAt(d);
      const ox = (rand() - 0.5) * cell * 0.55, oy = (rand() - 0.5) * cell * 0.55;
      ctx.beginPath();
      ctx.arc(p.x + ox, p.y + oy, 0.8 + rand() * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Picnic basket where the pests are headed
    const end = GameMap.points[GameMap.points.length - 1];
    this.drawBasket(ctx, end.x, GameMap.height - 12);
    this.bg = c;
  },

  pathStroke(ctx) {
    ctx.beginPath();
    GameMap.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  },

  drawBasket(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#7a4a1e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -4, 11, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = '#b8783a';
    ctx.fillRect(-16, -4, 32, 16);
    ctx.strokeStyle = '#8a5526';
    ctx.lineWidth = 1.5;
    for (let i = -12; i <= 12; i += 6) { ctx.beginPath(); ctx.moveTo(i, -4); ctx.lineTo(i, 12); ctx.stroke(); }
    ctx.fillStyle = 'rgba(214,84,72,0.9)';
    ctx.fillRect(-16, -4, 32, 4);
    ctx.restore();
  },

  // Called by the UI when a pest is squished
  burst(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 70;
      this.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r: 1.5 + Math.random() * 2, ttl: 0.45, color: i % 3 ? color : COLORS.crumb,
      });
    }
    if (this.particles.length > 300) this.particles.splice(0, this.particles.length - 300);
  },

  draw(run, ui, dt) {
    const ctx = this.ctx;
    const cell = GameMap.cell;
    this.time += dt;

    if (this.bg) ctx.drawImage(this.bg, 0, 0, GameMap.width, GameMap.height);

    // Range preview: placing a tower (with Workshop bonuses) or a tower is selected
    if (ui.pending && ui.pendingType) {
      const def = CONFIG.towers[ui.pendingType];
      const pos = GameMap.cellCenter(ui.pending.c, ui.pending.r);
      const preview = { type: ui.pendingType, def, x: pos.x, y: pos.y, angle: -Math.PI / 2, levels: def.paths.map(() => 0) };
      const stats = towerStats(preview);
      if (stats.range) this.rangeCircle(pos.x, pos.y, stats.range);
      this.drawTower(preview, 0.6);
    }
    if (ui.pending) this.selectBox(ui.pending.c, ui.pending.r);
    if (ui.selected && ui.selected.stats.range) this.rangeCircle(ui.selected.x, ui.selected.y, ui.selected.stats.range);

    // Hot sauce streams under the towers
    for (const t of run.towers) if (t.beam) this.drawSauce(t);

    for (const t of run.towers) this.drawTower(t, 1);
    if (ui.selected) this.selectBox(ui.selected.c, ui.selected.r);

    for (const e of run.enemies) this.drawPest(e);

    for (const p of run.projectiles) this.drawShot(p);

    // Squish particles
    for (const p of this.particles) {
      p.ttl -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.9; p.vy *= 0.9;
      ctx.globalAlpha = Math.max(0, p.ttl / 0.45);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    this.particles = this.particles.filter((p) => p.ttl > 0);

    // Floating text
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px system-ui, sans-serif';
    for (const f of run.floaters) {
      ctx.globalAlpha = Math.min(1, f.ttl);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  },

  selectBox(c, r) {
    const ctx = this.ctx, cell = GameMap.cell;
    ctx.strokeStyle = COLORS.select;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(c * cell + 2, r * cell + 2, cell - 4, cell - 4);
    ctx.setLineDash([]);
  },

  rangeCircle(x, y, r) {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.range;
    ctx.strokeStyle = COLORS.rangeEdge;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  },

  // Two cartoon eyes that look in direction `look` (radians), plus an optional smile.
  face(x, y, size, look, smile) {
    const ctx = this.ctx;
    const gap = size * 0.42;
    const lx = Math.cos(look) * size * 0.12, ly = Math.sin(look) * size * 0.12;
    for (const sx of [-gap, gap]) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(x + sx, y - size * 0.1, size * 0.28, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COLORS.ink;
      ctx.beginPath(); ctx.arc(x + sx + lx, y - size * 0.1 + ly, size * 0.14, 0, Math.PI * 2); ctx.fill();
    }
    if (smile) {
      ctx.strokeStyle = COLORS.ink;
      ctx.lineWidth = Math.max(1, size * 0.1);
      ctx.beginPath(); ctx.arc(x, y + size * 0.2, size * 0.28, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    }
  },

  drawTower(t, alpha) {
    const ctx = this.ctx;
    const { x, y } = t;
    ctx.globalAlpha = alpha;

    // Paper plate under every tower
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(120,80,40,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    if (t.type === 'cannon') {
      // Pepperoni slice that turns to aim
      ctx.fillStyle = '#c8382a';
      ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#9c2a1f';
      for (const [dx, dy] of [[-6, 6], [6, 5], [0, 9], [-8, -1], [8, -2]]) {
        ctx.beginPath(); ctx.arc(x + dx, y + dy, 1.8, 0, Math.PI * 2); ctx.fill();
      }
      this.face(x, y - 1, 9, t.angle, true);
    } else if (t.type === 'burst') {
      // Striped popcorn bucket with kernels on top; bounces when it pops
      const bounce = t.popAnim > 0 ? 1 + t.popAnim * 1.2 : 1;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(bounce, bounce);
      ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.closePath();
      ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.fillStyle = '#d9472b';
      for (let i = -12; i <= 12; i += 8) ctx.fillRect(i, -13, 4, 26);
      ctx.restore();
      ctx.fillStyle = '#fff6d6';
      for (const [dx, dy] of [[-7, -9], [0, -11], [7, -9], [-3, -6], [4, -6]]) {
        ctx.beginPath(); ctx.arc(dx, dy, 3.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      this.face(x, y + 3, 8, Math.PI / 2, true);
    } else if (t.type === 'tracker') {
      // Hot sauce bottle, nozzle points at its target
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t.angle);
      ctx.fillStyle = '#e8562a';
      ctx.beginPath(); ctx.ellipse(-2, 0, 11, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3f8f3a';
      ctx.fillRect(8, -3.5, 8, 7);
      ctx.fillStyle = '#fff3c4';
      ctx.fillRect(-7, -4, 6, 8);
      ctx.restore();
      this.face(x - Math.cos(t.angle) * 3, y - Math.sin(t.angle) * 3, 8, t.angle, false);
    } else if (t.type === 'generator') {
      // Glass tip jar with crumbs inside
      ctx.fillStyle = 'rgba(173, 216, 240, 0.9)';
      ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d9a441';
      for (const [dx, dy] of [[-5, 6], [2, 7], [6, 3], [-1, 3]]) {
        ctx.beginPath(); ctx.arc(x + dx, y + dy, 2.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = COLORS.ink;
      ctx.font = 'bold 7px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TIPS', x, y - 7);
      this.face(x, y - 1, 7, Math.PI / 2, true);
    }

    // Upgrade pips
    if (t.levels && t.levels.some((l) => l > 0)) {
      t.levels.forEach((lvl, pi) => {
        for (let i = 0; i < lvl; i++) {
          ctx.fillStyle = pi === 0 ? '#e0a020' : '#3f8fd0';
          ctx.fillRect(x - 13 + i * 6, y + 14 + pi * 4, 4, 3);
        }
      });
    }
    ctx.globalAlpha = 1;
  },

  drawSauce(t) {
    const ctx = this.ctx;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(232, 86, 42, 0.85)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(t.x + Math.cos(t.angle) * 16, t.y + Math.sin(t.angle) * 16);
    for (const p of t.beam.points) ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.fillStyle = 'rgba(232, 86, 42, 0.9)';
    for (const p of t.beam.points) { ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill(); }
  },

  drawShot(p) {
    const ctx = this.ctx;
    if (p.kind === 'cannon') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin);
      ctx.fillStyle = '#c8382a';
      ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#9c2a1f';
      ctx.beginPath(); ctx.arc(2, 1, 1.5, 0, Math.PI * 2); ctx.arc(-2, -2, 1.3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else {
      // Popcorn kernel: a few white puffs
      ctx.fillStyle = '#fffaf0';
      ctx.strokeStyle = 'rgba(200,160,80,0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x - 1.5, p.y, p.radius * 0.8, 0, Math.PI * 2);
      ctx.arc(p.x + 1.5, p.y - 1, p.radius * 0.8, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
  },

  drawPest(e) {
    const ctx = this.ctx;
    const r = e.radius;
    const flash = e.hitFlash > 0;
    const body = flash ? '#ffffff' : e.def.color;
    ctx.save();
    ctx.translate(e.x, e.y);

    switch (e.def.look) {
      case 'ant': {
        ctx.rotate(e.angle);
        ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 1.2;
        const wig = Math.sin(this.time * 18 + e.id) * 2;
        for (const s of [-1, 1]) for (const lx of [-3, 0, 3]) {
          ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx + wig * s, s * 7); ctx.stroke();
        }
        ctx.fillStyle = body;
        ctx.beginPath(); ctx.arc(-6, 0, 4, 0, Math.PI * 2); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.arc(6, 0, 3.5, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'fly': {
        const flap = Math.abs(Math.sin(this.time * 30 + e.id));
        ctx.fillStyle = 'rgba(220, 240, 255, 0.75)';
        ctx.beginPath(); ctx.ellipse(-5, -4, 5, 3 + flap * 2, -0.6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(5, -4, 5, 3 + flap * 2, 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = body;
        ctx.beginPath(); ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#c0392b';
        ctx.beginPath(); ctx.arc(-3, -3, 2, 0, Math.PI * 2); ctx.arc(3, -3, 2, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'beetle': {
        ctx.rotate(e.angle);
        ctx.fillStyle = COLORS.ink;
        ctx.beginPath(); ctx.arc(r * 0.9, 0, r * 0.45, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = body;
        ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.85, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.45, r * 0.35, r * 0.18, 0, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'snail': {
        ctx.rotate(e.angle);
        ctx.fillStyle = flash ? '#fff' : '#d8c96a';
        ctx.beginPath(); ctx.ellipse(2, 3, r, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = body;
        ctx.beginPath(); ctx.arc(-1, -1, r * 0.8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#7a4a1e'; ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 4; a += 0.3) {
          const rr = (a / (Math.PI * 4)) * r * 0.7;
          ctx.lineTo(-1 + Math.cos(a) * rr, -1 + Math.sin(a) * rr);
        }
        ctx.stroke();
        break;
      }
      case 'slug': {
        ctx.rotate(e.angle);
        ctx.fillStyle = body;
        ctx.beginPath(); ctx.ellipse(0, 0, r * 1.2, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = body; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(r, -2); ctx.lineTo(r + 4, -5); ctx.moveTo(r, 2); ctx.lineTo(r + 4, 5); ctx.stroke();
        ctx.fillStyle = COLORS.ink;
        ctx.beginPath(); ctx.arc(r + 4, -5, 1.3, 0, Math.PI * 2); ctx.arc(r + 4, 5, 1.3, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'raccoon': {
        // Big Bandit: grey face, black mask, ears, sneaky grin
        ctx.fillStyle = body;
        ctx.beginPath(); ctx.moveTo(-r * 0.9, -r * 0.4); ctx.lineTo(-r * 0.55, -r * 1.15); ctx.lineTo(-r * 0.15, -r * 0.7); ctx.fill();
        ctx.beginPath(); ctx.moveTo(r * 0.9, -r * 0.4); ctx.lineTo(r * 0.55, -r * 1.15); ctx.lineTo(r * 0.15, -r * 0.7); ctx.fill();
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e9e6df';
        ctx.beginPath(); ctx.ellipse(0, r * 0.4, r * 0.55, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = COLORS.ink;
        ctx.beginPath(); ctx.ellipse(0, -r * 0.15, r * 0.85, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.15, r * 0.14, 0, Math.PI * 2); ctx.arc(r * 0.35, -r * 0.15, r * 0.14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = COLORS.ink;
        ctx.beginPath(); ctx.arc(0, r * 0.3, r * 0.12, 0, Math.PI * 2); ctx.fill();
        break;
      }
      default:
        ctx.fillStyle = body;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // HP bar (only when damaged)
    if (e.hp < e.maxHp) {
      const w = Math.max(16, r * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(e.x - w / 2, e.y - r - 8, w, 4);
      ctx.fillStyle = '#4caf50';
      ctx.fillRect(e.x - w / 2, e.y - r - 8, w * Math.max(0, e.hp / e.maxHp), 4);
    }
  },
};
