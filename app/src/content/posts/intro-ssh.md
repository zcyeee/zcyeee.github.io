---
title: "SSH 入门"
date: "2026-03-12"
tags: ["SSH", "VSCode", "新手入门"]
category: "工程知识"
excerpt: "从免密登录配置到 VSCode 远程连接、跳板机与各类端口转发隧道，整理 SSH 核心用法与实战场景快查指南。"
---

介绍日常开发中 SSH 的核心用法与实战场景。

---

# 一、VSCode 连接服务器

## 1. 生成本地 SSH 公钥：ssh-keygen

在**本地电脑**终端执行：  
```bash
# 邮箱仅作标识符号，可随意自定义
ssh-keygen -t rsa -C "your_email@example.com"
```

执行后直接按回车采用默认配置即可：
- 提示保存路径“Enter file in which to save the key”，默认保存在 `~/.ssh/id_rsa`
- 提示“Enter passphrase”（密钥密码），可直接回车设置为空（即无需密码登录）

生成成功后本地创建两个文件：
- `~/.ssh/id_rsa`：**私钥**（绝对保密，仅限本地留存）
- `~/.ssh/id_rsa.pub`：**公钥**（上传并配置到服务器）

## 2. 查看本地公钥：cat

在**本地终端**执行，复制公钥内容（以 `ssh-rsa` 开头）：  
```bash
cat ~/.ssh/id_rsa.pub  # 显示公钥内容，须全选复制
```

## 3. 将公钥上传到服务器

需先通过密码以常规方式登录服务器（如 `ssh work@10.76.160.16`），再执行以下任一方法添加公钥：

### 方法一：vim 编辑授权文件（通用稳定）  
```bash
mkdir -p ~/.ssh              # 确保 .ssh 目录已存在
vim ~/.ssh/authorized_keys   # 打开或新建授权文件
```
按 `i` 进入编辑模式，粘贴刚才复制的公钥内容，按 `Esc` 后输入 `:wq` 保存退出。

### 方法二：echo 管道追加  
只需在服务器终端执行一行命令（双引号内替换为你复制的公钥内容）：  
```bash
echo "公钥内容" >> ~/.ssh/authorized_keys
```

### 方法三：本地直接上传
跳过上述步骤，直接在**本地终端**执行，按提示输入密码后自动上传：  
```bash
ssh-copy-id user@remote_ip          # 默认 22 端口
ssh-copy-id -p 2222 user@remote_ip  # 自定义端口需加小写 -p
```

## 4. 配置本地 SSH 文件

**本地终端**配置 `~/.ssh/config`，实现快捷别名免密连接：  
```bash
vim ~/.ssh/config  # Windows 的路径一般在 C:\Users\你的用户名\.ssh\config
```

添加以下格式的配置项（可添加多组不同的服务器）：  
```bash
Host bj8-gpu                 # 自定义名称，易于记录和区分
  HostName 10.76.160.16      # 目标服务器 IP
  User work                  # 登录用户名
  ForwardAgent yes           # 开启代理转发功能（可选，用于跳板机场景）
  HostkeyAlgorithms +ssh-rsa   # 兼容旧版 SSH 服务（部分老服务器可能需要开启）
  PubkeyAcceptedKeyTypes +ssh-rsa
```

## 5. VSCode 连接服务器

1. 在 VSCode 拓展市场安装 **Remote - SSH** 插件。
2. 点击侧边栏“远程资源管理器”图标，在“SSH”下找到你配置的 `bj8-gpu`。
3. 点击连接（或右键“连接到主机”）。

## 6. 断开连接：exit

- **VSCode**：点击左下角的状态按钮（通常为绿色），选择“关闭远程连接”。
- **终端**：在服务器终端输入 `exit` 并回车，即可退出当前 SSH 会话。

## 7. 配置跳板机（ProxyJump）

如果本地无法直接访问目标服务器 B，但可以通过一台能访问公网的跳板机 A 间接连接：

编辑本地 `~/.ssh/config`，加入 `ProxyJump` 项：
```bash
Host jump
  HostName 跳板机A的IP
  User 用户名1

Host target
  HostName 目标服务器B的IP
  User 用户名2
  ProxyJump jump    # 核心指令：要求连接 target 时必须先经过 jump
```

后续只需要在终端或者 VSCode 直接连接 `target`：

```bash
ssh target   # SSH 将自动为你处理完整的跳转流程
```

## 8. 常见问题：VSCode 连接失败

