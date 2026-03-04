class AudioManager {
  constructor() {
    this.enabled = typeof wx !== 'undefined' && wx.createInnerAudioContext;
    this.muted = false;
    this.ctxMap = {};
    this.manifest = {
      tap: 'assets/audio/tap.wav',
      ok: 'assets/audio/click_ok.wav',
      bad: 'assets/audio/click_bad.wav',
      timeout: 'assets/audio/timeout.wav',
      levelUp: 'assets/audio/level_up.wav',
      gameOver: 'assets/audio/game_over.wav',
      bgm: 'assets/audio/bgm_loop.wav'
    };
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      this.stop('bgm');
    }
    return this.muted;
  }

  ensure(name, loop) {
    if (!this.enabled) return null;
    if (!this.ctxMap[name]) {
      const ctx = wx.createInnerAudioContext();
      ctx.src = this.manifest[name];
      ctx.loop = !!loop;
      this.ctxMap[name] = ctx;
    }
    return this.ctxMap[name];
  }

  play(name) {
    if (this.muted || !this.enabled) return;
    const loop = name === 'bgm';
    const ctx = this.ensure(name, loop);
    if (!ctx) return;
    try {
      ctx.stop();
      ctx.play();
    } catch (e) {
      // ignore
    }
  }

  stop(name) {
    if (!this.enabled) return;
    const ctx = this.ctxMap[name];
    if (!ctx) return;
    try {
      ctx.stop();
    } catch (e) {
      // ignore
    }
  }
}

module.exports = {
  AudioManager
};
