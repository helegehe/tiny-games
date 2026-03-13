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

const KNOWLEDGE_QUESTIONS = [
  {
    id: 'img_panda',
    tier: 1,
    topic: '图片识别',
    text: '点击熊猫图片',
    options: [
      { key: 'panda', text: '🐼' },
      { key: 'dog', text: '🐶' },
      { key: 'cat', text: '🐱' },
      { key: 'frog', text: '🐸' }
    ],
    correctKeys: ['panda']
  },
  {
    id: 'img_transport',
    tier: 1,
    topic: '图片识别',
    text: '点击会飞的交通工具图标',
    options: [
      { key: 'plane', text: '✈️' },
      { key: 'car', text: '🚗' },
      { key: 'train', text: '🚆' },
      { key: 'bike', text: '🚲' }
    ],
    correctKeys: ['plane']
  },
  {
    id: 'geo_capital_cn',
    tier: 2,
    topic: '地理',
    text: '点击中国的首都',
    options: [
      { key: 'beijing', text: '北京' },
      { key: 'shanghai', text: '上海' },
      { key: 'guangzhou', text: '广州' },
      { key: 'shenzhen', text: '深圳' }
    ],
    correctKeys: ['beijing']
  },
  {
    id: 'science_planet',
    tier: 2,
    topic: '科普',
    text: '点击离太阳最近的行星',
    options: [
      { key: 'mercury', text: '水星' },
      { key: 'earth', text: '地球' },
      { key: 'mars', text: '火星' },
      { key: 'jupiter', text: '木星' }
    ],
    correctKeys: ['mercury']
  },
  {
    id: 'history_qin',
    tier: 3,
    topic: '历史',
    text: '点击秦朝建立者',
    options: [
      { key: 'qinshihuang', text: '秦始皇' },
      { key: 'liubang', text: '刘邦' },
      { key: 'xiangyu', text: '项羽' },
      { key: 'hanwudi', text: '汉武帝' }
    ],
    correctKeys: ['qinshihuang']
  },
  {
    id: 'poem_author_jys',
    tier: 3,
    topic: '诗歌',
    text: '点击《静夜思》的作者',
    options: [
      { key: 'libai', text: '李白' },
      { key: 'dufu', text: '杜甫' },
      { key: 'baijuyi', text: '白居易' },
      { key: 'sushi', text: '苏轼' }
    ],
    correctKeys: ['libai']
  },
  {
    id: 'geo_municipality',
    tier: 4,
    topic: '地理',
    text: '点击中国的直辖市',
    options: [
      { key: 'beijing', text: '北京' },
      { key: 'shanghai', text: '上海' },
      { key: 'hangzhou', text: '杭州' },
      { key: 'xian', text: '西安' }
    ],
    correctKeys: ['beijing', 'shanghai']
  },
  {
    id: 'poem_tang',
    tier: 4,
    topic: '诗歌',
    text: '点击唐代诗人',
    options: [
      { key: 'libai', text: '李白' },
      { key: 'dufu', text: '杜甫' },
      { key: 'sushi', text: '苏轼' },
      { key: 'xinqiji', text: '辛弃疾' }
    ],
    correctKeys: ['libai', 'dufu']
  },
  {
    id: 'history_invention',
    tier: 4,
    topic: '历史',
    text: '点击中国古代四大发明之一',
    options: [
      { key: 'printing', text: '活字印刷术' },
      { key: 'compass', text: '指南针' },
      { key: 'paperclip', text: '回形针' },
      { key: 'steamengine', text: '蒸汽机' }
    ],
    correctKeys: ['printing', 'compass']
  }
];

function getClassicDifficulty(level) {
  const clamped = Math.min(Math.max(level, 1), 20);
  let knowledgeTier = 0;
  if (clamped >= 4) knowledgeTier = 1;
  if (clamped >= 8) knowledgeTier = 2;
  if (clamped >= 12) knowledgeTier = 3;
  if (clamped >= 16) knowledgeTier = 4;

  return {
    level: clamped,
    itemCount: clamped < 6 ? 4 : clamped < 12 ? 5 : 6,
    roundTime: Math.max(1.4, 3.6 - clamped * 0.07),
    allowComposite: clamped >= 5,
    allowReverse: clamped >= 10,
    allowNumberCompare: clamped >= 15,
    knowledgeTier,
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
  KNOWLEDGE_QUESTIONS,
  getThemeById,
  getClassicDifficulty,
  getDailySeedKey
};
