const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const mode = event.mode || 'timed';
  const ret = await db.collection('scores')
    .where({ mode })
    .orderBy('score', 'desc')
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();

  const list = (ret.data || []).map((row) => ({
    nick: row.nick || '微信玩家',
    score: row.score || 0
  }));

  return { list };
};
