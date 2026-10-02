# aya-comment Worker

此 Cloudflare Worker 为 Hugo 博客提供评论 API，评论记录保存在 Cloudflare D1。新评论默认进入 `pending`（待审核）状态；只有审核通过的评论会由公开读取接口返回。

## API 接口

### 提交评论

`POST /api/comments`

请求体为 JSON：

```json
{
  "postId": "/posts/example/",
  "postTitle": "文章标题",
  "author": "访客昵称",
  "content": "评论内容",
  "website": "",
  "parentId": null
}
```

`postId` 必须是站内文章路径，且不能包含查询参数或锚点。`postTitle` 必填，最多 240 个字符；`content` 必填，最多 5000 个字符；`author` 可选，最多 60 个字符，留空时显示为“匿名”。`parentId` 可选，用于回复某条已审核评论。`website` 是反垃圾蜜罐字段，正常用户必须留空。

成功时返回 HTTP `201`，评论状态为 `pending`：

```json
{
  "ok": true,
  "message": "评论已提交，审核后显示。",
  "comment": {
    "id": "评论 UUID",
    "postId": "/posts/example/",
    "postTitle": "文章标题",
    "parentId": null,
    "author": "访客昵称",
    "content": "评论内容",
    "createdAt": "2026-09-30T12:00:00.000Z",
    "status": "pending"
  }
}
```

提交上限为每个来源 IP 每小时 5 条；Worker 只将加盐哈希后的 IP 写入 D1。错误响应格式为 `{"ok":false,"error":"错误说明"}`。若蜜罐字段 `website` 非空，接口会返回伪成功响应，但不会保存评论。

### 获取评论

`GET /api/comments?postId=/posts/example/`

必填参数 `postId` 指定文章路径。默认只返回该文章下已审核的顶层评论，每页默认 20 条、最多 50 条。响应示例：

```json
{
  "ok": true,
  "postId": "/posts/example/",
  "comments": [],
  "nextCursor": null
}
```

后续回复和翻页接口也已预留：传 `parentId=<评论 UUID>` 获取该评论的回复；传上一页响应里的 `cursor=<nextCursor>` 获取下一页。评论内容按纯文本返回，前端不应将其作为 HTML 插入页面。

## 部署前准备

1. 准备 Cloudflare 账号，并启用 Workers 和 D1。
2. 本地部署需要安装 Node.js 20 LTS（包含 npm）。本项目不必预装 Wrangler，后续命令用 `npx` 临时调用。
3. Worker 项目目录是仓库里的 `workers/aya-comment/`，其入口、D1 绑定和 migration 配置位于本目录的 `wrangler.toml`。

## 本地 Wrangler 部署

以下命令在 PowerShell 中执行。先进入 Worker 项目目录：

```powershell
cd F:\blog\ayablog\workers\aya-comment
npx wrangler@latest --version
```

首次运行时 Wrangler 会提示安装；继续即可。按提示登录 Cloudflare：

```powershell
npx wrangler@latest login
```

### 1. 创建 D1 数据库

```powershell
npx wrangler@latest d1 create aya-comment
```

命令会输出数据库名称和 `database_id`。打开 `wrangler.toml`，将：

```toml
database_id = "REPLACE_WITH_D1_DATABASE_ID"
```

替换成 Cloudflare 返回的真实 ID。不要修改 `binding = "DB"`、数据库名称或 migration 目录。

### 2. 创建数据库表

在 Worker 目录中执行：

```powershell
npx wrangler@latest d1 migrations apply aya-comment --remote
```

出现确认提示时确认执行。migration 会创建评论表和查询索引；这一步必须在首次部署前完成，之后有新 migration 时也要再次执行。

### 3. 首次部署 Worker

```powershell
npx wrangler@latest deploy
```

部署成功后，记录 Wrangler 输出的 Worker URL，通常类似：

```text
https://aya-comment.<你的 Cloudflare workers.dev 子域>.workers.dev
```

### 4. 设置限流密钥

为 IP 哈希限流设置一个随机、私有的 salt：

```powershell
npx wrangler@latest secret put RATE_LIMIT_SALT
```

按提示输入至少 32 个随机字符。不要把这个值写进 `wrangler.toml`、源码或 Git。设置 secret 后，Wrangler 会更新 Worker。

### 5. 将网站连接到 Worker

