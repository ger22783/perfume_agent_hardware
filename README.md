# Aromacell：个性化香氛 Agent 与四泵硬件

这是**硬件版 Agent**。用户注册、填写问卷后，输入本次需求；Agent 结合偏好和已确认的反馈记忆生成配方，再把百分比换成各个泵的加注克数。Python 桥接程序负责通过 USB 串口将任务交给 STM32。

- 在线体验：<https://aromacell-agent.vercel.app/?lang=zh>，页面可切换中英文。
- 账号、问卷与管理员说明：[ACCOUNT_SYSTEM.md](ACCOUNT_SYSTEM.md)。
- 串口协议与硬件验收：[hardware/README.md](hardware/README.md)。
- 模型接口配置：[API_SETUP.md](API_SETUP.md)。

## 先确定你要做什么

**只体验网页：** 打开在线地址，注册或登录，填写问卷，再生成配方即可，不需要安装开发工具。当前发布环境未配置设备连接地址，点击调配只做克数换算和模拟返回，不会启动实体泵。

**联调或操作真实机器：** 按下面步骤，在 USB 连接 STM32 的 Windows 电脑上同时运行 Agent 和 Python Bridge。现有实现由 Next.js 后端调用 Bridge；Vercel 云端不能通过 `127.0.0.1` 访问展台电脑的 USB。仅在本地启动 Bridge，不会让线上网页自动连上设备。

```text
浏览器 → 本机 Agent（3000端口）→ 本机 Bridge（8765端口）→ USB串口 → STM32
```

`127.0.0.1` 表示程序所在的电脑自身。云端直接控制设备还需要受认证的远程设备通道，当前仓库没有这一功能。

## 1. 准备电脑和代码

安装 Git、Node.js 和 Python。本项目最近的应用构建使用 Node.js 24；Python 代码要求 3.10 及以上。先检查命令可以运行：

```powershell
git --version
node --version
npm --version
python --version
```

首次下载：

```powershell
git clone https://github.com/ger22783/perfume_agent_hardware.git
cd perfume_agent_hardware
npm ci
python -m pip install -r hardware/requirements.txt
```

已有仓库时，先保存自己的改动，再用 `git pull --ff-only origin main` 更新。如果你的硬件仓库远程名不是 `origin`，换成对应远程名。更新后重新运行 `npm ci`。

后续命令都在仓库根目录执行。串口驱动、STM32 固件由硬件负责人按实际开发板准备，网页不会代替这些步骤。

## 2. 配置本机账号系统（必需）

GitHub 不包含真实数据库连接串和密钥。仅在配置文件不存在时复制模板，避免覆盖已经填写的内容：

```powershell
if (-not (Test-Path -LiteralPath .env.local)) {
    Copy-Item -LiteralPath .env.example -Destination .env.local
}
notepad .env.local
```

在编辑器里填写下面配置。尖括号中的内容是占位说明，必须替换，不能直接复制后就启动：

```dotenv
AUTH_DATABASE_URL=<数据库连接串>
BETTER_AUTH_SECRET=<至少32字符的随机密钥>
BETTER_AUTH_URL=http://127.0.0.1:3000
HARDWARE_API_URL=http://127.0.0.1:8765/v1/jobs
HARDWARE_API_TOKEN=
```

- **数据库连接串**：向管理员私下取得授权配置，或使用自己的 Postgres 测试数据库。账号、问卷和反馈会写入这个数据库。使用团队现有数据库时，应使用自己的测试账号，操作会产生真实记录。
- **登录密钥**：使用管理员提供的配置，或为独立本地环境生成自己的随机密钥。若两套应用按共享认证配置运行，按团队约定保持一致。可用下面命令生成随机值，手动填入配置文件；不要公开输出或提交 Git。

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

