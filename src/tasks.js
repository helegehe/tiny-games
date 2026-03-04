const { DAILY_TASK_DEFS } = require('./data');

function getDateText(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function createTaskState() {
  const tasks = {};
  for (let i = 0; i < DAILY_TASK_DEFS.length; i += 1) {
    tasks[DAILY_TASK_DEFS[i].id] = { progress: 0, claimed: false };
  }
  return tasks;
}

function ensureDailyTasks(meta, date) {
  const today = getDateText(date);
  if (!meta || meta.date !== today) {
    return {
      date: today,
      tasks: createTaskState()
    };
  }
  return meta;
}

function incrementTask(meta, type, value) {
  const next = {
    date: meta.date,
    tasks: Object.assign({}, meta.tasks)
  };
  for (let i = 0; i < DAILY_TASK_DEFS.length; i += 1) {
    const def = DAILY_TASK_DEFS[i];
    if (def.type !== type) continue;
    const cur = Object.assign({ progress: 0, claimed: false }, next.tasks[def.id]);
    cur.progress += value;
    next.tasks[def.id] = cur;
  }
  return next;
}

function claimTask(meta, taskId) {
  const def = DAILY_TASK_DEFS.find((x) => x.id === taskId);
  if (!def) return { ok: false, reward: 0 };
  const task = meta.tasks[taskId] || { progress: 0, claimed: false };
  if (task.claimed || task.progress < def.target) {
    return { ok: false, reward: 0 };
  }
  const next = {
    date: meta.date,
    tasks: Object.assign({}, meta.tasks)
  };
  next.tasks[taskId] = { progress: task.progress, claimed: true };
  return { ok: true, reward: def.reward, meta: next };
}

module.exports = {
  getDateText,
  ensureDailyTasks,
  incrementTask,
  claimTask
};
