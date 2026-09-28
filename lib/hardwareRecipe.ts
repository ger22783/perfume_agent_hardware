import { boothMaterials } from '@/data/ingredients';
import { activeHardwareProfile } from '@/data/hardwareProfile';
import type { FormulaResponse } from './types';

export const MIN_BATCH_GRAMS = 5;
export const MAX_BATCH_GRAMS = 100;
export const DEFAULT_BATCH_GRAMS = 20;
export const BATCH_GRAM_OPTIONS = [10, 20, 50] as const;

export type HardwareStep = {
  pump: number;
  grams: number;
  materialId: string;
  materialName: string;
  percentage: number;
};

export type HardwareRecipe = {
  schemaVersion: 1;
  jobId: string;
  idempotencyKey: string;
  sessionId: string;
  deviceId: string;
  targetTotalG: number;
  steps: HardwareStep[];
};

export type HardwareStepResult = HardwareStep & {
  ok: boolean;
  actualG: number | null;
  errorG: number | null;
  reply: string;
};

export type DispatchResponse = {
  ok: boolean;
  mode: 'hardware' | 'simulated';
  status: 'succeeded' | 'failed';
  dispatchedAt: string;
  recipe: HardwareRecipe;
  results: HardwareStepResult[];
  note?: string;
  deduplicated?: boolean;
};

function allNotes(formula: FormulaResponse) {
  return [
    ...formula.formula.topNotes,
    ...formula.formula.heartNotes,
    ...formula.formula.baseNotes
  ];
}

function assertBatchGrams(value: number) {
  if (!Number.isFinite(value) || value < MIN_BATCH_GRAMS || value > MAX_BATCH_GRAMS) {
    throw new Error(`总质量必须在 ${MIN_BATCH_GRAMS}-${MAX_BATCH_GRAMS}g 之间。`);
  }
  if (Math.round(value * 10) !== value * 10) {
    throw new Error('总质量最多保留 1 位小数。');
  }
}

/**
 * 最大余数法：在 0.1g 精度下分配每种原料，保证各步之和严格等于总质量。
 */
function allocateTenths(percentages: number[], totalTenths: number) {
  const raw = percentages.map((percentage) => totalTenths * percentage / 100);
  const units = raw.map(Math.floor);
  let remaining = totalTenths - units.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, remainder: value - units[index] }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);

  for (let index = 0; index < remaining; index += 1) {
    units[order[index % order.length].index] += 1;
  }

  return units;
}

/** 把 Agent 百分比配方转换为 STM32 主机可执行的泵号 + 克数步骤。 */
export function buildHardwareSteps(formula: FormulaResponse, targetTotalG: number): HardwareStep[] {
  assertBatchGrams(targetTotalG);
  const notes = allNotes(formula);
  if (notes.length < 3 || notes.length > activeHardwareProfile.pumps.length) {
    throw new Error(`硬件配方必须包含 3-${activeHardwareProfile.pumps.length} 种原料。`);
  }

  const totalPercentage = notes.reduce((sum, note) => sum + note.percentage, 0);
  if (totalPercentage !== 100) {
    throw new Error(`配方比例总和必须为 100，目前为 ${totalPercentage}。`);
  }

  const uniqueNames = new Set(notes.map((note) => note.name));
  if (uniqueNames.size !== notes.length) {
    throw new Error('硬件配方不能包含重复原料。');
  }

  const materialByName = new Map(boothMaterials.map((material) => [material.nameZh, material]));
  const pumpByMaterialId = new Map(activeHardwareProfile.pumps.map((slot) => [slot.materialId, slot]));
  const resolved = notes.map((note) => {
    const material = materialByName.get(note.name);
    if (!material) throw new Error(`未知原料：${note.name}`);
    const slot = pumpByMaterialId.get(material.id);
    if (!slot) throw new Error(`${note.name} 当前没有装入 Aromacell。`);
    if (!Number.isInteger(note.percentage) || note.percentage <= 0) {
      throw new Error(`${note.name} 的比例无效。`);
    }
    return { note, material, slot };
  });

  const totalTenths = Math.round(targetTotalG * 10);
  const allocated = allocateTenths(notes.map((note) => note.percentage), totalTenths);

  return resolved.map(({ note, material, slot }, index) => {
    const grams = allocated[index] / 10;
    if (grams < 0.1 || grams > 500) {
      throw new Error(`${note.name} 换算后的 ${grams}g 超出硬件范围。`);
    }
    return {
      pump: slot.pump,
      grams,
      materialId: material.id,
      materialName: material.nameZh,
      percentage: note.percentage
    };
  });
}

export function buildHardwareRecipe(input: {
  formula: FormulaResponse;
  targetTotalG: number;
  jobId: string;
  idempotencyKey: string;
  sessionId: string;
}): HardwareRecipe {
  return {
    schemaVersion: 1,
    jobId: input.jobId,
    idempotencyKey: input.idempotencyKey,
    sessionId: input.sessionId,
    deviceId: activeHardwareProfile.deviceId,
    targetTotalG: input.targetTotalG,
    steps: buildHardwareSteps(input.formula, input.targetTotalG)
  };
}
