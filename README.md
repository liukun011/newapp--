# 小狸AI - 智能访谈助手

这是一个基于 React 和 Vite 构建的移动端 AI 访谈助手应用。

## 环境配置

项目支持三种环境配置：

| 环境 | API 地址 | 说明 |
|------|---------|------|
| 开发环境 | `http://dev.example.com/api` | 本地开发使用 |
| 测试环境 | `http://test.example.com/api` | 测试服务器 |
| 生产环境 | `https://api.example.com` | 正式生产环境 |

### 环境变量文件

- `.env.development` - 开发环境配置
- `.env.test` - 测试环境配置
- `.env.production` - 生产环境配置
- `.env.example` - 环境变量示例模板

## 本地运行

**前置要求:** Node.js 16+ 和 Yarn

1. **安装依赖:**
   ```bash
   yarn install
   ```

2. **运行开发环境 (默认):**
   ```bash
   yarn dev
   ```
   使用开发环境 API: `http://dev.example.com/api`

3. **运行测试环境:**
   ```bash
   yarn dev:test
   ```
   使用测试环境 API: `http://test.example.com/api`

4. **访问应用:**
   打开浏览器访问 `http://localhost:5173`

## 构建部署

根据不同环境构建应用：

```bash
# 构建开发环境
yarn build

# 构建测试环境
yarn build:test

# 构建生产环境
yarn build:prod
```

构建产物将生成在 `dist` 目录下。

## 项目技术栈

- **框架:** React 18 + TypeScript
- **构建工具:** Vite
- **UI 组件库:** React Vant (移动端)
- **HTTP 客户端:** Axios
- **样式:** Tailwind CSS + PostCSS
- **图标:** Lucide React

## 开发说明

- 环境配置在 `config.ts` 中管理
- API 请求封装在 `request.ts` 中
- 业务服务层在 `services/` 目录下
- 页面组件在 `pages/` 目录下
- 通用组件在 `components/` 目录下

## License

MIT
