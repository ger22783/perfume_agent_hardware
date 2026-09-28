# Aromacell 硬件同伴接入说明

这份文档给负责 STM32、蠕动泵和称重模块的同伴使用。目标是把 Perfume Agent 生成的百分比配方安全地下发到现有四泵定量加注系统。

硬件同伴最初提供的说明原文保存在 [`STM32_ORIGINAL_README.md`](./STM32_ORIGINAL_README.md)。

## 先看结论

硬件侧不再调用 DeepSeek，也不需要理解“清爽、花香”等自然语言。Agent 已经完成意图解析和配方计算，传给硬件的只有结构化 JSON：

```text
Perfume Agent 百分比配方
  → Next.js 换算泵号和克数
  → POST http://127.0.0.1:8765/v1/jobs
  → hardware/bridge.py
  → hardware/pump_host.py
  → USB 串口 D1 5.0
  → STM32 闭环称重
  → D1 DONE actual=5.2g target=5.0g err=+0.2g
  → 网页显示目标值和实际值
```

原先的 `llm.py` 可以继续作为硬件团队独立调试工具，但不在 Agent 正式链路中使用。

## 当前四泵装载约定

| 泵号 | materialId | 概念原料 | 角色 | 显色液 | 建议浓度 | 估算密度（20°C） |
|---|---|---|---|---|---:|---:|
| 1 | `japanese-citrus` | 日系柑橘 | 前调、清爽 | 柠檬黄 | 0.020% w/v | 0.998 g/mL |
| 2 | `sea-breeze-bell` | 海上风铃 | 前/中调、水感 | 海盐蓝 | 0.005% w/v | 0.998 g/mL |
| 3 | `osmanthus-oolong` | 桂花乌龙 | 中调、花茶 | 桂花琥珀 | 0.014% w/v | 0.998 g/mL |
| 4 | `desert-rose` | 无人之境玫瑰 | 中/后调、花香木质 | 玫瑰红 | 0.008% w/v | 0.998 g/mL |

对应配置在 `data/hardwareProfile.ts`。换瓶时只修改该文件，不要修改提示词，也不要让 LLM 猜泵号。

实体瓶统一使用蒸馏水基底的食品级水溶性色素。上述浓度是低染色风险的建议起点，不同色素品牌的着色力不同，先配100mL小样再微调。`0.998 g/mL` 是近似纯水的工程估值，只用于页面体积预览；泵控制始终使用电子秤反馈的质量。正式路演前必须逐泵实测密度和过冲。

食品级色素不等于成品可饮用。混合液只应装在封闭展示容器中，并准备接液盘、手套和清水冲洗方案。

## 硬件侧需要保证的串口协议

Bridge 使用 115200 波特率，按顺序一次只运行一个泵：

```text
发送：D1 5
期望：D1 START target=5.0g
完成：D1 DONE actual=5.2g target=5.0g err=+0.2g
停止：STOP
```

以下响应会被认定为失败，并停止后续泵：

- 任意包含 `ERR` 的响应；
- 任意包含 `CANCELLED` 的响应；
- 300 秒内没有收到对应泵的 `DONE`；
- `DONE` 的绝对误差超过允许值，默认是 ±0.5g；
- 串口断开或返回格式无法解析。

`DONE` 行请保持下面的字段顺序和单位：

```text
D{pump} DONE actual={number}g target={number}g err={signed_number}g
```

## Agent 发给 Bridge 的 JSON

请求地址：

```text
POST http://127.0.0.1:8765/v1/jobs
Content-Type: application/json
```

示例：

```json
{
  "schemaVersion": 1,
  "jobId": "job_123",
  "idempotencyKey": "session-1:formula-hash",
  "sessionId": "session-1",
  "deviceId": "aromacell-01",
  "targetTotalG": 20.0,
  "steps": [
    {
      "pump": 1,
      "grams": 7.0,
      "materialId": "japanese-citrus",
      "materialName": "日系柑橘",
      "percentage": 35
    },
    {
      "pump": 3,
      "grams": 8.0,
      "materialId": "osmanthus-oolong",
      "materialName": "桂花乌龙",
      "percentage": 40
    },
    {
      "pump": 4,
      "grams": 5.0,
      "materialId": "desert-rose",
      "materialName": "无人之境玫瑰",
      "percentage": 25
    }
  ]
}
```

