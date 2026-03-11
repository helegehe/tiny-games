const SAVE_KEY = 'bie_dian_wo_save_v2';

function getStorage() {
  if (typeof wx !== 'undefined' && wx.getStorageSync) {
    return {
      get: (key) => wx.getStorageSync(key),
      set: (key, value) => wx.setStorageSync(key, value)
    };
  }
  if (typeof localStorage !== 'undefined') {
    return {
      get: (key) => {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        try {
          return JSON.parse(raw);
        } catch (e) {
          return null;
        }
      },
      set: (key, value) => localStorage.setItem(key, JSON.stringify(value))
    };
  }
  const mem = {};
  return {
    get: (key) => mem[key] || null,
    set: (key, value) => {
      mem[key] = value;
    }
  };
}

function mergeState(base, extra) {
  if (!extra || typeof extra !== 'object') return base;
  const next = Object.assign({}, base, extra);
  next.signIn = Object.assign({}, base.signIn, extra.signIn || {});
  next.dailyTasks = Object.assign({}, base.dailyTasks, extra.dailyTasks || {});
  next.dailyTasks.tasks = Object.assign({}, base.dailyTasks.tasks, (extra.dailyTasks && extra.dailyTasks.tasks) || {});
  next.props = Object.assign({}, base.props, extra.props || {});
  next.stats = Object.assign({}, base.stats, extra.stats || {});
  return next;
}

class SaveStore {
  constructor() {
    this.storage = getStorage();
    this.state = this.load();
  }

  defaultState() {
    return {
      coins: 100,
      highestLevel: 1,
      timedBest: 0,
      dailyBest: {},
      signIn: {
        streak: 0,
        lastDate: ''
      },
      timedLeaderboard: [],
      collection: {
        discoveredIds: [],
        byCategory: {}
      },
      themes: {
        unlocked: ['default'],
        current: 'default'
      },
      dailyTasks: {
        date: '',
        tasks: {}
      },
      asyncChallenges: [],
      stickers: [],
      props: {
        eliminate: 0,
        freeze: 0,
        shield: 0,
        picky: 0
      },
      stats: {
        classicLevelWin: 0,
        timedPlayed: 0,
        shared: 0,
        adWatched: 0
      }
    };
  }

  load() {
    const stored = this.storage.get(SAVE_KEY);
    const merged = mergeState(this.defaultState(), stored);
    return merged;
  }

  save() {
    this.storage.set(SAVE_KEY, this.state);
  }

  patch(partial) {
    this.state = mergeState(this.state, partial);
    this.save();
    return this.state;
  }
}

module.exports = {
  SaveStore
};
