---
title: "Claude Code 长期记忆机制"
date: "2026-08-03"
tags: ["Claude Code", "Memory"]
category: "大语言模型"
excerpt: "Claude Code 的长期记忆不是向量数据库，而是一套 Markdown 索引、模型相关性预取与 Agent 主动检索共同构成的文件系统。"
---

Claude Code 实现了一套**基于文件的长期记忆系统**，其机制可分为五个部分：

1. 把长期知识保存为本地 Markdown 文件；
2. 用 `MEMORY.md` 维护简短索引；
3. 必要时用额外模型调用从主题文件中选择相关记忆；
4. 允许主 Agent 继续用 `Read`、`Grep`、`Glob` 主动查找；
5. 在对话结束后，由一个受限的后台 Agent 抽取新记忆。

---

# 一、记忆机制的分类

Claude Code 中至少存在三种经常被统称为 memory、但功能不同的机制。

## 1. CLAUDE.md：人工维护的持久化指令

`CLAUDE.md`、`CLAUDE.local.md` 和 `.claude/rules/*.md` 由人维护，用于告诉 Claude：

- 项目应该如何构建和测试；
- 代码风格与架构约束；
- 哪些工作流必须遵循；
- 哪些目录需要特殊处理。

它们属于**指令记忆**，用于规定工作方式，而非 Claude 自动提取的知识。

## 2. Auto memory：Claude 生成的跨会话知识

Auto memory 由 Claude 自动读写，默认位于：

```text
~/.claude/projects/<project>/memory/
```

它保存的是未来会话仍可能有用、但无法简单从当前代码推导出来的信息：用户角色与偏好、用户对工作方式的纠正、项目背景与决策原因，以及 Linear 项目或监控面板这类外部系统入口。本文主要讨论该层机制。

## 3. Transcript 与 compaction：会话内状态

Claude Code 还会把消息、工具调用和结果保存为 JSONL，并在上下文过长时进行 compaction。它们解决的是：

- 如何恢复同一个会话；
- 如何在长对话中压缩上下文；
- 如何回滚或续接之前的工具调用。

这类数据并非默认注入每个新会话的长期知识库，应与 auto memory 区分。

---

# 二、记忆文件的存储结构

典型的 auto-memory 目录结构如下：

```text
memory/
├── MEMORY.md
├── release-merge-freeze.md
├── postgres-conn-pool.md
└── latency-dashboard.md
```

其中，`MEMORY.md` 用于存储索引，而非记忆正文：

```markdown
- [发布期间的主干冻结](release-merge-freeze.md) — 应用商店审核期间冻结主干，新版本上线并稳定观察一天后解除
- [Postgres 连接池](postgres-conn-pool.md) — 线上连接上限及其决策原因
- [延迟看板](latency-dashboard.md) — 线上延迟看板入口与关键面板
```

源码中的记忆提示词明确要求：

- 每条索引占一行；
- 每条约 150 字符以内；
- 仅保留标题、文件链接和单行摘要（one-line hook）；
- 详细内容必须存入独立主题文件；
- 不得将记忆正文直接写入 `MEMORY.md`。

主题文件则带 YAML frontmatter：

```markdown
---
name: release-merge-freeze
description: 移动端版本提交应用商店审核后冻结主干，新版本上线并稳定观察一天后解除
type: project
---

# 发布期间的主干冻结

移动端版本提交应用商店审核后，主干进入冻结状态，直至新版本上线并稳定观察一天。

**Why:** 此前曾在审核期间合入改动，导致紧急修复被一并打包送审，最终需要回滚发布。

**How to apply:** 安排合并前，应确认当前是否处于冻结窗口；冻结期间仅允许合入经批准的 hotfix。
```

这条规则之所以适合写入 memory，是因为它由**团队流程约定和实际事故经验**共同形成，无法从代码中判断当前是否允许向主干分支合并；反过来，如果它已经写进 `CLAUDE.md` 或由 CI 强制执行，就不该再存一份可能过时的副本。

