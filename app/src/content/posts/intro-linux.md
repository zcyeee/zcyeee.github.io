---
title: "Linux 入门"
date: "2026-03-12"
tags: ["Linux", "新手入门"]
category: "工程知识"
excerpt: "从文件管理到进程监控、远程连接与隧道转发，整理 Linux 入门常用命令与实战场景，便于快速查阅与上手。"
---

面向刚开始使用 Linux 的同学，按场景梳理常用命令与操作。

---

# 一、文件与目录核心操作
## 1. 新建文件夹：mkdir
```bash
mkdir folder            # 创建单个文件夹
mkdir folder1 folder2   # 同时创建多个文件夹
```
`-p`：parents，递归创建多级目录（父目录不存在时自动创建）  
```bash
mkdir -p project/code/data
```

## 2. 创建文件：touch
创建空文件（若文件已存在，会更新其修改时间，内容不变）  
```bash
touch file          # 创建单个文件
touch file1 file2   # 同时创建多个文件
```
场景：快速创建配置文件、日志文件等，例如 touch requirements.txt 用于记录Python依赖。

## 3. 切换工作目录：cd
```bash
cd directory_path  # 如 cd /home/work/project（绝对路径）或 cd ../code（相对路径）
```
高频快捷键：
```bash
cd ~   # 切换当前用户的家目录
cd     # 切换当前用户的家目录
cd ..  # 切换到上一级目录
cd -   # 切换到上一次所在的目录（相当于“返回”）
```

## 4. 查看目录内容：ls
```bash
ls    # 显示非隐藏文件/文件夹（默认不显示以.开头的隐藏文件）
ls directory_name   # 显示指定目录的内容，如 ls /home/work
```

`-a`：all，显示所有文件，包括隐藏文件（以.开头的文件）  
`-l`：long，以详细列表形式显示（包含权限、大小、修改时间等信息）  
`-h`：human-readable，以人类可读的单位显示大小（如K、M、G）  
```bash
ls -a    # 会显示.（当前目录）、..（上一级目录）及所有隐藏文件
ls -l    # 等价于 ll（很多系统的别名），显示权限、所有者、大小、时间等
ls -lh   # 显示文件大小为 1.5K、2.3M 等，更直观
ls -lha  # 显示所有文件的详细信息并优化大小显示
```

## 5. 删除文件/文件夹：rm
```bash
rm file          # 删除单个文件
rm file1 file2   # 同时删除多个文件
```

`-r`：recursive，递归删除**文件夹**及其下所有内容（会逐个询问是否删除，需手动输入 y 确认）  
`-rf`：recursive force，强制递归删除**文件夹**（不询问直接删除）  
```bash
rm -r folder   # 删除前会提示 "是否删除xxx？"
rm -rf folder  # 瞬间删除整个文件夹及内容，无法恢复
```
注意：rm 删除的文件不会进入“回收站”，删除前务必确认路径正确，尤其是 rm -rf / 等致命操作绝对禁止！

## 6. 查看文件/目录大小：du

`-s`：summary，汇总单个目录的大小  
`-h`：human-readable，以人类可读单位显示（如 2.5G）

查看当前**文件夹整体大小**：  
```bash
du -sh  # -s 表示汇总单个目录的大小，-h 表示以人类可读单位显示（如 2.5G）
```
查看当前文件夹下所有非隐藏**文件/文件夹**的大小：  
```bash
du -sh *  # * 匹配所有非隐藏文件/文件夹，列出每个的大小
```
查看**隐藏文件/文件夹**的大小（以 . 开头的文件）：  
```bash
du -sh .[!.]*  # .[!.]* 匹配所有以.开头且第二个字符不是.的文件（即隐藏文件，排除.和..）
```
查看**特定文件/文件夹**的大小，直接在命令后加路径：  
```bash
du -sh ./models  # 查看当前目录下 models 文件夹的大小
du -sh ./large_file.csv  # 查看单个大文件的大小
```


## 7. 复制文件/目录：cp

`-r`：recursive，递归复制（文件夹）  
`-p`：preserve，保留源文件的属性信息  
`-f`：force，强制覆盖目标文件而不提示  

```bash
# 复制单个文件到目标目录
cp test.txt ./backup/  # 将test.txt复制到当前目录的backup文件夹

# 复制目录（必须加-r）
cp -r ./models ./backup/  # 复制models文件夹及所有内容到backup

# 强制覆盖并保留属性
cp -rfp ./config.ini /etc/  # 强制复制config.ini到/etc，保留原权限和修改时间

# 批量复制多个文件
cp *.csv ./data/  # 将当前目录所有.csv文件复制到data文件夹
```

## 8. 移动/重命名文件：mv
① 移动文件/目录到新位置；  
② 重命名文件/目录（同一目录下移动即重命名）。  


