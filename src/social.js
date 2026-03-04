const { createRng } = require('./logic');

function createAsyncChallenge(seed, score, tag) {
  return {
    id: `ac_${Date.now()}`,
    seed,
    score,
    tag,
    createdAt: Date.now(),
    status: 'pending'
  };
}

function simulateOpponent(roundSeed, level) {
  const rng = createRng((roundSeed ^ (level * 9301)) >>> 0);
  const accuracy = Math.max(0.45, 0.78 - level * 0.015 + rng() * 0.2);
  return {
    reaction: 0.38 + rng() * 0.9,
    correct: rng() < accuracy
  };
}

module.exports = {
  createAsyncChallenge,
  simulateOpponent
};
