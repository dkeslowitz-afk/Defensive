# Project Spec — Mobile Tower Defense Game

The owner works almost entirely from their phone, so keep everything simple to test in a phone browser.

## Tech
- Plain HTML/CSS/JavaScript, no build step, no frameworks. Use an HTML canvas for the game.
- Must run on GitHub Pages from the main branch (index.html in the repo root).
- Mobile-first: portrait layout, touch controls, buttons big enough for thumbs, no hover-only features. Should also work on desktop.
- Organize code into separate files (game loop, towers, enemies, waves, UI, save data, monetization) so features are easy to add later.
- Commit after each working change with a clear message.

## Positioning
Bloons-style tower placement with short runs (3–5 minutes) and permanent upgrades between runs (like The Tower: Idle Tower Defense). Original theme: do NOT use monkeys, balloons, or anything from Bloons. 

## Theme: "Picnic Pests" (chosen by the owner after a player-panel pilot)
- Pests march across a picnic blanket to steal the pies; "the Snack Squad" (food heroes) defends it. Bright, silly, cozy — never scary.
- Towers (internal ids unchanged): cannon = Pepperoni (spinning pepperoni discs), burst = Popcorn (kernels pop all directions), tracker = Hot Sauce (stream follows one pest), generator = Tip Jar.
- Enemies: basic = Ant, fast = Fly, tanky = Beetle, layered = Snail (cracks into a Slug), boss = Big Bandit the Raccoon (drops 3 Beetles).
- Lives = pies 🥧, coins = crumbs 🍪, gems = Golden Forks 🍴. Board = soft gingham blanket with a crumb-trail path ending at a picnic basket.
- Art is drawn in code (`js/render.js`), sounds are synthesized (`js/audio.js`); keep everything readable on a small phone (pests must stand out from the blanket).


## Core loop
- Enemies walk a fixed winding path. Each enemy that reaches the end costs a life. Start with 20 lives.
- Killing enemies earns coins. Coins buy and upgrade towers during the run.
- A run is 15 waves, getting harder each wave. Show a "Start Wave" button between waves, plus a fast-forward toggle.
- Enemy types: basic, fast, tanky, and layered (splits into a weaker enemy when destroyed). Wave 15 has a boss.
- HUD: lives, coins, wave number, pause button.

## Towers
Tap an empty spot to open a build menu. Tap a placed tower to upgrade, change targeting, or sell (70% refund). Show tower range when placing or selected.
1. Cannon: turns to aim at its target (default: First enemy in range) and fires heavy piercing shells that lead moving targets. (Changed from the original fixed-direction design at the owner's request.)
2. Burst Tower: fires 8 projectiles in all directions at once.
3. Tracker: rotates to follow its target and keeps hitting it as it moves.
4. Coin Generator: doesn't attack; produces bonus coins at the end of each wave.
- Each attacking tower has 2 upgrade paths with 3 tiers each (for example, damage/range vs. speed/pierce). Show cost and what each upgrade does.
- Attacking towers have targeting modes: First (furthest along the path), Last, Strong, and Close.

## Meta-progression
- After each run (win or lose), the player earns gems based on how far they got.
- A Workshop screen between runs where gems buy permanent upgrades, organized in tabs (like Kingdom Rush / Bloons TD 6):
  - General: +starting coins, +starting lives.
  - One tab per tower type (Cannon, Burst, Tracker, Coin Gen): damage, attack speed, range, cheaper build (Coin Gen: coins per wave, cheaper build). These only affect that tower type, so each tower levels up at its own pace. (Changed from the original all-tower +damage/+speed at the owner's request.)
  - Unlocking towers (the Tracker and Coin Generator start locked) happens in that tower's tab.
  - "Refund all" returns spent gems for free so players can try other builds.
- Upgrades bought during a run apply only to the individual tower they were bought on.
- Save gems, upgrades, and best wave to localStorage.
- Screens: Home (Play, Workshop, Shop), Game, Run Over (results + gems earned).

## Monetization hooks (placeholders only, no real ads or payments yet)
- Game over: "Watch ad to revive" button, once per run. For now, simulate it with a 3-second fake "ad" then grant the revive.
- Run over: "Watch ad to double gems" button, same fake-ad simulation.
- Shop screen: "Remove Ads" and a "Starter Pack" item, marked "Coming soon."
- Put all of this behind one monetization module so we can plug in real ad and purchase SDKs later when we wrap the game as an iOS app.

## Balance goals
- A brand-new player should usually reach wave 6–10 on their first run, and need a few runs of Workshop upgrades to beat wave 15.
- Keep all numbers (costs, damage, health, wave makeup) in one config file so balance is easy to tweak.

## How to work with the owner
- After each change, explain in one or two plain-English sentences what changed and what to test.
- Before big changes, give the plan in a few bullets first.
- If something requested would break something else, say so before doing it.
- Never put real prices in the game yet.

## Code map (keep this updated)
- `index.html` — page shell, screens, loads scripts in order.
- `css/style.css` — all styling (portrait, thumb-sized buttons).
- `js/config.js` — ALL balance numbers: map path, enemies, towers + upgrades, waves, workshop, gems.
- `js/save.js` — localStorage save data (gems, workshop levels, unlocks, best wave, settings). Treat stored data as untrusted: validate/clamp on load.
- `js/monetization.js` — the only place ads/purchases live (currently fake ads + "coming soon").
- `js/audio.js` — synthesized sound effects + vibration, respecting the Sound/Vibration settings.
- `js/map.js` — grid and path geometry.
- `js/enemies.js` — enemy creation/movement/splitting.
- `js/towers.js` — tower stats, upgrades, targeting, firing, projectiles.
- `js/waves.js` — turns wave config into a spawn schedule.
- `js/game.js` — run state and the update logic (no drawing, no DOM).
- `js/render.js` — canvas drawing (blanket, Snack Squad, pests, particles).
- `js/ui.js` — screens, HUD, build/tower panels, input.
- `js/main.js` — boot + requestAnimationFrame loop.
- `tools/sim.js` — optional headless balance check: `node tools/sim.js`.

## Review agents (`.claude/agents/`)
Run these to check work before telling the owner it's done:
- `qa-tester` — plays the game in a headless phone browser to find bugs.
- `uat-reviewer` — checks every spec bullet above, pass/fail, from a phone player's view.
- `qc-reviewer` — code quality, config discipline, phone performance.
- `security-reviewer` — injection, save tampering, secrets, future ad/IAP risks.
- `player-panel` — simulated panel of 8 mobile-gamer personas who react to ideas/themes/builds (a gut-check, not real users).