- **应用地址**：按本说明统一使用 `http://127.0.0.1:3000`。更换端口或主机名时，同步修改 `BETTER_AUTH_URL`，然后重启 Agent。
- **Bridge 地址**：本地网页和桥接程序在同一台电脑时使用上面的地址。留空会跳过 Bridge，直接返回模拟结果。
- **管理员权限**：`ADMIN_USER_IDS` 由管理员配置，普通体验者不用填写。注册账号不会自动获得后台权限。

**完整账号流程必须有数据库和登录密钥。** 无模型密钥可以使用本地规则和模板；无账号数据库不能完成注册、问卷保存或配方生成。旧匿名记录的 JSONL 文件不能替代账号数据库。

使用全新测试数据库时，填写配置后初始化一次：

```powershell
npm run migrate:accounts
```

团队现有数据库已初始化时，无需重复执行。迁移是实际数据库写操作，应由维护该数据库的人执行。

## 3. 配置模型（可选）

先跑通本地链路可以不填写模型密钥。需要在线语言理解和解释时，在 `.env.local` 中填写 DeepSeek 或 OpenAI-compatible 配置，见 [API_SETUP.md](API_SETUP.md)。模型负责语言理解和解释，配方比例由约束优化器计算，硬件侧无需再次调用模型。

`npm run check:api` 会真实请求一次模型接口。修改环境变量后重启 Agent。

## 4. 先做模拟联调

打开两个 PowerShell 窗口，**都进入仓库根目录**。

窗口 A：显式开启模拟模式并启动 Bridge：

```powershell
$env:HARDWARE_DRY_RUN="true"
python -m uvicorn hardware.bridge:app --host 127.0.0.1 --port 8765
```

窗口 B：检查 Bridge，再启动 Agent：

```powershell
Invoke-RestMethod http://127.0.0.1:8765/health
npm run dev -- --hostname 127.0.0.1 --port 3000
```

健康检查应显示 `ok=true`、`dryRun=true`。这表示桥接服务在线且不会打开串口，不代表已连接 STM32。

打开 <http://127.0.0.1:3000>：

1. 注册账号，密码至少12个字符，输入两遍；已有账号直接登录。
2. 完成四步偏好问卷并保存。
3. 输入需求，例如“通勤用，清爽一点，不要太甜”，生成配方。
4. 选择页面提供的 10g、20g 或 50g 总量，核对每个泵的目标克数。
5. 点击“确定并调配”，页面应显示模拟结果。模拟返回的目标与实际克数一致，不代表实测精度。

例如20g配方中某原料占35%，对应泵目标就是7g。程序按0.1g精度分配，并保持各步总量等于批次总量。

## 5. 连接真实 STM32

让硬件负责人确认固件协议、泵号映射、称重校准和现场停泵方式，再用清水测试。关闭串口助手等可能占用串口的程序，在 Windows“设备管理器 → 端口”确认实际 COM 口。

在窗口 A 按 `Ctrl+C` 停止模拟 Bridge，再启动真实模式。`COM7` 只是示例，必须换成自己的串口：

```powershell
$env:HARDWARE_SERIAL_PORT="COM7"
$env:HARDWARE_DRY_RUN="false"
$env:HARDWARE_TOLERANCE_G="0.5"
python -m uvicorn hardware.bridge:app --host 127.0.0.1 --port 8765
```

另一个窗口检查：

```powershell
Invoke-RestMethod http://127.0.0.1:8765/health
```

