---
title: "为什么需要 Harness"
date: "2026-10-14"
tags: ["Harness", "Agent"]
category: "大语言模型"
excerpt: "Harness 是模型权重之外、将模型能力接入实际任务的软件层。本文结合 Claude Code 源码，分析其在上下文管理、工具调度、子 Agent 编排与约束验证中解决的问题。"
---

Harness 一词本义为挽具，即将马的牵引力传递至车辆、并约束其行进方向的装置。在 LLM Agent 中，harness 指位于模型外部、负责将模型能力接入实际任务的软件层。

由于**模型本身是一个无状态函数**：给定一段上下文，输出后续文本。它无法读取文件或执行命令，不保留跨调用的状态，也无法自行判断任务何时终止。这些能力均需由模型之外的系统提供：

<div style="overflow-x:auto">
<svg width="100%" style="max-width:680px;min-width:600px" viewBox="0 0 680 300" role="img">
<title>Agent = 模型 + Harness</title>
<desc>用户任务进入 harness。harness 以模型为核心，周围是上下文组装、工具调度、子 Agent 编排、Agent 循环、错误恢复、权限与沙箱、验证与反馈、状态持久化。harness 向环境发出动作，并把环境返回的观察交还给模型。</desc>
<defs>
<marker id="harness-overview-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
<path d="M2 1L8 5L2 9" fill="none" stroke="#888780" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</marker>
</defs>
<rect x="20" y="126" width="100" height="48" rx="8" fill="#F1EFE8" stroke="#888780" stroke-width="0.5"/>
<text x="70" y="150" font-size="14" text-anchor="middle" dominant-baseline="central" fill="#444441">用户任务</text>
<path d="M122 150 L146 150" fill="none" stroke="#888780" stroke-width="1.5" marker-end="url(#harness-overview-arrow)"/>
<rect x="150" y="20" width="360" height="260" rx="12" fill="currentColor" fill-opacity="0.04" stroke="currentColor" stroke-opacity="0.35" stroke-width="0.8"/>
<text x="168" y="44" font-size="16" font-weight="600" fill="currentColor">Harness</text>
<rect x="166" y="58" width="100" height="40" rx="7" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.5"/>
<text x="216" y="78" font-size="13.5" text-anchor="middle" dominant-baseline="central" fill="#042C53">上下文组装</text>
<rect x="280" y="58" width="100" height="40" rx="7" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.5"/>
<text x="330" y="78" font-size="13.5" text-anchor="middle" dominant-baseline="central" fill="#042C53">工具调度</text>
<rect x="394" y="58" width="100" height="40" rx="7" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.5"/>
<text x="444" y="78" font-size="13.5" text-anchor="middle" dominant-baseline="central" fill="#042C53">子 Agent 编排</text>
<rect x="166" y="130" width="94" height="40" rx="7" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.5"/>
<text x="213" y="150" font-size="13.5" text-anchor="middle" dominant-baseline="central" fill="#042C53">Agent 循环</text>
<rect x="270" y="122" width="120" height="56" rx="9" fill="#EEEDFE" stroke="#534AB7" stroke-width="0.8"/>
<text x="330" y="142" font-size="16" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="#26215C">模型</text>
<text x="330" y="164" font-size="12" text-anchor="middle" dominant-baseline="central" fill="#3C3489">预测下一步</text>
<rect x="400" y="130" width="94" height="40" rx="7" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.5"/>
<text x="447" y="150" font-size="13.5" text-anchor="middle" dominant-baseline="central" fill="#042C53">错误恢复</text>
<rect x="166" y="202" width="100" height="40" rx="7" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.5"/>
<text x="216" y="222" font-size="13.5" text-anchor="middle" dominant-baseline="central" fill="#042C53">权限与沙箱</text>
<rect x="280" y="202" width="100" height="40" rx="7" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.5"/>
<text x="330" y="222" font-size="13.5" text-anchor="middle" dominant-baseline="central" fill="#042C53">验证与反馈</text>
<rect x="394" y="202" width="100" height="40" rx="7" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.5"/>
<text x="444" y="222" font-size="13.5" text-anchor="middle" dominant-baseline="central" fill="#042C53">状态持久化</text>
<text x="330" y="264" font-size="12.5" text-anchor="middle" fill="currentColor" opacity="0.62">模型权重之外的一切</text>
<path d="M512 138 L566 138" fill="none" stroke="#888780" stroke-width="1.5" marker-end="url(#harness-overview-arrow)"/>
<text x="539" y="128" font-size="12" text-anchor="middle" fill="currentColor" opacity="0.65">动作</text>
<path d="M568 162 L514 162" fill="none" stroke="#888780" stroke-width="1.5" marker-end="url(#harness-overview-arrow)"/>
<text x="539" y="180" font-size="12" text-anchor="middle" fill="currentColor" opacity="0.65">观察</text>
<rect x="570" y="100" width="94" height="100" rx="9" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.6"/>
<text x="617" y="126" font-size="15" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="#04342C">环境</text>
<text x="617" y="152" font-size="12.5" text-anchor="middle" dominant-baseline="central" fill="#085041">文件 / 终端</text>
<text x="617" y="174" font-size="12.5" text-anchor="middle" dominant-baseline="central" fill="#085041">网络 / 浏览器</text>
</svg>
</div>

