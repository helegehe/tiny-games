class AdManager {
  constructor() {
    this.lastInterstitialAt = 0;
    this.cooldownMs = 60000;
    this.bannerVisible = false;
    this.rewardedCount = 0;
  }

  canShowInterstitial(ts) {
    return ts - this.lastInterstitialAt >= this.cooldownMs;
  }

  showInterstitial(ts) {
    if (!this.canShowInterstitial(ts)) {
      return { shown: false, reason: 'cooldown' };
    }
    this.lastInterstitialAt = ts;
    return { shown: true };
  }

  showBanner() {
    this.bannerVisible = true;
    return { shown: true };
  }

  hideBanner() {
    this.bannerVisible = false;
  }

  showRewarded() {
    this.rewardedCount += 1;
    return Promise.resolve({ ok: true, rewardedCount: this.rewardedCount });
  }
}

module.exports = {
  AdManager
};
