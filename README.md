# 小狸AI - 智能访谈助手 (TalkAssistant)

这是一个基于 **React 18** 和 **Vite** 开发的高性能移动端 AI 访谈助手应用。系统深度集成了 **离线语音转写**、**AI 报告异步生成** 以及 **天眼查企业洞察** 功能。

## 🚀 快速上手

### 1. 环境准备
确保您的开发环境已安装 **Node.js (16+)** 和 **Yarn** 包管理器。

### 2. 依赖安装
```bash
yarn install
```

### 3. 开发环境运行
```bash
yarn dev
```
启动后访问：`http://localhost:5173/talk-assistant/`

---

## 🛠 构建与部署

项目支持多环境配置，构建产物将统一输出至目录：`/talk-assistant`。

| 环境 | 构建命令 | 备注 |
| :--- | :--- | :--- |
| **开发环境** | `yarn build` | 默认构建（一般用于本地验证） |
| **测试环境** | `yarn build:test` | 使用 `.env.test` 配置，输出至测试网关 |
| **生产环境** | `yarn build:prod` | 使用 `.env.production` 配置，全量优化构建 |

---

## 📖 重要：项目交接文档

项目的详细业务逻辑、原生交互协议以及运维部署指南已整合至：

👉 **[HANDOVER.md (核心交接文档)](./HANDOVER.md)**

**文档涵盖的核心内容：**
*   **业务链路**：尽调创建、天眼查解析、AI 洞察双步采纳流程。
*   **跨端通信**：基于 **DSBridge** 的原生 Action 回调协议及 Android 序列化避坑指南。
*   **异步流处理**：离线语音转写、WebSocket 进度实时推送方案。
*   **运维部署**：`config.js` 动态外挂配置原理、测试/生产服务器地址及 Nginx 部署路径。

---

## 🏗 技术栈简述

*   **核心框架**: React 18 + TypeScript (Vite 构建)
*   **状态管理**: Zustand (持久化录音现场) + useViewStack (视图管理)
*   **UI 库**: React Vant (UI 交互) + Tailwind CSS (布局) + Lucide (图标)
*   **通讯**: Axios (REST) + WebSocket (实时推送) + DSBridge (Native 通讯)

---

## ⚠️ 避坑提醒

在开发涉及原生交互的功能时，请务必阅读 `HANDOVER.md` 中的 **[前端核心经验规约](./HANDOVER.md#7-前端核心开发建议与避坑总结-handover-notes)**，了解关于侧滑手势返回拦截及租户 ID 判定等核心工程规范。