模型决定 Agent 能力的上限，harness 决定该上限能够实现的程度。本文结合 Claude Code 的源码实现，分析 harness 所解决的几类问题，各部分内容概述如下：

| 方面 | 要点 |
|---|---|
| 上下文管理 | 上下文窗口是容量有限的工作区，而非存储。需要控制四个环节：准入、清理、压缩与外置 |
| 工具调度 | 只读调用可以并行，有副作用的调用须串行，耗时任务转入后台 |
| 子 Agent 编排 | 首要作用是上下文隔离，其次才是并行加速；读操作可分派给多个 Agent，写操作宜保持单线程 |
| 约束与验证 | 提示词中的禁止性指令只是请求，不构成约束；危险操作应由权限层拦截，任务完成应由模型无法修改的外部检查判定；异常恢复须设次数上限，保证循环可终止 |
| 长程任务 | 依靠交接文件与版本控制而非模型记忆，将工程团队的交接规范转化为 Agent 可执行的流程 |
---

# 一、Harness 的基本结构

Harness 的核心是一个循环：模型决定下一步动作，harness 负责执行并将结果写回上下文，直至模型不再调用工具。其最小实现如下：

```python
messages = [system_prompt, user_task]

while True:
    reply = model(messages, tools)       # 模型决定下一步
    messages.append(reply)
    if not reply.tool_calls:             # 不再调用工具，视为完成
        break
    for call in reply.tool_calls:
        result = execute(call)           # 实际执行读文件、运行命令等操作
        messages.append(result)          # 将观察结果写回上下文
```

上述代码已构成一个完整的 agent。但要成为可交付实际任务的产品，其中几乎每一行都会扩展为一个独立的子系统：

| 代码 | 需要解决的问题 | 对应的 harness 能力 |
|---|---|---|
| `messages` | 放入哪些内容？超出窗口时如何处理？ | 上下文管理 |
| `execute(call)` | 多个调用能否同时执行？耗时数分钟的命令如何处理？ | 工具调度 |
| `execute(call)` | 如何阻止 `rm -rf` 等危险命令？ | 权限与沙箱 |
| `break` | 模型声称任务完成时，如何确认？ | 验证 |
| `while True` | 出错后如何恢复？单个上下文无法完成任务时如何处理？ | 循环控制、子 Agent、跨会话交接 |

---

# 二、上下文管理

## 1. 上下文长度与性能退化

Anthropic 将上下文的性能退化称为 context rot：上下文中的 token 越多，模型准确召回其中信息的能力越弱。在 agent 场景中，数十轮的文件内容、测试日志和失败尝试不断累积，任务开始时给出的约束被中间结果稀释，模型难以再充分关注。

Harness 的上下文管理可归结为四个问题：**哪些内容可以进入、哪些内容应当清除、窗口将满时如何处理、哪些状态应当外置。**

## 2. 准入控制：限制大块内容进入上下文

成本最低的上下文管理方式，是阻止无用内容进入上下文。Claude Code 在入口处设置了以下几项限制：

- **大输出落盘**：工具结果超过阈值（Bash 为 3 万字符）时，完整内容写入磁盘，模型仅看到开头 2KB 的预览与文件路径，需要细节时再自行 `grep`。
- **限制读取长度**：默认最多读取 2000 行；文件过大时直接报错，并提示使用 `offset`/`limit` 分段读取或先行搜索。
- **重复读取返回占位**：文件未变化时再次读取，不再返回全文，而是返回 “File unchanged since last read”，提示模型参照此前的读取结果。
- **工具定义按需加载**：工具描述本身也占用上下文。据 Anthropic 统计，58 个工具的定义在对话开始前即占用约 55K token。Claude Code 对 MCP 工具默认延迟加载：模型起初只看到工具名，需要时再通过 ToolSearch 获取完整定义。

