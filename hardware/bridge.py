#!/usr/bin/env python3
"""Local HTTP bridge: validated hardware jobs -> pump_host -> STM32 serial."""

from __future__ import annotations

import hmac
import os
import threading
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

try:
    from .pump_host import DEFAULT_PORT, execute_recipe, validate_recipe
except ImportError:  # Allows `python hardware/bridge.py` during local debugging.
    from pump_host import DEFAULT_PORT, execute_recipe, validate_recipe

app = FastAPI(title="Aromacell Hardware Bridge", version="1.0.0")
execution_lock = threading.Lock()
cache_lock = threading.Lock()
completed_by_key: dict[str, dict[str, Any]] = {}


class HardwareStep(BaseModel):
    pump: int
    grams: float
    materialId: str
    materialName: str
    percentage: int


class HardwareJob(BaseModel):
    schemaVersion: int
    jobId: str = Field(min_length=1)
    idempotencyKey: str = Field(min_length=1)
    sessionId: str = Field(min_length=1)
    deviceId: str = Field(min_length=1)
    targetTotalG: float
    steps: list[HardwareStep] = Field(min_length=3, max_length=4)


def is_dry_run() -> bool:
    return os.environ.get("HARDWARE_DRY_RUN", "true").strip().lower() not in {"0", "false", "no"}


def authorize(authorization: str | None) -> None:
    expected = os.environ.get("HARDWARE_API_TOKEN", "").strip()
    if not expected:
        return
    received = authorization.removeprefix("Bearer ").strip() if authorization else ""
    if not hmac.compare_digest(received, expected):
        raise HTTPException(status_code=401, detail="invalid hardware API token")


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "deviceId": "aromacell-01",
        "port": os.environ.get("HARDWARE_SERIAL_PORT", DEFAULT_PORT),
        "dryRun": is_dry_run(),
        "toleranceG": float(os.environ.get("HARDWARE_TOLERANCE_G", "0.5")),
        "busy": execution_lock.locked(),
    }


@app.post("/v1/jobs")
def execute_job(job: HardwareJob, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    authorize(authorization)
    if job.schemaVersion != 1:
        raise HTTPException(status_code=400, detail="unsupported schemaVersion")
    if job.deviceId != "aromacell-01":
        raise HTTPException(status_code=400, detail=f"unknown deviceId: {job.deviceId}")

    with cache_lock:
        cached = completed_by_key.get(job.idempotencyKey)
    if cached:
        return {**cached, "deduplicated": True}

    raw_steps = [{"pump": step.pump, "grams": step.grams} for step in job.steps]
    try:
        validate_recipe(raw_steps)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    step_total = round(sum(step.grams for step in job.steps), 1)
    if abs(step_total - job.targetTotalG) > 0.05:
        raise HTTPException(status_code=400, detail="step grams do not equal targetTotalG")

    if not execution_lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="Aromacell is busy")

    try:
        execution = execute_recipe(
            raw_steps,
            port=os.environ.get("HARDWARE_SERIAL_PORT", DEFAULT_PORT),
            dry_run=is_dry_run(),
            tolerance_g=float(os.environ.get("HARDWARE_TOLERANCE_G", "0.5")),
        )
        results = []
        for index, result in enumerate(execution["results"]):
            source = job.steps[index]
            results.append({
                **source.model_dump(),
                **result,
            })
        response = {
            "ok": execution["ok"],
            "status": execution["status"],
            "jobId": job.jobId,
            "deviceId": job.deviceId,
            "mode": "simulated" if is_dry_run() else "hardware",
            "results": results,
        }
        with cache_lock:
            completed_by_key[job.idempotencyKey] = response
        return response
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    finally:
        execution_lock.release()
