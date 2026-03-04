# 云函数说明

- `uploadScore`：上传分数到 `scores` 集合。
- `fetchRank`：按模式读取排行榜。

## 部署

1. 在微信开发者工具中启用云开发。
2. 创建数据库集合 `scores`。
3. 右键 `cloudfunctions/uploadScore`、`cloudfunctions/fetchRank` 分别上传并部署。
4. 保持小游戏端 `src/cloud.js` 中调用名称一致。