## MEMORY.md 的容量限制

索引本身也有容量限制：最多加载前 200 行或 25 KB，以先达到的上限为准。超过限制时，Claude Code 仅加载上限以内的内容，并附加警告，要求 Claude：

- 缩短每一条索引；
- 把细节移入主题文件；
- 合并重复项；
- 删除过期项。

---

# 三、记忆召回通路及其启用条件

从功能上看，Claude Code 有三种取得旧记忆的方式：

- **通路 A：注入 `MEMORY.md` 索引；**
- **通路 B：自动相关性预取主题文件；**
- **通路 C：主 Agent 主动调用文件工具。**

但在源码中，通路 A 与通路 B 并非始终同时启用，而是由同一个 `tengu_moth_copse` feature flag 切换：

<div style="overflow-x:auto">
<svg width="100%" style="max-width:680px;min-width:600px" viewBox="0 0 680 310" role="img">
<title>Claude Code 两种自动记忆召回模式</title>
<desc>当 tengu_moth_copse 为 false 时使用通路 A 注入 MEMORY.md；为 true 时使用通路 B 预取相关主题文件。两种模式都保留通路 C 的主动文件检索。</desc>
<defs>
<marker id="cc-memory-route-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
<path d="M2 1L8 5L2 9" fill="none" stroke="#888780" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</marker>
</defs>
<text x="340" y="20" font-size="14" text-anchor="middle" fill="currentColor" opacity="0.65">tengu_moth_copse</text>
<path d="M250 26 L180 44" fill="none" stroke="#888780" stroke-width="1.5" marker-end="url(#cc-memory-route-arrow)"/>
<path d="M430 26 L500 44" fill="none" stroke="#888780" stroke-width="1.5" marker-end="url(#cc-memory-route-arrow)"/>
<rect x="30" y="44" width="300" height="164" rx="12" fill="#F1EFE8" stroke="#888780" stroke-width="0.5"/>
<rect x="50" y="60" width="94" height="28" rx="14" fill="#EEEDFE" stroke="#534AB7" stroke-width="0.5"/>
<text x="97" y="74" font-size="13.5" text-anchor="middle" dominant-baseline="central" fill="#26215C">false</text>
<text x="50" y="112" font-size="16" font-weight="600" fill="currentColor">通路 A · 索引常驻</text>
<rect x="50" y="126" width="106" height="38" rx="7" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.5"/>
<text x="103" y="145" font-size="13.5" text-anchor="middle" dominant-baseline="central" fill="#042C53">MEMORY.md</text>
<path d="M158 145 L188 145" fill="none" stroke="#888780" stroke-width="1.5" marker-end="url(#cc-memory-route-arrow)"/>
<rect x="190" y="126" width="120" height="38" rx="7" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.5"/>
<text x="250" y="145" font-size="13.5" text-anchor="middle" dominant-baseline="central" fill="#04342C">注入用户上下文</text>
<text x="50" y="190" font-size="13.5" fill="currentColor" opacity="0.62">通路 B 关闭</text>
<rect x="350" y="44" width="300" height="164" rx="12" fill="#F1EFE8" stroke="#888780" stroke-width="0.5"/>
<rect x="370" y="60" width="94" height="28" rx="14" fill="#EEEDFE" stroke="#534AB7" stroke-width="0.5"/>
<text x="417" y="74" font-size="13.5" text-anchor="middle" dominant-baseline="central" fill="#26215C">true</text>
<text x="370" y="112" font-size="16" font-weight="600" fill="currentColor">通路 B · 相关性预取</text>
<rect x="370" y="126" width="106" height="38" rx="7" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.5"/>
<text x="423" y="145" font-size="13.5" text-anchor="middle" dominant-baseline="central" fill="#042C53">主题文件清单</text>
<path d="M478 145 L508 145" fill="none" stroke="#888780" stroke-width="1.5" marker-end="url(#cc-memory-route-arrow)"/>
<rect x="510" y="126" width="120" height="38" rx="7" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.5"/>
<text x="570" y="145" font-size="13.5" text-anchor="middle" dominant-baseline="central" fill="#04342C">选择并注入正文</text>
<text x="370" y="190" font-size="13.5" fill="currentColor" opacity="0.62">通路 A 关闭</text>
<path d="M180 208 L180 230" fill="none" stroke="#888780" stroke-width="1.25" stroke-dasharray="4 4"/>
<path d="M500 208 L500 230" fill="none" stroke="#888780" stroke-width="1.25" stroke-dasharray="4 4"/>
<rect x="30" y="230" width="620" height="58" rx="10" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.5"/>
<text x="340" y="251" font-size="15.5" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="#04342C">通路 C · 主 Agent 主动检索</text>
<text x="340" y="272" font-size="13.5" text-anchor="middle" dominant-baseline="central" fill="#085041">Read / Grep / Glob 在两种模式下都可用</text>
</svg>
</div>

