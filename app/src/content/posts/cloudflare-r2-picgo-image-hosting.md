---
title: "Cloudflare R2 + PicGo 搭建图床"
date: "2026-05-28"
tags: ["Cloudflare R2", "PicGo", "图床"]
category: "工程知识"
excerpt: "记录如何把 Cloudflare R2 配置成个人图床，并通过 PicGo 拖拽上传图片，最终生成自定义域名格式的图片链接。"
---

本文记录如何把 Cloudflare R2 配置成个人图床，并通过 PicGo 上传图片，上传后自动得到自定义域名格式的图片链接。

参考链接：[网站搭建全流程（含 DNS、nginx 配置详解）](https://juejin.cn/post/7589454621719396402#cloudflare-)

---

# 一、目标效果

最终希望形成这样一条上传链路：

```text
本地图片 -> PicGo -> Cloudflare R2 Bucket -> 自定义域名访问
```

例如：

```text
上传工具：PicGo
对象存储：Cloudflare R2
Bucket：blog-fig
访问域名：https://img.example.com
期望链接：https://img.example.com/img/xxx.jpg
```

> 注意：Cloudflare 的对象存储产品叫 **R2**，不是 R3。R2 兼容 S3 API，所以 PicGo 中通常通过 Amazon S3 / S3 插件完成上传。

---

# 二、需要准备的信息

PicGo 配置 Cloudflare R2 时，可以先把下面这些信息准备好：

| 需要的信息 | Cloudflare 来源 | PicGo 对应字段 | 说明 |
|------|------|------|------|
| Bucket Name | R2 Bucket 名称 | 桶名 | 决定图片上传到哪个存储桶 |
| Account ID | 账户详情 | 间接使用 | 用于组成 S3 Endpoint |
| S3 Endpoint | S3 API Endpoint | 自定义节点 | PicGo 连接 R2 的上传地址 |
| Access Key ID | R2 API Token 创建结果 | 应用密钥 ID | 不要填 API Token 令牌值 |
| Secret Access Key | R2 API Token 创建结果 | 应用密钥 | 只显示一次，需要妥善保存 |
| Custom Domain | Bucket 自定义域 | 设置输出图片 URL 前缀 | 图片最终公开访问域名 |
| Region | R2 通常使用固定值 | 地区 | PicGo 中通常填 `auto` |
| Upload Path | 自行规划 | 上传文件路径 | 图片在 Bucket 中的保存路径 |
| ACL | 插件上传参数 | ACL 访问控制列表 | 部分 S3 插件要求填写 |
| Bucket 前缀 | PicGo 输出设置 | Bucket 前缀 | 避免输出 URL 中带上 Bucket 名 |

其中最容易混淆的是两个地址：

- `S3 Endpoint`：给 PicGo 上传时调用 R2 API 使用。
- `Custom Domain`：给浏览器、博客和 Markdown 访问图片时使用。

**关键结论**：上传用 R2 Endpoint，访问用自定义域名，两者不要混填。

---

# 三、创建 R2 Bucket

进入 Cloudflare 控制台后：

1. 打开 `R2 对象存储`。
2. 点击创建存储桶。
3. 输入 Bucket 名称，例如：

```text
blog-fig
```

4. 选择合适的位置，个人博客通常保持默认或选择靠近主要访问区域的位置即可。
5. 创建完成后进入该 Bucket。

Bucket 名称后续会填到 PicGo 的 `桶名` 字段。建议只使用小写字母、数字和短横线，避免后续工具兼容问题。

---

# 四、找到 Account ID 和 S3 Endpoint

进入 Cloudflare R2 页面后，可以在账户详情或 Bucket 设置页找到：

```text
Account ID
S3 API Endpoint
```

PicGo 的 `自定义节点` / `Endpoint` 字段应填写：

```text
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

注意 Endpoint 后面不要拼接 Bucket 名。

正确写法：

```text
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

不推荐写法：

```text
https://<ACCOUNT_ID>.r2.cloudflarestorage.com/blog-fig
```

Bucket 应该单独填到 PicGo 的 `桶名` 字段中。

---

# 五、创建 R2 API Token / S3 凭据

PicGo 不能只靠网页登录上传，它需要一组 S3 客户端凭据。

在 Cloudflare 中操作：

1. 进入 `R2 对象存储`。
2. 找到 `账户详情`。
3. 在 `API 令牌` 附近点击 `管理`。
4. 创建新的 R2 API Token。
5. 权限建议选择：

```text
Object Read & Write
```

中文界面中通常对应：

```text
对象读写
```

6. Bucket 范围建议只选择目标 Bucket，例如：

```text
blog-fig
```

7. 创建后保存以下信息：

```text
Access Key ID
Secret Access Key
S3 Endpoint
```

`Secret Access Key` 通常只显示一次，建议立刻保存到密码管理器中。

> 安全提醒：如果密钥出现在聊天记录、公开文档、截图或 Git 仓库中，应当视为已经泄露，建议立刻删除旧密钥并重新创建。

---

# 六、绑定自定义域名

如果希望图片链接形如：

```text
https://img.example.com/img/xxx.jpg
```

需要为 R2 Bucket 绑定公开访问域名。

操作步骤：

1. 进入 `R2 对象存储`。
2. 打开目标 Bucket，例如 `blog-fig`。
3. 进入 `设置`。
4. 找到 `自定义域` 或 `Public access` 区域。
5. 添加域名，例如：

```text
img.example.com
```

6. 等待状态变为 `Active` 或 `启用`。

如果主域名还要用于博客网站，更推荐使用图片子域名：

```text
img.example.com
```

这样静态资源和网站本身会更清晰地分离。

---

# 七、推荐 PicGo 配置

在 PicGo 的 Amazon S3 / S3 插件中，可以按下面的方式填写：

```text
图床配置名:
Cloudflare R2

应用密钥 ID:
填 Cloudflare 的 Access Key ID

应用密钥:
填 Cloudflare 的 Secret Access Key

桶名:
blog-fig

上传文件路径:
img/{fileName}

地区:
auto

自定义节点:
https://<ACCOUNT_ID>.r2.cloudflarestorage.com

ACL 访问控制列表:
public-read

ForcePathStyle:
yes

自定义输出 URL 模板:
留空

设置输出图片 URL 前缀:
https://img.example.com/

设置输出图片 URL 后缀:
留空

Bucket 前缀:
no
```

上传成功后，期望返回：

```text
https://img.example.com/img/图片文件名.jpg
```

---

# 八、上传路径建议

简单版本：

```text
img/{fileName}
```

按日期分目录：

```text
img/{year}/{month}/{day}/{fileName}
```

不要只填写：

```text
img/
```

部分 S3 插件可能会把它当作一个目录占位对象上传，导致 Cloudflare R2 后台出现类似“此对象未命名”的记录。把上传路径改成包含文件名的模板后，通常就不会再出现。

如果当前插件不识别 `{fileName}`，可以查看插件文档，常见变量还可能包括：

```text
{filename}
{origin}
$fileName
```

---

# 九、常见问题排查

## 1. 上传失败，但密钥看起来没错

优先检查 `地区` 是否填写为：

```text
auto
```

如果填成 `Asia`、`APAC` 或其他值，可能导致签名或请求区域不匹配。

## 2. 上传失败，提示 ACL 相关问题

部分 PicGo S3 插件要求填写 ACL 字段，可以尝试保留：

```text
public-read
```

R2 的公开访问主要由自定义域名和 Bucket 访问配置决定，但插件侧可能仍要求该字段存在。实际以插件上传成功为准。

## 3. 返回链接里带了 Bucket 名

如果输出变成：

```text
https://img.example.com/blog-fig/img/xxx.jpg
```

检查：

```text
Bucket 前缀:
no
```

## 4. 返回的是 R2 Endpoint，不是自定义域名

检查：

```text
设置输出图片 URL 前缀:
https://img.example.com/
```

## 5. R2 后台出现“此对象未命名”

通常是上传路径只填了目录：

```text
img/
```

改成：

```text
img/{fileName}
```

已有的异常空对象可以在 R2 后台删除。

## 6. 图片能上传，但网页打不开

按顺序检查：

1. 自定义域名是否已经启用。
2. 域名 DNS 是否已经生效。
3. 图片 URL 是否包含多余的 Bucket 前缀。
4. 对象路径是否正确，例如 `img/xxx.jpg`。
