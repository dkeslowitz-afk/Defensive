// ============================================================
// RENDER — draws the run onto the canvas. Simple shapes for v1.
// ============================================================

const COLORS = {
  grass: '#1f2a38',
  grassAlt: '#223042',
  path: '#c9b48a',
  pathEdge: '#a8946c',
  range: 'rgba(255,255,255,0.12)',
  rangeEdge: 'rgba(255,255,255,0.5)',
  bad: 'rgba(255,80,80,0.35)',
  select: '#ffffff',
};

const Render = {
  canvas: null,
  ctx: null,
  scale: 1,

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
  },

  // Screen point -> map coordinates
  toMap(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    return { x: (clientX - r.left) / this.scale, y: (clientY - r.top) / this.scale };
  },

  draw(run, ui) {
    const ctx = this.ctx;
    const cell = GameMap.cell;

    // Ground checkerboard
    for (let c = 0; c < GameMap.cols; c++) {
      for (let r = 0; r < GameMap.rows; r++) {
        ctx.fillStyle = (c + r) % 2 ? COLORS.grass : COLORS.grassAlt;
        ctx.fillRect(c * cell, r * cell, cell, cell);
      }
    }

    // Path
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    ctx.strokeStyle = COLORS.pathEdge;
    ctx.lineWidth = cell * 0.86;
    this.pathStroke();
    ctx.strokeStyle = COLORS.path;
    ctx.lineWidth = cell * 0.72;
    this.pathStroke();

    // Exit marker
    const end = GameMap.points[GameMap.points.length - 1];
    ctx.fillStyle = 'rgba(255,80,80,0.5)';
    ctx.fillRect(end.x - cell / 2, GameMap.height - 6, cell, 6);

    // Range preview: placing a tower or a tower is selected
    if (ui.pending && ui.pendingType) {
      const def = CONFIG.towers[ui.pendingType];
      const pos = GameMap.cellCenter(ui.pending.c, ui.pending.r);
      if (def.stats.range) this.rangeCircle(pos.x, pos.y, def.stats.range);
      this.drawTowerShape({ type: ui.pendingType, def, x: pos.x, y: pos.y, angle: -Math.PI / 2, levels: [0, 0] }, 0.55);
    }
    if (ui.pending) {
      ctx.strokeStyle = COLORS.select;
      ctx.lineWidth = 2;
      ctx.strokeRect(ui.pending.c * cell + 2, ui.pending.r * cell + 2, cell - 4, cell - 4);
    }
    if (ui.selected) {
      const t = ui.selected;
      if (t.stats.range) this.rangeCircle(t.x, t.y, t.stats.range);
    }

    // Towers
    for (const t of run.towers) this.drawTowerShape(t, 1);
    if (ui.selected) {
      ctx.strokeStyle = COLORS.select;
      ctx.lineWidth = 2;
      ctx.strokeRect(ui.selected.c * cell + 2, ui.selected.r * cell + 2, cell - 4, cell - 4);
    }

    // Enemies
    for (const e of run.enemies) this.drawEnemy(e);

    // Projectiles
    for (const p of run.projectiles) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Tracker beams
    for (const t of run.towers) {
      if (!t.beam) continue;
      ctx.strokeStyle = 'rgba(140,255,170,0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(t.x + Math.cos(t.angle) * 14, t.y + Math.sin(t.angle) * 14);
      for (const p of t.beam.points) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }

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

  pathStroke() {
    const ctx = this.ctx;
    ctx.beginPath();
    GameMap.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
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

  drawTowerShape(t, alpha) {
    const ctx = this.ctx;
    const def = t.def;
    ctx.globalAlpha = alpha;
    // base
    ctx.fillStyle = '#2b3646';
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = def.color;
    if (t.type === 'cannon') {
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.angle);
      ctx.fillRect(0, -4.5, 19, 9);
      ctx.restore();
      ctx.beginPath(); ctx.arc(t.x, t.y, 8, 0, Math.PI * 2); ctx.fill();
    } else if (t.type === 'burst') {
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        ctx.beginPath();
        ctx.arc(t.x + Math.cos(a) * 10, t.y + Math.sin(a) * 10, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath(); ctx.arc(t.x, t.y, 6, 0, Math.PI * 2); ctx.fill();
    } else if (t.type === 'tracker') {
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.angle);
      ctx.beginPath();
      ctx.moveTo(16, 0); ctx.lineTo(-8, -9); ctx.lineTo(-4, 0); ctx.lineTo(-8, 9);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (t.type === 'generator') {
      ctx.beginPath();
      ctx.arc(t.x, t.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2b3646';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', t.x, t.y + 1);
      ctx.textBaseline = 'alphabetic';
    }

    // upgrade pips
    if (t.levels && t.levels.some((l) => l > 0)) {
      t.levels.forEach((lvl, pi) => {
        for (let i = 0; i < lvl; i++) {
          ctx.fillStyle = pi === 0 ? '#ffd54a' : '#7fd3ff';
          ctx.fillRect(t.x - 13 + i * 6, t.y + 12 + pi * 4, 4, 3);
        }
      });
    }
    ctx.globalAlpha = 1;
  },

  drawEnemy(e) {
    const ctx = this.ctx;
    const r = e.radius;
    ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : e.def.color;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    switch (e.def.shape) {
      case 'triangle':
        ctx.moveTo(e.x, e.y - r);
        ctx.lineTo(e.x + r * 0.9, e.y + r * 0.7);
        ctx.lineTo(e.x - r * 0.9, e.y + r * 0.7);
        ctx.closePath();
        break;
      case 'square':
        ctx.rect(e.x - r, e.y - r, r * 2, r * 2);
        break;
      case 'hexagon':
        for (let i = 0; i < 6; i++) {
          const a = i * Math.PI / 3 + e.dist * 0.01;
          ctx.lineTo(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r);
        }
        ctx.closePath();
        break;
      default:
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
    if (e.def.shape === 'ring') {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, r * 0.55, 0, Math.PI * 2);
      ctx.stroke();
    }
    // HP bar (only when damaged)
    if (e.hp < e.maxHp) {
      const w = Math.max(16, r * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(e.x - w / 2, e.y - r - 7, w, 4);
      ctx.fillStyle = '#5be37d';
      ctx.fillRect(e.x - w / 2, e.y - r - 7, w * Math.max(0, e.hp / e.maxHp), 4);
    }
  },
};