若一直卡死或出现 `Failed to parse remote port from server output` 报错。

通常是因为远程 `.vscode-server` 目录数据受损（由网络中断或更新失败导致）。VSCode 的服务端守护程序存放在该文件夹中，若它处于异常状态，会导致连接直接阻断。

**解决步骤：**

1. 开启**本地默认终端**，使用基础命令行连接服务器：
    ```bash
    ssh username@remote_ip
    ```
2. 在服务器上，彻底删除受损的相关目录：
    ```bash
    rm -rf ~/.vscode-server
    ```
3. 返回 VSCode 重新尝试连接（VSCode 连入时会自动在服务器重新下载一份完整的服务包）。

---

# 二、SSH 隧道
根据 SSH 的出口和入口位置不同，SSH 隧道主要分为三种模式：**本地转发**、**远程转发**和**动态转发**。

## 1. 本地端口转发：-L

将远程的服务“拉”到本地来用。

**作用**：访问当前电脑无法直接访问，但 SSH 服务器可以访问的服务（如公司内网数据库、Web 管理后台）。

```bash
ssh -L [本地端口]:[目标主机]:[目标端口] user@ssh_server
```

**参数解释**：
- `-L`：表示 Local，建立本地转发通道。
- `[本地端口]`：在本地电脑上开一个“入口”（例如 `8888`）。
- `[目标主机]:[目标端口]`：通道的“出口”（例如 `mysql.internal.corp:3306`）。

**具体例子**：
假设你想在家里访问公司内网的数据库 `mysql.internal.corp:3306`，可以通过跳板机 `jump.corp.com`：
```bash
ssh -L 8888:mysql.internal.corp:3306 user@jump.corp.com
```
- **效果**：在本地连接 `localhost:8888`，数据会经过 `jump.corp.com` 转发到 `mysql.internal.corp:3306`，就像在本地直接操作数据库一样。

## 2. 远程端口转发：-R

将本地的服务“推”到远程去，让别人访问。

**作用**：将内网、无公网 IP 的服务（如本地开发的网站）暴露到有公网 IP 的 SSH 服务器上，供他人临时访问。

```bash
ssh -R [远程端口]:[本地主机]:[本地端口] user@ssh_server
```

**参数解释**：
- `-R`：表示 Remote，建立远程转发通道。
- `[远程端口]`：在远程 SSH 服务器上开一个“出口”（例如 `9090`）。
- `[本地主机]:[本地端口]`：出口连接到本地的服务（例如 `localhost:8000`）。

**具体例子**：
你的笔记本（无公网 IP）运行了一个网站在 `localhost:8000`，想通过云服务器 `123.45.67.89` 展示给同事：
```bash
ssh -R 9090:localhost:8000 user@123.45.67.89
```
- **效果**：同事访问 `http://123.45.67.89:9090`，请求会通过隧道转发到你笔记本的 `8000` 端口。

## 3. 动态端口转发：-D

建立一个全能的“代理通道”，不绑定具体目标。

**作用**：创建一个 SOCKS 代理服务器，让浏览器等应用的网络请求通过加密通道转发（常用于安全浏览公共 Wi-Fi 网页）。

```bash
ssh -D [本地SOCKS代理端口] user@ssh_server
```

**参数解释**：
- `-D`：表示 Dynamic，建立基于 SOCKS 的动态代理通道。
- `[本地SOCKS代理端口]`：在本地创建代理服务入口（例如 `1080`）。

**具体例子**：
连接一台安全的海外服务器 `my.server.com` 作为代理：
```bash
ssh -D 1080 user@my.server.com
```
- **效果**：在系统或浏览器网络设置中，配置 SOCKS 代理为 `127.0.0.1:1080`。此后所有网络请求都会加密传输到 `my.server.com`，由它代为访问互联网。

---

## 4. 隧道常用辅助参数

在执行隧道转发时，常配合以下参数使用：
- `-N`：**不执行远程命令**（No command）。仅建立隧道，不占用终端交互界面。
- `-f`：**后台运行**（fork）。验证通过后，SSH 转入后台，不影响当前终端操作。
- `-C`：**启用压缩**（Compression）。传输大量数据时可提速，但会稍微增加 CPU 消耗。
- `-g`：**允许网关访问**（gateway）。配合 `-R` 使用时，允许远程主机上的其他设备连入转发端口。

**后台运行且不执行命令的本地转发**：
```bash
ssh -f -N -L 8888:mysql.internal.corp:3306 user@jump.corp.com
```