也就是说，A 与 B 是二选一的两种自动召回模式，C 则在两种模式下都可用。由此带来一个容易被忽略的推论：磁盘上存在 `MEMORY.md` 并不表示它一定会进入本轮上下文；同样，缺少索引条目也不表示主题文件一定无法被检索。

---

# 四、通路 A：MEMORY.md 索引注入

## 1. MEMORY.md 的上下文注入过程

Auto memory 开启时，Claude Code 会读取：

```text
~/.claude/projects/<project>/memory/MEMORY.md
```

并把它和 `CLAUDE.md` 一起汇总进本轮会话的用户上下文。

> 进入 system prompt 的是“如何保存、何时读取、不要保存什么”这类行为规则；`MEMORY.md` 的正文属于 system prompt 之后的用户上下文。

换句话说，memory 是提供给模型的材料，而不是不可覆盖的系统级配置。

## 2. 索引召回的主要特性

当 `tengu_moth_copse` 未启用且索引文件存在时，加载 `MEMORY.md` 无需额外的模型调用：

```text
读文件 → 截断 → 拼入上下文
```

该过程具有三个特点：

- **确定性**：无需 embedding、关键词搜索或 LLM 选择；
- **低延迟**：没有独立 API 请求；
- **信息粒度有限**：模型通常仅能看到单行摘要，而非主题文件全文。

例如用户问“在向主干分支合并前，是否发生过与版本发布相关的事故？”，模型此时只知道“存在 `release-merge-freeze.md`，它与商店审核期间的主干冻结有关”。如果单行索引恰好包含完整答案，模型可能直接作答；但从设计目的看，索引主要用于提供后续读取主题文件的路径。

## 3. 索引模式的召回缺口

如果主题文件已经写入磁盘，但抽取 Agent 忘了更新 `MEMORY.md`：

```text
memory/
├── MEMORY.md
├── indexed-memory.md
└── orphan-memory.md
```

那么 `orphan-memory.md` 就不会通过通路 A 进入上下文——除非主 Agent 主动扫描目录，这条记忆在索引模式下等同于不存在。这也是相关性预取模式直接扫描全部主题文件、而不完全依赖索引的重要原因。

---

# 五、通路 B：自动相关性预取

相关性预取是更接近检索系统的一条通路，但它既不建立 embedding，也不对正文执行向量搜索。其流程如下：

```text
扫描 frontmatter
      ↓
生成候选 manifest
      ↓
额外模型调用选择文件
      ↓
读取选中文件开头
      ↓
作为 relevant_memories 附件注入
```

## 1. 触发条件

`startRelevantMemoryPrefetch()` 的启动条件大多是例行检查（flag 已开启、存在真实用户消息、会话注入预算未耗尽），其中只有一项值得单独一提：用户输入去除首尾空白后若不含任何空白字符，会被判定为“单词查询”并跳过预取。这条英文启发式规则落到 CJK 输入上，意味着 `合并主干前是否发生过发布事故` 这类不含空格的中文提问通常不会触发自动预取。

