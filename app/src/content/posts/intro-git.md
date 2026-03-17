---
title: "Git 入门"
date: "2025-02-14"
tags: ["Git", "新手入门"]
category: "工程知识"
excerpt: "从基础配置到本地仓库管理、远程协作与常见问题，整理 Git 常用操作与实战场景快查指南。"
---

面向日常开发，整理 Git 的基础用法与常见代码管理流程。

---

# 一、Git 基础配置

Git 需配置用户信息用于提交记录，分为全局配置（适用于个人设备）和仓库级配置（适用于服务器或特定项目）。

## 1. 全局配置（个人设备）

设置全局用户名和邮箱（所有仓库默认使用）：
```bash
git config --global user.name "[NAME]"
git config --global user.email "[EMAIL_ADDRESS]"
```

查看全局配置：
```bash
git config --global --list
```

## 2. 仓库级配置（服务器或特定项目）

仅对当前仓库生效，优先级高于全局配置：
```bash
# 进入项目目录后设置
cd ~/my_project
git config --local user.name "[NAME]"
git config --local user.email "[EMAIL_ADDRESS]"
```

查看当前仓库配置（包含全局继承的配置）：
```bash
git config --local --list
```

## 3. 常用配置补充

配置默认编辑器（例如 VSCode）：
```bash
git config --global core.editor "code --wait"
```

配置默认分支名称（新建仓库时默认的主分支名）：
```bash
git config --global init.defaultBranch main
```

---

# 二、本地仓库管理

## 1. 初始化仓库：git init

将本地已有项目纳入 Git 管理。

进入项目根目录：
```bash
cd ~/my_project
```

初始化 Git 仓库（生成 `.git` 隐藏文件夹，存储版本信息）：
```bash
git init
```

查看初始化结果（确认 `.git` 文件夹存在）：
```bash
ls -a  # 显示所有文件，包括隐藏的 .git
```

## 2. 创建忽略文件：.gitignore

用于排除无需版本控制的文件（如编译产物、环境变量、日志等）。

创建并编辑 `.gitignore` 文件：
```bash
touch .gitignore
vim .gitignore
```

`.gitignore` 常见配置示例（根据项目类型进行调整）：
```text
# 忽略 Python 虚拟环境与字节码
venv/
__pycache__/
*.pyc

# 忽略环境配置文件
.env
.env.local

# 忽略系统文件
.DS_Store  # Mac 系统
Thumbs.db  # Windows 系统

# 忽略编译输出
build/
dist/
*.o
```

## 3. 暂存与提交文件

将所有修改添加到暂存区（`.` 代表当前目录所有文件）：
```bash
git add .
```

仅添加特定文件：
```bash
git add main.py README.md
```

提交暂存区文件到本地仓库，并附带提交信息（必须填写，简述改动）：
```bash
git commit -m "Initial commit: 初始化项目结构"
```

> **进阶用法**：如果所有修改的文件都已经是被 Git 跟踪的，可以跳过 `git add`，直接添加所有修改并提交：
> ```bash
> git commit -am "修改登录逻辑，修复bug"
> ```

**Commit Message 格式推荐**

采用明确的规范格式有利于追踪历史：
```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

- **type**：本次提交的类型，如 `feat`（新功能）、`fix`（修复 bug）、`docs`（文档）、`style`（格式）、`refactor`（重构）、`test`（测试）、`chore`（杂项）。
- **scope**：（可选）本次提交影响的范围，如模块名、文件名等。
- **description**：简要描述本次提交的内容，建议使用动词开头，简洁明了。

**示例**：
- `feat(login): 添加用户登录功能`
- `fix(api): 修复数据接口返回错误`
- `docs(readme): 更新项目说明文档`
- `style: 调整代码缩进和格式`
- `refactor(user): 重构用户模块逻辑`

## 4. 分支管理：git branch / checkout

查看当前**本地分支**（带 `*` 标注的是当前分支）：
```bash
git branch
```

查看**远程分支 / 所有分支**：
```bash
# 仅查看远程分支
git branch -r

