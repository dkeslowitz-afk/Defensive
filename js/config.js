// ============================================================
// CONFIG — every balance number lives here.
// Tweak costs, damage, health and wave makeup without touching game code.
// Times are in seconds, distances in map pixels (1 grid cell = 40px).
// ============================================================

const CONFIG = {
  map: {
    cols: 9,
    rows: 10,
    cell: 40,
    // Path waypoints in grid cells [col, row]. Segments must be straight lines.
    // First point starts off-screen (top), last point ends off-screen (bottom).
    path: [[1, -1], [1, 1], [7, 1], [7, 4], [1, 4], [1, 7], [7, 7], [7, 10]],
  },

  run: {
    startLives: 20,
    startCoins: 170,
    totalWaves: 15,
    waveClearBonusBase: 18,     // coins at the end of every wave...
    waveClearBonusPerWave: 3,   // ...plus this much per wave number
    // Enemy HP multiplier on wave w = 1 + hpScaleLinear*(w-1) + hpScaleQuadratic*(w-1)^2
    hpScaleLinear: 0.06,
    hpScaleQuadratic: 0.012,
    sellRefund: 0.7,
    reviveLives: 10,
    gameSpeeds: [1, 2, 3],      // fast-forward toggle cycles through these
  },

  // reward = coins per kill, lives = lives lost if it reaches the end
  // splitsInto = what spawns when it dies
  enemies: {
    basic:   { name: 'Basic',   hp: 6,   speed: 48,  reward: 2,   radius: 9,  lives: 1,  color: '#e05555', shape: 'circle' },
    fast:    { name: 'Fast',    hp: 4,   speed: 95,  reward: 2,   radius: 8,  lives: 1,  color: '#f2c94c', shape: 'triangle' },
    tanky:   { name: 'Tanky',   hp: 34,  speed: 30,  reward: 6,   radius: 12, lives: 2,  color: '#8e6bd6', shape: 'square' },
    layered: { name: 'Layered', hp: 12,  speed: 44,  reward: 2,   radius: 11, lives: 1,  color: '#3fb4a8', shape: 'ring',
               splitsInto: { type: 'basic', count: 1 } },
    boss:    { name: 'Boss',    hp: 900, speed: 18,  reward: 150, radius: 20, lives: 15, color: '#d6336c', shape: 'hexagon',
               splitsInto: { type: 'tanky', count: 3 } },
  },

  // Tower stats:
  //   damage, range (px), interval (seconds between shots), pierce (enemies per projectile),
  //   projectileSpeed, shotDistance (how far shots fly, as a multiple of range)
  // Upgrades: each path has 3 tiers. "add" adds to a stat, "mul" multiplies it.
  towers: {
    cannon: {
      name: 'Cannon', cost: 60, color: '#4a90d9', unlockedByDefault: true,
      desc: 'Turns to aim and fires heavy shells that pierce.',
      stats: { damage: 3, range: 95, interval: 1.1, pierce: 2, projectileSpeed: 320, shotDistance: 1.6, turnSpeed: 5 },
      paths: [
        { name: 'Heavy Shells', tiers: [
          { name: 'Bigger Shells', cost: 60,  desc: '+2 damage',               add: { damage: 2 } },
          { name: 'Long Barrel',   cost: 110, desc: '+30 range, +2 damage',    add: { range: 30, damage: 2 } },
          { name: 'Siege Shells',  cost: 260, desc: '+6 damage, +2 pierce',    add: { damage: 6, pierce: 2 } },
        ]},
        { name: 'Rapid Loader', tiers: [
          { name: 'Quick Reload',  cost: 55,  desc: '25% faster firing',        mul: { interval: 0.75 } },
          { name: 'Piercing Shot', cost: 100, desc: '+3 pierce',                add: { pierce: 3 } },
          { name: 'Autoloader',    cost: 240, desc: '2x faster firing',         mul: { interval: 0.5 } },
        ]},
      ],
    },
    burst: {
      name: 'Burst', cost: 70, color: '#e8833a', unlockedByDefault: true,
      desc: 'Fires 8 shots in every direction at once.',
      stats: { damage: 2, range: 75, interval: 1.2, pierce: 1, projectileSpeed: 260, shotDistance: 1.0, projectiles: 8 },
      paths: [
        { name: 'Shrapnel', tiers: [
          { name: 'Sharp Bits',    cost: 50,  desc: '+1 damage',               add: { damage: 1 } },
          { name: 'Wide Spray',    cost: 100, desc: '+1 pierce, +20 range',    add: { pierce: 1, range: 20 } },
          { name: 'Razor Storm',   cost: 230, desc: '+3 damage, +1 pierce',    add: { damage: 3, pierce: 1 } },
        ]},
        { name: 'Overdrive', tiers: [
          { name: 'Hot Core',      cost: 60,  desc: '20% faster firing',       mul: { interval: 0.8 } },
          { name: 'Twelve Shot',   cost: 110, desc: '12 shots per burst',      add: { projectiles: 4 } },
          { name: 'Meltdown',      cost: 260, desc: '16 shots, 40% faster',    add: { projectiles: 4 }, mul: { interval: 0.6 } },
        ]},
      ],
    },
    tracker: {
      name: 'Tracker', cost: 90, color: '#47b86b', unlockedByDefault: false,
      desc: 'Turns to follow one enemy and zaps it nonstop.',
      stats: { damage: 2, range: 115, interval: 0.35, turnSpeed: 7, chain: 0 },
      paths: [
        { name: 'Focus Lens', tiers: [
          { name: 'Hot Beam',      cost: 70,  desc: '+1 damage',               add: { damage: 1 } },
          { name: 'Long Lens',     cost: 110, desc: '+35 range',               add: { range: 35 } },
          { name: 'Plasma Beam',   cost: 280, desc: '+4 damage',               add: { damage: 4 } },
        ]},
        { name: 'Overclock', tiers: [
          { name: 'Fast Cycle',    cost: 65,  desc: '25% faster zaps',         mul: { interval: 0.75 } },
          { name: 'Arc Jump',      cost: 130, desc: 'Zap jumps to +1 enemy',   add: { chain: 1 } },
          { name: 'Storm Core',    cost: 270, desc: '40% faster, +1 jump',     mul: { interval: 0.6 }, add: { chain: 1 } },
        ]},
      ],
    },
    generator: {
      name: 'Coin Gen', cost: 80, color: '#d4af37', unlockedByDefault: false,
      desc: "Doesn't attack. Makes bonus coins after each wave.",
      stats: { coinsPerWave: 25 },
      paths: [
        { name: 'Output', tiers: [
          { name: 'Bigger Vault',  cost: 70,  desc: '+15 coins per wave',      add: { coinsPerWave: 15 } },
          { name: 'Minting Press', cost: 120, desc: '+25 coins per wave',      add: { coinsPerWave: 25 } },
          { name: 'Gold Reactor',  cost: 200, desc: '+40 coins per wave',      add: { coinsPerWave: 40 } },
        ]},
      ],
    },
  },

  // Each wave is a list of groups. A group spawns `count` enemies of `type`,
  // one every `gap` seconds, starting `delay` seconds after the wave begins.
  waves: [
    /* 1 */  [{ type: 'basic', count: 10, gap: 1.0 }],
    /* 2 */  [{ type: 'basic', count: 16, gap: 0.75 }],
    /* 3 */  [{ type: 'basic', count: 12, gap: 0.7 }, { type: 'fast', count: 6, gap: 0.7, delay: 5 }],
    /* 4 */  [{ type: 'layered', count: 8, gap: 1.0 }, { type: 'basic', count: 10, gap: 0.6, delay: 3 }],
    /* 5 */  [{ type: 'tanky', count: 3, gap: 2.5 }, { type: 'fast', count: 12, gap: 0.5, delay: 3 }],
    /* 6 */  [{ type: 'basic', count: 24, gap: 0.4 }, { type: 'layered', count: 12, gap: 0.7, delay: 4 }],
    /* 7 */  [{ type: 'tanky', count: 8, gap: 1.4 }, { type: 'fast', count: 20, gap: 0.35, delay: 4 }],
    /* 8 */  [{ type: 'layered', count: 22, gap: 0.5 }, { type: 'tanky', count: 6, gap: 1.6, delay: 5 }],
    /* 9 */  [{ type: 'fast', count: 34, gap: 0.25 }, { type: 'tanky', count: 9, gap: 1.2, delay: 3 }],
    /* 10 */ [{ type: 'layered', count: 26, gap: 0.4 }, { type: 'tanky', count: 10, gap: 1.0, delay: 2 }, { type: 'fast', count: 20, gap: 0.3, delay: 8 }],
    /* 11 */ [{ type: 'tanky', count: 16, gap: 0.85 }, { type: 'basic', count: 40, gap: 0.22, delay: 2 }],
    /* 12 */ [{ type: 'layered', count: 40, gap: 0.3 }, { type: 'fast', count: 26, gap: 0.25, delay: 5 }],
    /* 13 */ [{ type: 'tanky', count: 22, gap: 0.65 }, { type: 'layered', count: 26, gap: 0.35, delay: 4 }],
    /* 14 */ [{ type: 'fast', count: 50, gap: 0.18 }, { type: 'tanky', count: 20, gap: 0.6, delay: 2 }, { type: 'layered', count: 26, gap: 0.35, delay: 6 }],
    /* 15 */ [{ type: 'boss', count: 1, gap: 1 }, { type: 'tanky', count: 14, gap: 0.9, delay: 4 }, { type: 'layered', count: 26, gap: 0.35, delay: 8 }, { type: 'fast', count: 26, gap: 0.25, delay: 14 }],
  ],

  meta: {
    // Gems per wave cleared = gemsPerWave + floor(wave / gemsBonusEvery). Win adds winBonusGems.
    gemsPerWave: 1,
    gemsBonusEvery: 3,
    winBonusGems: 20,
    // Workshop: one section for run-wide bonuses ("general") plus one per tower type.
    // A tower section's upgrades only affect that tower type.
    // Cost of next level = round(baseCost * costGrowth ^ currentLevel).
    // effect: 'startCoins' | 'startLives' (flat, per level)
    //         'statPct'  (+perLevel x100 % to `stat`)
    //         'speed'    (+perLevel x100 % attack speed)
    //         'discount' (-perLevel x100 % build cost)
    workshop: {
      general: {
        coins: { name: 'Starting Coins', effect: 'startCoins', perLevel: 20, maxLevel: 10, baseCost: 6, costGrowth: 1.4 },
        lives: { name: 'Starting Lives', effect: 'startLives', perLevel: 2,  maxLevel: 10, baseCost: 5, costGrowth: 1.4 },
      },
      cannon: {
        damage:   { name: 'Damage',       effect: 'statPct', stat: 'damage', perLevel: 0.10, maxLevel: 10, baseCost: 3, costGrowth: 1.35 },
        speed:    { name: 'Attack Speed', effect: 'speed',                   perLevel: 0.08, maxLevel: 10, baseCost: 3, costGrowth: 1.35 },
        range:    { name: 'Range',        effect: 'statPct', stat: 'range',  perLevel: 0.05, maxLevel: 5,  baseCost: 4, costGrowth: 1.5 },
        discount: { name: 'Cheaper Build', effect: 'discount',               perLevel: 0.05, maxLevel: 5,  baseCost: 4, costGrowth: 1.5 },
      },
      burst: {
        damage:   { name: 'Damage',       effect: 'statPct', stat: 'damage', perLevel: 0.10, maxLevel: 10, baseCost: 3, costGrowth: 1.35 },
        speed:    { name: 'Attack Speed', effect: 'speed',                   perLevel: 0.08, maxLevel: 10, baseCost: 3, costGrowth: 1.35 },
        range:    { name: 'Range',        effect: 'statPct', stat: 'range',  perLevel: 0.05, maxLevel: 5,  baseCost: 4, costGrowth: 1.5 },
        discount: { name: 'Cheaper Build', effect: 'discount',               perLevel: 0.05, maxLevel: 5,  baseCost: 4, costGrowth: 1.5 },
      },
      tracker: {
        damage:   { name: 'Damage',       effect: 'statPct', stat: 'damage', perLevel: 0.10, maxLevel: 10, baseCost: 3, costGrowth: 1.35 },
        speed:    { name: 'Attack Speed', effect: 'speed',                   perLevel: 0.08, maxLevel: 10, baseCost: 3, costGrowth: 1.35 },
        range:    { name: 'Range',        effect: 'statPct', stat: 'range',  perLevel: 0.05, maxLevel: 5,  baseCost: 4, costGrowth: 1.5 },
        discount: { name: 'Cheaper Build', effect: 'discount',               perLevel: 0.05, maxLevel: 5,  baseCost: 4, costGrowth: 1.5 },
      },
      generator: {
        income:   { name: 'Coins per Wave', effect: 'statPct', stat: 'coinsPerWave', perLevel: 0.10, maxLevel: 10, baseCost: 3, costGrowth: 1.35 },
        discount: { name: 'Cheaper Build',  effect: 'discount',                      perLevel: 0.05, maxLevel: 5,  baseCost: 4, costGrowth: 1.5 },
      },
    },
    unlockCosts: { tracker: 15, generator: 12 },
  },

  monetization: {
    fakeAdSeconds: 3,
  },
};