## 2. 扫描候选文件

`scanMemoryFiles()` 递归列出 memory 目录中的 `.md`（排除 `MEMORY.md`），每个文件只读前 30 行用于解析 frontmatter 中的 `description` 和 `type`，再按修改时间从新到旧排序，最多保留 200 个候选。

随后，`formatMemoryManifest()` 生成每行对应一个文件的清单：

```text
- [project] release-merge-freeze.md (2026-07-15T...): 移动端版本提交应用商店审核后冻结主干，新版本上线并稳定观察一天后解除
- [project] postgres-conn-pool.md (2026-07-10T...): 线上连接池上限及其决策原因
- [reference] latency-dashboard.md (2026-07-02T...): 线上延迟看板入口
```

检索模型看到的是**文件名、类型、时间和 description**，而不是主题文件正文。frontmatter 描述的具体程度会直接影响记忆能否被选中。

## 3. 通过额外的 LLM 调用选择文件

`selectRelevantMemories()` 把用户问题和这份清单拼成一次独立的模型调用：

```text
Query: <用户问题>

Available memories:
<manifest>
```

返回值被约束为：

```json
{
  "selected_memories": [
    "release-merge-freeze.md"
  ]
}
```

最多选择 5 个文件。选择提示词还包含一个特殊规则：

- 如果某个工具最近已经成功使用，不要召回它的普通 API 文档；
- 但仍应召回该工具的警告（warning）、注意事项（gotcha）和已知问题（known issue）。

原因在于，成功调用已经表明模型掌握了工具的使用方式，重复注入 API 手册会造成上下文浪费；在工具使用期间，历史故障与风险提示具有更高的参考价值。

## 4. 文件读取、截断与注入

文件选定后，`readMemoriesForSurfacing()` 会限制正文读取量：每个文件最多注入前 200 行或前 4096 字节，并在任一上限达到时截断。

单轮最多注入 5 个文件，因此每轮的理论上限约为 20 KB。本会话累计注入上限约为 60 KB，超过该值后不再启动新的 memory prefetch。发生 compaction 后，旧附件会离开当前消息历史，累计值随之重置，相关记忆可以再次注入。

如果文件被截断，附件尾部会提示模型使用 `Read` 查看全文。最终内容以 `relevant_memories` attachment 的形式，经 `<system-reminder>` 包装后进入消息上下文。

## 5. 去重

Claude Code 从两个维度避免重复注入：

- `alreadySurfaced`：过滤本会话之前已经自动召回过的路径；
- `readFileState`：过滤主 Agent 已经通过 `Read`、`Write` 或 `Edit` 接触过的文件。

系统会在 selector 调用前后分别执行过滤，尽可能将 5 个名额用于尚未注入的文件，同时避免多个 memory 目录或并发状态重新引入重复项。

## 6. 预取的非阻塞执行方式

这是理解实际召回效果的关键：`startRelevantMemoryPrefetch()` 在用户轮次（turn）开始时启动，但采用**零等待**策略，主模型不会等待 selector 返回，而是立即开始首次生成。

查询循环只会在一次工具执行结束、准备进入下一轮模型调用时检查预取是否完成：

