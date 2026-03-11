const { getClassicDifficulty, getDailySeedKey, ITEM_POOL, THEMES, DAILY_TASK_DEFS, FUNNY_TAGS, getThemeById } = require('./data');
const { SaveStore } = require('./storage');
const { createRng, shuffle, buildRound } = require('./logic');
const { AdManager } = require('./ads');
const { ensureDailyTasks, incrementTask, claimTask } = require('./tasks');
const { createAsyncChallenge } = require('./social');
const { AudioManager } = require('./audio');
const { AssetManager } = require('./assets');

function now() {
  return Date.now();
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function createSurface() {
  let canvas;
  let width = 375;
  let height = 667;

  if (typeof wx !== 'undefined' && wx.createCanvas) {
    const info = wx.getSystemInfoSync();
    width = info.windowWidth;
    height = info.windowHeight;
    canvas = wx.createCanvas();
    canvas.width = width;
    canvas.height = height;
  } else if (typeof document !== 'undefined') {
    canvas = document.createElement('canvas');
    width = window.innerWidth || width;
    height = window.innerHeight || height;
    canvas.width = width;
    canvas.height = height;
    document.body.style.margin = '0';
    document.body.appendChild(canvas);
  } else {
    throw new Error('No canvas environment available');
  }

  const ctx = canvas.getContext('2d');
  return { canvas, ctx, width, height };
}

function pickTag(score) {
  return FUNNY_TAGS[score % FUNNY_TAGS.length];
}

class Button {
  constructor(x, y, w, h, text, onTap, theme) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.text = text;
    this.onTap = onTap;
    this.theme = theme || { bg: '#1f6feb', fg: '#ffffff' };
  }

  draw(ctx, skinImage) {
    ctx.save();
    if (skinImage) {
      ctx.drawImage(skinImage, this.x, this.y, this.w, this.h);
    } else {
      ctx.fillStyle = this.theme.bg;
      const r = 14;
      ctx.beginPath();
      ctx.moveTo(this.x + r, this.y);
      ctx.arcTo(this.x + this.w, this.y, this.x + this.w, this.y + this.h, r);
      ctx.arcTo(this.x + this.w, this.y + this.h, this.x, this.y + this.h, r);
      ctx.arcTo(this.x, this.y + this.h, this.x, this.y, r);
      ctx.arcTo(this.x, this.y, this.x + this.w, this.y, r);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = this.theme.fg;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text, this.x + this.w / 2, this.y + this.h / 2 + 1);
    ctx.restore();
  }

  hit(px, py) {
    return px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h;
  }
}

class GameApp {
  constructor() {
    this.surface = createSurface();
    this.canvas = this.surface.canvas;
    this.ctx = this.surface.ctx;
    this.w = this.surface.width;
    this.h = this.surface.height;
    this.store = new SaveStore();
    this.ad = new AdManager();
    this.ad.init(this.w, this.h);
    this.audio = new AudioManager();
    this.assets = new AssetManager();

    this.state = {
      scene: 'home',
      mode: null,
      round: null,
      cards: [],
      particles: [],
      uiButtons: [],
      lives: 3,
      level: 1,
      levelRound: 0,
      score: 0,
      timer: 0,
      timerMax: 2,
      gameOverReason: '',
      message: '',
      messageUntil: 0,
      canRevive: false,
      challengeElapsed: 0,
      challengeTotal: 60,
      challengeRoundBase: 1.5,
      challengeSpeedStep: 0,
      dailySeed: '',
      rng: Math.random,
      lastResult: null,
      latestSticker: '',
      recentFail: null,
      freezeRemaining: 0,
      shieldActive: false,
      revived: false
    };
    this.lastTs = now();
  }

  start() {
    this.assets.loadAll();
    this.bindInput();
    this.enterHome();
    this.loop();
  }

  bindInput() {
    const handleTap = (x, y) => this.onTap(x, y);

    if (typeof wx !== 'undefined' && wx.onTouchStart) {
      wx.onTouchStart((e) => {
        const t = e.touches && e.touches[0];
        if (!t) return;
        handleTap(t.clientX, t.clientY);
      });
    } else if (this.canvas.addEventListener) {
      this.canvas.addEventListener('click', (e) => handleTap(e.offsetX, e.offsetY));
      this.canvas.addEventListener('touchstart', (e) => {
        const t = e.touches && e.touches[0];
        if (!t) return;
        const rect = this.canvas.getBoundingClientRect();
        handleTap(t.clientX - rect.left, t.clientY - rect.top);
      });
    }
  }

