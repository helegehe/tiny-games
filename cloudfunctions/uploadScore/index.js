const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const mode = event.mode || 'timed';
  const score = Number(event.score || 0);
  const openid = wxContext.OPENID;

  await db.collection('scores').add({
    data: {
      openid,
      mode,
      score,
      nick: '微信玩家',
      createdAt: Date.now()
    }
  });

  return { ok: true };
};