<div style="overflow-x:auto">
<svg width="100%" style="max-width:680px;min-width:620px" viewBox="0 0 680 350" role="img">
<title>相关性预取的零等待执行方式</title>
<desc>用户消息到达后，主 Agent 首次生成与记忆预取并行开始。若首次生成调用工具，预取结果可在工具结束后注入下一轮；若直接回答，则没有下一轮可以使用预取结果。</desc>
<defs>
<marker id="cc-memory-prefetch-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
<path d="M2 1L8 5L2 9" fill="none" stroke="#888780" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</marker>
</defs>
<text x="30" y="22" font-size="16" font-weight="600" fill="currentColor">首轮调用工具 · 预取结果进入下一轮</text>
<text x="30" y="68" font-size="13.5" fill="currentColor" opacity="0.65">主 Agent</text>
<text x="100" y="40" font-size="12.5" text-anchor="middle" fill="currentColor" opacity="0.65">用户消息</text>
<circle cx="100" cy="68" r="4" fill="#534AB7"/>
<path d="M104 68 L128 68" fill="none" stroke="#888780" stroke-width="1.5" marker-end="url(#cc-memory-prefetch-arrow)"/>
<rect x="130" y="46" width="100" height="44" rx="8" fill="#EEEDFE" stroke="#534AB7" stroke-width="0.5"/>
<text x="180" y="68" font-size="14" text-anchor="middle" dominant-baseline="central" fill="#26215C">首次生成</text>
<path d="M232 68 L256 68" fill="none" stroke="#888780" stroke-width="1.5" marker-end="url(#cc-memory-prefetch-arrow)"/>
<rect x="258" y="46" width="88" height="44" rx="8" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.5"/>
<text x="302" y="68" font-size="14" text-anchor="middle" dominant-baseline="central" fill="#042C53">执行工具</text>
<path d="M348 68 L372 68" fill="none" stroke="#888780" stroke-width="1.5" marker-end="url(#cc-memory-prefetch-arrow)"/>
<rect x="374" y="46" width="104" height="44" rx="8" fill="#F1EFE8" stroke="#888780" stroke-width="0.5"/>
<text x="426" y="68" font-size="13.5" text-anchor="middle" dominant-baseline="central" fill="#444441">检查 prefetch</text>
<path d="M480 68 L504 68" fill="none" stroke="#888780" stroke-width="1.5" marker-end="url(#cc-memory-prefetch-arrow)"/>
<rect x="506" y="42" width="144" height="52" rx="8" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.5"/>
<text x="578" y="61" font-size="14" text-anchor="middle" dominant-baseline="central" fill="#04342C">下一轮生成</text>
<text x="578" y="79" font-size="12.5" text-anchor="middle" dominant-baseline="central" fill="#085041">带 relevant_memories</text>
<text x="30" y="132" font-size="13.5" fill="currentColor" opacity="0.65">记忆预取</text>
<path d="M100 72 L100 132 L128 132" fill="none" stroke="#888780" stroke-width="1.25" marker-end="url(#cc-memory-prefetch-arrow)"/>
<rect x="130" y="111" width="216" height="42" rx="8" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.5"/>
<text x="238" y="132" font-size="13.5" text-anchor="middle" dominant-baseline="central" fill="#042C53">扫描 → selector → 读取主题文件</text>
<path d="M348 132 L372 132" fill="none" stroke="#888780" stroke-width="1.5" marker-end="url(#cc-memory-prefetch-arrow)"/>
<rect x="374" y="111" width="104" height="42" rx="8" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.5"/>
<text x="426" y="132" font-size="13.5" text-anchor="middle" dominant-baseline="central" fill="#04342C">结果就绪</text>
<path d="M426 110 L426 92" fill="none" stroke="#0F6E56" stroke-width="1.25" stroke-dasharray="4 3" marker-end="url(#cc-memory-prefetch-arrow)"/>
<line x1="30" y1="177" x2="650" y2="177" stroke="currentColor" stroke-width="0.5" opacity="0.25"/>
<text x="30" y="207" font-size="16" font-weight="600" fill="currentColor">首轮直接回答 · 预取结果可能无法参与</text>
<text x="30" y="251" font-size="13.5" fill="currentColor" opacity="0.65">主 Agent</text>
<text x="100" y="225" font-size="12.5" text-anchor="middle" fill="currentColor" opacity="0.65">用户消息</text>
<circle cx="100" cy="251" r="4" fill="#534AB7"/>
<path d="M104 251 L128 251" fill="none" stroke="#888780" stroke-width="1.5" marker-end="url(#cc-memory-prefetch-arrow)"/>
<rect x="130" y="229" width="100" height="44" rx="8" fill="#EEEDFE" stroke="#534AB7" stroke-width="0.5"/>
<text x="180" y="251" font-size="14" text-anchor="middle" dominant-baseline="central" fill="#26215C">首次生成</text>
<path d="M232 251 L274 251" fill="none" stroke="#888780" stroke-width="1.5" marker-end="url(#cc-memory-prefetch-arrow)"/>
<rect x="276" y="229" width="108" height="44" rx="8" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.5"/>
<text x="330" y="251" font-size="14" text-anchor="middle" dominant-baseline="central" fill="#04342C">最终回答</text>
<text x="402" y="255" font-size="12.5" fill="currentColor" opacity="0.62">查询循环结束</text>
<text x="30" y="316" font-size="13.5" fill="currentColor" opacity="0.65">记忆预取</text>
<path d="M100 255 L100 316 L128 316" fill="none" stroke="#888780" stroke-width="1.25" marker-end="url(#cc-memory-prefetch-arrow)"/>
<rect x="130" y="295" width="216" height="42" rx="8" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.5"/>
<text x="238" y="316" font-size="13.5" text-anchor="middle" dominant-baseline="central" fill="#042C53">扫描 → selector → 读取主题文件</text>
<path d="M348 316 L372 316" fill="none" stroke="#888780" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#cc-memory-prefetch-arrow)"/>
<rect x="374" y="295" width="104" height="42" rx="8" fill="#F1EFE8" stroke="#888780" stroke-width="0.5"/>
<text x="426" y="316" font-size="13.5" text-anchor="middle" dominant-baseline="central" fill="#444441">可能已就绪</text>
<path d="M480 316 L504 316" fill="none" stroke="#A32D2D" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#cc-memory-prefetch-arrow)"/>
<rect x="506" y="295" width="144" height="42" rx="8" fill="#FCEBEB" stroke="#A32D2D" stroke-width="0.5"/>
<text x="578" y="316" font-size="13.5" text-anchor="middle" dominant-baseline="central" fill="#501313">没有下一轮可注入</text>
</svg>
</div>

