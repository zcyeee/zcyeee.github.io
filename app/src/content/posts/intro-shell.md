---
title: "Shell 入门"
date: "2025-03-14"
tags: ["Shell", "Bash", "新手入门"]
category: "工程知识"
excerpt: "从脚本结构、变量参数到流程控制、函数与调试，梳理 Bash 脚本常见语法，方便快速查阅。"
---

面向初步接触 Shell 脚本的同学，按常见开发场景整理核心语法。

---

# 一、脚本基础知识
## 1. 指定解释器
脚本首行通常写为：

```bash
#!/bin/bash
```

含义是“使用 Bash 执行当前脚本”。例如：

```bash
#!/bin/bash
echo "Hello Shell"
```

## 2. 注释写法
单行注释使用 `#`：

```bash
# 这是一行注释
echo "Hello World"  # 行尾注释
```

Bash 没有官方多行注释语法，常见“模拟写法”如下：

```bash
: '
这是第一行注释
这是第二行注释
'
echo "不会执行注释里的内容"
```

## 3. 命令执行与拼接
常见拼接方式：

```bash
# 无论 command1 成功与否都执行 command2
command1 ; command2

# command1 成功才执行 command2
command1 && command2

# command1 失败才执行 command2
command1 || command2
```

示例：

```bash
cd /tmp && touch test.txt && ls -l test.txt
cp file.txt /dest || echo "复制失败"
```

## 4. 输入输出与重定向
`echo` 用于输出，重定向用于写入或读取文件：

```bash
echo "简单输出"
echo -e "第一行\n第二行"

echo "新内容" > test.txt
echo "新增内容" >> test.txt
```

## 5. 统计行数
在统计行数时，`wc -l` 很常用：
- `wc`：word count，统计信息
- `-l`：line，按行计数

```bash
wc -l < test.txt
```

---

# 二、变量与参数
## 1. 变量定义与使用
变量定义时，**等号两边不能有空格**：

```bash
name="Shell脚本"
age=20

echo "名称：$name，年龄：$age"
echo "文件名：${name}_script.sh"
```

只读变量与删除变量：

```bash
readonly version="1.0"
unset name
```

## 2. 环境变量与常见系统变量
环境变量可通过 `export` 传递给子进程：

```bash
export PATH="$PATH:/new/bin"
export PROJECT_DIR="/home/user/project"
```

常见系统变量：
- `$HOME`：当前用户家目录
- `$PWD`：当前工作目录
- `$USER`：当前用户名
- `$?`：上一条命令退出状态（0 为成功）
- `$$`：当前进程 ID

示例：

```bash
echo "用户：$USER，目录：$HOME"
ls /nonexist_dir || echo "退出状态：$?"
```

## 3. 脚本参数传递
位置参数：

```bash
#!/bin/bash
echo "脚本名：$0"
echo "第一个参数：$1"
echo "第二个参数：$2"
```

特殊参数：
- `$#`：参数总数
- `$*`：所有参数（作为一个整体）
- `$@`：所有参数（保留参数边界，循环中更常用）

```bash
#!/bin/bash
echo "参数总数：$#"
echo "所有参数(\$*)：$*"
echo "所有参数(\$@)：$@"

for param in "$@"; do
  echo "参数：$param"
done
```

---

# 三、流程控制
## 1. 条件判断（if / elif / else）

```bash
if 条件; then
  echo "条件成立"
elif 其他条件; then
  echo "命中其他分支"
else
  echo "条件不成立"
fi
```

常见判断速查：
- 文件：`-f`（普通文件）、`-d`（目录）、`-e`（存在）
- 字符串：`=`、`!=`、`-z`（空）、`-n`（非空）
- 数值：`-eq`、`-ne`、`-gt`、`-lt`、`-ge`、`-le`

示例：

```bash
file_path="test.txt"
if [[ -e $file_path ]]; then
  echo "文件存在"
else
  echo "文件不存在"
fi
```

## 2. 循环结构（for / while / until）
`for` 列表遍历：

```bash
fruits=("apple" "banana" "orange")
for fruit in "${fruits[@]}"; do
  echo "水果：$fruit"
done
```

`for` C 风格循环：

```bash
for ((i=1; i<=5; i++)); do
  echo "循环次数：$i"
done
```

`while` 读取文件：

```bash
file="test.txt"
while read -r line; do
  echo "行内容：$line"
done < "$file"
```

`until`（条件为假时继续）：

```bash
count=1
until [[ $count -gt 3 ]]; do
  echo "计数：$count"
  ((count++))
done
```