```bash
# 重命名文件（同一目录下）
mv old_name.txt new_name.txt

# 移动文件到其他目录
mv report.pdf ./docs/reports/

# 移动目录
mv ./temp_logs ./logs/
```

## 9. 查找文件/目录：find
按名称、类型、大小等条件搜索文件。  
基本语法：`find 搜索路径 [条件] [附加动作]`

**常用搜索条件：**  
`-name`：按名称查找（如 `"*.txt"`，支持通配符）  
`-type`：按类型查找，`f` 代表文件，`d` 代表目录  
`-size`：按大小查找，`+N`（大于），`-N`（小于）

```bash
# 查找当前目录及子目录下所有 .txt 文件
find . -name "*.txt"

# 查找整个系统中所有的 python 脚本（.py 文件，搜索全盘可能需 sudo 权限）
find / -name "*.py"

# 查找 /var/log 下所有大于 100M 的普通日志文件
find /var/log -type f -name "*.log" -size +100M
```

---

# 二、文件内容查看与编辑
## 1. 查看文件内容：cat
直接输出整个文件内容，适合查看短小文件。  

`-n`：number，显示所有行的行号  
`-b`：number-nonblank，只显示非空行的行号  

```bash
cat README.md
cat -n config.ini  # 带行号显示
```

## 2. 分页查看文件：less / more
`less`：更强大的分页工具（支持上下滚动、搜索）。按 `q` 退出，`/关键词` 搜索，`n` 找下一个匹配  
```bash
less large_log.txt  # 分页查看大日志文件（推荐）
```

`more`：简单分页工具（只能向下滚动），按 `空格` 翻页，`q` 退出  
```bash
more /var/log/syslog  # 简单分页查看系统日志
```

## 3. 查看文件头部/尾部：head / tail
`head -n N`：显示文件前 N 行（默认前 10 行）  
`tail -n N`：显示文件后 N 行（默认后 10 行）  
`tail -f`：实时跟踪文件新增内容（常用于监控不断输出的日志）  

```bash
head -5 error.log    # 查看前5行
tail -10 access.log  # 查看最后10行
tail -f access.log   # 实时监控日志（按Ctrl+C退出）
```


## 4. 文本编辑：vim
`vim` 是 Linux 默认的强大文本编辑器，分为**命令模式**、**输入模式**和**底线命令模式**。

**进入编辑与输入模式**
- `vim 文件名`：打开或新建文件，默认进入命令模式
- `i`：在光标当前位置，进入输入模式（左下角显示 `-- INSERT --`）
- `o`：在当前行**下方**插入新行，并进入输入模式
- `O`：在当前行**上方**插入新行，并进入输入模式
- `G` + `o`：快速跳到文件末尾，并新建一行进入输入模式

**保存与退出（按 `Esc` 退出输入模式后输入）**
- `:w`：保存文件但不退出
- `:q`：退出 Vim（文件未修改时）
- `:wq`：保存修改并退出
- `:q!`：强制退出，放弃所有未保存的修改

**查找与替换（命令模式下）**
- `/关键词`：向下查找关键词，按 `n` 跳转到下一个匹配项
- `:%s/旧内容/新内容/g`：全局替换匹配内容（`%` 代表所有行，`g` 代表行内所有匹配）

```bash
# 编辑依赖文件，按 i 添加内容，完成后按 Esc 输入 :wq 保存退出
vim requirements.txt
```

---

# 三、进程管理

## 1. 查看进程：ps

`ps aux`：显示系统中所有进程（`a`=all 所有用户，`u`=user 详细信息，`x` 包括后台进程）  

`ps -ef`：显示进程详细信息（`-e`=every 所有进程，`-f`=full 完整格式，包含父进程 PID）  

```bash
# 查找所有 python 进程（竖线 | 为管道符，grep 用于过滤）
ps aux | grep python

# 查找名为 train.py 的进程
ps -ef | grep "train.py"

# 高阶技巧：通过正则排除 grep 自身的进程
ps aux | grep '[p]ython gradio_chat.py'
```

## 2. 实时监控进程：top / htop
`top`：实时显示进程资源占用（CPU、内存），**默认按 CPU 使用率排序**。
按 `P` 依 CPU 排序，`M` 依内存排序，`k` 终止进程（需输入 PID），`q` 退出  
```bash
top   # 实时监控进程，排查哪个进程占用 CPU 过高
```

`htop`：`top` 的增强版（Ubuntu 下需执行 `sudo apt install htop`），支持鼠标操作和条形图显示，更直观  
```bash
htop  # 更友好的多核 CPU 监控界面
```

## 3. 终止进程：kill