# 查看所有分支（含本地与远程）
git branch -a
```

创建与切换新分支：
```bash
# 基于当前分支，创建 feature/login 分支
git branch feature/login

# 切换到新分支
git checkout feature/login
```

> **创建并立即切换分支**：`git checkout -b <分支名>`  
> 相当于先执行 `git branch` 创建分支，再**自动执行** `git checkout` 切换到该分支。

```bash
# 创建并立即切换到 feature/payment 分支
git checkout -b feature/payment  
```

重命名当前分支。例如改为当前默认名称 `main`（旧版本默认为 `master`）：
```bash
# -m 是 move 的缩写，用于重命名
git branch -m main
```

删除分支（需先切换到其他分支）：
```bash
# -d 安全删除（仅允许删除已合并的分支）
git branch -d feature/old

# -D 强制删除（即使未合并也直接删除）
git branch -D feature/old
```

## 5. 已追踪的文件加入 .gitignore

如果某些文件已经被提交到了仓库，随后再加入 `.gitignore` 中，Git 仍会继续跟踪它们。此时需要先从 Git 的缓存中移除追踪。

更改 `.gitignore` 后，执行以下命令：
```bash
git rm -r --cached .
git add .
git commit -m "chore: update .gitignore rules"
git push
```

如果只单独移除并清理某个特定的缓存文件：
```bash
git rm --cached [file_path]
```

---

# 三、远程仓库交互

将本地仓库关联到远程托管平台（如 GitHub、GitLab、Gitee 等），实现代码的共享和备份。

## 1. 准备工作：配置 SSH 密钥

远程仓库通常需要 SSH 密钥验证，步骤如下：

**生成 SSH 密钥**（已有 `~/.ssh/id_rsa.pub` 可跳过此步）：
```bash
ssh-keygen -t rsa -C "your_email@example.com"
```

**查看并复制公钥内容**：
```bash
cat ~/.ssh/id_rsa.pub
```

**在远程平台添加公钥**：  
登录托管平台 → 进入个人设置 → SSH 密钥管理 → 新增密钥 → 粘贴公钥内容 → 保存。

## 2. 关联远程仓库：git remote

查看当前已关联的远程仓库（首次关联时为空）：
```bash
git remote -v
```

关联远程仓库（远程仓库名默认约定为 `origin`，也可自定义）：
```bash
# 格式：git remote add <远程仓库名> <仓库SSH地址>
git remote add origin git@github.com:your_username/your_project.git
```

如果需要修改或更换远程仓库地址：
```bash
git remote set-url origin [新仓库地址]
```

## 3. 首次推送本地分支到远程：git push

如果远程为新建的空仓库，默认无分支。需要将**本地的主分支**作为基底推送到远程：

推送本地 `main` 分支到远程 `origin` 仓库，并建立上游追踪：
```bash
# 新版本本地默认分支名为 main
git push -u origin main

# 旧版本默认分支名 master，替换为对应名称：
git push -u origin master
```
> **说明**：`-u` 是 `--set-upstream` 的缩写。建立追踪后，后续的推送可以简化为 `git push`。

## 4. 日常推送与拉取：git push / pull

推送当前分支到远程关联的目标分支：
```bash
git push
```

拉取远程最新的代码到本地并合并（同步他人提交）：
```bash
# 拉取远程 origin 主机的 main 分支并合并到本地当前分支
git pull origin main

# 拉取并合并远程分支
git pull
```
> `git pull` 等价于拉取更新 `git fetch` 加上合并分支 `git merge`。

---

# 四、高频操作

## 1. 合并分支：git merge

将 `feature/login` 的工作成果合并回主干：
```bash
# 切换到目标接收分支（如 main）
git checkout main