  onTap(x, y) {
    for (let i = 0; i < this.state.uiButtons.length; i += 1) {
      const btn = this.state.uiButtons[i];
      if (btn.hit(x, y)) {
        this.audio.play('tap');
        btn.onTap();
        return;
      }
    }

    if (this.state.scene === 'playing') {
      const propButtons = this.getInGamePropButtons();
      for (let i = 0; i < propButtons.length; i += 1) {
        const btn = propButtons[i];
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
          this.audio.play('tap');
          this.useProp(btn.key);
          return;
        }
      }

      for (let i = 0; i < this.state.cards.length; i += 1) {
        const card = this.state.cards[i];
        if (x >= card.x && x <= card.x + card.w && y >= card.y && y <= card.y + card.h) {
          this.pickCard(card);
          return;
        }
      }
    }
  }

  refreshDailyTasks() {
    const save = this.store.state;
    const nextTasks = ensureDailyTasks(save.dailyTasks, new Date());
    if (nextTasks.date !== save.dailyTasks.date) {
      this.store.patch({ dailyTasks: nextTasks });
    }
  }

  emitTaskProgress(type, value) {
    const save = this.store.state;
    const daily = ensureDailyTasks(save.dailyTasks, new Date());
    const nextDaily = incrementTask(daily, type, value);
    this.store.patch({ dailyTasks: nextDaily });
  }

  patchStats(partial) {
    const stats = Object.assign({}, this.store.state.stats);
    Object.keys(partial).forEach((k) => {
      stats[k] = (stats[k] || 0) + partial[k];
    });
    this.store.patch({ stats });
  }

  getPropsInventory() {
    const base = { eliminate: 0, freeze: 0, shield: 0, picky: 0 };
    return Object.assign(base, this.store.state.props || {});
  }

  patchProps(delta) {
    const inv = this.getPropsInventory();
    const next = Object.assign({}, inv);
    Object.keys(delta).forEach((k) => {
      next[k] = Math.max(0, (next[k] || 0) + delta[k]);
    });
    this.store.patch({ props: next });
    return next;
  }

  enterHome() {
    this.refreshDailyTasks();
    this.state.scene = 'home';
    this.state.mode = null;
    this.state.cards = [];
    this.state.uiButtons = [];

    this.ad.showBanner();
    this.audio.play('bgm');

    const bw = this.w * 0.72;
    const bh = 50;
    const bx = (this.w - bw) / 2;
    const top = this.h * 0.28;
    const gap = 62;

    this.state.uiButtons.push(
      new Button(bx, top, bw, bh, '经典闯关', () => this.startClassic(), { bg: '#0077ff', fg: '#fff' }),
      new Button(bx, top + gap, bw, bh, '限时挑战', () => this.startTimed(), { bg: '#ff6b35', fg: '#fff' }),
      new Button(bx, top + gap * 2, bw, bh, '每日挑战', () => this.startDaily(), { bg: '#00a86b', fg: '#fff' }),
      new Button(bx, top + gap * 3, bw, bh, '功能中心', () => this.enterHub(), { bg: '#22365b', fg: '#fff' }),
      new Button(bx, top + gap * 4, bw, bh, '隐私说明', () => this.enterPrivacy(), { bg: '#4b5563', fg: '#fff' }),
      new Button(14, this.h - 52, 120, 40, this.audio.muted ? '声音:关' : '声音:开', () => this.toggleAudio(), { bg: '#2d3436', fg: '#fff' })
    );
  }

  toggleAudio() {
    const muted = this.audio.toggleMute();
    this.showMessage(muted ? '已静音' : '声音已开启');
    this.enterHome();
  }

  enterHub() {
    this.state.scene = 'hub';
    this.state.uiButtons = [];
    const bw = this.w * 0.72;
    const bh = 50;
    const bx = (this.w - bw) / 2;
    const top = this.h * 0.22;
    const gap = 58;

    this.state.uiButtons.push(
      new Button(bx, top, bw, bh, '每日任务', () => this.enterTasks(), { bg: '#1e90ff', fg: '#fff' }),
      new Button(bx, top + gap, bw, bh, '图鉴系统', () => this.enterCollection(), { bg: '#00a86b', fg: '#fff' }),
      new Button(bx, top + gap * 2, bw, bh, '主题包', () => this.enterThemes(), { bg: '#ff7a00', fg: '#fff' }),
      new Button(bx, top + gap * 3, bw, bh, '排行榜', () => this.enterRank(), { bg: '#7b5cff', fg: '#fff' }),
      new Button(bx, top + gap * 4, bw, bh, '道具工坊', () => this.enterProps(), { bg: '#9c27b0', fg: '#fff' }),
      new Button(bx, top + gap * 5, bw, bh, '本地挑战记录', () => this.enterLocalRecords(), { bg: '#1f3c88', fg: '#fff' }),
      new Button(bx, top + gap * 6, bw, bh, '返回主页', () => this.enterHome(), { bg: '#34495e', fg: '#fff' })
    );
  }

  enterPrivacy() {
    this.state.scene = 'privacy';
    this.state.uiButtons = [];
    const bw = this.w * 0.72;
    const bh = 50;
    const bx = (this.w - bw) / 2;
    this.state.uiButtons.push(
      new Button(bx, this.h * 0.82, bw, bh, '返回主页', () => this.enterHome(), { bg: '#34495e', fg: '#fff' })
    );
  }

  enterProps() {
    this.state.scene = 'props';
    this.state.uiButtons = [];
    const inv = this.getPropsInventory();
    const bw = this.w * 0.74;
    const bh = 46;
    const bx = (this.w - bw) / 2;
    const top = this.h * 0.24;
    const gap = 56;
    const defs = [
      { key: 'eliminate', name: '排除卡' },
      { key: 'freeze', name: '冻结时间' },
      { key: 'shield', name: '护盾' },
      { key: 'picky', name: '挑剔卡' }
    ];
    for (let i = 0; i < defs.length; i += 1) {
      const def = defs[i];
      this.state.uiButtons.push(
        new Button(
          bx,
          top + i * gap,
          bw,
          bh,
          `${def.name} x${inv[def.key] || 0}（看广告+1）`,
          () => this.redeemProp(def.key, def.name),
          { bg: '#5b4b8a', fg: '#fff' }
        )
      );
    }
    this.state.uiButtons.push(
      new Button(bx, top + gap * defs.length + 10, bw, bh, '返回功能中心', () => this.enterHub(), { bg: '#34495e', fg: '#fff' })
    );
  }

  redeemProp(key, name) {
    this.ad.showRewarded().then((ret) => {
      if (!ret || !ret.ok) {
        this.showMessage('广告未完整观看');
        return;
      }
      this.patchStats({ adWatched: 1 });
      this.emitTaskProgress('watch_ad', 1);
      this.patchProps({ [key]: 1 });
      this.showMessage(`${name}+1`);
      this.enterProps();
    });
  }

  enterTasks() {
    this.refreshDailyTasks();
    this.state.scene = 'tasks';
    this.state.uiButtons = [];

    const bw = this.w * 0.72;
    const bh = 44;
    const bx = (this.w - bw) / 2;
    const top = this.h * 0.26;
    const gap = 54;
    const daily = this.store.state.dailyTasks;

    for (let i = 0; i < DAILY_TASK_DEFS.length; i += 1) {
      const def = DAILY_TASK_DEFS[i];
      const task = daily.tasks[def.id] || { progress: 0, claimed: false };
      const done = task.progress >= def.target;
      const label = task.claimed ? '已领取' : done ? `领取+${def.reward}` : `进度${task.progress}/${def.target}`;
      const bg = task.claimed ? '#7f8c8d' : done ? '#00a86b' : '#1f6feb';
      this.state.uiButtons.push(new Button(bx, top + i * gap, bw, bh, label, () => {
        const latest = this.store.state.dailyTasks;
        const ret = claimTask(latest, def.id);
        if (!ret.ok) {
          this.showMessage('任务未完成或已领取');
          return;
        }
        this.store.patch({ dailyTasks: ret.meta, coins: this.store.state.coins + ret.reward });
        this.showMessage(`领取成功 +${ret.reward}金币`);
        this.enterTasks();
      }, { bg, fg: '#fff' }));
    }

    this.state.uiButtons.push(new Button(bx, top + gap * 4 + 18, bw, bh, '返回功能中心', () => this.enterHub(), { bg: '#34495e', fg: '#fff' }));
  }

  enterCollection() {
    this.state.scene = 'collection';
    this.state.uiButtons = [];
    const bw = this.w * 0.7;
    const bh = 50;
    const bx = (this.w - bw) / 2;
    this.state.uiButtons.push(
      new Button(bx, this.h * 0.8, bw, bh, '返回功能中心', () => this.enterHub(), { bg: '#34495e', fg: '#fff' })
    );
  }

  enterThemes() {
    this.state.scene = 'themes';
    this.state.uiButtons = [];

    const bw = this.w * 0.72;
    const bh = 44;
    const bx = (this.w - bw) / 2;
    const top = this.h * 0.24;
    const gap = 52;

    for (let i = 0; i < THEMES.length; i += 1) {
      const theme = THEMES[i];
      const unlocked = this.store.state.themes.unlocked.indexOf(theme.id) >= 0;
      const selected = this.store.state.themes.current === theme.id;
      let text = `${theme.name}`;
      let bg = '#1f6feb';

      if (selected) {
        text += '（使用中）';
        bg = '#00a86b';
      } else if (!unlocked) {
        if (theme.unlock.type === 'coins') {
          text += `（${theme.unlock.value}金币解锁）`;
          bg = '#ff7a00';
        } else if (theme.unlock.type === 'ad') {
          text += '（看广告解锁）';
          bg = '#8c52ff';
        }
      } else {
        text += '（点击使用）';
      }

      this.state.uiButtons.push(new Button(bx, top + i * gap, bw, bh, text, () => this.tryUseTheme(theme), { bg, fg: '#fff' }));
    }

    this.state.uiButtons.push(new Button(bx, top + gap * THEMES.length + 12, bw, bh, '返回功能中心', () => this.enterHub(), { bg: '#34495e', fg: '#fff' }));
  }

  tryUseTheme(theme) {
    const save = this.store.state;
    const unlocked = save.themes.unlocked.indexOf(theme.id) >= 0;
    if (unlocked) {
      this.store.patch({ themes: { unlocked: save.themes.unlocked, current: theme.id } });
      this.showMessage(`切换到${theme.name}`);
      this.enterThemes();
      return;
    }

    if (theme.unlock.type === 'coins') {
      if (save.coins < theme.unlock.value) {
        this.showMessage('金币不足');
        return;
      }
      const unlockedNext = save.themes.unlocked.concat([theme.id]);
      this.store.patch({
        coins: save.coins - theme.unlock.value,
        themes: { unlocked: unlockedNext, current: theme.id }
      });
      this.showMessage(`已解锁${theme.name}`);
      this.enterThemes();
      return;
    }

    this.ad.showRewarded().then((ret) => {
      if (!ret || !ret.ok) {
        this.showMessage('广告未完整观看');
        return;
      }
      this.patchStats({ adWatched: 1 });
      this.emitTaskProgress('watch_ad', 1);
      const latest = this.store.state;
      const unlockedNext = latest.themes.unlocked.concat([theme.id]);
      this.store.patch({ themes: { unlocked: unlockedNext, current: theme.id } });
      this.showMessage(`广告完成，已解锁${theme.name}`);
      this.enterThemes();
    });
  }

  enterRank() {
    this.state.scene = 'rank';
    this.state.uiButtons = [];

    const bw = this.w * 0.72;
    const bh = 50;
    const bx = (this.w - bw) / 2;
    this.state.uiButtons.push(
      new Button(bx, this.h * 0.8, bw, bh, '返回功能中心', () => this.enterHub(), { bg: '#34495e', fg: '#fff' })
    );
  }

  enterLocalRecords() {
    this.state.scene = 'async';
    this.state.uiButtons = [];
    const bw = this.w * 0.72;
    const bh = 46;
    const bx = (this.w - bw) / 2;

    this.state.uiButtons.push(
      new Button(bx, this.h * 0.65, bw, bh, '保存上局为挑战记录', () => this.saveLocalRecord(), { bg: '#1f6feb', fg: '#fff' }),
      new Button(bx, this.h * 0.71, bw, bh, '随机处理一条记录', () => this.processLocalRecord(), { bg: '#00a86b', fg: '#fff' }),
      new Button(bx, this.h * 0.77, bw, bh, '返回功能中心', () => this.enterHub(), { bg: '#34495e', fg: '#fff' })
    );
  }

  saveLocalRecord() {
    const ref = this.state.lastResult;
    if (!ref) {
      this.showMessage('先完成一局再保存记录');
      return;
    }
    const challenge = createAsyncChallenge(ref.seed || parseInt(getDailySeedKey(new Date()), 10), ref.score, ref.tag);
    const list = this.store.state.asyncChallenges.slice();
    list.unshift(challenge);
    this.store.patch({ asyncChallenges: list.slice(0, 20) });
    this.showMessage('已保存本地挑战记录');
  }

  processLocalRecord() {
    const list = this.store.state.asyncChallenges.slice();
    const target = list.find((x) => x.status === 'pending');
    if (!target) {
      this.showMessage('暂无待处理记录');
      return;
    }
    const rng = createRng((target.seed ^ 193) >>> 0);
    const myScore = Math.max(0, target.score - 3 + Math.floor(rng() * 8));
    target.status = 'resolved';
    target.replyScore = myScore;
    target.resolvedAt = Date.now();

    let reward = 20;
    if (myScore >= target.score) {
      reward = 60;
      this.showMessage(`处理成功 +${reward}金币`);
    } else {
      this.showMessage(`处理失败 +${reward}安慰金币`);
    }
    this.store.patch({ asyncChallenges: list, coins: this.store.state.coins + reward });
  }

  resetSession() {
    this.ad.hideBanner();
    this.audio.stop('bgm');
    this.state.round = null;
    this.state.cards = [];
    this.state.particles = [];
    this.state.uiButtons = [];
    this.state.timer = 0;
    this.state.timerMax = 2;
    this.state.gameOverReason = '';
    this.state.canRevive = false;
    this.state.message = '';
    this.state.rng = Math.random;
    this.state.recentFail = null;
    this.state.freezeRemaining = 0;
    this.state.shieldActive = false;
    this.state.revived = false;
  }

  startClassic() {
    this.resetSession();
    this.state.mode = 'classic';
    this.state.scene = 'playing';
    this.state.lives = 3;
    this.state.level = 1;
    this.state.levelRound = 0;
    this.state.score = 0;
    this.nextRound();
  }

  startTimed() {
    this.resetSession();
    this.state.mode = 'timed';
    this.state.scene = 'playing';
    this.state.lives = 1;
    this.state.score = 0;
    this.state.challengeElapsed = 0;
    this.state.challengeSpeedStep = 0;
    this.patchStats({ timedPlayed: 1 });
    this.emitTaskProgress('timed_play', 1);
    this.nextRound();
  }

  startDaily() {
    this.resetSession();
    this.state.mode = 'daily';
    this.state.scene = 'playing';
    this.state.lives = 3;
    this.state.level = 1;
    this.state.levelRound = 0;
    this.state.score = 0;
    this.state.dailySeed = getDailySeedKey(new Date());
    this.state.rng = createRng(parseInt(this.state.dailySeed, 10));
    this.nextRound();
  }

  nextRound() {
    let difficulty;
    if (this.state.mode === 'classic') {
      difficulty = getClassicDifficulty(this.state.level);
    } else if (this.state.mode === 'daily') {
      difficulty = getClassicDifficulty(Math.min(15, this.state.level + 4));
      difficulty.roundTime = Math.max(0.95, difficulty.roundTime - 0.25);
    } else if (this.state.mode === 'timed') {
      difficulty = {
        itemCount: 5,
        roundTime: Math.max(0.8, this.state.challengeRoundBase - this.state.challengeSpeedStep),
        allowComposite: true,
        allowReverse: true,
        allowNumberCompare: this.state.score >= 8,
        knowledgeTier: this.state.score >= 20 ? 4 : this.state.score >= 13 ? 3 : this.state.score >= 7 ? 2 : this.state.score >= 3 ? 1 : 0,
        blink: this.state.score >= 10,
        shuffle: this.state.score >= 14
      };
    } else {
      difficulty = getClassicDifficulty(this.state.level);
    }

    const round = buildRound(difficulty, this.state.rng || Math.random);
    this.collectItems(round.items);

    this.state.round = {
      instruction: round.instruction,
      difficulty,
      blink: !!difficulty.blink,
      shuffle: !!difficulty.shuffle,
      shuffleTimer: 0,
      seed: (Math.random() * 1e9) | 0
    };
    if (this.state.mode === 'timed') {
      this.state.timer = 1;
      this.state.timerMax = 1;
    } else {
      this.state.timer = difficulty.roundTime;
      this.state.timerMax = difficulty.roundTime;
    }
    this.state.cards = this.layoutCards(round.items);
  }

  collectItems(items) {
    const save = this.store.state;
    const discovered = save.collection.discoveredIds.slice();
    const byCategory = Object.assign({}, save.collection.byCategory);
    let changed = false;

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (item.collect === false) continue;
      if (discovered.indexOf(item.id) < 0) {
        discovered.push(item.id);
        changed = true;
      }
      const arr = byCategory[item.category] ? byCategory[item.category].slice() : [];
      if (arr.indexOf(item.id) < 0) {
        arr.push(item.id);
        byCategory[item.category] = arr;
        changed = true;
      }
    }

    if (changed) {
      this.store.patch({ collection: { discoveredIds: discovered, byCategory } });
    }
  }

  layoutCards(items) {
    const count = items.length;
    const cols = count <= 4 ? 2 : 3;
    const rows = Math.ceil(count / cols);
    const marginX = this.w * 0.08;
    const top = this.h * 0.38;
    const gap = 12;
    const cw = (this.w - marginX * 2 - gap * (cols - 1)) / cols;
    const ch = Math.min(118, (this.h * 0.52 - gap * (rows - 1)) / rows);

    const cards = [];
    for (let i = 0; i < count; i += 1) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      cards.push({
        item: items[i],
        x: marginX + col * (cw + gap),
        y: top + row * (ch + gap),
        w: cw,
        h: ch,
        flashPhase: Math.random() * Math.PI * 2
      });
    }
    return cards;
  }

  getInGamePropButtons() {
    if (this.state.scene !== 'playing') return [];
    const inv = this.getPropsInventory();
    const defs = [
      { key: 'eliminate', label: `排除(${inv.eliminate || 0})`, color: '#7b5cff' },
      { key: 'freeze', label: `冻结(${inv.freeze || 0})`, color: '#1f9d8b' },
      { key: 'shield', label: `护盾(${inv.shield || 0})`, color: '#ff7a00' },
      { key: 'picky', label: `挑剔(${inv.picky || 0})`, color: '#d94862' }
    ];
    const w = (this.w * 0.84 - 8) / 2;
    const h = 28;
    const x0 = this.w * 0.08;
    const y0 = this.h * 0.285;
    return defs.map((d, i) => ({
      key: d.key,
      label: d.label,
      color: d.color,
      x: x0 + (i % 2) * (w + 8),
      y: y0 + Math.floor(i / 2) * (h + 8),
      w,
      h
    }));
  }

  useProp(key) {
    if (!this.state.round || this.state.scene !== 'playing') return;
    const inv = this.getPropsInventory();
    if ((inv[key] || 0) <= 0) {
      this.showMessage('道具不足');
      return;
    }
    if (key === 'freeze' && this.state.mode !== 'timed') {
      this.showMessage('冻结时间仅限时挑战可用');
      return;
    }

    if (key === 'eliminate') {
      const badCards = this.state.cards.filter((c) => !this.state.round.instruction.shouldClick(c.item) && !c.disabled);
      if (!badCards.length) {
        this.showMessage('没有可排除选项');
        return;
      }
      const target = badCards[Math.floor(Math.random() * badCards.length)];
      target.disabled = true;
      this.patchProps({ eliminate: -1 });
      this.showMessage('已排除一个错误选项');
      return;
    }

    if (key === 'freeze') {
      this.state.freezeRemaining = Math.max(this.state.freezeRemaining, 3);
      this.patchProps({ freeze: -1 });
      this.showMessage('时间冻结3秒');
      return;
    }

    if (key === 'shield') {
      this.state.shieldActive = true;
      this.patchProps({ shield: -1 });
      this.showMessage('护盾已激活');
      return;
    }

    this.patchProps({ picky: -1 });
    this.showMessage('已跳过本题');
    this.nextRound();
  }

  pickCard(card) {
    if (!this.state.round) return;
    if (card.disabled) {
      this.showMessage('该选项已被排除');
      return;
    }
    const ok = this.state.round.instruction.shouldClick(card.item);

    if (ok) {
      this.audio.play('ok');
      this.state.score += 1;
      this.spawnParticles(card.x + card.w / 2, card.y + card.h / 2, '#29d17d');
      this.progressOnCorrect();
      return;
    }

    this.state.recentFail = {
      instruction: this.state.round.instruction.text,
      pick: `${card.item.label}(${card.item.category})`
    };
    if (this.state.shieldActive) {
      this.state.shieldActive = false;
      this.audio.play('ok');
      this.showMessage('护盾生效，已免疫本次失误');
      this.nextRound();
      return;
    }
    this.audio.play('bad');
    this.handleFail('点错了');
  }

  progressOnCorrect() {
    if (this.state.mode === 'classic' || this.state.mode === 'daily') {
      this.state.levelRound += 1;
      if (this.state.levelRound >= 5) {
        this.state.levelRound = 0;
        this.state.level += 1;

        if (this.state.mode === 'classic') {
          let reward = 10;
          const day = new Date().getDay();
          if (day === 0 || day === 6) {
            reward *= 2;
          }
          const save = this.store.state;
          this.store.patch({
            coins: save.coins + reward,
            highestLevel: Math.max(save.highestLevel, this.state.level)
          });
          this.patchStats({ classicLevelWin: 1 });
          this.emitTaskProgress('classic_level', 1);
          this.showMessage(`通关+${reward}金币`);
          this.audio.play('levelUp');

          if ((this.state.level - 1) % 3 === 0) {
            const adRet = this.ad.showInterstitial(Date.now());
            if (adRet.shown) {
              this.showMessage('插屏广告展示（模拟）');
            }
          }
        }

        if (this.state.mode === 'daily' && this.state.level > 2) {
          this.finishGame('完成每日挑战');
          return;
        }
        if (this.state.mode === 'classic' && this.state.level > 20) {
          this.finishGame('20关全部通关');
          return;
        }
      }
    } else if (this.state.mode === 'timed') {
      if (this.state.score > 0 && this.state.score % 10 === 0) {
        this.state.challengeSpeedStep += 0.1;
        this.showMessage('节奏加快');
      }
    }

    this.nextRound();
  }

  handleFail(reason) {
    this.state.lives -= 1;
    this.spawnScreenFlash('#ff4d4f');
    if (this.state.mode === 'timed') {
      this.offerReviveOrFinish(reason || '挑战结束');
      return;
    }
    if (this.state.lives <= 0) {
      this.offerReviveOrFinish(reason || '失败');
      return;
    }
    if (reason === '超时') {
      this.audio.play('timeout');
    } else {
      this.audio.play('bad');
    }
    this.showMessage(`${reason}，剩余${this.state.lives}次机会`);
    this.nextRound();
  }

  offerReviveOrFinish(reason) {
    if (this.state.revived) {
      this.state.canRevive = false;
      this.finishGame(reason);
      return;
    }

    if (typeof wx !== 'undefined' && wx.showModal) {
      wx.showModal({
        title: '复活机会',
        content: '是否观看广告复活继续挑战？',
        confirmText: '看广告复活',
        cancelText: '放弃',
        success: (res) => {
          if (res && res.confirm) {
            this.reviveWithAd(reason);
          } else {
            this.state.canRevive = false;
            this.finishGame(reason);
          }
        },
        fail: () => {
          this.state.canRevive = true;
          this.finishGame(reason);
        }
      });
      return;
    }

    this.state.canRevive = true;
    this.finishGame(reason);
  }

  reviveWithAd(fallbackReason) {
    this.ad.showRewarded().then((ret) => {
      if (!ret || !ret.ok) {
        this.showMessage('广告未完整观看');
        this.state.canRevive = false;
        this.finishGame(fallbackReason || '失败');
        return;
      }
      this.patchStats({ adWatched: 1 });
      this.emitTaskProgress('watch_ad', 1);
      this.state.revived = true;
      this.state.canRevive = false;
      this.state.scene = 'playing';
      this.state.lives = Math.max(1, this.state.lives);
      this.showMessage('复活成功');
      this.nextRound();
    });
  }

  finishGame(reason) {
    this.audio.play('gameOver');
    const save = this.store.state;
    const seed = this.state.dailySeed ? parseInt(this.state.dailySeed, 10) : ((Math.random() * 1e9) | 0);
    const tag = pickTag(this.state.score);
    this.state.lastResult = { mode: this.state.mode, score: this.state.score, seed, tag };

    if (this.state.mode === 'timed') {
      const best = Math.max(save.timedBest, this.state.score);
      const board = save.timedLeaderboard.slice();
      board.push({ score: this.state.score, ts: now() });
      board.sort((a, b) => b.score - a.score || b.ts - a.ts);
      const reward = this.state.score;
      this.store.patch({
        timedBest: best,
        timedLeaderboard: board.slice(0, 20),
        coins: save.coins + reward
      });
      reason = `${reason}，获得${reward}金币`;
    }

    if (this.state.mode === 'daily') {
      const dailyBest = Object.assign({}, save.dailyBest);
      dailyBest[this.state.dailySeed] = Math.max(dailyBest[this.state.dailySeed] || 0, this.state.score);
      this.store.patch({ dailyBest });
    }

    this.state.scene = 'gameover';
    this.state.gameOverReason = reason;
    this.state.uiButtons = [];

    const bw = this.w * 0.68;
    const bh = 48;
    const bx = (this.w - bw) / 2;
    const base = this.h * 0.54;

    if (this.state.canRevive) {
      this.state.uiButtons.push(new Button(bx, base - 58, bw, bh, '看广告复活', () => this.reviveWithAd(this.state.gameOverReason || '失败'), { bg: '#7b5cff', fg: '#fff' }));
    }

    this.state.uiButtons.push(
      new Button(bx, base, bw, bh, '再来一局', () => this.retryCurrentMode(), { bg: '#0077ff', fg: '#fff' }),
      new Button(bx, base + 58, bw, bh, '分享战绩', () => this.shareResult(), { bg: '#ff7a00', fg: '#fff' }),
      new Button(bx, base + 116, bw, bh, '生成表情包文案', () => this.makeSticker(), { bg: '#00a86b', fg: '#fff' }),
      new Button(bx, base + 174, bw, bh, '返回主页', () => this.enterHome(), { bg: '#34495e', fg: '#fff' })
    );
  }

  retryCurrentMode() {
    if (this.state.mode === 'classic') return this.startClassic();
    if (this.state.mode === 'timed') return this.startTimed();
    return this.startDaily();
  }

  shareResult() {
    const title = `我在《别点我》拿到${this.state.score}分，标签：${pickTag(this.state.score)}，你敢挑战吗？`;
    this.emitTaskProgress('share', 1);
    this.patchStats({ shared: 1 });

    if (typeof wx !== 'undefined' && wx.shareAppMessage) {
      wx.shareAppMessage({ title });
      this.showMessage('已触发分享');
    } else {
      this.showMessage(title);
    }
  }

  makeSticker() {
    const fail = this.state.recentFail;
    const sticker = fail
      ? `指令:${fail.instruction}，结果点了${fail.pick}。${pickTag(this.state.score)}`
      : `本局${this.state.score}分，${pickTag(this.state.score)}。你敢挑战吗？`;

    const stickers = this.store.state.stickers.slice();
    stickers.unshift({ text: sticker, ts: Date.now() });
    this.store.patch({ stickers: stickers.slice(0, 20) });
    this.state.latestSticker = sticker;
    this.showMessage('已生成并保存表情包文案');
  }

  spawnParticles(x, y, color) {
    for (let i = 0; i < 14; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = 50 + Math.random() * 140;
      this.state.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.42 + Math.random() * 0.25,
        color
      });
    }
  }

  spawnScreenFlash(color) {
    this.state.particles.push({ flash: true, color, life: 0.11 });
  }

  showMessage(text) {
    this.state.message = text;
    this.state.messageUntil = now() + 1300;
  }

  update(dt) {
    if (this.state.scene === 'playing') {
      if (this.state.mode === 'timed') {
        if (this.state.freezeRemaining > 0) {
          this.state.freezeRemaining = Math.max(0, this.state.freezeRemaining - dt);
        } else {
          this.state.challengeElapsed += dt;
        }
        if (this.state.challengeElapsed >= this.state.challengeTotal) {
          this.finishGame('时间到');
          return;
        }
      } else {
        this.state.timer -= dt;
      }
      if (this.state.mode !== 'timed' && this.state.timer <= 0) {
        this.handleFail('超时');
        return;
      }

      if (this.state.round && this.state.round.shuffle) {
        this.state.round.shuffleTimer += dt;
        if (this.state.round.shuffleTimer >= 0.55) {
          this.state.round.shuffleTimer = 0;
          const disabledMap = {};
          for (let i = 0; i < this.state.cards.length; i += 1) {
            if (this.state.cards[i].disabled) {
              disabledMap[this.state.cards[i].item.id] = true;
            }
          }
          const items = this.state.cards.map((c) => c.item);
          this.state.cards = this.layoutCards(shuffle(items, this.state.rng || Math.random));
          for (let i = 0; i < this.state.cards.length; i += 1) {
            this.state.cards[i].disabled = !!disabledMap[this.state.cards[i].item.id];
          }
        }
      }
    }

    const next = [];
    for (let i = 0; i < this.state.particles.length; i += 1) {
      const p = this.state.particles[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      if (!p.flash) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 230 * dt;
      }
      next.push(p);
    }
    this.state.particles = next;

    if (this.state.message && now() > this.state.messageUntil) {
      this.state.message = '';
    }
  }

  drawBackground() {
    const theme = getThemeById(this.store.state.themes.current);
    const ctx = this.ctx;
    const bgImg = this.assets.getImage('bg');
    if (bgImg) {
      ctx.drawImage(bgImg, 0, 0, this.w, this.h);
      return;
    }
    const g = ctx.createLinearGradient(0, 0, this.w, this.h);
    g.addColorStop(0, theme.bg[0]);
    g.addColorStop(0.5, theme.bg[1]);
    g.addColorStop(1, theme.bg[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);

    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.arc(this.w * 0.12, this.h * 0.14, 56, 0, Math.PI * 2);
    ctx.arc(this.w * 0.88, this.h * 0.08, 74, 0, Math.PI * 2);
    ctx.arc(this.w * 0.84, this.h * 0.82, 96, 0, Math.PI * 2);
    ctx.fill();
  }

  drawTopBar() {
    const save = this.store.state;
    const ctx = this.ctx;
    ctx.fillStyle = '#1d2540';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    const coin = this.assets.getImage('coin');
    if (coin) {
      ctx.drawImage(coin, 12, 8, 24, 24);
      ctx.fillText(`金币 ${save.coins}`, 42, 28);
    } else {
      ctx.fillText(`金币 ${save.coins}`, 14, 28);
    }

    ctx.textAlign = 'right';
    ctx.fillText(`主题 ${getThemeById(save.themes.current).name}`, this.w - 14, 28);
  }

  drawHomeText() {
    const save = this.store.state;
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1f2435';
    ctx.font = 'bold 46px sans-serif';
    ctx.fillText('别点我', this.w / 2, this.h * 0.16);
    ctx.font = '16px sans-serif';
    ctx.fillText(`最高关卡 ${save.highestLevel} | 限时最高 ${save.timedBest}`, this.w / 2, this.h * 0.22);
  }

  drawPlayingHud() {
    const ctx = this.ctx;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1d2540';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`机会 ${this.state.lives}`, 14, 54);

    if (this.state.mode === 'timed') {
      const remain = clamp(this.state.challengeTotal - this.state.challengeElapsed, 0, this.state.challengeTotal);
      ctx.textAlign = 'center';
      ctx.fillText(`剩余 ${remain.toFixed(1)} 秒`, this.w / 2, 54);
    } else {
      ctx.textAlign = 'center';
      ctx.fillText(`第${this.state.level}关 ${this.state.levelRound + 1}/5`, this.w / 2, 54);
    }

    ctx.textAlign = 'right';
    ctx.fillText(`分数 ${this.state.score}`, this.w - 14, 54);

    const barX = this.w * 0.08;
    const barY = this.h * 0.15;
    const barW = this.w * 0.84;
    const barH = 13;
    let ratio = clamp(this.state.timer / this.state.timerMax, 0, 1);
    if (this.state.mode === 'timed') {
      ratio = clamp((this.state.challengeTotal - this.state.challengeElapsed) / this.state.challengeTotal, 0, 1);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = ratio > 0.35 ? '#19be6b' : '#ff4d4f';
    ctx.fillRect(barX, barY, barW * ratio, barH);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#20253d';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(this.state.round ? this.state.round.instruction.text : '', this.w / 2, this.h * 0.24);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#3a4664';
    ctx.fillText('规则：点不符合条件的项', this.w / 2, this.h * 0.275);
    if (this.state.mode === 'timed' && this.state.freezeRemaining > 0) {
      ctx.fillStyle = '#1f9d8b';
      ctx.fillText(`冻结中 ${this.state.freezeRemaining.toFixed(1)}s`, this.w / 2, this.h * 0.292);
    }

    const propButtons = this.getInGamePropButtons();
    for (let i = 0; i < propButtons.length; i += 1) {
      const b = propButtons[i];
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = '#fff';
      ctx.font = '13px sans-serif';
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
    }
  }

  drawCards(elapsedSeconds) {
    if (this.state.scene !== 'playing') return;
    const theme = getThemeById(this.store.state.themes.current);
    const ctx = this.ctx;
    const cardSkin = this.assets.getImage('card');

    for (let i = 0; i < this.state.cards.length; i += 1) {
      const c = this.state.cards[i];
      let alpha = 1;
      if (this.state.round && this.state.round.blink) {
        alpha = 0.55 + 0.45 * Math.abs(Math.sin(elapsedSeconds * 6 + c.flashPhase));
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      if (cardSkin) {
        ctx.drawImage(cardSkin, c.x, c.y, c.w, c.h);
      } else {
        ctx.fillStyle = theme.cardBg;
        ctx.strokeStyle = theme.cardStroke;
        ctx.lineWidth = 2;
        const r = 12;
        ctx.beginPath();
        ctx.moveTo(c.x + r, c.y);
        ctx.arcTo(c.x + c.w, c.y, c.x + c.w, c.y + c.h, r);
        ctx.arcTo(c.x + c.w, c.y + c.h, c.x, c.y + c.h, r);
        ctx.arcTo(c.x, c.y + c.h, c.x, c.y, r);
        ctx.arcTo(c.x, c.y, c.x + c.w, c.y, r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = '#111';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.item.label, c.x + c.w / 2, c.y + c.h * 0.4);

      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#566';
      ctx.fillText(`${c.item.category}·${c.item.color}`, c.x + c.w / 2, c.y + c.h * 0.73);

      if (c.disabled) {
        ctx.fillStyle = 'rgba(20,20,20,0.5)';
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('已排除', c.x + c.w / 2, c.y + c.h * 0.5);
      }
      ctx.restore();
    }
  }

  drawHubText() {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1f2435';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('功能中心', this.w / 2, this.h * 0.13);
    ctx.font = '15px sans-serif';
    ctx.fillText('任务 / 图鉴 / 主题 / 排行 / 道具 / 本地挑战记录', this.w / 2, this.h * 0.18);
  }

  drawPropsText() {
    const ctx = this.ctx;
    const inv = this.getPropsInventory();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1f2435';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText('道具工坊', this.w / 2, this.h * 0.14);
    ctx.font = '15px sans-serif';
    ctx.fillText('看激励广告兑换道具，进入对局后可点击使用', this.w / 2, this.h * 0.19);
    ctx.fillText(`库存：排除${inv.eliminate} 冻结${inv.freeze} 护盾${inv.shield} 挑剔${inv.picky}`, this.w / 2, this.h * 0.23);
  }

  drawTasksText() {
    const ctx = this.ctx;
    const daily = this.store.state.dailyTasks;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1f2435';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('每日任务', this.w / 2, this.h * 0.14);

    for (let i = 0; i < DAILY_TASK_DEFS.length; i += 1) {
      const def = DAILY_TASK_DEFS[i];
      const task = daily.tasks[def.id] || { progress: 0, claimed: false };
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#2c3e50';
      ctx.fillText(`${def.text} (${task.progress}/${def.target})`, this.w / 2, this.h * 0.21 + i * 54);
    }
  }

  drawCollectionText() {
    const save = this.store.state;
    const ctx = this.ctx;
    const found = save.collection.discoveredIds.length;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#1f2435';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('图鉴系统', this.w / 2, this.h * 0.16);
    ctx.font = '18px sans-serif';
    ctx.fillText(`已发现 ${found}/${ITEM_POOL.length}`, this.w / 2, this.h * 0.22);

    const categories = Object.keys(save.collection.byCategory).sort();
    ctx.font = '15px sans-serif';
    for (let i = 0; i < Math.min(8, categories.length); i += 1) {
      const c = categories[i];
      const len = save.collection.byCategory[c].length;
      ctx.fillText(`${c}: ${len}`, this.w / 2, this.h * 0.3 + i * 24);
    }
  }

  drawThemesText() {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1f2435';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('主题包', this.w / 2, this.h * 0.14);
    ctx.font = '15px sans-serif';
    ctx.fillText('可用金币或广告解锁并切换主题', this.w / 2, this.h * 0.19);
  }

  drawRankText() {
    const ctx = this.ctx;
    const local = this.store.state.timedLeaderboard.slice(0, 10);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1f2435';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('本地排行榜', this.w / 2, this.h * 0.14);

    ctx.font = '16px sans-serif';
    ctx.fillText('本机限时榜 TOP10', this.w / 2, this.h * 0.2);
    for (let i = 0; i < local.length; i += 1) {
      ctx.fillText(`${i + 1}. ${local[i].score}分`, this.w / 2, this.h * 0.24 + i * 22);
    }
  }

  drawAsyncText() {
    const ctx = this.ctx;
    const list = this.store.state.asyncChallenges;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1f2435';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText('本地挑战记录', this.w / 2, this.h * 0.14);
    ctx.font = '15px sans-serif';

    for (let i = 0; i < Math.min(6, list.length); i += 1) {
      const row = list[i];
      const status = row.status === 'pending' ? '待处理' : `已处理 ${row.replyScore}/${row.score}`;
      ctx.fillText(`${i + 1}. ${row.score}分 ${status}`, this.w / 2, this.h * 0.24 + i * 24);
    }
  }

  drawPrivacyText() {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1f2435';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText('隐私说明', this.w / 2, this.h * 0.12);
    ctx.font = '14px sans-serif';
    const lines = [
      '1. 游戏数据保存在本地缓存：金币、分数、道具、进度等。',
      '2. 本版本不接入账号系统，不采集通讯录/相册/麦克风/摄像头。',
      '3. 接入微信广告（Banner/插屏/激励视频）用于变现。',
      '4. 激励广告仅在完整观看后发放对应奖励。',
      '5. 清理缓存、卸载或更换设备后，本地数据可能丢失。',
      '6. 详细内容请查看项目根目录 PRIVACY.md。'
    ];
    for (let i = 0; i < lines.length; i += 1) {
      ctx.fillText(lines[i], this.w / 2, this.h * 0.22 + i * 34);
    }
  }

  drawGameOverText() {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1f2435';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText('结算', this.w / 2, this.h * 0.18);
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(this.state.gameOverReason, this.w / 2, this.h * 0.24);
    ctx.font = '20px sans-serif';
    ctx.fillText(`本局得分 ${this.state.score}`, this.w / 2, this.h * 0.29);
    ctx.font = '16px sans-serif';
    ctx.fillText(`称号：${pickTag(this.state.score)}`, this.w / 2, this.h * 0.33);

    if (this.state.latestSticker) {
      ctx.font = '14px sans-serif';
      ctx.fillText(this.state.latestSticker.slice(0, 36), this.w / 2, this.h * 0.42);
    }
  }

  drawParticles() {
    const ctx = this.ctx;
    for (let i = 0; i < this.state.particles.length; i += 1) {
      const p = this.state.particles[i];
      if (p.flash) {
        ctx.save();
        ctx.globalAlpha = clamp(p.life / 0.11, 0, 1) * 0.33;
        ctx.fillStyle = p.color;
        ctx.fillRect(0, 0, this.w, this.h);
        ctx.restore();
        continue;
      }
      ctx.save();
      ctx.globalAlpha = clamp(p.life, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3 + p.life * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawButtons() {
    const btnSkin = this.assets.getImage('button');
    for (let i = 0; i < this.state.uiButtons.length; i += 1) {
      this.state.uiButtons[i].draw(this.ctx, btnSkin);
    }
  }

  drawMessage() {
    if (!this.state.message) return;
    const ctx = this.ctx;
    const w = this.w * 0.78;
    const h = 38;
    const x = (this.w - w) / 2;
    const y = this.h * 0.1;
    ctx.save();
    ctx.fillStyle = 'rgba(20,20,20,0.8)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.state.message, this.w / 2, y + h / 2);
    ctx.restore();
  }

  render(elapsedSeconds) {
    this.drawBackground();
    this.drawTopBar();

    if (this.state.scene === 'home') this.drawHomeText();
    if (this.state.scene === 'hub') this.drawHubText();
    if (this.state.scene === 'tasks') this.drawTasksText();
    if (this.state.scene === 'collection') this.drawCollectionText();
    if (this.state.scene === 'themes') this.drawThemesText();
    if (this.state.scene === 'rank') this.drawRankText();
    if (this.state.scene === 'props') this.drawPropsText();
    if (this.state.scene === 'async') this.drawAsyncText();
    if (this.state.scene === 'privacy') this.drawPrivacyText();

    if (this.state.scene === 'playing') {
      this.drawPlayingHud();
      this.drawCards(elapsedSeconds);
    }
    if (this.state.scene === 'gameover') {
      this.drawGameOverText();
    }

    this.drawButtons();
    this.drawParticles();
    this.drawMessage();
  }

  loop() {
    const raf = (typeof wx !== 'undefined' && wx.requestAnimationFrame)
      ? wx.requestAnimationFrame
      : (cb) => setTimeout(() => cb(now()), 16);

    const tick = (ts) => {
      const t = typeof ts === 'number' ? ts : now();
      const dt = clamp((t - this.lastTs) / 1000, 0, 0.05);
      this.lastTs = t;
      this.update(dt);
      this.render(t / 1000);
      raf(tick);
    };

    raf((ts) => {
      this.lastTs = typeof ts === 'number' ? ts : now();
      tick(this.lastTs);
    });
  }
}

module.exports = {
  GameApp
};