这种设计隐藏了 selector 的延迟，代价是预取并不是一个“回答前必须完成”的同步 RAG 阶段：只有首轮产生了工具调用，预取内容才有机会进入下一次 agent-loop 迭代。因此，把通路 B 描述为“主模型开始生成前一定已经读取主题文件”并不准确。

---

# 六、通路 C：主 Agent 的主动工具检索

前两条自动通路仅向模型提供索引线索或部分正文。主 Agent 仍可自主决定是否调用以下工具：

```text
Read release-merge-freeze.md
Grep "merge freeze" ~/.claude/projects/<project>/memory/
Glob **/*.md
```

该过程包含两个层面：

- `Grep`、`Glob` 和文件读取本身是确定性工具；
- 决定何时调用、搜索什么关键词，仍然是主对话 LLM 的行为。

源码的 memory prompt 还会要求：

- 用户明确说“检查、回忆、记住”时必须访问 memory；
- memory 中的路径、函数和 flag 只是过去某个时间点的声明；
- 在给出当前建议前，应重新检查文件是否存在、函数是否仍能搜到；
- memory 与当前代码冲突时，以当前代码为准，并更新或删除旧记忆。

---

# 七、完整执行流程示例

把三条通路放回同一个问题上。假设 memory 目录中只有 `MEMORY.md` 和 `release-merge-freeze.md`，用户问“在向主干分支合并前，是否发生过与版本发布相关的事故？”

`tengu_moth_copse=false` 时走 A + C：索引里的那行摘要随会话上下文注入，主 Agent 可能据此直接作答，也可能再调用一次 `Read` 补齐事故原因与解冻条件。仅凭最终回答无法判断它究竟读没读主题文件。