另一项原则是**按需检索，而非预先填充**。相比在任务开始时用 RAG 将“可能相关”的代码注入上下文，更有效的做法是提供 `grep`、`glob` 等工具，由模型依次浏览目录、搜索关键词，最终只打开所需文件。

> Claude Code 早期曾采用 RAG，后来全面改为 agentic search。其长期记忆同样没有使用向量检索，而是由 Markdown 索引、模型相关性预取与主动工具检索组成，详见 [Claude Code 长期记忆机制](/blog/cc-memory)。

## 3. 清理：移除过期的工具结果

较早读取的文件内容，模型通常不再需要原文；如有需要，可重新读取。Claude Code 的 microcompact 会将较早的工具结果（读文件、搜索、命令输出等）替换为 `[Old tool result content cleared]`，仅保留最近的若干条。Anthropic 认为，清理旧工具结果是最安全、最轻量的压缩方式之一。

> **为避免清理造成信息丢失，系统提示词会预先告知模型：重要信息应在回复中记录，因为原始工具结果之后可能被清除。**

但清理不应删除失败记录。Manus 的经验是：**错误信息应当保留在上下文中**。模型看到此前哪条命令失败、报错内容是什么，才能避免原样重试；若移除失败记录，模型便可能重复同样的错误。

## 4. 压缩：以结构化摘要替代截断

清理之后，上下文仍会持续增长。对于 200K 窗口的模型，Claude Code 在约 167K 时触发自动压缩（为输出预留 2 万 token，另留 1.3 万缓冲）：由模型将完整历史总结为结构化摘要，并以此替换原始对话。

摘要的结构有明确规定。压缩提示词要求覆盖九个部分，包括主要请求与意图、涉及的文件与代码、遇到的错误及修复方式、**全部用户消息**、待办任务、当前工作与下一步；描述下一步时须直接引用原文，标明工作的中断位置。压缩完成后，harness 会重新附上最近读取的 5 个文件（每个最多 5K token）、当前计划与已调用的技能，使模型在压缩后能够直接接续当前工作。

> “全部用户消息”一项尤为关键：**用户提出的约束是上下文中代价最高的信息。**工具结果丢失后可以重新获取，用户约束一旦丢失，模型就可能执行用户明确反对的操作。

## 5. 外置：将状态写入文件

上下文会被清理和压缩，需要长期保持的状态应当存放在上下文之外。文件系统容量不受限、天然持久，且可由 agent 直接操作，适合充当外部上下文：网页内容可以丢弃，只需保留 URL；文件内容可以清除，只需保留路径，需要时即可恢复。

另一种常用方法是**复述目标**。Manus 一次典型任务约需 50 次工具调用，**agent 在执行过程中持续重写 `todo.md`，标记已完成项并更新剩余项，从而将全局目标反复置于上下文末尾（模型注意力最集中的位置），以缓解 lost in the middle 问题。**

Claude Code 的 TodoWrite 采用相同思路：**模型连续 10 轮未更新任务列表时，harness 会插入一条提醒。**

## 6. 上下文与成本、延迟

上下文管理不仅关乎容量，也直接决定成本与延迟。

Agent 每一步都需将不断增长的历史重新输入模型，输出却只是一小段工具调用，因此成本主要由输入决定，KV-cache 命中率成为关键指标：比如 Sonnet 命中缓存的输入价格仅为未命中的 1/10。

**前缀缓存要求请求前缀逐字节一致，任何一处改动都会使其后的缓存全部失效。**由此衍生出一系列 harness 规则：

- 系统提示词开头不放置精确到秒的时间戳，否则每次请求的前缀都不同，缓存无法命中；
- 上下文只追加、不修改，历史消息的序列化方式保持稳定；
- 任务中途不增删工具定义；需要限制可用工具时，在解码阶段屏蔽，而非从工具列表中删除。

Claude Code 在实现上还将系统提示词分为静态与动态两段，以边界标记分隔，使静态部分可跨会话共享缓存；工具列表按名称排序，以保证顺序稳定。旧结果清理同样需要考虑缓存：清理可以节省 token，但会改变前缀、导致缓存失效。因此按时间触发的清理设在距上一次请求 60 分钟之后，此时服务端缓存（有效期 1 小时）已经过期，清理不会额外造成缓存失效。

---

# 三、工具调度：串行、并行与异步

