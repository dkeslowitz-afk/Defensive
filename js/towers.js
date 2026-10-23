// ============================================================
// TOWERS — stats, upgrades, targeting, firing and projectiles.
// ============================================================

const TARGETING_MODES = ['first', 'last', 'strong', 'close'];
const TARGETING_LABELS = { first: 'First', last: 'Last', strong: 'Strong', close: 'Close' };

let nextTowerId = 1;

function createTower(type, c, r) {
  const def = CONFIG.towers[type];
  const pos = GameMap.cellCenter(c, r);
  const t = {
    id: nextTowerId++,
    type, def, c, r,
    x: pos.x, y: pos.y,
    levels: def.paths.map(() => 0),
    spent: def.cost,
    targeting: 'first',
    angle: -Math.PI / 2, // cannon/tracker: current facing
    cooldown: 0,
    beam: null,          // tracker: last zap, for drawing
    stats: null,
  };
  t.stats = towerStats(t);
  return t;
}

// Build cost after this tower type's Workshop discount
function towerCost(type) {
  return Math.round(CONFIG.towers[type].cost * (1 - Save.bonus(type, 'discount')));
}

function isAttacker(t) { return t.type !== 'generator'; }
function usesTargeting(t) { return t.type === 'cannon' || t.type === 'tracker'; }

// Base stats + purchased upgrades + permanent Workshop bonuses
function towerStats(t) {
  const s = Object.assign({}, t.def.stats);
  t.def.paths.forEach((p, pi) => {
    for (let i = 0; i < t.levels[pi]; i++) {
      const tier = p.tiers[i];
      if (tier.add) for (const k in tier.add) s[k] = (s[k] || 0) + tier.add[k];
      if (tier.mul) for (const k in tier.mul) s[k] = (s[k] || 0) * tier.mul[k];
    }
  });
  // Permanent Workshop upgrades for this tower type only
  for (const w of Object.values(CONFIG.meta.workshop[t.type] || {})) {
    if (w.effect === 'statPct' && s[w.stat] !== undefined) s[w.stat] *= 1 + Save.bonus(t.type, 'statPct', w.stat);
  }
  if (s.interval !== undefined) s.interval /= 1 + Save.bonus(t.type, 'speed');
  return s;
}

function nextUpgrade(t, pathIndex) {
  const p = t.def.paths[pathIndex];
  const lvl = t.levels[pathIndex];
  return lvl < p.tiers.length ? p.tiers[lvl] : null;
}

function sellValue(t) {
  return Math.floor(t.spent * CONFIG.run.sellRefund);
}

// Turn toward an angle at turnSpeed. Returns how far off we still are (radians).
function turnToward(t, want, dt) {
  let diff = want - t.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const step = t.stats.turnSpeed * dt;
  t.angle += Math.abs(diff) <= step ? diff : Math.sign(diff) * step;
  return Math.abs(diff);
}

// Where to aim so a shell meets the enemy: predict its spot further along the path.
function leadPoint(t, e) {
  let p = { x: e.x, y: e.y };
  for (let i = 0; i < 2; i++) {
    const time = Math.hypot(p.x - t.x, p.y - t.y) / t.stats.projectileSpeed;
    p = GameMap.posAt(e.dist + e.speed * time);
  }
  return p;
}

function enemiesInRange(run, x, y, range) {
  const out = [];
  for (const e of run.enemies) {
    if (!e.alive) continue;
    const dx = e.x - x, dy = e.y - y;
    if (dx * dx + dy * dy <= (range + e.radius) * (range + e.radius)) out.push(e);
  }
  return out;
}

function pickTarget(t, list) {
  if (!list.length) return null;
  let best = list[0];
  for (const e of list) {
    switch (t.targeting) {
      case 'first':  if (e.dist > best.dist) best = e; break;
      case 'last':   if (e.dist < best.dist) best = e; break;
      case 'strong': if (e.hp > best.hp || (e.hp === best.hp && e.dist > best.dist)) best = e; break;
      case 'close': {
        const d1 = (e.x - t.x) ** 2 + (e.y - t.y) ** 2;
        const d2 = (best.x - t.x) ** 2 + (best.y - t.y) ** 2;
        if (d1 < d2) best = e;
        break;
      }
    }
  }
  return best;
}

function spawnProjectile(run, t, angle) {
  const s = t.stats;
  run.projectiles.push({
    x: t.x, y: t.y,
    vx: Math.cos(angle) * s.projectileSpeed,
    vy: Math.sin(angle) * s.projectileSpeed,
    damage: s.damage,
    pierce: Math.round(s.pierce),
    maxDist: s.range * s.shotDistance,
    traveled: 0,
    radius: t.type === 'cannon' ? 6 : 4,
    color: t.def.color,
    hit: new Set(),
    alive: true,
  });
}

function updateTower(run, t, dt) {
  if (!isAttacker(t)) return;
  const s = t.stats;
  t.cooldown -= dt;
  if (t.beam) { t.beam.ttl -= dt; if (t.beam.ttl <= 0) t.beam = null; }

  const inRange = enemiesInRange(run, t.x, t.y, s.range);

  if (t.type === 'cannon') {
    const target = pickTarget(t, inRange);
    if (!target) return;
    const aim = leadPoint(t, target);
    const off = turnToward(t, Math.atan2(aim.y - t.y, aim.x - t.x), dt);
    if (off < 0.15 && t.cooldown <= 0) {
      spawnProjectile(run, t, t.angle);
      t.cooldown = s.interval;
    }
  } else if (t.type === 'burst') {
    if (t.cooldown <= 0 && inRange.length) {
      const n = Math.round(s.projectiles);
      for (let i = 0; i < n; i++) spawnProjectile(run, t, -Math.PI / 2 + i * (Math.PI * 2 / n));
      t.cooldown = s.interval;
    }
  } else if (t.type === 'tracker') {
    const target = pickTarget(t, inRange);
    if (!target) return;
    const off = turnToward(t, Math.atan2(target.y - t.y, target.x - t.x), dt);
    if (off < 0.25 && t.cooldown <= 0) {
      const hits = [target];
      // Chain: jump to nearest other enemies near the last hit
      let last = target;
      for (let i = 0; i < Math.round(s.chain); i++) {
        let next = null, nd = Infinity;
        for (const e of run.enemies) {
          if (!e.alive || hits.includes(e)) continue;
          const d = (e.x - last.x) ** 2 + (e.y - last.y) ** 2;
          if (d < nd && d < 70 * 70) { nd = d; next = e; }
        }
        if (!next) break;
        hits.push(next); last = next;
      }
      t.beam = { points: hits.map((e) => ({ x: e.x, y: e.y })), ttl: 0.08 };
      for (const e of hits) damageEnemy(run, e, s.damage);
      t.cooldown = s.interval;
    }
  }
}

function updateProjectile(run, p, dt) {
  const mx = p.vx * dt, my = p.vy * dt;
  p.x += mx; p.y += my;
  p.traveled += Math.hypot(mx, my);
  if (p.traveled >= p.maxDist || p.x < -20 || p.y < -20 || p.x > GameMap.width + 20 || p.y > GameMap.height + 20) {
    p.alive = false;
    return;
  }
  for (const e of run.enemies) {
    if (!e.alive || p.hit.has(e.id)) continue;
    const r = p.radius + e.radius;
    if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= r * r) {
      p.hit.add(e.id);
      damageEnemy(run, e, p.damage);
      p.pierce--;
      if (p.pierce <= 0) { p.alive = false; return; }
    }
  }
}
