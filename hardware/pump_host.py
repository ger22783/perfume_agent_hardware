#!/usr/bin/env python3
"""Reusable STM32 dosing host for the Aromacell HTTP bridge and CLI."""

from __future__ import annotations

import argparse
import json
import re
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

BAUD = 115200
DEFAULT_PORT = "COM10"
STEP_TIMEOUT_S = 300
DOSING_MAX_G = 500.0
BATCH_MAX_G = 100.0
DEFAULT_TOLERANCE_G = 0.5

DONE_RE = re.compile(
    r"^D(?P<pump>[1-4])\s+DONE\s+actual=(?P<actual>[+-]?\d+(?:\.\d+)?)g\s+"
    r"target=(?P<target>[+-]?\d+(?:\.\d+)?)g\s+err=(?P<error>[+-]?\d+(?:\.\d+)?)g$"
)


@dataclass
class DosingResult:
    pump: int
    targetG: float
    ok: bool
    actualG: float | None
    errorG: float | None
    reply: str


def validate_recipe(steps: Any) -> list[tuple[int, float]]:
    """Validate a 1-4 step recipe before any serial command is emitted."""
    if not isinstance(steps, list) or not steps:
        raise ValueError("配方为空")
    if len(steps) > 4:
        raise ValueError("配方最多包含 4 步")

    checked: list[tuple[int, float]] = []
    used_pumps: set[int] = set()
    for index, step in enumerate(steps, 1):
        if not isinstance(step, dict):
            raise ValueError(f"第{index}步格式错误: {step}")
        pump_raw = step.get("pump")
        grams_raw = step.get("grams")
        if isinstance(pump_raw, bool) or not isinstance(pump_raw, int):
            raise ValueError(f"第{index}步泵号必须是整数 1~4，当前: {pump_raw}")
        if isinstance(grams_raw, bool) or not isinstance(grams_raw, (int, float)):
            raise ValueError(f"第{index}步克数必须是数字，当前: {grams_raw}")
        pump = pump_raw
        grams = float(grams_raw)
        if not 1 <= pump <= 4:
            raise ValueError(f"第{index}步泵号必须是 1~4，当前: {pump}")
        if pump in used_pumps:
            raise ValueError(f"泵{pump}重复出现，请先合并为一个步骤")
        if not 0.1 <= grams <= DOSING_MAX_G:
            raise ValueError(f"第{index}步克数必须在 0.1~{DOSING_MAX_G:g}g，当前: {grams}")
        used_pumps.add(pump)
        checked.append((pump, grams))

    total = sum(grams for _, grams in checked)
    if total > BATCH_MAX_G:
        raise ValueError(f"批次总质量不能超过 {BATCH_MAX_G:g}g，当前: {total:g}g")
    return checked


def parse_done(line: str, expected_pump: int) -> DosingResult | None:
    match = DONE_RE.match(line.strip())
    if not match:
        return None
    pump = int(match.group("pump"))
    if pump != expected_pump:
        return None
    return DosingResult(
        pump=pump,
        targetG=float(match.group("target")),
        ok=True,
        actualG=float(match.group("actual")),
        errorG=float(match.group("error")),
        reply=line.strip(),
    )


class PumpDevice:
    def __init__(self, port: str):
        try:
            import serial
        except ImportError as error:
            raise RuntimeError("缺少 pyserial，请执行: pip install -r hardware/requirements.txt") from error
        try:
            self.ser = serial.Serial(port, BAUD, timeout=0.2)
        except Exception as error:
            raise RuntimeError(f"打不开串口 {port}: {error}") from error
        time.sleep(1.0)
        self.drain(0.5)

    def send(self, command: str) -> None:
        self.ser.write((command + "\n").encode("ascii"))
        self.ser.flush()

    def read_line(self) -> str | None:
        data = self.ser.readline()
        return data.decode("ascii", errors="ignore").strip() if data else None

    def drain(self, seconds: float) -> None:
        end = time.time() + seconds
        while time.time() < end:
            self.read_line()

    def stop_all(self) -> None:
        self.send("STOP")

    def close(self) -> None:
        self.ser.close()


def dispense(device: PumpDevice, pump: int, grams: float) -> DosingResult:
    device.send(f"D{pump} {grams:g}")
    start = time.time()
    while time.time() - start < STEP_TIMEOUT_S:
        line = device.read_line()
        if not line:
            continue
        parsed = parse_done(line, pump)
        if parsed:
            return parsed
        if "ERR" in line or "CANCELLED" in line:
            return DosingResult(pump, grams, False, None, None, line)
    return DosingResult(pump, grams, False, None, None, "timeout (no response)")


def execute_recipe(
    steps: Any,
    port: str = DEFAULT_PORT,
    dry_run: bool = False,
    tolerance_g: float = DEFAULT_TOLERANCE_G,
) -> dict[str, Any]:
    checked = validate_recipe(steps)
    if tolerance_g < 0:
        raise ValueError("允许误差不能小于 0")
    if dry_run:
        results = [
            DosingResult(
                pump=pump,
                targetG=grams,
                ok=True,
                actualG=grams,
                errorG=0.0,
                reply=f"[dry-run] D{pump} DONE actual={grams:g}g target={grams:g}g err=+0g",
            )
            for pump, grams in checked
        ]
        return {"ok": True, "status": "succeeded", "results": [asdict(item) for item in results]}

    device = PumpDevice(port)
    results: list[DosingResult] = []
    try:
        for pump, grams in checked:
            result = dispense(device, pump, grams)
            if result.ok and result.errorG is not None and abs(result.errorG) > tolerance_g:
                result.ok = False
                result.reply = f"{result.reply} (error exceeds ±{tolerance_g:g}g tolerance)"
            results.append(result)
            if not result.ok:
                device.stop_all()
                break
    except BaseException:
        device.stop_all()
        raise
    finally:
        device.close()

    ok = len(results) == len(checked) and all(result.ok for result in results)
    return {
        "ok": ok,
        "status": "succeeded" if ok else "failed",
        "results": [asdict(item) for item in results],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Aromacell STM32 dosing host")
    parser.add_argument("recipe", nargs="?", default="recipe.json", help="recipe JSON path")
    parser.add_argument("--port", default=DEFAULT_PORT)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--yes", action="store_true", help="skip the CLI confirmation")
    args = parser.parse_args()

    path = Path(args.recipe)
    data = json.loads(path.read_text(encoding="utf-8"))
    raw_steps = data.get("steps") if isinstance(data, dict) else data
    checked = validate_recipe(raw_steps)
    print(f"配方共 {len(checked)} 步，合计 {sum(grams for _, grams in checked):g}g")
    for pump, grams in checked:
        print(f"  泵{pump} -> {grams:g}g")

    if not args.dry_run and not args.yes:
        answer = input("以上配方将真实加注，确认? (y/N): ").strip().lower()
        if answer not in {"y", "yes"}:
            print("已取消，未执行任何加注。")
            return

    print(json.dumps(execute_recipe(raw_steps, port=args.port, dry_run=args.dry_run), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