一次模型回复中可能包含多个工具调用，它们在依赖关系与耗时上各不相同。Harness 需要据此判断：**哪些调用可以并行执行，哪些必须串行，哪些应当转入后台。**

<div style="overflow-x:auto">
<svg width="100%" style="max-width:680px;min-width:600px" viewBox="0 0 680 330" role="img">
<title>串行、并行与异步三种工具调度方式</title>
<desc>串行时三次读取和一次编辑依次执行；并行时三次读取同时发出，编辑单独执行，总耗时约为一次读取加一次编辑；异步时完整测试在后台运行，主线继续读取和编辑，测试完成后以通知形式回到主线，再根据结果修复。</desc>
<defs>
<marker id="harness-tools-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
<path d="M2 1L8 5L2 9" fill="none" stroke="#0F6E56" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</marker>
</defs>
<text x="40" y="22" font-size="16" font-weight="600" fill="currentColor">串行 · 逐个依次执行</text>
<rect x="40" y="36" width="96" height="30" rx="6" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.5"/>
<text x="88" y="51" font-size="13" text-anchor="middle" dominant-baseline="central" fill="#042C53">读文件 A</text>
<rect x="140" y="36" width="96" height="30" rx="6" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.5"/>
<text x="188" y="51" font-size="13" text-anchor="middle" dominant-baseline="central" fill="#042C53">读文件 B</text>
<rect x="240" y="36" width="96" height="30" rx="6" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.5"/>
<text x="288" y="51" font-size="13" text-anchor="middle" dominant-baseline="central" fill="#042C53">读文件 C</text>
<rect x="340" y="36" width="80" height="30" rx="6" fill="#FAEEDA" stroke="#BA7517" stroke-width="0.5"/>
<text x="380" y="51" font-size="13" text-anchor="middle" dominant-baseline="central" fill="#633806">编辑</text>
<text x="436" y="51" font-size="12.5" dominant-baseline="central" fill="currentColor" opacity="0.65">耗时 ≈ 3 次读取 + 1 次编辑</text>
<line x1="40" y1="84" x2="640" y2="84" stroke="currentColor" stroke-width="0.5" opacity="0.25"/>
<text x="40" y="106" font-size="16" font-weight="600" fill="currentColor">并行 · 只读调用一起发出，写入单独执行</text>
<rect x="40" y="118" width="96" height="22" rx="5" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.5"/>
<text x="88" y="129" font-size="12.5" text-anchor="middle" dominant-baseline="central" fill="#042C53">读文件 A</text>
<rect x="40" y="143" width="96" height="22" rx="5" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.5"/>
<text x="88" y="154" font-size="12.5" text-anchor="middle" dominant-baseline="central" fill="#042C53">读文件 B</text>
<rect x="40" y="168" width="96" height="22" rx="5" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.5"/>
<text x="88" y="179" font-size="12.5" text-anchor="middle" dominant-baseline="central" fill="#042C53">读文件 C</text>
<rect x="140" y="143" width="80" height="22" rx="5" fill="#FAEEDA" stroke="#BA7517" stroke-width="0.5"/>
<text x="180" y="154" font-size="12.5" text-anchor="middle" dominant-baseline="central" fill="#633806">编辑</text>
<text x="236" y="154" font-size="12.5" dominant-baseline="central" fill="currentColor" opacity="0.65">耗时 ≈ 1 次读取 + 1 次编辑</text>
<line x1="40" y1="206" x2="640" y2="206" stroke="currentColor" stroke-width="0.5" opacity="0.25"/>
<text x="40" y="228" font-size="16" font-weight="600" fill="currentColor">异步 · 耗时任务转入后台，完成后通知</text>
<rect x="40" y="242" width="420" height="26" rx="6" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.6" stroke-dasharray="4 3"/>
<text x="250" y="255" font-size="12.5" text-anchor="middle" dominant-baseline="central" fill="#04342C">完整测试套件 · 后台运行</text>
<rect x="40" y="274" width="90" height="26" rx="6" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.5"/>
<text x="85" y="287" font-size="12.5" text-anchor="middle" dominant-baseline="central" fill="#042C53">读代码</text>
<rect x="134" y="274" width="80" height="26" rx="6" fill="#FAEEDA" stroke="#BA7517" stroke-width="0.5"/>
<text x="174" y="287" font-size="12.5" text-anchor="middle" dominant-baseline="central" fill="#633806">改文档</text>
<rect x="218" y="274" width="90" height="26" rx="6" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.5"/>
<text x="263" y="287" font-size="12.5" text-anchor="middle" dominant-baseline="central" fill="#042C53">读代码</text>
<rect x="312" y="274" width="80" height="26" rx="6" fill="#FAEEDA" stroke="#BA7517" stroke-width="0.5"/>
<text x="352" y="287" font-size="12.5" text-anchor="middle" dominant-baseline="central" fill="#633806">补注释</text>
<path d="M462 255 C478 255 484 262 484 270" fill="none" stroke="#0F6E56" stroke-width="1.4" marker-end="url(#harness-tools-arrow)"/>
<text x="490" y="255" font-size="12" dominant-baseline="central" fill="currentColor" opacity="0.7">完成通知</text>
<rect x="476" y="274" width="150" height="26" rx="6" fill="#EEEDFE" stroke="#534AB7" stroke-width="0.5"/>
<text x="551" y="287" font-size="12.5" text-anchor="middle" dominant-baseline="central" fill="#26215C">根据测试结果修复</text>
<text x="40" y="320" font-size="12.5" fill="currentColor" opacity="0.62">主线无需等待测试，测试结束后以通知形式插入对话</text>
</svg>
</div>