# 将 feature/login 合并到当前分支
git merge feature/login
```

## 2. 强制同步远程代码

当本地代码异常混乱且无需保留时，可强制将本地重置为与远程完全一致：
```bash
# 拉取远程所有最新版本
git fetch --all

# 强制将当前分支重置为远程的 main 分支
git reset --hard origin/main
```
> [!WARNING]
> 这个操作会不可逆转地丢失本地所有的未提交更改和尚未推送到远程的提交记录，使用前务必确认。

## 3. 代码暂存：git stash

如果在某分支进行开发时，临时需要切换到其他分支处理紧急事务，但又不想生成多余的 `commit`，可以利用 `git stash` 将修改暂存并带过去：

保存当前未提交的代码更改：
```bash
git stash push -m "save my local changes before checkout"
```

此时工作区变干净，可以安全地切换到其他分支：
```bash
git checkout main
```

处理完事务后切换回来，并恢复之前的代码状态：
```bash
git checkout 原分支
git stash pop
```

## 4. 修改最近一次提交：git commit --amend

适用于“刚提交就发现问题”的场景，比如补漏文件或改错提交说明。

```bash
# 先补充遗漏文件
git add .

# 修改最近一次提交（会重写最近一次 commit）
git commit --amend

# 也可直接改提交信息，不改内容
git commit --amend -m "feat: 更新更准确的提交说明"
```

## 5. 撤销修改：git reset

撤销暂存区修改（已 `git add` 但未 `commit`）：
```bash
# 将 main.py 从暂存区移回工作区（保留文件本身的修改）
git reset HEAD main.py
```

回退最近一次提交，代码保留在暂存区：
```bash
# HEAD~1 表示上一个版本
git reset --soft HEAD~1
```

回退最近一次提交，代码与提交都删除（危险）：
```bash
# 丢弃修改内容，完全回滚。谨慎使用
git reset --hard HEAD~1
```

## 6. 返回某次历史提交：git revert

如果提交已经推到远程，通常推荐 `revert` 而不是 `reset`，因为它不会改写历史，而是新增一个“反向提交”。

```bash
# 撤销指定提交（不会删除历史）
git revert <commit_hash>
```

## 7. 批量整理历史提交：git rebase -i

交互式变基可用于压缩、改名、删除历史提交（常用于合并前清理提交历史）：

```bash
# 整理最近 3 次提交
git rebase -i HEAD~3
```

在打开的编辑列表中可使用：
- `pick`：保留提交
- `reword`：仅修改提交信息
- `squash`：合并到上一条提交
- `drop`：删除该提交


## 8. 强制推送远程分支：git push --force

当你执行了 `commit --amend`、`reset`、`rebase` 等改写历史操作后，本地与远程提交链会不一致，此时推送可能失败，需要强制更新远程分支。

```bash
# 强制覆盖远程 main 分支
git push origin main --force
```

更安全的方式（防止覆盖他人新提交）：

```bash
git push origin main --force-with-lease
```

> [!WARNING]
> 强制推送会重写远程历史，可能影响协作成员。建议在个人分支使用，或与团队同步后再执行。

---

# 五、常见问题与解决方案

## 1. 删除本地 Git 管理（删除 .git 文件夹）

若需重新初始化整个仓库，可以删除本地的版本控制信息：

进入项目根目录并强制删除 `.git` 文件夹：
```bash
cd ~/my_project
ls -a            # 确认 .git 文件夹存在
rm -rf .git      # 强制删除 .git 文件夹（彻底取消 Git 管理）
```
> [!CAUTION]
> 彻底删除 `.git` 文件夹意味着放弃所有的本地历史记录提交和分支代码，操作不可逆转，需谨慎！

## 2. 推送报错：HTTP2 framing layer 错误

部分网络环境下 HTTP/2 协议不够稳定，可尝试回退为 HTTP/1.1 临时解决：

```bash
# 全局禁用 HTTP/2
git config --global http.version HTTP/1.1

# 若想恢复默认设置
git config --global --unset http.version
```

