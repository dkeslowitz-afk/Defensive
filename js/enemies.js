// ============================================================
// ENEMIES — creation, movement and splitting.
// ============================================================

let nextEnemyId = 1;

function createEnemy(type, wave, dist = 0) {
  const def = CONFIG.enemies[type];
  const w = wave - 1;
  const mult = 1 + CONFIG.run.hpScaleLinear * w + CONFIG.run.hpScaleQuadratic * w * w;
  const hp = Math.max(1, Math.round(def.hp * mult));
  const pos = GameMap.posAt(dist);
  return {
    id: nextEnemyId++,
    type, def, wave,
    hp, maxHp: hp,
    speed: def.speed,
    radius: def.radius,
    dist,
    x: pos.x, y: pos.y,
    alive: true,
    hitFlash: 0,
  };
}

function updateEnemy(e, dt) {
  e.dist += e.speed * dt;
  const p = GameMap.posAt(e.dist);
  e.x = p.x; e.y = p.y;
  if (e.hitFlash > 0) e.hitFlash -= dt;
}

function enemyReachedEnd(e) {
  return e.dist >= GameMap.length;
}

// Children spawned when an enemy dies (e.g. Layered -> Basic)
function enemyChildren(e) {
  const s = e.def.splitsInto;
  if (!s) return [];
  const kids = [];
  for (let i = 0; i < s.count; i++) {
    kids.push(createEnemy(s.type, e.wave, Math.max(0, e.dist - i * 14)));
  }
  return kids;
}
