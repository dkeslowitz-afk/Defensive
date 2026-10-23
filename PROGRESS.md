# Picnic Pests — Progress Log

Play: https://dkeslowitz-afk.github.io/Defensive/

## Shipped
1. **v1 game** — 15-wave tower defense, 4 towers with 2×3 upgrade paths, 5 enemy types + boss, Workshop meta-progression, fake revive/double-reward ads, Shop "coming soon", localStorage saves. (PR #1)
2. **GitHub Pages** live from `main`. (PR #2)
3. **Aiming Cannon** — turns and leads targets instead of a fixed direction (owner request). (PR #3)
4. **Per-tower Workshop** — tabs per tower so each levels at its own pace, free Refund all (owner request, based on Kingdom Rush / BTD6 research). (PR #4)
5. **Picnic Pests reskin** — theme picked after a simulated 8-person player panel (picnic won 7/8). Snack Squad towers with faces, picnic pests incl. new Slug and Big Bandit raccoon boss, pies/crumbs/Golden Forks, gingham blanket, synthesized sounds, particles, Sound/Vibration toggles. Plus fixes from QA/UAT/QC/security agents (save validation, CSP, double-tap Build bug, etc.). Review agents added in `.claude/agents/`. (PR #5)
6. **Polish round (PR #6)** — from re-running QA + UAT on the reskin:
   - Big Bandit now has fixed HP, so a winning defense actually squishes him (sim: 13/16 wins squish him at ~5 runs of upgrades, was 0/16).
   - Game no longer freezes if the phone refuses to start sound.
   - Piercing Pepperoni no longer double-hits the Slug that pops out of a Snail.
   - Sounds for Hot Sauce, upgrades, selling; boss kill gets its own sound + toast instead of the victory jingle.
   - Golden Forks icon tinted gold; "best" now means most waves cleared; leftover wording fixed; Starter Pack name restored.
   - Version tags on files so phones load updates right away (no stale cache).

## Known / open
- **Run length**: a full 15-wave win is ~8–10 min at 1x (target 3–5). ~4 min at 3x.
- **Lives**: Beetles cost 2 pies and the boss 15 (spec says 1 per enemy) — owner to decide.
- **Casual grind**: a casual-style player may need ~10 runs to win (smart ~5).
- **Small screens**: on iPhone SE the board shrinks (pests ~14px); landscape is unplayable (portrait-first).
- Email in old public commits: low risk; owner turned on email privacy going forward.

## Next (first-week hooks, from player panel)
1. "Next goal" line on the Run Over screen (e.g. "12 more Golden Forks → unlock Hot Sauce") + Play again button.
2. 7-day login streak, day-7 prize shown from day 1, one free missed day.
3. Daily challenge ("Popcorn Only", "Spicy Day") with an easy tier.
4. Shorter runs (faster pests / fewer per wave) to hit 3–5 minutes.
5. Shareable end-of-run card.
