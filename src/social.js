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

module.exports = {
  createAsyncChallenge
};