## 1. 并行：只读调用可同时执行

例如模型需要读取 8 个文件：逐个读取要经历 8 轮“模型生成 → 执行工具 → 结果回填”，一次性发出 8 个读取请求则只需 1 轮。

**但并行需要以安全为前提。Claude Code 为每个工具标注了是否可以安全并发：**

- 读文件、Grep、Glob 等只读工具可以并发；
- Bash 取决于具体命令：`ls`、`git status` 等被判定为只读的命令可以并发，`npm install` 则不可以；
- 未声明的工具默认视为不可并发的写操作，以牺牲部分速度为代价规避并发写入风险。

模型一次给出的多个调用会被划分为若干批次：连续的可并发调用合为一批并行执行（默认最多 10 个），不可并发的调用单独成批、独占执行。无论各调用的完成顺序如何，结果均按原始顺序返回给模型。

## 2. 串行：有副作用的调用须依次执行

写操作之间往往存在隐含依赖：

- 两个 Edit 同时修改同一文件，后写入者会覆盖先写入者的修改；
- `mkdir build` 与 `cd build && cmake ..` 同时执行，第二条命令可能在目录创建之前即已失败；
- 修改代码与运行测试的顺序若颠倒，测试结果便失去意义。

Claude Code 的流式工具执行器对并行批次还有一条规则：**仅当 Bash 出错时，才取消同批次的其他调用**。因为 Bash 命令之间常存在隐含的依赖链（`mkdir` 失败后，后续命令均失去意义）；而 Read、WebFetch 彼此独立，单个调用失败不应影响其他调用。被取消的调用会收到 “Cancelled: parallel tool call ... errored” 的说明，使模型能够了解取消原因。

## 3. 流式：生成与执行重叠

模型输出以 token 为单位流式生成。若一次回复包含三个工具调用，无需等待全部生成完毕再执行：第一个调用的参数一旦完整，即可开始执行。Claude Code 的 StreamingToolExecutor 采用的这一方式，使工具执行与模型生成在时间上重叠。

## 4. 异步：耗时任务转入后台

开发服务器、耗时较长的测试、等待交互输入的命令，在前台执行时都会使 agent 长时间阻塞。harness 可采取以下措施处理：

- **后台运行**：长时间运行的命令在后台执行，模型继续处理其他工作；**命令结束时，harness 将 “Background command ... completed (exit code N)” 形式的通知插入对话；**
- **拦截无效等待**：在启用监视工具的版本中，单独的 `sleep 5` 等命令会被直接拦截，并提示改用后台运行或监视工具。以固定时长的 `sleep` 等待后再检查，属于低效的轮询方式；
- **识别阻塞于交互提示的命令**：后台命令 45 秒无新输出、且输出末尾形似 `(y/n)` 等提示时，harness 会告知模型该命令可能正在等待交互输入，应将其终止，并改用 `echo y | command` 或非交互参数重新运行。

子 Agent 同样可以在后台运行。派出子 Agent 后，主 Agent 会被明确告知不要 sleep 或轮询，子 Agent 完成时将自动收到通知。

---

# 四、子 Agent 编排

## 1. 子 Agent 的首要作用：上下文隔离

多 Agent 通常被理解为通过分工提升效率。但在编码 agent 中，子 Agent 更重要的作用是**隔离上下文**：探索过程中读取的大量文件留在子 Agent 自己的上下文中，主 Agent 只收到结论。

