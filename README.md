<p align="center">
  <img src="assets/logo.png" alt="AI Drama Logo" width="368" />
</p>
<p align="center">
  <strong>AI Drama，基于 Agent 的智能微短剧创作平台</strong>
</p>
---

## 📖 项目简介

AI Drama (脑海译 / Naohaiyi) 是一款面向内容创作者的 AI 微短剧与视频创作平台。你可以在平台上编写剧本，AI 会自动将剧本拆解为分镜画面，并利用多家主流 AI 模型生成配图和视频片段，让视频创作流程更高效、更智能。

**技术栈**：全栈 Next.js 16 + React 19 + TypeScript + PostgreSQL (Drizzle ORM)。

---

## ✨ 功能特性

- **📝 剧本管理** — 创建和编辑视频剧本，支持分集/分场景结构化管理
- **🎨 AI 分镜生成** — AI 自动将剧本拆解为可视化分镜，包含画面描述、镜头语言等
- **🖼️ AI 绘图** — 集成多家 AI 绘图引擎，一键生成分镜参考图
- **🎥 AI 视频生成** — 基于分镜描述和参考图生成视频片段
- **📦 素材管理** — 统一管理项目内的图片、视频等素材资源
- **🤖 多模型支持** — 集成 OpenAI、Claude、Gemini、通义千问、DeepSeek、Ollama 等主流大模型
- **⬆️ 版本更新检查** — 在系统设置中检测 GitHub Release 新版本并给出升级指引

https://github.com/user-attachments/assets/fe71cbb8-f9d9-4351-9a4c-cb8a0a6af7ba

https://github.com/user-attachments/assets/2f1de26c-5cd5-4be3-ad2e-81be2edd6956

https://github.com/user-attachments/assets/acd26ede-8b77-48c0-91dc-c80c5ed7ceca

https://github.com/user-attachments/assets/8a8ce3cf-4bf8-4f76-ad7c-0af373d16a5b

https://github.com/user-attachments/assets/be99d4c1-dc09-4616-8fba-06cb959c84c8

---

## ✅ 已完成

- [x] 用户认证与授权（注册 / 登录 / Token 刷新）
- [x] 项目管理（创建 / 编辑 / 删除项目）
- [x] 剧本管理（分集 / 分场景结构化编辑）
- [x] AI 分镜生成（剧本 → 分镜自动拆解）
- [x] AI 绘图（多引擎文生图 / 图生图）
- [x] AI 视频生成（基于分镜描述和参考图）
- [x] 素材管理（图片 / 视频统一管理）
- [x] 多 AI 模型支持（OpenAI / Claude / Gemini / 通义千问 / DeepSeek / Ollama 等）
- [x] 多存储后端（本地 / 阿里云 OSS / 腾讯 COS / MinIO 等 S3 兼容）
- [x] Agent Pipeline 可视化流程
- [x] 系统初始化向导

## 🗺️ TODO

- [ ] 团队管理（多用户协作、权限控制）
- [ ] 全局智能 Agent（跨项目任务调度与自动化）
- [ ] 适配更多 AI 提供者
- [ ] 更智能的 Agent Pipeline 流程

---

## 🚀 快速开始

### 方式一：Docker 一键部署（推荐）

只需安装 Docker，无需配置复杂的环境。

```bash
git clone <your-repository-url>.git
cd aidrama

# 可选：复制并修改环境变量
cp .env.example .env

# 拉取镜像并启动
docker compose up -d
```

#### 如果你希望从源码本地构建镜像：

```bash
docker compose -f docker-compose.build.yml up -d --build
```

启动后访问 `http://localhost:3000` 即可使用（可在 `.env` 中通过 `APP_PORT` 修改端口）。

### 方式二：源码开发

**环境要求**：Node.js 20+、pnpm 10+、Docker (用于运行 PostgreSQL/Redis 基础设施)

```bash
# 1. 复制环境变量配置文件并根据需要进行修改
cp .env.example .env

# 2. 启动 PostgreSQL 和 Redis 基础设施
docker compose up postgres redis -d

# 3. 安装依赖并启动 Next.js 全栈应用
cd ai-fusion-video-web
pnpm install
pnpm dev
```

启动后访问 `http://localhost:3000` 即可开始开发与体验！

---

## 🔑 配置说明

### 数据库 & Redis

**Docker 部署 / 源码开发**：编辑项目根目录的 `.env` 文件（从 `.env.example` 复制），可配置端口、密码、以及数据库连接等环境变量：

```env
PG_DATABASE=aidrama
REDIS_PASSWORD=123456
```

### AI 模型

AI 模型可在系统设置页面动态管理，支持以下提供商：

| 提供商    | 模型示例                         |
| --------- | -------------------------------- |
| OpenAI    | GPT-4o, GPT-4o-mini              |
| Anthropic | Claude 4 Opus, Claude 4 Sonnet   |
| Google    | Gemini 2.5 Pro, Gemini 2.5 Flash |
| 通义千问  | Qwen-Max, Qwen-Plus              |
| DeepSeek  | DeepSeek-R1, DeepSeek-V3         |
| Ollama    | 本地部署的开源模型               |

### 存储

支持通过系统设置页面配置 S3 兼容的对象存储（阿里云 OSS、腾讯 COS、MinIO 等），也支持本地文件存储。

## 🙏 致谢

- 感谢 [LinuxDo](https://linux.do) 论坛的支持
- 感谢开源项目 [waoowaoo](https://github.com/saturndec/waoowaoo) 提供的剧本 UI 设计灵感



## 📄 License

[MIT License](LICENSE)
