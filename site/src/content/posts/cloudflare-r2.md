---
title: "Cloudflare R2 搭建图床"
date: "2026-05-28"
tags: ["Cloudflare R2", "图床", "PicGo"]
category: "工程知识"
excerpt: "配置 Cloudflare R2 作为个人图床，同时可生成自定义域名格式的图片链接（推荐 AI 自动化管理图库）。"
---

本文记录如何把 Cloudflare R2 配置成个人图床，并生成自定义域名格式的图片链接。日常上传/整理图片，更推荐交给 AI 助手（如 Cursor）用命令行自动化完成，而不是每次手动打开 PicGo；文中也保留了 PicGo 的配置方法，作为手动上传的备选方案。

参考链接：[网站搭建全流程（含 DNS、nginx 配置详解）](https://juejin.cn/post/7589454621719396402#cloudflare-)

---

# 一、目标效果

最终希望形成这样一条上传链路：

```text
本地图片 -> [AI 助手 / 命令行 / PicGo] -> Cloudflare R2 Bucket -> 自定义域名访问
```

例如：

```text
对象存储：Cloudflare R2
Bucket：blog-fig
访问域名：https://example.com
期望链接：https://example.com/img/xxx.jpg
```

# 二、准备工作

下面几步**需要在 [Cloudflare R2 对象存储控制台](https://dash.cloudflare.com/?to=/:account/r2/overview) 中手动完成**，AI 暂时无法代替网页操作，只需操作一次。

## Step 1：创建 R2 Bucket

进入 Cloudflare 控制台，打开 `R2 对象存储`，创建一个新的 Bucket，例如：

```text
blog-fig
```

建议只使用小写字母、数字和短横线。

## Step 2：找到 S3 Endpoint

进入 R2 对象存储控制台，右下角默认会显示 `Account ID` 和 `S3 API` 地址，无需另外查找。`S3 API` 即 S3 Endpoint，格式为：

```text
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

直接复制页面上的 `S3 API` 即可。

## Step 3：创建 R2 API Token

进入 `R2 对象存储` 的账户详情，管理 API Token，创建一组 R2 凭据，权限选择：

```text
Object Read & Write
```

Bucket 范围选择目标 Bucket，创建后保存：

```text
Access Key ID
Secret Access Key
S3 Endpoint
```

**`Secret Access Key` 只显示一次，建议立刻保存到密码管理器中。**


## Step 4：绑定自定义域名

打开目标 Bucket，进入 `设置`，在 `自定义域` 或 `Public access` 区域添加图片域名，例如：

```text
example.com
```

等待状态变为 `Active` 或 `启用`。如果主域名还要用于博客网站，建议使用图片子域名，便于区分网站和静态资源。

---

# 三、使用方式

Bucket、密钥、域名都准备好之后，"上传新图 / 批量重命名 / 清理旧图"就是重复性操作了，有两条方法：

| 方式 | 适合场景 | 特点 |
|------|------|------|
| **AI + 命令行（推荐）** | 批量重命名、清理、迁移、按目录整理 | 一句话描述需求，AI 直接调用命令行完成；无 GUI，效率高 |
| **PicGo** | 日常手动上传单张截图 | 有图形界面，配置一次后拖拽/截图即传，适合零散场景 |

两者用的是同一套 Bucket 和密钥，可以混用。

---

# 四、AI 自动化管理（推荐）

因为上传、重命名、清理本质上都是命令行操作，把 R2 交给 AI 工具管理，只需要让它调用现成的命令行工具即可，不用手写脚本，也不用记具体参数。有两种方案，按需选择。

## 方案 A：Wrangler CLI（Cloudflare 官方）

官方命令行工具，认证最省事。

- **需要准备**：`npx wrangler login`（浏览器 OAuth 一键授权，无需手动创建密钥）
- **支持**：上传 `put`、下载 `get`、删除 `delete`
- **局限**：没有原生"重命名"（要靠"下载 → 改名上传 → 删旧"三步实现），也不能列出桶里的文件清单

## 方案 B：S3 兼容 API + rclone（推荐做文件管理）

把 R2 当成标准 S3 对象存储来操作，功能最全，是更推荐的方式。

- **需要准备**：一组 R2 API Token（创建方式见前文「二、准备工作」的 Step 3），配置进 rclone 的 remote
- **支持**：列目录 `ls`、重命名/移动 `moveto`、上传 `copy`、删除 `delete`
- **提示**：若 Token 限定了单个桶，需给 remote 设置 `no_check_bucket = true`，否则写操作会因尝试检查桶而报 403

配置好 rclone remote 后，直接用自然语言让 AI 处理即可，例如："把 `img/` 目录下今天上传的图片按日期归类""列出 Bucket 里体积最大的 10 张图并询问是否删除"——AI 会自行拼出对应的 `rclone` 命令并执行。

---

# 五、PicGo 配置（备选）

如果只是想手动上传单张图片，也可以用 PicGo。安装对应的 Amazon S3 / S3 插件，把 Cloudflare 的信息填进去即可：

| PicGo 字段 | 对应值 |
|------|------|
| 应用密钥 ID / 应用密钥 | 前文 Step 3 保存的 Access Key ID / Secret Access Key |
| 桶名 | `blog-fig` |
| 自定义节点 | 前文 Step 2 的 S3 Endpoint |
| 地区 | `auto` |
| 上传文件路径 | `img/{fileName}`，不要只填 `img/`（否则可能在 R2 后台留下未命名的目录占位对象） |
| ACL 访问控制列表 | `public-read` |
| ForcePathStyle | `yes` |
| 设置输出图片 URL 前缀 | `https://example.com/` |
| Bucket 前缀 | `no` |

上传成功后，期望返回：

```text
https://example.com/img/图片文件名.jpg
```

其中最容易混淆的是两个地址：`S3 Endpoint` 给 PicGo 上传时调用，`Custom Domain` 给浏览器和 Markdown 访问图片时用，两者不要填反。

# 六、常见问题排查

## 1. 上传失败，但密钥看起来没错

优先检查 `地区` 是否填写为 `auto`，填成 `Asia`、`APAC` 等值可能导致签名或请求区域不匹配。

## 2. 上传失败，提示 ACL 相关问题

保留 `public-read`。R2 的公开访问主要由自定义域名和 Bucket 访问配置决定，但插件侧可能仍要求该字段存在，实际以插件上传成功为准。

## 3. 返回链接里带了 Bucket 名

检查 `Bucket 前缀` 是否设为 `no`。

## 4. 返回的是 R2 Endpoint，不是自定义域名

检查 `设置输出图片 URL 前缀` 是否填成了自定义域名，而不是 R2 Endpoint。

## 5. R2 后台出现"此对象未命名"

通常是上传路径只填了目录（如 `img/`），改成 `img/{fileName}` 即可。已有的异常空对象可以在 R2 后台手动删除。

## 6. 图片能上传，但网页打不开

按顺序检查：自定义域名是否已启用、域名 DNS 是否已生效、图片 URL 是否包含多余的 Bucket 前缀、对象路径是否正确（例如 `img/xxx.jpg`）。
