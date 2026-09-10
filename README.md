# AI闪卡记忆卡 🦊

基于艾宾浩斯记忆法的 AI 增强版闪卡工具，适合中小学生使用。

## 功能特点

- 🎯 **AI 智能建卡** - 输入英语单词自动查词（Free Dictionary API），拍照错题 AI 识别生成解析
- 🧠 **艾宾浩斯记忆法** - 科学复习调度，四级评分自动调整间隔
- 📸 **错题拍照** - 安卓端拍照上传，AI OCR 识别生成记忆卡
- 💾 **本地存储** - 数据全部保存在浏览器本地，支持导出/导入备份
- 🎨 **可爱界面** - 马卡龙糖果色设计，适合中小学生审美
- 📱 **PWA 支持** - 可添加到手机主屏幕，离线可用

## 技术栈

- React 18 + TypeScript + Vite
- Tailwind CSS (v4)
- Dexie.js (IndexedDB)
- OpenRouter API (AI)
- Free Dictionary API (查词主源)
- PWA (Progressive Web App)

## 本地开发

```bash
npm install
npm run dev
```

## 构建部署

```bash
npm run build
# 构建产物在 dist/ 目录
```

## 使用指南

1. 打开应用，点击「创建」开始
2. 输入英语单词 → 自动查词 → 预览 → 保存
3. 拍照错题 → AI 识别 → 自动生成解析 → 保存
4. 点击「复习」开始每日复习
5. 在「设置」中配置 OpenRouter API Key

## API Key 配置

- **OpenRouter**: 访问 https://openrouter.ai/keys 获取免费 Key
- **剑桥词典代理** (可选): 如有 CORS 代理可配置，否则使用默认的 Free Dictionary API

## 浏览器支持

- Chrome (推荐，安卓端最佳)
- Edge
- Safari (iOS 有限支持)

## 许可证

MIT
