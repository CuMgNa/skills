# Windows + Git Bash 下 Claude Code 配置路径错位排查与修复方案

> 适用场景：Windows + Git Bash 中，`CLAUDE_CONFIG_DIR` 看似不生效、配置文件查到错误目录（如 `C:\Users\xxx\.claude`）的问题。

---

## 一、现象

要找配置文件（如状态栏宠物 tamagotchi 的 `settings.json`）时出现矛盾：

- 实际配置在 `E:\.claude\settings.json`，程序也确实在用它运行；
- 但排查时却查到了 `C:\Users\33606\.claude`，**查错了地方**。

---

## 二、归因：为什么会查错

关键在于 **Git Bash 在 Windows 上会重定义 `HOME`**：

```
你设了 CLAUDE_CONFIG_DIR  →  指向 E:\.claude   ✅ 正确
              ↓
但手动排查时用了 ~/.claude
              ↓
Git Bash 把 ~ (HOME) 展开成 /c/Users/33606
              ↓
于是查到 C:\Users\33606\.claude          ❌ 错位
```

**结论**：`CLAUDE_CONFIG_DIR` 本身没失效，配置也没错。错的是"用 `~` 去推断路径"这个动作——这是**诊断误会**，不是真故障。

---

## 三、辨析：为什么"让 HOME 跟随 CLAUDE_CONFIG_DIR"不可取

为了对齐一个路径，去改动整个 Shell 的根目录 `HOME`，属于"杀鸡用牛刀"，会连带破坏一堆别的工具：

| 改 HOME（牛刀） | 只固化 CLAUDE_CONFIG_DIR（手术刀） |
|---|---|
| `~/.ssh` 密钥失效，git push / 远程登录失败 | 只影响 Claude 配置路径 |
| `~/.gitconfig` git 用户名/邮箱/配置丢失 | 其它一律不动 |
| npm / pip 缓存、配置目录错位 | —— |
| `~/.bash_history` 命令历史错乱 | —— |

→ 改 `HOME` 是"治标却引发新病"，**风险面太大，不推荐**。

---

## 四、推荐方案：只做两件事

1. **固化变量**（一劳永逸）：在 `.bashrc` 里 `export CLAUDE_CONFIG_DIR`，让每个会话都知道正确路径——但**不动 HOME**。
2. **改用法**（治本）：以后排查一律用 `"$CLAUDE_CONFIG_DIR"`，永远不用 `~/.claude`，从根上杜绝再次错位。

---

## 五、可执行步骤（按顺序复制）

> Git Bash 路径写法：`E:\.claude` → `/e/.claude`（按你的实际盘符替换）。

### 第 1 步：确认变量当前值

```bash
echo "$CLAUDE_CONFIG_DIR"
```

- 输出为空 → 本会话未设，继续第 2 步补上。
- 已是实际目录（如 `/e/.claude`）→ 本来就没问题，做第 2 步固化即可。

### 第 2 步：在 .bashrc 里固化 CLAUDE_CONFIG_DIR

```bash
echo 'export CLAUDE_CONFIG_DIR="/e/.claude"' >> ~/.bashrc
```

> 注意：路径不要用反斜杠 `E:\.claude`，Git Bash 用 `/e/.claude`。

### 第 3 步：立即生效（不用重开终端）

```bash
source ~/.bashrc
```

### 第 4 步：验证（关键）

```bash
echo "$CLAUDE_CONFIG_DIR"      # 应输出 /e/.claude
ls -la "$CLAUDE_CONFIG_DIR"    # 应列出 settings.json 等文件
```

### 第 5 步（可选）：以后排查的正确姿势

```bash
cat "$CLAUDE_CONFIG_DIR/settings.json"
```

永远用变量、别用 `~`。

---

## 六、一键版（确认盘符是 E: 后整段贴）

```bash
echo 'export CLAUDE_CONFIG_DIR="/e/.claude"' >> ~/.bashrc
source ~/.bashrc
echo "当前配置目录：$CLAUDE_CONFIG_DIR"
ls -la "$CLAUDE_CONFIG_DIR"
```

**执行前确认两件事：**

1. `.claude` 的真实路径是不是 `E:\.claude`？不是就把 `/e/.claude` 改成对应盘符（如 `D:` → `/d/.claude`）。
2. 看第 1 步输出，避免重复往 `.bashrc` 追加同样的行（重复了删掉多余的即可，不影响功能）。

跑完第 4 步能正常列出 `settings.json`，即彻底解决。

---

## 一句话总结

> 不是变量坏了，是 `~` 在 Git Bash 里指错了"家"；所以**别去搬家（改 HOME）**，只要**记住正确地址（固化 CLAUDE_CONFIG_DIR）+ 以后报地址别用"家"这个词（不用 `~`）**就行。