确认 `dryRun=false`、`port` 正确。健康检查只报告配置，串口在任务执行时才会打开；它不是设备连通性测试。此时从**本地网页**点击调配会尝试启动真实泵。按 [硬件验收说明](hardware/README.md#清水验收清单)完成逐泵和整批测试。

固件需要支持115200波特率，并按下列格式通信：

```text
请求：D1 5
完成：D1 DONE actual=5.2g target=5.0g err=+0.2g
停止：STOP
```

Bridge 一次执行一个任务、按顺序运行各泵。出现设备错误、超时或超差时，程序会尝试发送 `STOP` 并停止后续步骤。当前网页没有独立急停按钮，现场必须有硬件侧可用的停泵方式。实际精度、固件配合和异常停泵行为仍需真机验收，应用测试不能替代真机测试。

可选接口鉴权：在**启动 Bridge 前**，在窗口 A 设置 `HARDWARE_API_TOKEN`，并在 Agent 的 `.env.local` 填入相同随机值，再重启相关程序。Bridge 保持监听 `127.0.0.1`，不要把这个本地服务直接暴露到公网。

## 6. 确认四个泵里装的是什么

当前配置是四路**彩色演示液**，香气名称是概念原料，不表示液体本身具有对应香气：

- 泵1：日系柑橘，柠檬黄演示液。
- 泵2：海上风铃，海盐蓝演示液。
- 泵3：桂花乌龙，桂花琥珀演示液。
- 泵4：无人之境玫瑰，玫瑰红演示液。

映射在 [data/hardwareProfile.ts](data/hardwareProfile.ts)。换瓶时必须同步核对材料ID、泵号与材料参数，更换为真实香料也需要实际材料标定。当前密度是工程估值，毫升只作预览，实际控制使用克数和电子秤反馈。

## 常见问题

- **打开线上网页，为什么泵不动？** 当前线上没有远程设备通道。按本说明运行本地 Agent，不能只启动本地 Bridge 后继续用线上网页。
- **注册或生成提示账号配置不可用？** 检查数据库连接、`AUTH_DATABASE_URL` 和 `BETTER_AUTH_SECRET`；新数据库还需初始化。模型密钥不能替代这些配置。
- **登录报来源或地址错误？** 浏览器地址与 `BETTER_AUTH_URL` 要一致，不要交替使用 `localhost` 和 `127.0.0.1`。改配置后重启。
- **调配仍显示模拟？** 检查 `HARDWARE_API_URL` 是否留空、Bridge 的 `/health` 是否仍为 `dryRun=true`。两处任一处仍是模拟配置，都不会启动泵。
- **Bridge连接失败？** 确认窗口 A 仍在运行、8765端口正确；启用Token时确认两端一致。
- **串口被占用或找不到？** 核对COM口、USB和驱动，关闭串口助手等占用程序。
- **重复点击没有再次出液？** 相同配方、会话和总量会产生相同去重键，Bridge返回之前的结果。需要新批次时，在网页重新开始会话并生成配方；不要靠重启 Bridge 重放旧请求，重启会清空内存去重记录。
- **页面显示本地模板？** 没有取得在线解释时会回退模板。检查模型配置并运行 `npm run check:api`；这不等于账号或配方求解器失效。
- **如何看后台？** 授权管理员登录后进入 `/admin`，可查看原始问卷、画像、配方、反馈和记忆；普通账号不能访问其他用户记录。

## 开发者验证与文件入口

无需真实硬件的检查：

```powershell
npm test
npm run build
python -m unittest hardware.test_pump_host -v
```

生产模式本地启动：先运行 `npm run build`，再运行 `npm run start -- --hostname 127.0.0.1 --port 3000`。

- [app/api/dispatch/route.ts](app/api/dispatch/route.ts)：验证登录、读取本人已保存配方，换算后调用 Bridge。
- [lib/hardwareRecipe.ts](lib/hardwareRecipe.ts)：百分比到泵号/克数，默认20g，批次范围5–100g。
- [hardware/bridge.py](hardware/bridge.py)：HTTP校验、互斥、去重和执行。
- [hardware/pump_host.py](hardware/pump_host.py)：串口通信、完成结果解析和停止后续步骤。
- [lib/accounts](lib/accounts)：账号、问卷、偏好和反馈记录。
- [hardware/STM32_ORIGINAL_README.md](hardware/STM32_ORIGINAL_README.md)：原始硬件说明，仅作历史参考；当前 Agent 使用四泵映射，以本说明和硬件接入文档为准。

线上部署由维护者负责。队友本地联调无需执行 Vercel 部署，也无需取得 Vercel 管理权限。许可见 [LICENSE](LICENSE)。