<div style="overflow-x:auto">
<svg width="100%" style="max-width:680px;min-width:600px" viewBox="0 0 680 316" role="img">
<title>子 Agent 的上下文隔离</title>
<desc>上半部分：不拆分时，几十次搜索与读文件的结果全部留在主 Agent 上下文里，修改与验证只剩很小的空间。下半部分：拆分后，搜索与读文件发生在子 Agent 的独立上下文中，用完即弃；主 Agent 只收到一份 1 到 2 千 token 的报告，修改与验证之后仍有充足余量。</desc>
<defs>
<marker id="harness-subagent-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
<path d="M2 1L8 5L2 9" fill="none" stroke="#0F6E56" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</marker>
</defs>
<text x="40" y="22" font-size="16" font-weight="600" fill="currentColor">不拆分 · 探索过程全部留在主 Agent 的上下文里</text>
<text x="40" y="56" font-size="13.5" dominant-baseline="central" fill="currentColor" opacity="0.65">主 Agent</text>
<rect x="130" y="38" width="510" height="36" rx="6" fill="none" stroke="currentColor" stroke-opacity="0.35" stroke-width="0.8"/>
<rect x="130" y="38" width="60" height="36" rx="6" fill="#EEEDFE" stroke="#534AB7" stroke-width="0.5"/>
<text x="160" y="56" font-size="13" text-anchor="middle" dominant-baseline="central" fill="#26215C">任务</text>
<rect x="190" y="38" width="320" height="36" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.5"/>
<text x="350" y="56" font-size="13" text-anchor="middle" dominant-baseline="central" fill="#042C53">几十次搜索与读文件的原始结果</text>
<rect x="510" y="38" width="110" height="36" fill="#FAEEDA" stroke="#BA7517" stroke-width="0.5"/>
<text x="565" y="56" font-size="13" text-anchor="middle" dominant-baseline="central" fill="#633806">修改与验证</text>
<text x="130" y="96" font-size="12.5" fill="currentColor" opacity="0.62">修改与验证的空间被压缩，早期约束被大量中间结果淹没</text>
<line x1="40" y1="116" x2="640" y2="116" stroke="currentColor" stroke-width="0.5" opacity="0.25"/>
<text x="40" y="144" font-size="16" font-weight="600" fill="currentColor">拆分 · 子 Agent 在独立上下文里探索，只交回结论</text>
<text x="40" y="171" font-size="13.5" dominant-baseline="central" fill="currentColor" opacity="0.65">子 Agent</text>
<text x="40" y="190" font-size="12" dominant-baseline="central" fill="currentColor" opacity="0.5">用完即弃</text>
<rect x="130" y="160" width="510" height="36" rx="6" fill="none" stroke="currentColor" stroke-opacity="0.35" stroke-width="0.8" stroke-dasharray="4 3"/>
<rect x="130" y="160" width="60" height="36" rx="6" fill="#EEEDFE" stroke="#534AB7" stroke-width="0.5"/>
<text x="160" y="178" font-size="13" text-anchor="middle" dominant-baseline="central" fill="#26215C">说明</text>
<rect x="190" y="160" width="320" height="36" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.5"/>
<text x="350" y="178" font-size="13" text-anchor="middle" dominant-baseline="central" fill="#042C53">几十次搜索与读文件的原始结果</text>
<path d="M350 198 C350 222 215 216 215 238" fill="none" stroke="#0F6E56" stroke-width="1.4" marker-end="url(#harness-subagent-arrow)"/>
<text x="362" y="222" font-size="12" fill="currentColor" opacity="0.7">只回传 1~2K token 的报告</text>
<text x="40" y="262" font-size="13.5" dominant-baseline="central" fill="currentColor" opacity="0.65">主 Agent</text>
<rect x="130" y="244" width="510" height="36" rx="6" fill="none" stroke="currentColor" stroke-opacity="0.35" stroke-width="0.8"/>
<rect x="130" y="244" width="60" height="36" rx="6" fill="#EEEDFE" stroke="#534AB7" stroke-width="0.5"/>
<text x="160" y="262" font-size="13" text-anchor="middle" dominant-baseline="central" fill="#26215C">任务</text>
<rect x="190" y="244" width="50" height="36" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.5"/>
<text x="215" y="262" font-size="13" text-anchor="middle" dominant-baseline="central" fill="#04342C">报告</text>
<rect x="240" y="244" width="110" height="36" fill="#FAEEDA" stroke="#BA7517" stroke-width="0.5"/>
<text x="295" y="262" font-size="13" text-anchor="middle" dominant-baseline="central" fill="#633806">修改与验证</text>
<text x="495" y="262" font-size="12.5" text-anchor="middle" dominant-baseline="central" fill="currentColor" opacity="0.55">余量充足</text>
<text x="130" y="304" font-size="12.5" fill="currentColor" opacity="0.62">主 Agent 仅为结论承担上下文成本</text>
</svg>
</div>

