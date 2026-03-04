class CloudAdapter {
  constructor() {
    this.enabled = typeof wx !== 'undefined' && wx.cloud;
  }

  init() {
    if (!this.enabled) return;
    try {
      wx.cloud.init({ traceUser: true });
    } catch (e) {
      this.enabled = false;
    }
  }

  uploadScore(mode, score) {
    if (!this.enabled) {
      return Promise.resolve({ ok: false, offline: true });
    }
    return wx.cloud.callFunction({
      name: 'uploadScore',
      data: { mode, score }
    }).then(() => ({ ok: true })).catch(() => ({ ok: false }));
  }

  fetchRank(mode) {
    if (!this.enabled) {
      return Promise.resolve([]);
    }
    return wx.cloud.callFunction({
      name: 'fetchRank',
      data: { mode }
    }).then((res) => (res && res.result && res.result.list) || []).catch(() => []);
  }
}

module.exports = {
  CloudAdapter
};
