# DeepSeek API 配置指南

这个项目不会、也不应该把 API Key 上传到 GitHub。GitHub 保存的是程序；每个运行程序的人都要在自己的电脑上创建 `.env.local`，把自己的 Key 放进去。

## Windows：推荐的一键配置

在项目根目录打开 PowerShell：

```powershell
npm install
npm run setup:api
```

终端会要求粘贴 DeepSeek API Key。输入时屏幕不会显示字符，这是正常的安全行为。脚本会把配置写入仅本机使用的 `.env.local`。

然后验证 API：

```powershell
npm run check:api
```

成功时会看到类似：

```text
Provider: DeepSeek
Endpoint: https://api.deepseek.com/v1/chat/completions
Model: deepseek-chat
API connected successfully. Model reply: OK
```

最后启动网站：

```powershell
npm run dev
```

打开 `http://127.0.0.1:3000`。生成配方后，右上角显示 `AI 实时回答 / Live AI response`，才代表这次解释文案真实使用了 API。

## 手动配置

如果不使用脚本：

```powershell
Copy-Item .env.example .env.local
notepad .env.local
```

把 `.env.local` 中这一行填上自己的 Key：

```dotenv
DEEPSEEK_API_KEY=sk-这里换成自己的Key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
EXPLAIN_LLM=true
```

保存后必须重启 `npm run dev`。Next.js 进程启动时读取环境变量；只修改文件但不重启，旧进程可能继续使用旧配置。

## 队友克隆后的完整命令

```powershell
git clone https://github.com/ger22783/perfume_agent_hardware.git
cd perfume_agent_hardware
npm install
npm run setup:api
npm run check:api
npm run dev
```

## 常见问题

### 页面显示“本地模板”

说明本次没有成功取得模型文案。常见原因是没有 Key、Key 填错、修改 `.env.local` 后没有重启、网络无法访问 API，或者模型接口超时。先运行 `npm run check:api` 查看明确错误。

### 为什么 GitHub 上看不到 `.env.local`

`.env.local` 在 `.gitignore` 中，这是为了避免泄漏密钥。队友必须在自己的电脑上单独配置。

### API 是否决定四个泵的比例

模型负责理解自然语言和生成解释；四泵比例由约束优化器计算。这样即使模型暂时不可用，硬件配方仍然能运行，并且模型不能绕过四泵范围和安全校验。

### 能不能把 Key 发到群里或写进 README

不能。拿到 Key 的人通常可以消耗账户余额。Key 只能放在自己的 `.env.local` 或部署平台的加密环境变量中。