Claude Code 的实现严格遵循这一原则：普通子 Agent 启动时不携带任何对话历史，仅有主 Agent 编写的任务说明，文件读取记录也从空白开始；结束时，只有其最后一条消息的文本返回主 Agent，中间的工具调用全部保留在子 Agent 内部。

这也意味着，**任务说明是子 Agent 获取信息的唯一来源**。Claude Code 对模型的指导是：每次调用都从零开始，必须提供完整的任务描述；并强调 “Never delegate understanding.”，**即可以委派搜索，但不应委派对问题本身的理解。**

## 2. 子 Agent 类型：权限与成本

Claude Code 内置了几类子 Agent，主要区别在于权限与所用模型：

| 类型 | 权限范围 | 设计意图 |
|---|---|---|
| Explore | 只读：可搜索、读取文件，不可编辑、写入或派生子 Agent | 快速检索代码库；对外部用户默认使用成本更低、速度更快的 Haiku |
| Plan | 只读，使用与主 Agent 相同的模型 | 调研后给出实现方案，不修改代码 |
| general-purpose | 全部工具 | 需要执行修改的多步任务 |
| fork | 继承主 Agent 的完整上下文 | 需要背景信息的并行任务；请求前缀与主 Agent 逐字节一致，可共享提示词缓存 |

以下细节体现了 harness 对规模化运行的考量：

- 对外部用户，子 Agent 不可再派生子 Agent；fork 出的子 Agent 也会被明确告知 “Do NOT spawn sub-agents; execute directly”，从结构上避免递归派生失控；
- Explore 子 Agent 不加载 CLAUDE.md，以降低高频调用下的上下文开销。

## 3. 多 Agent 的适用边界

多 Agent 更适用于读操作，而非写操作。调研、搜索等任务的产出是信息，可由多个 Agent 并行收集，再由单一 Agent 汇总。编码任务的每处改动都包含风格、接口与命名上的决策，多个 Agent 分别修改时，各自的改动单独看均合理，合并后却可能出现风格不一致、接口不匹配等冲突。

因此更稳妥的做法是**让写操作保持单线程，额外的 Agent 只负责提供信息和判断，不直接修改代码。**

## 4. 独立审查

Agent 评价自身产出时存在明显的自我偏好。Anthropic 观察到，让 agent 为自己的工作评分时，即使质量明显平庸，它也往往给出自信的正面评价。将生成与评估拆分给不同的 Agent，由上下文独立的评估者检查产出，可以显著提升最终质量。

---

# 五、约束与验证

写在上下文中的禁止性指令只是请求，而非约束：模型可能误解、遗忘，或在长链推理后认定当前属于例外情况。可靠的约束必须位于模型之外。

## 1. 权限：独立于模型的判断层

Claude Code 的权限系统提供多种模式：逐项确认的 `default`、只读的 `plan`、自动接受文件编辑的 `acceptEdits`，以及由分类器自动审批的 `auto`。其中分类器只依据用户消息与工具调用进行判断，**不参考 agent 自己生成的解释文字**，避免模型生成的文字影响审批结果。

另一机制是 `hooks`（**在工具调用前后及会话结束前插入用户自定义的确定性逻辑**），例如：

- PreToolUse：命令中包含 `git push --force` 时直接拦截；
- PostToolUse：每次编辑文件后自动运行格式化与 lint，并将报错反馈给模型；
- Stop：测试未通过时，不允许 agent 结束任务。

## 2. 完成判定：依赖外部证据

模型常在未充分测试时就将功能标记为完成。更隐蔽的是针对测试的投机行为，为特定测试编写特例、直接返回期望值，甚至修改测试本身，或篡改计时器与评测程序。

应对思路是将“完成”转化为可机械检验的条件：

- 为任务维护一份功能清单，每项带有 `passes: false` 字段，只有端到端测试通过后才能改为 `true`，并明确禁止删除或修改测试。清单采用 JSON 而非 Markdown，因为模型较少随意改写 JSON 文件；
- 在 agent 退出前强制插入一轮验证。LangChain 在不更换模型的情况下，通过包括这一项在内的 harness 改动，将 Terminal-Bench 2.0 得分从 52.8% 提升至 66.5%。

