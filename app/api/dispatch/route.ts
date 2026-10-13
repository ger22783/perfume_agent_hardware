import { createHash, randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { buildHardwareRecipe, DEFAULT_BATCH_GRAMS } from '@/lib/hardwareRecipe';
import { sanitizeFormula } from '@/lib/types';
import { assertUsableFormula } from '@/lib/validation';
import { requireUser, requireSameOrigin, readJson, failure } from '@/lib/accounts/http';
import { getGeneration, getProfile } from '@/lib/accounts/repository';
import { assertExclusions } from '@/lib/accounts/personalization';

export const dynamic = 'force-dynamic';

function makeIdempotencyKey(sessionId: string, formula: unknown, targetTotalG: number) {
  const digest = createHash('sha256')
    .update(JSON.stringify({ sessionId, formula, targetTotalG }))
    .digest('hex')
    .slice(0, 24);
  return `${sessionId}:${digest}`;
}

export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const user = await requireUser(req);
    const body = await readJson(req);
    const saved = await getGeneration(user.id, 'hardware', String(body.generationId || ''));
    const sessionId = saved.session_id;
    const targetTotalG = Number(body?.targetTotalG ?? DEFAULT_BATCH_GRAMS);
    const formula = sanitizeFormula(saved.payload.formula);
    assertUsableFormula(formula);
    const profile = await getProfile(user.id);
    if (profile) assertExclusions(formula, profile.answers);

    const recipe = buildHardwareRecipe({
      formula,
      targetTotalG,
      jobId: `job_${randomUUID()}`,
      idempotencyKey: makeIdempotencyKey(sessionId, formula.formula, targetTotalG),
      sessionId
    });
    const dispatchedAt = new Date().toISOString();
    const hardwareUrl = process.env.HARDWARE_API_URL?.trim();

    if (!hardwareUrl) {
      return NextResponse.json({
        ok: true,
        mode: 'simulated',
        status: 'succeeded',
        dispatchedAt,
        recipe,
        results: recipe.steps.map((step) => ({
          ...step,
          ok: true,
          actualG: step.grams,
          errorG: 0,
          reply: `[dry-run] D${step.pump} DONE actual=${step.grams}g target=${step.grams}g err=+0g`
        })),
        note: 'HARDWARE_API_URL 未配置，本次只完成克数换算，没有连接 STM32。'
      });
    }

    const controller = new AbortController();
    // 固件允许单步最长 300 秒，四泵按顺序执行；HTTP 总等待需覆盖完整批次。
    const timeout = setTimeout(() => controller.abort(), 1_550_000);
    let response: Response;
    try {
      const token = process.env.HARDWARE_API_TOKEN?.trim();
      response = await fetch(hardwareUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(recipe)
      });
    } finally {
      clearTimeout(timeout);
    }

    const rawText = await response.text();
    let hardwareResult: any = {};
    try {
      hardwareResult = rawText ? JSON.parse(rawText) : {};
    } catch {
      hardwareResult = { error: rawText || 'Hardware bridge returned an empty response' };
    }

    if (!response.ok) {
      return NextResponse.json({
        ok: false,
        error: hardwareResult?.detail || hardwareResult?.error || `Hardware dispatch failed: ${response.status}`,
        recipe
      }, { status: response.status === 409 ? 409 : 502 });
    }

    return NextResponse.json({
      ok: hardwareResult?.ok !== false,
      mode: hardwareResult?.mode === 'simulated' ? 'simulated' : 'hardware',
      status: hardwareResult?.status || (hardwareResult?.ok === false ? 'failed' : 'succeeded'),
      dispatchedAt,
      recipe,
      results: Array.isArray(hardwareResult?.results) ? hardwareResult.results : [],
      deduplicated: hardwareResult?.deduplicated === true
    });
  } catch (error) {
    return failure(error);
  }
}
