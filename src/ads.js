const AD_UNITS = {
  // 替换成你自己的微信广告位 ID（格式通常为 adunit-xxxxxxxxxxxxxxxx）
  banner: '',
  rewarded: '',
  interstitial: ''
};

function isValidAdUnitId(id) {
  return typeof id === 'string' && /^adunit-[a-zA-Z0-9]+$/.test(id);
}

class AdManager {
  constructor() {
    this.lastInterstitialAt = 0;
    this.cooldownMs = 60000;
    this.bannerVisible = false;
    this.rewardedCount = 0;
    this.bannerAd = null;
    this.rewardedAd = null;
    this.interstitialAd = null;
    this.bannerStyle = null;
    this.envReady = typeof wx !== 'undefined';
  }

  canShowInterstitial(ts) {
    return ts - this.lastInterstitialAt >= this.cooldownMs;
  }

  init(width, height) {
    if (!this.envReady) return;
    this.bannerStyle = {
      left: 0,
      top: Math.max(0, Math.floor(height - 100)),
      width: Math.floor(width || 320)
    };
  }

  ensureBanner() {
    if (!this.envReady || !wx.createBannerAd || !isValidAdUnitId(AD_UNITS.banner)) return null;
    if (this.bannerAd) return this.bannerAd;
    this.bannerAd = wx.createBannerAd({
      adUnitId: AD_UNITS.banner,
      style: this.bannerStyle || { left: 0, top: 0, width: 320 }
    });
    this.bannerAd.onError(() => {});
    return this.bannerAd;
  }

  ensureRewarded() {
    if (!this.envReady || !wx.createRewardedVideoAd || !isValidAdUnitId(AD_UNITS.rewarded)) return null;
    if (this.rewardedAd) return this.rewardedAd;
    this.rewardedAd = wx.createRewardedVideoAd({ adUnitId: AD_UNITS.rewarded });
    this.rewardedAd.onError(() => {});
    return this.rewardedAd;
  }

  ensureInterstitial() {
    if (!this.envReady || !wx.createInterstitialAd || !isValidAdUnitId(AD_UNITS.interstitial)) return null;
    if (this.interstitialAd) return this.interstitialAd;
    this.interstitialAd = wx.createInterstitialAd({ adUnitId: AD_UNITS.interstitial });
    this.interstitialAd.onError(() => {});
    return this.interstitialAd;
  }

  showInterstitial(ts) {
    if (!this.canShowInterstitial(ts)) {
      return { shown: false, reason: 'cooldown' };
    }
    const ad = this.ensureInterstitial();
    if (!ad) {
      return { shown: false, reason: 'no_ad_unit' };
    }
    this.lastInterstitialAt = ts;
    ad.show().catch(() => {});
    return { shown: true };
  }

  showBanner() {
    const ad = this.ensureBanner();
    if (!ad) {
      this.bannerVisible = false;
      return { shown: false, reason: 'no_ad_unit' };
    }
    this.bannerVisible = true;
    ad.show().catch(() => {
      this.bannerVisible = false;
    });
    return { shown: true };
  }

  hideBanner() {
    this.bannerVisible = false;
    if (this.bannerAd && this.bannerAd.hide) {
      this.bannerAd.hide();
    }
  }

  showRewarded() {
    const ad = this.ensureRewarded();
    if (!ad) {
      return Promise.resolve({ ok: false, reason: 'no_ad_unit' });
    }
    this.rewardedCount += 1;
    return new Promise((resolve) => {
      const onClose = (res) => {
        if (ad.offClose) ad.offClose(onClose);
        const ended = !res || res.isEnded === undefined || res.isEnded;
        resolve({ ok: !!ended, rewardedCount: this.rewardedCount });
      };

      ad.onClose(onClose);
      ad.load()
        .then(() => ad.show())
        .catch(() => ad.show())
        .catch(() => {
          if (ad.offClose) ad.offClose(onClose);
          resolve({ ok: false, rewardedCount: this.rewardedCount, reason: 'show_failed' });
        });
    });
  }
}

module.exports = {
  AdManager,
  AD_UNITS
};