这些方法的共同点是：**不依赖模型对自身工作的判断，而依赖模型无法随意改写的外部信号。**

## 3. 异常恢复：保证循环可终止

Claude Code 的主循环本质上仍是一个 `while True`：调用模型、执行工具、进入下一轮。但大部分代码用于处理正常路径之外的情况：

- **输出被截断**：先以更高的输出上限重试一次；仍不足时注入续写消息，要求模型不道歉、不复述，直接从中断处继续，最多 3 次；
- **上下文超长**：先压缩历史，再重试；
- **模型不可用**：切换至备用模型，**为已发出但尚未返回结果的工具调用补充占位结果，以保证消息序列合法**。

每个恢复分支均设有次数上限，并记录本轮继续执行的原因，防止同一恢复手段被反复触发。**模型只负责决定下一步，harness 则需保证整个循环能够终止。**

---

# 六、长程任务的跨会话交接

当任务持续数十小时、跨越多个上下文窗口时，上下文管理问题会以另一种形式出现。Anthropic 将其类比为：

> 想象一个软件项目由轮班的工程师负责，而每个新来的工程师都对上一班发生的事毫无记忆。

他们最初发现，仅依靠压缩并不足够。Agent 会出现两类错误：一是试图一次性完成整个应用，在上下文耗尽时留下大量未完成且无记录的功能，后续会话只能推测此前的进度；二是后续的 agent 看到已有较多进展，便宣布任务完成。

最终的 harness 将工作划分为两种角色：

```text
初始化 Agent（只运行一次）
  ├─ 编写 init.sh：一键启动开发环境
  ├─ 编写功能清单：200 多项，全部标记为未通过
  ├─ 创建 claude-progress.txt：进度日志
  └─ 完成首次 git commit

编码 Agent（每个会话重复）
  1. 读取进度日志与 git log，了解上一会话的进度
  2. 运行 init.sh 与基础测试，确认环境未被上一会话破坏
  3. 从清单中选择一个未通过的功能，仅实现该功能
  4. 执行端到端测试，通过后再更新状态
  5. 提交 git，更新进度日志
```

**Harness 的许多工作，本质上是将成熟的工程实践转化为 agent 可遵循的形式。**如上述流程对应人类工程团队的日常规范（需求清单、交接文档、小步提交、先验证再修改）。

---

# 参考资料

1. LangChain. *Improving Deep Agents with Harness Engineering*. LangChain Blog, 2026. [https://www.langchain.com/blog/improving-deep-agents-with-harness-engineering](https://www.langchain.com/blog/improving-deep-agents-with-harness-engineering)
2. Anthropic. *Effective context engineering for AI agents*. [https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
3. Yichao "Peak" Ji. *Context Engineering for AI Agents: Lessons from Building Manus*. [https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)
4. Cognition. *Multi-Agents: What's Actually Working*. 2026. [https://cognition.com/blog/multi-agents-working](https://cognition.com/blog/multi-agents-working)
5. Harrison Chase. *How and when to build multi-agent systems*. LangChain Blog, 2025. [https://www.langchain.com/blog/how-and-when-to-build-multi-agent-systems](https://www.langchain.com/blog/how-and-when-to-build-multi-agent-systems)
6. Anthropic. *Introducing advanced tool use on the Claude Developer Platform*. [https://www.anthropic.com/engineering/advanced-tool-use](https://www.anthropic.com/engineering/advanced-tool-use)
7. Anthropic. *Effective harnesses for long-running agents*. [https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
8. Anthropic. *Harness design for long-running application development*. [https://www.anthropic.com/engineering/harness-design-long-running-apps](https://www.anthropic.com/engineering/harness-design-long-running-apps)
9. Anthropic. *Claude Code auto mode*. [https://www.anthropic.com/engineering/claude-code-auto-mode](https://www.anthropic.com/engineering/claude-code-auto-mode)
10. Gergely Orosz. *How Claude Code is built*. The Pragmatic Engineer, 2025. [https://newsletter.pragmaticengineer.com/p/how-claude-code-is-built](https://newsletter.pragmaticengineer.com/p/how-claude-code-is-built)
11. Latent Space. *Claude Code: Anthropic's Agent in Your Terminal*. 2025. [https://www.latent.space/p/claude-code](https://www.latent.space/p/claude-code)
12. [777genius/claude-code-source-code-full](https://github.com/777genius/claude-code-source-code-full)
