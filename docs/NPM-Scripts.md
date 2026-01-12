# NPM Scripts 快速参考

## 开发命令

### 启动开发服务器

```bash
# 开发环境 (默认)
yarn dev

# 测试环境
yarn dev:test
```

## 构建命令

### 构建应用

```bash
# 构建开发环境
yarn build

# 构建测试环境  
yarn build:test

# 构建生产环境
yarn build:prod
```

### 预览构建产物

```bash
yarn preview
```

## 代码质量

### 运行 ESLint 检查

```bash
yarn lint
```

## 环境对照表

| 命令 | 环境 | API 地址 | 用途 |
|------|------|---------|------|
| `yarn dev` | development | http://dev.example.com/api | 本地开发 |
| `yarn dev:test` | test | http://test.example.com/api | 本地测试环境调试 |
| `yarn build` | development | http://dev.example.com/api | 构建开发版本 |
| `yarn build:test` | test | http://test.example.com/api | 构建测试版本 |
| `yarn build:prod` | production | https://api.example.com | 构建生产版本 |

## 常用工作流

### 开发新功能
```bash
# 1. 启动开发服务器
yarn dev

# 2. 在浏览器打开 http://localhost:5173
# 3. 开始编码，保存后自动热更新
```

### 测试环境验证
```bash
# 1. 启动测试环境
yarn dev:test

# 2. 或者构建测试版本
yarn build:test

# 3. 预览构建结果
yarn preview
```

### 部署生产环境
```bash
# 1. 构建生产版本
yarn build:prod

# 2. 验证构建产物
yarn preview

# 3. 部署 dist 目录到生产服务器
```

## 提示

- 所有 dev 命令都会启动本地开发服务器，支持热更新
- 所有 build 命令都会生成优化后的生产包到 `dist` 目录
- 修改环境变量后需要重启 dev server
- 使用 `preview` 命令可以本地预览构建后的应用
