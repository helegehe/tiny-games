const { ITEM_POOL, COLORS, CATEGORIES } = require('./data');

function createRng(seed) {
  let s = seed >>> 0;
  return function next() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffle(arr, rng) {
  const cp = arr.slice();
  for (let i = cp.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const t = cp[i];
    cp[i] = cp[j];
    cp[j] = t;
  }
  return cp;
}

function buildInstruction(difficulty, rng) {
  const types = ['forbidCategory', 'forbidColor'];
  if (difficulty.allowComposite) types.push('forbidColorCategory');
  if (difficulty.allowReverse) {
    types.push('clickNotCategory');
    types.push('exceptColor');
  }
  if (difficulty.allowNumberCompare) types.push('forbidGreaterThan');

  const type = pick(types, rng);
  if (type === 'forbidCategory') {
    const category = pick(CATEGORIES, rng);
    return {
      text: `不要点${category}`,
      shouldClick: (item) => item.category !== category
    };
  }
  if (type === 'forbidColor') {
    const color = pick(COLORS, rng);
    return {
      text: `不要点${color}`,
      shouldClick: (item) => item.color !== color
    };
  }
  if (type === 'forbidColorCategory') {
    const color = pick(COLORS, rng);
    const category = pick(CATEGORIES, rng);
    return {
      text: `不要点${color}的${category}`,
      shouldClick: (item) => !(item.color === color && item.category === category)
    };
  }
  if (type === 'clickNotCategory') {
    const category = pick(CATEGORIES, rng);
    return {
      text: `点不是${category}的`,
      shouldClick: (item) => item.category !== category
    };
  }
  if (type === 'exceptColor') {
    const color = pick(COLORS, rng);
    return {
      text: `除了${color}都可以点`,
      shouldClick: (item) => item.color !== color
    };
  }
  const threshold = 3 + Math.floor(rng() * 4);
  return {
    text: `不要点比${threshold}大的数字`,
    shouldClick: (item) => !(item.category === '数字' && typeof item.value === 'number' && item.value > threshold)
  };
}

function buildRound(difficulty, rng) {
  for (let attempts = 0; attempts < 60; attempts += 1) {
    const instruction = buildInstruction(difficulty, rng);
    const shuffled = shuffle(ITEM_POOL, rng);
    const candidates = shuffled.slice(0, difficulty.itemCount);
    const ok = candidates.filter((item) => instruction.shouldClick(item));
    const bad = candidates.filter((item) => !instruction.shouldClick(item));
    if (ok.length >= 1 && bad.length >= 1) {
      return {
        instruction,
        items: candidates
      };
    }
  }
  const fallback = shuffle(ITEM_POOL, rng).slice(0, difficulty.itemCount);
  return {
    instruction: {
      text: '不要点水果',
      shouldClick: (item) => item.category !== '水果'
    },
    items: fallback
  };
}

module.exports = {
  createRng,
  pick,
  shuffle,
  buildInstruction,
  buildRound
};