Bridge 会再次校验：泵号1–4、单步0.1–500g、最多四步、泵号不重复、批次不超过100g、各步总量等于 `targetTotalG`。

## Bridge 返回给 Agent 的 JSON

```json
{
  "ok": true,
  "status": "succeeded",
  "jobId": "job_123",
  "deviceId": "aromacell-01",
  "mode": "hardware",
  "results": [
    {
      "pump": 1,
      "grams": 7.0,
      "targetG": 7.0,
      "actualG": 7.2,
      "errorG": 0.2,
      "ok": true,
      "reply": "D1 DONE actual=7.2g target=7.0g err=+0.2g"
    }
  ]
}
```

相同 `idempotencyKey` 重复提交时，Bridge 返回第一次的结果，不会再次启动泵。Bridge 重启后内存中的去重记录会清空，因此真机操作时仍需避免随意重启后重放旧请求。

## 第一次运行：只做模拟，不碰串口

在仓库根目录执行：

```powershell
python -m pip install -r hardware/requirements.txt
python -m uvicorn hardware.bridge:app --host 127.0.0.1 --port 8765
```

Bridge 默认 `HARDWARE_DRY_RUN=true`，不会打开串口。检查状态：

```powershell
Invoke-RestMethod http://127.0.0.1:8765/health
```

预期：

```json
{
  "ok": true,
  "deviceId": "aromacell-01",
  "port": "COM10",
  "dryRun": true,
  "toleranceG": 0.5,
  "busy": false
}
```

可以单独运行 Python 测试：

```powershell
python -m unittest hardware.test_pump_host -v
```

## 启动 Agent 做整链路 dry-run

复制环境配置：

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

打开 `http://127.0.0.1:3000`：

1. 生成配方；
2. 选择10g、20g或50g；
3. 检查页面上的泵号和克数；
4. 点击“确定并调配”；
5. 页面应显示“演示模式”以及每泵目标/实际克数。

## 连接真实 STM32

必须先完成清水 dry-run 检查，再显式关闭模拟模式：

```powershell
$env:HARDWARE_SERIAL_PORT="COM10"
$env:HARDWARE_DRY_RUN="false"
$env:HARDWARE_TOLERANCE_G="0.5"
python -m uvicorn hardware.bridge:app --host 127.0.0.1 --port 8765
```

如果需要本地接口鉴权：

```powershell
$env:HARDWARE_API_TOKEN="共同约定的随机字符串"
```

并在 Agent 的 `.env.local` 写入相同的 `HARDWARE_API_TOKEN`。

## 清水验收清单

- [ ] `GET /health` 显示正确 COM 口且 `dryRun=false`；
- [ ] 分别执行泵1–4的1g、5g、10g；
- [ ] `DONE actual/target/err` 格式与文档完全一致；
- [ ] 每泵每个质量至少重复10次并记录平均过冲；
- [ ] 超过误差阈值时，后续泵不会继续运行；
- [ ] 执行过程中发送 `STOP`，泵能立即停止；
- [ ] 拔掉USB后任务失败，不会继续运行其他泵；
- [ ] 连续执行20个完整配方，没有重复任务或串泵；
- [ ] 最后换成实际彩色演示液，逐泵测量密度、流速和过冲并记录。

## 文件分工

- `data/hardwareProfile.ts`：四泵装载映射、显色液参数，由双方共同确认；
- `lib/hardwareRecipe.ts`：Agent 百分比到0.1g精度步骤的换算；
- `app/api/dispatch/route.ts`：Next.js 到 Bridge 的 HTTP 请求；
- `hardware/bridge.py`：HTTP校验、互斥锁、幂等和任务执行；
- `hardware/pump_host.py`：串口、`D1`、`STOP`、`DONE`解析；
- `hardware/test_pump_host.py`：无需真实硬件的基础测试。

## 安全约束

- Bridge 默认 dry-run，必须显式设置 `HARDWARE_DRY_RUN=false` 才会打开串口；
- 只监听 `127.0.0.1`，不要暴露到公网；
- 网页展示的喷距字段不参与硬件控制；
- 页面里的毫升数只是按配置密度估算；控制闭环统一使用称重质量，不用估算体积控制停泵；
- 同一时间只执行一个任务；
- 任意错误、取消、超时或超差都会发送 `STOP` 并停止后续步骤。
