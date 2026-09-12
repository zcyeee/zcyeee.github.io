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

先用一张图串起最常用的完整工作流。工作区、暂存区和本地仓库都位于本机；远程仓库是另一份可协作的仓库。`fetch` 只更新本地的远程跟踪分支，只有后续 `merge`、`rebase` 或 `pull` 才会影响当前分支。

<div style="overflow-x:auto">
<svg width="100%" style="max-width:920px;min-width:820px" viewBox="0 0 920 440" role="img">
<title>Git 从工作区到远程仓库的全局工作流</title>
<desc>日常提交流程依次经过工作区、暂存区、本地分支和远程仓库。git fetch 只把远程状态更新到 origin/main，之后可 merge 或 rebase 到本地分支；git pull 是这两步的组合。git clone 会创建本地仓库、暂存区和工作区。</desc>
<defs>
<marker id="intro-git-workflow-green-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M0 0 L10 5 L0 10 Z" fill="#0F6E56"/>
</marker>
<marker id="intro-git-workflow-blue-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M0 0 L10 5 L0 10 Z" fill="#185FA5"/>
</marker>
<marker id="intro-git-workflow-orange-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M0 0 L10 5 L0 10 Z" fill="#BA7517"/>
</marker>
</defs>
<text x="20" y="28" font-size="14" font-weight="600" fill="currentColor">日常提交与同步</text>
<rect x="20" y="55" width="180" height="170" rx="12" fill="#F1EFE8" stroke="#888780" stroke-width="0.75"/>
<text x="110" y="83" font-size="15" font-weight="600" text-anchor="middle" fill="#2C2C2A">工作区 · worktree</text>
<text x="110" y="112" font-size="13" text-anchor="middle" fill="#5F5E5A">正在编辑的文件</text>
<text x="110" y="136" font-size="13" text-anchor="middle" fill="#5F5E5A">包含未提交改动</text>
<text x="110" y="198" font-size="12.5" text-anchor="middle" fill="#5F5E5A">git status 首先看到这里</text>
<rect x="245" y="55" width="180" height="170" rx="12" fill="#FAEEDA" stroke="#BA7517" stroke-width="0.75"/>
<text x="335" y="83" font-size="15" font-weight="600" text-anchor="middle" fill="#412402">暂存区 · index</text>
<text x="335" y="112" font-size="13" text-anchor="middle" fill="#633806">下一次提交的快照</text>
<text x="335" y="198" font-size="12.5" text-anchor="middle" fill="#633806">可反复 add 更新</text>
<rect x="470" y="55" width="210" height="170" rx="12" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.75"/>
<text x="575" y="81" font-size="15" font-weight="600" text-anchor="middle" fill="#04342C">本地仓库 · .git</text>
<rect x="490" y="94" width="170" height="38" rx="8" fill="#9FE1CB" stroke="#0F6E56" stroke-width="0.5"/>
<text x="575" y="113" font-size="13.5" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="#04342C">本地分支 main</text>
<rect x="490" y="166" width="170" height="38" rx="8" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.5"/>
<text x="575" y="185" font-size="13" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="#0C447C">远程跟踪 origin/main</text>
<path d="M575 166 V132" fill="none" stroke="#BA7517" stroke-width="1.8" marker-end="url(#intro-git-workflow-orange-arrow)"/>
<text x="584" y="153" font-size="11.5" fill="#854F0B">merge / rebase</text>
<rect x="735" y="55" width="165" height="170" rx="12" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.75"/>
<text x="817.5" y="83" font-size="15" font-weight="600" text-anchor="middle" fill="#0C447C">远程仓库</text>
<text x="817.5" y="108" font-size="13" text-anchor="middle" fill="#185FA5">origin</text>
<rect x="757" y="133" width="121" height="38" rx="8" fill="#B5D4F4" stroke="#185FA5" stroke-width="0.5"/>
<text x="817.5" y="152" font-size="13.5" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="#0C447C">远程分支 main</text>
<text x="817.5" y="198" font-size="12" text-anchor="middle" fill="#185FA5">GitHub / GitLab / Gitee</text>
<path d="M200 113 H245" fill="none" stroke="#0F6E56" stroke-width="2" marker-end="url(#intro-git-workflow-green-arrow)"/>
<text x="222.5" y="99" font-size="12.5" text-anchor="middle" fill="#0F6E56">add</text>
<path d="M425 113 H490" fill="none" stroke="#0F6E56" stroke-width="2" marker-end="url(#intro-git-workflow-green-arrow)"/>
<text x="457.5" y="99" font-size="12.5" text-anchor="middle" fill="#0F6E56">commit</text>
<path d="M660 113 C700 113 719 142 757 142" fill="none" stroke="#185FA5" stroke-width="2" marker-end="url(#intro-git-workflow-blue-arrow)"/>
<text x="710" y="99" font-size="12.5" text-anchor="middle" fill="#185FA5">push</text>
<path d="M757 152 C720 152 704 185 662 185" fill="none" stroke="#185FA5" stroke-width="2" marker-end="url(#intro-git-workflow-blue-arrow)"/>
<text x="710" y="205" font-size="12.5" text-anchor="middle" fill="#185FA5">fetch</text>
<rect x="470" y="242" width="430" height="43" rx="9" fill="#FAEEDA" stroke="#BA7517" stroke-width="0.5"/>
<text x="685" y="258" font-size="13.5" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="#412402">git pull = git fetch + git merge / rebase</text>
<text x="685" y="275" font-size="11.5" text-anchor="middle" dominant-baseline="central" fill="#633806">先更新 origin/*，再整合进当前本地分支</text>
<text x="20" y="315" font-size="14" font-weight="600" fill="currentColor">首次获取远程项目</text>
<rect x="20" y="330" width="570" height="65" rx="11" fill="#F1EFE8" stroke="#888780" stroke-width="0.75"/>
<text x="305" y="352" font-size="13.5" font-weight="600" text-anchor="middle" fill="#2C2C2A">创建本地环境</text>
<text x="305" y="377" font-size="12.5" text-anchor="middle" fill="#5F5E5A">本地仓库（含 origin/*）＋ 暂存区（与 HEAD 一致）＋ 已检出的工作区</text>
<rect x="700" y="330" width="200" height="65" rx="11" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.75"/>
<text x="800" y="353" font-size="13.5" font-weight="600" text-anchor="middle" fill="#0C447C">已有远程仓库</text>
<text x="800" y="377" font-size="12.5" text-anchor="middle" fill="#185FA5">URL / SSH 地址</text>
<path d="M700 362 H592" fill="none" stroke="#185FA5" stroke-width="2" stroke-dasharray="6 4" marker-end="url(#intro-git-workflow-blue-arrow)"/>
<text x="646" y="349" font-size="12.5" text-anchor="middle" fill="#185FA5">clone</text>
<circle cx="25" cy="422" r="5" fill="#888780"/>
<text x="37" y="426" font-size="12" fill="currentColor" opacity="0.72">工作状态</text>
<circle cx="132" cy="422" r="5" fill="#BA7517"/>
<text x="144" y="426" font-size="12" fill="currentColor" opacity="0.72">待提交快照</text>
<circle cx="263" cy="422" r="5" fill="#0F6E56"/>
<text x="275" y="426" font-size="12" fill="currentColor" opacity="0.72">本地版本历史</text>
<circle cx="408" cy="422" r="5" fill="#185FA5"/>
<text x="420" y="426" font-size="12" fill="currentColor" opacity="0.72">远程状态与同步</text>
</svg>
</div>

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

在经典的非快进合并中，`feature` 从主干某个提交分出；两条线各自产生提交后，合并提交 `M` 同时连接两边的最新提交：

<div style="overflow-x:auto">
<svg width="100%" style="max-width:780px;min-width:700px" viewBox="0 0 780 292" role="img">
<title>Git feature 分支合并回 main 的提交图</title>
<desc>时间从左向右。main 从提交 B 分出 feature 分支；main 继续产生 C 和 D，feature 产生 F1 和 F2，最后两条提交线汇入 main 上具有两个父提交的合并提交 M。</desc>
<defs>
<marker id="intro-git-commit-main-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M2 1L8 5L2 9" fill="none" stroke="#0F6E56" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</marker>
<marker id="intro-git-commit-feature-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
<path d="M2 1L8 5L2 9" fill="none" stroke="#BA7517" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</marker>
</defs>
<text x="748" y="24" font-size="13.5" text-anchor="end" fill="currentColor" opacity="0.68">时间方向：从左到右 →</text>
<rect x="24" y="52" width="76" height="28" rx="14" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.75"/>
<text x="62" y="66" font-size="13.5" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="#04342C">main</text>
<rect x="24" y="236" width="88" height="28" rx="14" fill="#FAEEDA" stroke="#BA7517" stroke-width="0.75"/>
<text x="68" y="250" font-size="13.5" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="#412402">feature</text>
<path d="M98 110 H160" fill="none" stroke="#0F6E56" stroke-width="2" marker-end="url(#intro-git-commit-main-arrow)"/>
<path d="M198 110 H282" fill="none" stroke="#0F6E56" stroke-width="2" marker-end="url(#intro-git-commit-main-arrow)"/>
<path d="M318 110 H432" fill="none" stroke="#0F6E56" stroke-width="2" marker-end="url(#intro-git-commit-main-arrow)"/>
<path d="M468 110 H632" fill="none" stroke="#0F6E56" stroke-width="2" marker-end="url(#intro-git-commit-main-arrow)"/>
<path d="M190 126 C214 170 246 210 282 210" fill="none" stroke="#BA7517" stroke-width="2" marker-end="url(#intro-git-commit-feature-arrow)"/>
<path d="M318 210 H422" fill="none" stroke="#BA7517" stroke-width="2" marker-end="url(#intro-git-commit-feature-arrow)"/>
<path d="M458 210 C528 210 560 110 632 110" fill="none" stroke="#BA7517" stroke-width="2" marker-end="url(#intro-git-commit-feature-arrow)"/>
<circle cx="80" cy="110" r="18" fill="#E1F5EE" stroke="#0F6E56" stroke-width="1.25"/>
<text x="80" y="110" font-size="13.5" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="#04342C">A</text>
<circle cx="180" cy="110" r="18" fill="#E1F5EE" stroke="#0F6E56" stroke-width="1.25"/>
<text x="180" y="110" font-size="13.5" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="#04342C">B</text>
<circle cx="300" cy="110" r="18" fill="#E1F5EE" stroke="#0F6E56" stroke-width="1.25"/>
<text x="300" y="110" font-size="13.5" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="#04342C">C</text>
<circle cx="450" cy="110" r="18" fill="#E1F5EE" stroke="#0F6E56" stroke-width="1.25"/>
<text x="450" y="110" font-size="13.5" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="#04342C">D</text>
<circle cx="300" cy="210" r="18" fill="#FAEEDA" stroke="#BA7517" stroke-width="1.25"/>
<text x="300" y="210" font-size="13.5" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="#412402">F1</text>
<circle cx="440" cy="210" r="18" fill="#FAEEDA" stroke="#BA7517" stroke-width="1.25"/>
<text x="440" y="210" font-size="13.5" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="#412402">F2</text>
<circle cx="650" cy="110" r="20" fill="#E1F5EE" stroke="#0F6E56" stroke-width="2"/>
<text x="650" y="110" font-size="14" font-weight="700" text-anchor="middle" dominant-baseline="central" fill="#04342C">M</text>
<rect x="682" y="86" width="72" height="48" rx="8" fill="#F1EFE8" stroke="#888780" stroke-width="0.75"/>
<text x="718" y="102" font-size="12.5" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="#2C2C2A">merge</text>
<text x="718" y="120" font-size="12" text-anchor="middle" dominant-baseline="central" fill="#5F5E5A">两个父提交</text>
<text x="180" y="148" font-size="12.5" text-anchor="middle" fill="currentColor" opacity="0.65">从 B 分支</text>
<text x="440" y="252" font-size="12.5" text-anchor="middle" fill="currentColor" opacity="0.65">feature/login 上的提交</text>
</svg>
</div>

若 `main` 自分支点后没有新提交，默认 `git merge` 可能直接快进而不创建 `M`；需要保留显式合并节点时可使用 `git merge --no-ff feature/login`。

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

将当前分支 / `HEAD` 移到上一个提交，暂存区和工作区保持命令执行前的内容：
```bash
# HEAD~1 表示上一个版本
git reset --soft HEAD~1
```

将当前分支 / `HEAD` 移到上一个提交，并用目标提交重置暂存区和被跟踪的工作区文件（危险）：
```bash
# 丢弃修改内容，完全回滚。谨慎使用
git reset --hard HEAD~1
```

> [!WARNING]
> `reset --hard` 会丢弃被跟踪文件中未提交的修改；为写入目标快照而挡路的未跟踪文件或目录也可能被删除。目标不一定是 `HEAD~1`，执行前应先用 `git status` 和 `git log --oneline` 确认当前状态与目标提交。

## 6. 撤销已提交的修改：git revert

如果提交已经推到远程，通常推荐 `revert` 而不是 `reset`，因为它不会改写历史，而是新增一个“反向提交”。

```bash
# 撤销指定提交（不会删除历史）
git revert <commit_hash>
```

`revert` 撤销的是指定提交引入的差异，而不是把整个目录切换到该提交的快照。协作分支通常优先使用 `revert`；`reset` 会移动分支位置，后续推送可能需要 `--force-with-lease`。

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

## 2. 操作报错：HTTP2 framing layer 错误

在使用 `git clone`、`git push` 或 `git pull` 操作大仓库，或者在特定网络环境（如代理环境、网络不稳定）下，偶尔会遇到类似 `RPC failed; curl 16 Error in the HTTP2 framing layer` 的报错。

此时可尝试将 Git 网络通讯协议回退为 HTTP/1.1 以临时解决此问题：

```bash
# 全局禁用 HTTP/2
git config --global http.version HTTP/1.1

# 若想恢复默认设置
git config --global --unset http.version
```