```bash
# 查找对应进程的 PID
ps aux | grep python

# 终止卡死的进程
kill -9 12345

# 终止特定脚本（如 test.py）的所有进程
pkill -9 -f test.py
```

## 4. 后台运行进程：& / nohup
`&`：将命令放入后台运行（**终端断开连接后进程会被终止**）  
`nohup`：no hang up，忽略挂断信号。配合 `&` 使用，**终端断开后进程仍会继续运行**  

```bash
# 放入后台运行，当前终端仍可继续输入其他命令
python train.py &

# 关闭本地终端后依然在运行（标准输出默认保存到当前目录的 nohup.out 中）
nohup python server.py &

# 将各种标准和错误输出均重定向到 output.log 中
nohup python run.py > output.log 2>&1 &
```

## 5. 管理后台进程：jobs

```bash
# 查看后台进程
# 例如输出：[1]+  Running  python train.py &
jobs
```

---

# 四、服务器文件传输

## 1. scp 方法（陈旧）

推文件（本地 ➔ 远程）：
```bash
scp local_file user@remote_ip:/remote/path/         # 传输单个文件
scp -r local_folder user@remote_ip:/remote/path/    # 传输整个文件夹
```

拉文件（远程 ➔ 本地）：
```bash
scp user@remote_ip:/remote/path/file local_path/        # 拉取单个文件
scp -r user@remote_ip:/remote/path/folder local_path/   # 拉取整个文件夹
```

## 2. rsync 方法（推荐） 

`-a`：archive，递归传输并保留文件属性（如权限、时间戳等）  
`-v`：verbose，显示传输过程细节  
`-z`：compression，在传输过程中压缩文件数据  
`-P`：progress，显示传输进度
```bash
# --exclude= 排除特定文件或目录（示例：排除 data 文件夹和所有隐藏文件）
rsync -avzP --exclude='data/' --exclude='.*' user@remote_ip:/remote/path/ local_path/
```

- 支持传输文件夹时**排除不需要的文件**
- 支持**断点续传**，传输时可以进行压缩


## 3. 免密传输配置
如果需要频繁在服务器 A 和 B 之间传文件，可将 A 机器生成的公钥追加到 B 机器的 `~/.ssh/authorized_keys` 中。 

原理：**A 访问/请求 B**，则需要将 A 的公钥放在机器 B 中，这样 A 发起请求时机器 B 才能核实 A 的身份，从而实现免密传输。

> [!WARNING]
> 传文件夹时谨防隐藏文件（如 `.git` 目录），它们很多时候体积巨大，会严重拖慢传输速度！可以使用 `du -sh .[!.]*` 提前检查隐藏文件大小。

---

# 五、系统资源与空间监控

## 1. 磁盘可用空间：df

disk free，磁盘空闲。工作在 **文件系统（分区）** 级别。  
> 💡 想象成一个停车场管理员：他只关心整个停车场还剩多少个车位，以及总共有多少个车位，而不关心每一辆车具体占了多大地方。

`-h`：human-readable，以人类易读的单位（GB, MB, KB等）显示大小，这也是 `df` 最常用的选项。  

```bash
df -h  # 默认查看所有挂载分区的空间使用情况
```

输出示例及字段解释：
```text
Filesystem      Size  Used Avail Use% Mounted on
/dev/sdc1       3.5T  3.3T     0 100% /persist_data
```
- **Filesystem**：磁盘分区的设备名。
- **Size / Used / Avail**：分区总大小 / 已用空间 / 可用空间。
- **Use%**：已用空间的百分比。
- **Mounted on**：挂载点目录。所有在该目录下的读写操作，实际都发生在该磁盘分区上。

**查看特定目录所在的分区情况：**
```bash
df -h .                    # 查看当前所在目录的分区情况
df -h /home/chenyangzhang  # 指定具体路径查看
```

## 2. 磁盘使用情况：du

disk usage，磁盘使用。工作在 **文件和目录** 级别。  
> 💡 想象成一个精打细算的管家：他会深入告诉你车库里的每一辆车、每一个箱子具体占了多大的地方。

**基础用法速查：**
```bash
du -h          # 递归地列出所有子目录的大小（如果目录很深，输出会很长）
du -sh .       # -s (summary)，只汇总显示当前指定目录的总大小
du -sh *       # 列出当前目录下每个一级非隐藏文件/文件夹的大小
du -sh .[!.]*  # 列出当前目录下每个隐藏文件/文件夹的大小（.[!.]* 排除了 . 和 ..）
```

**排查当前目录下占用空间最大的文件：**
```bash
du -sh * | sort -rh | head -n 10
```
- `du -sh *`：计算当前目录下每个文件/文件夹的大小。
- `|`：管道符，将前一个命令的输出传递给后一个命令作为输入。
- `sort -rh`：`-h` 表示按照人类可读的数字大小进行智能排序，`-r` 表示逆序排列（reverse，由大到小）。
- `head -n 10`：截取并显示排序后的前 10 行结果。