`tengu_moth_copse=true` 时走 B + C：`filterInjectedMemoryFiles()` 先去掉 AutoMem 的 `MEMORY.md`，预取扫描主题文件并由 selector 选中 `release-merge-freeze.md`。若主 Agent 首轮产生了工具调用，正文的前 200 行/4 KB 会作为附件进入下一轮，不足则再由主 Agent 读取全文；若首轮直接给出答案，这份附件就赶不上本次回答。

两种模式下还有一条共同的兜底路径：只要用户把问题改成“检查长期记忆：……”，memory prompt 就会要求主 Agent 走通路 C 主动搜索。此时自动预取有没有触发——中文提问不含空格、会话预算耗尽或 flag 未开启——都不再影响结果。

---

# 八、记忆写入机制

除召回机制外，Claude Code 还需要确定记忆的写入主体与执行时机。写入有两条路径：主 Agent 在对话中直接写，或在 turn 结束后由后台 extraction Agent 补充写入。

## 1. 主 Agent 直接写入

`loadMemoryPrompt()` 会将完整的保存规则注入 system prompt。当用户明确提出持久化记忆要求时，主 Agent 先读取已有主题文件避免重复，再新建或更新主题文件；索引模式下还要同步更新 `MEMORY.md`，而 `tengu_moth_copse=true` 时的 `skipIndex` 模式省去了这一步。

## 2. 后台 extraction Agent

如果主 Agent 未写入 memory，查询循环结束后仍可触发 `extractMemories`：

```text
主 Agent 输出最终回复
        ↓
handleStopHooks
        ↓
检查最近消息中是否已执行 memory Write/Edit
        ↓
没有则 runForkedAgent
        ↓
抽取并写入主题文件
```

该路径同样受 feature flag 和运行环境限制，并非在每个版本、每个账户或每个 turn 中都必然执行。

该后台 Agent 运行在权限受到严格限制的沙盒中：它可以使用 `Read`、`Grep`、`Glob` 和只读 Bash 查看内容，但 `Write`、`Edit` 只能作用于 auto-memory 目录；MCP、子 Agent 和具有写入能力的 shell 均不可用。它与主 Agent 的直接写入互斥，同一时刻仅运行一个抽取任务，最多执行 5 个 Agent turn。

## 3. 四类记忆

抽取提示词定义了一个封闭的分类体系（taxonomy）：

| 类型 | 保存内容 | 示例 |
|------|----------|------|
| `user` | 用户角色、目标、偏好、知识水平 | “用户熟悉 Java，但刚接触前端” |
| `feedback` | 用户对工作方式的纠正与肯定 | “无需在每次改动后重复总结 diff” |
| `project` | 无法从代码推导的项目背景和决策 | “移动端新版本上线后方可解除 merge freeze” |
| `reference` | 外部系统的入口 | “线上延迟看板位于某 Grafana dashboard” |

源码尤其强调不要保存：

- 代码模式、目录结构和架构快照；
- Git 历史和最近改动；
- 调试修复步骤；
- 已经写在 `CLAUDE.md` 中的内容；
- 当前任务进度和临时状态。

其目标不是节省磁盘，而是减少**记忆漂移**：代码是活的，几周前保存的文件路径可能已经变成错误信息。

---

# 九、总结

从 Agent 设计角度看，Claude Code Memory 机制的主要参考价值并非某个固定阈值，而是以下三个原则：

1. **索引与正文分离**，控制常驻上下文成本；
2. **自动召回与显式工具互补**，不把成功完全押在单一检索器上；
3. **只保存无法从当前状态推导的知识**，减少长期记忆漂移。

---

# 参考资料

1. [Claude Code 官方文档：How Claude remembers your project](https://code.claude.com/docs/en/memory)
2. [Anthropic Claude Code Releases](https://github.com/anthropics/claude-code/releases)
3. [777genius/claude-code-source-code](https://github.com/777genius/claude-code-source-code)
