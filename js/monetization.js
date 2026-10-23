// ============================================================
// MONETIZATION — the ONLY place ads and purchases are handled.
// Everything here is a placeholder. When the game is wrapped as an
// iOS app, swap the internals of showRewardedAd() and purchase() for
// real SDK calls; the rest of the game won't need to change.
// No real prices anywhere yet.
// ============================================================

const Monetization = {
  products: [
    { id: 'remove_ads',   name: 'Remove Ads',   desc: 'Get revives and double Golden Forks without watching ads.', comingSoon: true },
    { id: 'starter_pack', name: 'Picnic Basket', desc: 'A starter bundle of Golden Forks and a head start.', comingSoon: true },
  ],

  adsRemoved() {
    return !!(Save.data && Save.data.adsRemoved);
  },

  // Rewarded ad. Resolves true if the player earned the reward.
  // placement: 'revive' | 'double_gems'
  showRewardedAd(placement) {
    return new Promise((resolve) => {
      const seconds = CONFIG.monetization.fakeAdSeconds;
      const overlay = document.createElement('div');
      overlay.className = 'overlay fake-ad';
      overlay.innerHTML =
        '<div class="fake-ad-box">' +
          '<div class="fake-ad-label">AD (placeholder)</div>' +
          '<div class="fake-ad-title">Your ad here</div>' +
          '<div class="fake-ad-count">' + seconds + '</div>' +
          '<div class="fake-ad-note">Reward: ' + (placement === 'revive' ? 'Fresh pies' : 'Double Golden Forks') + '</div>' +
        '</div>';
      document.body.appendChild(overlay);
      const countEl = overlay.querySelector('.fake-ad-count');
      let left = seconds;
      const timer = setInterval(() => {
        left--;
        countEl.textContent = left > 0 ? left : '✓';
        if (left <= 0) {
          clearInterval(timer);
          setTimeout(() => { overlay.remove(); resolve(true); }, 300);
        }
      }, 1000);
    });
  },

  // In-app purchase. Resolves { ok, reason }.
  purchase(productId) {
    const p = this.products.find((x) => x.id === productId);
    if (!p || p.comingSoon) return Promise.resolve({ ok: false, reason: 'coming_soon' });
    return Promise.resolve({ ok: false, reason: 'not_implemented' });
  },
};
