// ============================================================
// MAIN — boot and the requestAnimationFrame game loop.
// ============================================================

(function () {
  Save.load();
  UI.init();

  const MAX_STEP = 1 / 60; // sub-step so fast-forward stays accurate
  let last = performance.now();

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const run = UI.run;
    if (run && UI.screen === 'game') {
      if (!UI.paused) {
        let remaining = dt * UI.speed();
        while (remaining > 0) {
          const step = Math.min(MAX_STEP, remaining);
          updateRun(run, step);
          remaining -= step;
        }
      }
      Render.draw(run, UI);
      UI.tick();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
