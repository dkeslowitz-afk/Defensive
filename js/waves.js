// ============================================================
// WAVES — turns the wave list in CONFIG into a spawn schedule.
// ============================================================

function buildWaveSchedule(waveNum) {
  const groups = CONFIG.waves[waveNum - 1] || [];
  const schedule = [];
  for (const g of groups) {
    for (let i = 0; i < g.count; i++) {
      schedule.push({ time: (g.delay || 0) + i * g.gap, type: g.type });
    }
  }
  schedule.sort((a, b) => a.time - b.time);
  return schedule;
}

function waveHasBoss(waveNum) {
  return (CONFIG.waves[waveNum - 1] || []).some((g) => g.type === 'boss');
}
