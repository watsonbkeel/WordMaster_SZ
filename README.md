# WordMaster SZ

一个基于微信小程序原生技术栈开发的深圳小学英语背单词 MVP 项目，面向 1-6 年级学生，提供背词学习、词库浏览、自动听写、拼字游戏、虚拟宠物成长和本地多账号能力。

## 项目简介

`WordMaster SZ` 是一个已经跑通 MVP 的背单词小程序，目标是用轻量、低门槛、可持续迭代的方式，帮助小学生进行英语词汇记忆与复习。

当前版本特征：
- 原生微信小程序实现，不依赖第三方 UI 组件库
- 本地多账号学习数据隔离
- 单词学习与词库浏览
- 自动听写练习
- 拼字小游戏
- 宠物成长与奖励机制
- 本地持久化存储，适合 MVP 快速验证

## 技术栈

- 微信小程序原生：`WXML`、`WXSS`、`JavaScript`、`JSON`
- 本地存储：`wx.setStorageSync` / `wx.getStorageSync`
- 音频播放：`wx.createInnerAudioContext`

## 页面结构

当前小程序包含以下页面：

- `pages/learn/index`：学习主页
- `pages/words/index`：词库页
- `pages/pet/index`：宠物页
- `pages/profile/index`：个人中心
- `pages/game/index`：拼字游戏
- `pages/detail/index`：单词详情
- `pages/dictation/index`：自动听写

## 核心能力

### 1. 本地多账号
- 用户学习进度按账号隔离存储
- 进度键前缀：`userProgress_[name]`
- 成长键前缀：`userGrowth_[name]`

### 2. 词库与学习
- 词典数据来源于 `utils/fullDictionary.js`
- 支持单词查看、学习和详情浏览

### 3. 自动发音
- 通过 `utils/audio.js` 复用全局音频实例
- 默认使用有道词典语音接口进行英文单词发音

### 4. 奖励与成长体系
- `utils/reward.js` 负责经验、金币、等级与宠物状态
- 当前等级规则：每 `100 exp` 升一级

## 目录结构

```text
.
├── AI_CONTEXT.md
├── app.js
├── app.json
├── app.wxss
├── pages/
│   ├── detail/
│   ├── dictation/
│   ├── game/
│   ├── learn/
│   ├── pet/
│   ├── profile/
│   └── words/
├── project.config.json
├── project_context.md
├── sitemap.json
└── utils/
    ├── audio.js
    ├── fullDictionary.js
    ├── mockData.js
    └── reward.js
```

## 本地运行

### 环境要求
- 微信开发者工具
- 一个可用的小程序 AppID（或使用测试号进行本地调试）

### 启动方式
1. 打开微信开发者工具
2. 选择“导入项目”
3. 项目目录选择当前仓库根目录
4. 按需填写或使用测试 AppID
5. 导入后即可本地预览与调试

## 数据说明

当前项目以本地存储为主，适合 MVP 验证阶段：

- 学习进度：`userProgress_[name]`
- 成长数据：`userGrowth_[name]`
- 词典数据：`utils/fullDictionary.js`

后续如需升级，可逐步迁移到：
- 云开发数据库
- 用户登录态同步
- 跨设备学习记录同步

## 开发约束

根据项目上下文，当前代码库遵循以下原则：
- 严格使用微信小程序原生技术栈
- 不使用外部 UI 组件库
- 状态更新使用原生 `setData`
- 保持实现极简、轻量、便于快速迭代

## 当前状态

- 项目类型：已跑通的 MVP
- 当前版本：`V1.0 MVP 已封板`
- 项目定位：深圳小学英语背词小程序

## 后续建议

如果要继续迭代，建议优先补齐：
- 学习记录初始化与缓存兼容逻辑
- README 中的页面截图与演示说明
- 版本变更记录 `CHANGELOG.md`
- 云端同步方案设计
- 更细粒度的错误处理与数据校验

## License

本仓库默认采用 `MIT License`，详见 `LICENSE`。
