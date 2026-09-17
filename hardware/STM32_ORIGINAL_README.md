# 蠕动泵定量加注 - PC 主控程序使用说明

## 一、准备工作（只做一次）

1. 安装 Python 库：打开 PowerShell，执行

   ```
   pip install pyserial
   ```

2. 用数据线连好 STM32，在"设备管理器 → 端口"里确认虚拟串口号（如 COM10）

3. 烧录好固件（支持 `D1 50` 定量加注命令的版本）

## 二、写配方

编辑 `recipe.json`（泵号 1~5 对应 5 路泵，克数 0.1~500）：

```json
[
  {"pump": 1, "grams": 20},
  {"pump": 2, "grams": 15.5}
]
```

配方会**按顺序执行**（一次只用一个泵，因为只有一个秤）。

## 三、运行

```
cd host
python pump_host.py --dry-run          # 1. 先模拟，检查配方和程序逻辑
python pump_host.py                    # 真实执行（默认 COM10）
python pump_host.py --port COM7        # 指定串口
```

执行中随时按 `Ctrl+C` 急停（程序会自动给板子发 STOP 停泵）。

## 四、固件串口命令（也可用串口助手手动发）

| 命令 | 功能 | 回报 |
|------|------|------|
| `D1 50` | 泵1 加注 50g（支持小数，自动先去皮） | `Auto tare...` → `D1 START target=50.0g` → 进度 → `D1 DONE actual=... target=... err=...` |
| `STOP` | 取消加注并全停 | `Dosing cancelled, all pumps OFF` |
| `1`~`5` | 手动切换泵（加注中禁用） | `PUMP1 ON` / `PUMP1 OFF` |
| `0` 或 `s` | 全停 | `All pumps OFF` |
| `t` | 秤去皮 | `Tare done` |
| `i` | 查询泵状态 | `PUMP 1:OFF 2:ON ...` |
| `h` | 帮助 | 命令列表 |

注意：串口助手发命令**最好勾选"加回车换行"**（不勾也行，固件 100ms 后会自动识别）。

## 五、过冲标定（重要）

固件里 `DOSING_STOP_OFFSET_G`（`Core/Inc/pump.h`）默认 0：

1. 先跑 `D1 20` 几次，记下 DONE 里 actual 比 target 多多少（过冲量）
2. 把平均过冲量填进 `DOSING_STOP_OFFSET_G`，重新编译烧录
3. 例如每次多打 0.8g → 改成 `#define DOSING_STOP_OFFSET_G 0.8f`

### 读数缓慢漂移是正常现象

廉价称重传感器上电后自身发热，重量读数会**单方向缓慢漂移**（几分钟漂几克，通电 10~20 分钟后趋于稳定），这不是故障。固件已在**每次加注前自动去皮**，单步加注的测量不受漂移影响。使用建议：

- 开机预热 10 分钟后再开始长时间连续作业
- 保持输液管悬空对准容器口，不要搭在秤上
- 观察漂移可用 `t` 去皮后静置看读数：单向缓爬=蠕变（正常），乱跳=接线/机械/干扰问题

## 六、以后接大模型（阶段3）

1. 申请一个 API Key（如 DeepSeek，每次调用几分钱）
2. 在 `pump_host.py` 里加一个函数调 API，输入自然语言需求，输出 `[{"pump":..,"grams":..}]`
3. 把返回的列表交给已有的 `validate_recipe()` 校验后执行——其他代码一行不用改
