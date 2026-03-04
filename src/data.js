const ITEM_POOL = [
  { id: 'apple', label: '苹果', category: '水果', color: '红色', shape: '圆形' },
  { id: 'banana', label: '香蕉', category: '水果', color: '黄色', shape: '弯形' },
  { id: 'grape', label: '葡萄', category: '水果', color: '紫色', shape: '圆形' },
  { id: 'pear', label: '梨', category: '水果', color: '绿色', shape: '圆形' },
  { id: 'strawberry', label: '草莓', category: '水果', color: '红色', shape: '心形' },
  { id: 'cat', label: '猫', category: '动物', color: '白色', shape: '不规则' },
  { id: 'dog', label: '狗', category: '动物', color: '黄色', shape: '不规则' },
  { id: 'bird', label: '鸟', category: '动物', color: '蓝色', shape: '不规则' },
  { id: 'fish', label: '鱼', category: '动物', color: '橙色', shape: '不规则' },
  { id: 'panda', label: '熊猫', category: '动物', color: '黑白', shape: '圆形' },
  { id: 'car', label: '汽车', category: '交通工具', color: '蓝色', shape: '方形' },
  { id: 'bus', label: '公交', category: '交通工具', color: '黄色', shape: '方形' },
  { id: 'bike', label: '自行车', category: '交通工具', color: '绿色', shape: '不规则' },
  { id: 'train', label: '火车', category: '交通工具', color: '红色', shape: '方形' },
  { id: 'plane', label: '飞机', category: '交通工具', color: '白色', shape: '不规则' },
  { id: 'book', label: '书', category: '文具', color: '蓝色', shape: '方形' },
  { id: 'pen', label: '笔', category: '文具', color: '黑色', shape: '细长' },
  { id: 'ruler', label: '尺子', category: '文具', color: '黄色', shape: '长方形' },
  { id: 'eraser', label: '橡皮', category: '文具', color: '粉色', shape: '方形' },
  { id: 'bag', label: '书包', category: '文具', color: '紫色', shape: '方形' },
  { id: 'burger', label: '汉堡', category: '食物', color: '棕色', shape: '圆形' },
  { id: 'pizza', label: '披萨', category: '食物', color: '黄色', shape: '三角形' },
  { id: 'milk', label: '牛奶', category: '食物', color: '白色', shape: '方形' },
  { id: 'cake', label: '蛋糕', category: '食物', color: '粉色', shape: '圆形' },
  { id: 'noodle', label: '面条', category: '食物', color: '黄色', shape: '不规则' },
  { id: 'cup', label: '杯子', category: '日用品', color: '白色', shape: '圆形' },
  { id: 'soap', label: '香皂', category: '日用品', color: '绿色', shape: '方形' },
  { id: 'clock', label: '闹钟', category: '日用品', color: '红色', shape: '圆形' },
  { id: 'lamp', label: '台灯', category: '日用品', color: '黄色', shape: '不规则' },
  { id: 'chair', label: '椅子', category: '日用品', color: '棕色', shape: '方形' },
  { id: 'n1', label: '1', category: '数字', color: '蓝色', shape: '方形', value: 1 },
  { id: 'n2', label: '2', category: '数字', color: '绿色', shape: '方形', value: 2 },
  { id: 'n3', label: '3', category: '数字', color: '黄色', shape: '方形', value: 3 },
  { id: 'n4', label: '4', category: '数字', color: '红色', shape: '方形', value: 4 },
  { id: 'n5', label: '5', category: '数字', color: '紫色', shape: '方形', value: 5 },
  { id: 'n6', label: '6', category: '数字', color: '橙色', shape: '方形', value: 6 },
  { id: 'n7', label: '7', category: '数字', color: '黑色', shape: '方形', value: 7 },
  { id: 'n8', label: '8', category: '数字', color: '蓝色', shape: '方形', value: 8 }
];

const COLORS = ['红色', '黄色', '蓝色', '绿色', '紫色', '白色', '黑色'];
const CATEGORIES = ['水果', '动物', '交通工具', '文具', '食物', '日用品'];

const THEMES = [
  {
    id: 'default',
    name: '日常图标包',
    unlock: { type: 'free' },
    bg: ['#ffd7b5', '#ffe9f6', '#d3f7ff'],
    cardBg: 'rgba(255,255,255,0.88)',
    cardStroke: '#334'
  },
  {
    id: 'emoji',
    name: 'Emoji表情包',
    unlock: { type: 'coins', value: 300 },
    bg: ['#ffd86f', '#fc6262', '#fcb045'],
    cardBg: 'rgba(255,250,226,0.9)',
    cardStroke: '#6d3a00'
  },
  {
    id: 'letters',
    name: '数字字母包',
    unlock: { type: 'ad', value: 1 },
    bg: ['#8ec5fc', '#e0c3fc', '#cfd9df'],
    cardBg: 'rgba(245,250,255,0.9)',
    cardStroke: '#1b3a5c'
  },
  {
    id: 'meme',
    name: '网络热梗包',
    unlock: { type: 'coins', value: 600 },
    bg: ['#f093fb', '#f5576c', '#f5af19'],
    cardBg: 'rgba(255,246,250,0.92)',
    cardStroke: '#5a1734'
  }
];

const DAILY_TASK_DEFS = [
  { id: 'classic3', text: '完成3关经典模式', type: 'classic_level', target: 3, reward: 50 },
  { id: 'timed1', text: '玩1次限时挑战', type: 'timed_play', target: 1, reward: 30 },
  { id: 'share1', text: '分享1次战绩', type: 'share', target: 1, reward: 20 },
  { id: 'ad1', text: '看1次激励广告', type: 'watch_ad', target: 1, reward: 10 }
];

const ACTIVITY_CALENDAR = [
  { id: 'weekend_bonus', name: '周末双倍金币', rule: 'weekend' },
  { id: 'spring_theme', name: '春节红包主题', month: 2 },
  { id: 'mid_autumn_theme', name: '中秋月亮主题', month: 9 }
];

const FUNNY_TAGS = ['脑速超光速', '今天忘带脑子', '手比脑子快', '反向思维王者', '差点就赢了'];

function getClassicDifficulty(level) {
  const clamped = Math.min(Math.max(level, 1), 20);
  return {
    level: clamped,
    itemCount: clamped < 6 ? 4 : clamped < 12 ? 5 : 6,
    roundTime: Math.max(1.0, 3.2 - clamped * 0.08),
    allowComposite: clamped >= 5,
    allowReverse: clamped >= 10,
    allowNumberCompare: clamped >= 15,
    blink: clamped >= 11,
    shuffle: clamped >= 13
  };
}

function getDailySeedKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function getThemeById(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

module.exports = {
  ITEM_POOL,
  COLORS,
  CATEGORIES,
  THEMES,
  DAILY_TASK_DEFS,
  ACTIVITY_CALENDAR,
  FUNNY_TAGS,
  getThemeById,
  getClassicDifficulty,
  getDailySeedKey
};