## 3. 查看内存使用：free

free memory，空闲内存。工作在 **内存（RAM）** 级别。
```bash
free -h  # 显示系统内存（RAM）和交换分区（Swap）的使用情况（total/used/free）
```

---

# 六、用户身份切换

## 1. 用户切换：su

switch user，切换用户。  
> 切换用户时建议加上 `-`（连字符），这样不仅切换了用户身份，还会完整加载该用户的环境变量和工作目录。除系统 `root` 外，通常需要输入目标用户的密码。

`-` / `-l` / `--login`：提供类似直接登录的完整环境（推荐）。  
`-c`：以目标用户身份执行一条指令后，立即退回原身份。  
`-p` / `--preserve-environment`：保留当前的环境变量。  

**基础用法速查：**
```bash
su             # 仅切换到 root 身份，但不改变原有的环境变量（不推荐）
su -           # 切换到 root 身份，并加载其完整环境（推荐常用）
su - username  # 切换到指定用户（username），并加载其完整环境
```

如需临时执行一条其它用户权限的命令，可结合 `-c`：
```bash
su -c "ls -l /root" root  # 以 root 身份执行命令后，会马上退出该身份并返回
```

## 2. 退出当前会话：exit

通过 `su` 切换用户后，若想回到原本的用户环境，可直接键入 `exit` 退出当前新建立的会话环境。
```bash
exit
```

---

# 七、网络操作

## 1. 查看 IP 地址：ip / ifconfig
```bash
ip addr    # 显示所有网卡的 IP 地址（较新系统推荐，iproute2 包）
ifconfig   # 显示网络接口信息（较老系统常用，net-tools 包）
```

## 2. 测试网络连接：ping
`-c`：count，发送指定数量的数据包后停止（不加 `-c` 在 Linux 下会一直运行，需按 `Ctrl+C` 终止）。
```bash
ping baidu.com          # 测试与百度的网络连通性（按 Ctrl+C 停止）
ping -c 4 10.76.160.16  # 只发送 4 个包测试服务器连通性，自动停止
```

## 3. 查看端口占用：netstat / ss
`netstat` 和 `ss` 常用于监控网络状态和端口占用情况，`ss` 是 `netstat` 的现代替代品，性能更好。

常用参数串联：`-tulpn`
- `-t`：TCP 协议；`-u`：UDP 协议
- `-l`：listening，仅显示监听中的套接字
- `-p`：process，显示占用该端口的进程信息（通常需要 root 权限）
- `-n`：numeric，数字显示，不将 IP 和端口解析为域名或服务名

```bash
netstat -tulpn         # 查看所有监听端口及对应进程（需 root 权限）
ss -tulpn | grep 8080  # 结合 grep 查找 8080 端口被哪个进程占用
```

---

# 八、权限管理

在 Linux 中，任何文件和目录都具有**读、写、执行**权限。  
权限分为三组：**所有者（User, u）**、**所属组（Group, g）**、**其他用户（Others, o）**。  
> 权限对应关系：  
> 读（**r**ead）= **4** 
> 写（**w**rite）= **2**
> 执行（e**x**ecute）= **1**

## 1. 查看权限：ls -l
```bash
ls -l test.sh
```
输出示例：`-rwxr-xr-- 1 user group 1234 Aug 3 10:00 test.sh`
- 第 1 个字符：`-`（普通文件）、`d`（目录）、`l`（链接）
- 后 9 个字符分为三组：`rwx`（所有者）、`r-x`（所属组）、`r--`（其他用户）

## 2. 修改权限：chmod
change mode，更改文件或目录的模式（权限）。

**字母设定法：**
使用 `u` (user), `g` (group), `o` (others), `a` (all) 搭配 `+` (增加)、`-` (移除)、`=` (设定) 来操作。
```bash
chmod u+x test.sh  # 给所有者添加执行权限，使脚本可运行
```

**数字设定法（常用）：**
把每一组拥有的权限对应的数字加起来，形成一个 3 位数。
- `7` = 4 (r) + 2 (w) + 1 (x)
- `6` = 4 (r) + 2 (w) + 0 (-)
- `5` = 4 (r) + 0 (-) + 1 (x)

`-R`：recursive，递归修改目录下所有文件的权限。

```bash
chmod 755 script.sh   # 所有者拥有 rwx(7)，组和其他拥有 r-x(5)
chmod 644 config.ini  # 所有者读写(6)，组和其他只读(4)（典型的配置文件权限）
chmod -R 777 ./data   # 递归把 data 目录及内容全改为所有人可读写执行（极度危险，慎用！）
```