## 3. 分支匹配（case）
适合处理多分支命令参数：

```bash
case $1 in
  start)
    echo "启动服务..."
    ;;
  stop)
    echo "停止服务..."
    ;;
  restart)
    echo "重启服务..."
    ;;
  *)
    echo "无效参数，支持 start/stop/restart"
    ;;
esac
```

---

# 四、函数定义与使用
## 1. 基本结构

```bash
function say_hello {
  echo "Hello from function!"
  echo "第一个参数：$1"
}

say_hello "参数1"
```

## 2. 参数与返回值
Shell 函数通常通过标准输出“返回结果”：

```bash
function add {
  local result=$(( $1 + $2 ))
  echo "$result"
}

sum=$(add 5 3)
echo "总和：$sum"
```

`return` 返回的是状态码（0~255）：

```bash
function check_file {
  if [[ -f $1 ]]; then
    return 0
  else
    return 1
  fi
}

check_file "test.txt"
if [[ $? -eq 0 ]]; then
  echo "文件存在"
else
  echo "文件不存在"
fi
```

## 3. 作用域
Bash 变量默认是全局变量，函数内推荐使用 `local` 限制作用域：

```bash
global_var="全局变量"

function test_scope {
  local local_var="局部变量"
  echo "函数内访问全局变量：$global_var"
  echo "函数内访问局部变量：$local_var"
  global_var="函数内修改全局变量"
}

test_scope
echo "外部访问全局变量：$global_var"
```

---

# 五、常用高级能力
## 1. 进程管理（& / nohup / wait）

后台执行 `&`：

```bash
./script.sh &
echo "后台任务 PID: $!"
```

`nohup` 防止进程因终端关闭而终止：

```bash
nohup ./long_running_script.sh > output.log 2>&1 &
# nohup: 不受挂起信号影响
# 2>&1: 标准输出和错误输出都重定向到 output.log
# &: 放到后台运行
```

`wait` 等待后台任务完成：

```bash
./task1.sh &
./task2.sh &
wait  # 等待所有后台任务完成
echo "所有任务结束"
```

等待指定后台进程：

```bash
./script.sh &
PID=$!
./other_script.sh
wait $PID
echo "指定进程执行完毕"
```

## 2. 数组操作

```bash
arr=("a" "b" "c")
arr[3]="d"

echo "第一个元素：${arr[0]}"
echo "所有元素：${arr[@]}"
echo "元素个数：${#arr[@]}"

for element in "${arr[@]}"; do
  echo "数组元素：$element"
done
```

## 3. 正则匹配（`=~`）

```bash
email="test@example.com"
if [[ $email =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
  echo "邮箱格式合法"
else
  echo "邮箱格式不合法"
fi
```

## 4. 文本搜索（grep）

基础用法：

```bash
grep "keyword" file.txt          # 在文件中搜索关键词
grep -i "keyword" file.txt       # 忽略大小写
grep -n "keyword" file.txt       # 显示行号
grep -v "keyword" file.txt       # 反向匹配，显示不包含关键词的行
```

常用选项：

```bash
grep -r "keyword" ./dir/         # 递归搜索目录下所有文件
grep -c "keyword" file.txt      # 统计匹配行数
grep -e "pattern1" -e "pattern2" file.txt  # 多个模式匹配
grep -E "error|warning" log.txt # 扩展正则匹配多个模式
grep -o "pattern" file.txt       # 只输出匹配部分
```

配合管道使用：

```bash
ps aux | grep "nginx"           # 查找 nginx 进程
dmesg | grep -i "error"         # 查找系统错误
cat log.txt | grep "2024-01-01"  # 查找特定日期日志
```

## 5. 调试技巧
打印执行过程：

```bash
bash -x script.sh
```

错误捕获：

```bash
trap 'echo "执行到第 $LINENO 行出错，错误状态：$?"' ERR
echo "正常执行"
undefined_command
echo "不会执行到这里"
```

> [!WARNING]
> `rm -rf`、批量覆盖写入（`>`）等高风险操作，建议先在测试目录验证，再用于生产环境。

---

# 六、一些建议
- 开头统一写 `#!/bin/bash`，并保持脚本可执行权限。
- 涉及变量时尽量加双引号，减少空格和通配符引发的问题。
- 参数转发优先使用 `"$@"`，避免参数边界被破坏。
- 对关键命令检查退出状态，必要时及时 `exit 1`。
- 使用 `bash -x`、`trap ... ERR` 组合快速定位问题。
