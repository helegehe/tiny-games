const { ITEM_POOL, COLORS, CATEGORIES, KNOWLEDGE_QUESTIONS } = require('./data');
const SHAPES = Array.from(new Set(ITEM_POOL.map((item) => item.shape)));

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
  const types = ['category', 'color', 'shape'];
  if (difficulty.allowComposite) {
    types.push('colorCategory');
    types.push('colorShape');
    types.push('categoryShape');
  }
  if (difficulty.allowReverse) {
    types.push('categoryOrColor');
  }
  if (difficulty.allowNumberCompare) {
    types.push('numberGreaterThan');
    types.push('numberLessOrEqual');
  }

  const type = pick(types, rng);
  if (type === 'category') {
    const category = pick(CATEGORIES, rng);
    return {
      text: `${category}`,
      shouldClick: (item) => item.category !== category
    };
  }
  if (type === 'color') {
    const color = pick(COLORS, rng);
    return {
      text: `${color}`,
      shouldClick: (item) => item.color !== color
    };
  }
  if (type === 'shape') {
    const shape = pick(SHAPES, rng);
    return {
      text: `${shape}`,
      shouldClick: (item) => item.shape !== shape
    };
  }
  if (type === 'colorCategory') {
    const color = pick(COLORS, rng);
    const category = pick(CATEGORIES, rng);
    return {
      text: `${color}的${category}`,
      shouldClick: (item) => !(item.color === color && item.category === category)
    };
  }
  if (type === 'colorShape') {
    const color = pick(COLORS, rng);
    const shape = pick(SHAPES, rng);
    return {
      text: `${color}且${shape}`,
      shouldClick: (item) => !(item.color === color && item.shape === shape)
    };
  }
  if (type === 'categoryShape') {
    const category = pick(CATEGORIES, rng);
    const shape = pick(SHAPES, rng);
    return {
      text: `${category}且${shape}`,
      shouldClick: (item) => !(item.category === category && item.shape === shape)
    };
  }
  if (type === 'categoryOrColor') {
    const color = pick(COLORS, rng);
    const category = pick(CATEGORIES, rng);
    return {
      text: `${category}或${color}`,
      shouldClick: (item) => !(item.category === category || item.color === color)
    };
  }
  const threshold = 3 + Math.floor(rng() * 4);
  if (type === 'numberGreaterThan') {
    return {
      text: `大于${threshold}的数字`,
      shouldClick: (item) => !(item.category === '数字' && typeof item.value === 'number' && item.value > threshold)
    };
  }
  return {
    text: `小于等于${threshold}的数字`,
    shouldClick: (item) => !(item.category === '数字' && typeof item.value === 'number' && item.value <= threshold)
  };
}

function buildKnowledgeRound(difficulty, rng) {
  const tier = difficulty.knowledgeTier || 0;
  if (!tier) return null;

  const chance = Math.min(0.6, 0.18 + tier * 0.1);
  if (rng() > chance) return null;

  const bank = KNOWLEDGE_QUESTIONS.filter((q) => {
    if (q.tier > tier) return false;
    const reverseSelectableCount = q.options.length - q.correctKeys.length;
    return reverseSelectableCount >= 1 && reverseSelectableCount <= 2;
  });
  if (!bank.length) return null;

  const quiz = pick(bank, rng);
  const correctSet = {};
  quiz.correctKeys.forEach((k) => {
    correctSet[k] = true;
  });

  const items = shuffle(quiz.options, rng).map((opt) => ({
    id: `${quiz.id}_${opt.key}`,
    label: opt.text,
    category: quiz.topic,
    color: '知识',
    shape: '文本',
    collect: false,
    quizKey: opt.key
  }));

  const okCount = quiz.correctKeys.length;
  if (okCount < 1 || okCount > 2) return null;

  return {
    instruction: {
      text: `${quiz.text.replace(/^点击/, '')}`,
      shouldClick: (item) => !correctSet[item.quizKey]
    },
    items
  };
}

function buildRound(difficulty, rng) {
  const knowledgeRound = buildKnowledgeRound(difficulty, rng);
  if (knowledgeRound) return knowledgeRound;

  for (let attempts = 0; attempts < 120; attempts += 1) {
    const instruction = buildInstruction(difficulty, rng);
    const shuffled = shuffle(ITEM_POOL, rng);
    const candidates = shuffled.slice(0, difficulty.itemCount);
    const ok = candidates.filter((item) => instruction.shouldClick(item));
    const bad = candidates.filter((item) => !instruction.shouldClick(item));
    if (ok.length >= 1 && ok.length <= 2 && bad.length >= 1) {
      return {
        instruction,
        items: candidates
      };
    }
  }
  const fallback = shuffle(ITEM_POOL, rng).slice(0, difficulty.itemCount);
  const target = fallback[0];
  return {
    instruction: {
      text: `不是${target.label}`,
      shouldClick: (item) => item.id === target.id
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