打开博客模板 [`layouts/partials/comments.html`](../../layouts/partials/comments.html)，检查 `data-api-url` 是否与刚才的 Worker URL 完全一致：

```html
data-api-url="https://aya-comment.aitoricore.workers.dev"
```

若你获得的 `workers.dev` 子域不同，就把这里改成实际 URL，然后重新构建并发布 Hugo 站点。

当前 Worker 仅允许以下网页来源发起浏览器请求：

- `https://aitoricore.github.io`
- 本地 Hugo 预览 `http://localhost:1313`

若更换博客域名或本地预览端口，也必须同步修改 `src/index.js` 顶部的 `SITE_ORIGINS`，然后重新部署 Worker。

## Cloudflare Dashboard / Git 导入

Cloudflare Dashboard 的 Workers Builds 连接的是 Git 仓库，不是从电脑拖放一个本地文件夹。把项目推送到 GitHub 后：

1. 在 Cloudflare Dashboard 打开 **Workers & Pages**，选择创建 Worker 并连接 Git 仓库。
2. 选择包含本项目的仓库和分支。
3. 将 **Root directory** 设为 `workers/aya-comment`。这样 Cloudflare 会从这个子目录读取 `wrangler.toml` 和 `src/index.js`。
4. 本项目没有构建步骤，**Build command** 留空；**Deploy command** 使用 `npx wrangler deploy`。
5. 在首次构建前，先用 Wrangler 创建 D1、将数据库 ID 写入 `wrangler.toml` 并应用 migration。Cloudflare 的 Git 构建不会自动执行 D1 migration。
6. 首次部署后，在 Worker 的 **Settings → Variables and Secrets** 中添加 Secret `RATE_LIMIT_SALT`；也可以在本地 Worker 目录运行前述 `wrangler secret put` 命令。
7. 确认部署 URL 与网站 `comments.html` 中的 `data-api-url` 相同。

若通过 Dashboard 新建 D1 数据库，可在 **Storage & databases → D1** 中创建 `aya-comment`，再将数据库 ID 填入 `wrangler.toml`。之后仍需运行 migration。

## 部署后验收

以下命令可在 PowerShell 中运行。先将 `$worker` 设为实际 Worker URL，然后读取一篇文章的评论：

```powershell
$worker = "https://aya-comment.<你的子域>.workers.dev"
Invoke-RestMethod -Uri "$worker/api/comments?postId=%2Fposts%2Fexample%2F&limit=20" -Method Get
```

提交一条测试评论：

```powershell
$body = @{
  postId = "/posts/example/"
  postTitle = "测试文章"
  author = "测试用户"
  content = "这是一条部署验收评论。"
  website = ""
  parentId = $null
} | ConvertTo-Json -Compress

Invoke-RestMethod -Uri "$worker/api/comments" `
  -Method Post `
  -ContentType "application/json" `
  -Headers @{ Origin = "https://aitoricore.github.io" } `
  -Body $body
```

正常响应为 `201`，返回 `status: "pending"`。因评论尚未审核，紧接着的 GET 不会返回它。

## 审核评论

先从 POST 响应中复制评论 `id`，然后在 Worker 目录执行：

```powershell
npx wrangler@latest d1 execute aya-comment --remote --command "UPDATE comments SET status = 'approved' WHERE id = '填入评论UUID';"
```

再次调用 GET，即可读取这条评论。拒绝评论时将状态改为 `rejected`。请勿将未经审核的记录直接改成 `approved`。

## 常见问题

- **`503 Comment service is not configured`**：尚未设置 `RATE_LIMIT_SALT`，在 Worker Secrets 中添加后重新部署。
- **`500 Comment service failed`**：检查 `wrangler.toml` 中 D1 的 `database_id`、DB binding，以及是否已成功应用 migration。
- **浏览器报告 CORS 错误**：检查 `SITE_ORIGINS` 是否包含当前页面的完整来源（协议、域名和端口），修改后重新部署 Worker。
- **POST 返回 `429`**：当前来源 IP 已达到每小时 5 条的提交上限。
- **评论提交成功但页面没有显示**：这是预期行为；新评论先进入待审核状态，通过审核后 GET 才会返回。

## 数据文件说明

Worker 的 JSON 响应会返回给调用方；Cloudflare Worker 无法写入本地 Hugo 仓库中的文件。根目录 [`aya-comment.json`](../../aya-comment.json) 是 API 请求/响应契约样例，不是在线评论数据库。实际评论保存在 D1。