import type { ScentFacets } from '@/data/ingredients';

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type NoteItem = {
  name: string;
  percentage: number;
};

export type BoothStep = {
  material: string;
  noteRole: 'top' | 'heart' | 'base';
  percentage: number;
  distance: string;
  waitSeconds: number;
  instruction: string;
};

/**
 * 目标香气向量：把用户意图量化为可优化的 7 维目标。
 * facets 为 6 维香调（0-5），intensity 为强度目标（0-5）。
 * weights 为加权对角矩阵的对角线（用户明确禁忌的维度权重更大）。
 * banned 为硬排除的具体原料名（当前规则引擎不产出，保留接口）。
 */
export type TargetVector = {
  facets: ScentFacets;
  intensity: number;
  weights: ScentFacets & { intensity: number };
  banned: string[];
};

export type VectorDimensionError = {
  dim: string;
  label: string;
  target: number;
  actual: number;
  diff: number;
};

/** 配方与目标的匹配误差：逐维 + 总误差 ||Aw − y||² + L1 */
export type VectorError = {
  perDimension: VectorDimensionError[];
  total: number;
  l1: number;
};

/** 配方求解模式：enum=约束优化枚举求解；heuristic=启发式兜底；explain=解释追问保留原配方 */
export type SolveMode = 'enum' | 'heuristic' | 'explain';
export type GenerationSource = 'llm' | 'local';

export type FormulaResponse = {
  fragrancePositioning: {
    style: string;
    keywords: string[];
    suitableScenarios: string[];
  };
  formula: {
    topNotes: NoteItem[];
    heartNotes: NoteItem[];
    baseNotes: NoteItem[];
  };
  blendingSuggestion: {
    recommendedConcentration: string;
    targetVolumeMl?: number;
    fragranceConcentrateMl?: number;
    alcoholMl?: number;
    solventMl?: number;
    maceration?: string;
  };
  boothSteps: BoothStep[];
  finalEffect: {
    opening: string;
    heart: string;
    drydown: string;
    sillage: string;
    longevity: string;
  };
  adjustments?: {
    fresher: string;
    softer: string;
    longerLasting: string;
  };
  safetyNote: string;
  rawText?: string;
  targetVector?: TargetVector;
  error?: VectorError;
  solveMode?: SolveMode;
};

export type GenerateResponse = {
  mode: SolveMode;
  sessionId: string;
  replyText: string;
  formula: FormulaResponse;
  ai: {
    intent: GenerationSource;
    explanation: GenerationSource;
  };
};

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function sanitizeNotes(value: unknown): NoteItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((item: any) => ({
    name: toStringValue(item?.name),
    percentage: toNumber(item?.percentage)
  })).filter((item) => item.name);
}

function sanitizeBoothSteps(value: unknown): BoothStep[] {
  if (!Array.isArray(value)) return [];
  return value.map((item: any) => ({
    material: toStringValue(item?.material),
    noteRole: item?.noteRole === 'heart' || item?.noteRole === 'base' ? item.noteRole : 'top',
    percentage: toNumber(item?.percentage),
    distance: toStringValue(item?.distance),
    waitSeconds: toNumber(item?.waitSeconds),
    instruction: toStringValue(item?.instruction)
  })).filter((item) => item.material);
}

const facetKeys: Array<keyof ScentFacets> = ['fresh', 'sweet', 'floral', 'woody', 'watery', 'warm'];

function sanitizeFacetMap(value: unknown): ScentFacets | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const map = value as Record<string, unknown>;
  const result = facetKeys.reduce((acc, key) => {
    acc[key] = toNumber(map[key]);
    return acc;
  }, {} as ScentFacets);
  return facetKeys.every((key) => Number.isFinite(result[key])) ? result : undefined;
}

function sanitizeTargetVector(value: unknown): TargetVector | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  const facets = sanitizeFacetMap(raw.facets);
  const weights = sanitizeFacetMap(raw.weights);
  const intensity = toNumber(raw.intensity);
  if (!facets || !weights || !Number.isFinite(intensity)) return undefined;
  return {
    facets,
    intensity,
    weights: { ...weights, intensity: toNumber((raw.weights as Record<string, unknown>)?.intensity) },
    banned: Array.isArray(raw.banned) ? raw.banned.map(String).filter(Boolean) : []
  };
}

function sanitizeVectorError(value: unknown): VectorError | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  const perDimension = Array.isArray(raw.perDimension)
    ? raw.perDimension.map((item: any) => ({
        dim: toStringValue(item?.dim),
        label: toStringValue(item?.label),
        target: toNumber(item?.target),
        actual: toNumber(item?.actual),
        diff: toNumber(item?.diff)
      }))
    : [];
  const total = toNumber(raw.total);
  const l1 = toNumber(raw.l1);
  if (!perDimension.length && !Number.isFinite(total)) return undefined;
  return { perDimension, total, l1 };
}

export function sanitizeFormula(raw: any): FormulaResponse {
  const pos = raw?.fragrancePositioning || {};
  const formula = raw?.formula || {};
  const blend = raw?.blendingSuggestion || {};
  const effect = raw?.finalEffect || {};
  const adjustments = raw?.adjustments;

  return {
    fragrancePositioning: {
      style: toStringValue(pos.style),
      keywords: toStringArray(pos.keywords),
      suitableScenarios: toStringArray(pos.suitableScenarios)
    },
    formula: {
      topNotes: sanitizeNotes(formula.topNotes),
      heartNotes: sanitizeNotes(formula.heartNotes),
      baseNotes: sanitizeNotes(formula.baseNotes)
    },
    blendingSuggestion: {
      recommendedConcentration: toStringValue(blend.recommendedConcentration),
      targetVolumeMl: toNumber(blend.targetVolumeMl) || undefined,
      fragranceConcentrateMl: toNumber(blend.fragranceConcentrateMl) || undefined,
      alcoholMl: toNumber(blend.alcoholMl) || undefined,
      solventMl: toNumber(blend.solventMl) || undefined,
      maceration: toStringValue(blend.maceration) || undefined
    },
    boothSteps: sanitizeBoothSteps(raw?.boothSteps),
    finalEffect: {
      opening: toStringValue(effect.opening),
      heart: toStringValue(effect.heart),
      drydown: toStringValue(effect.drydown),
      sillage: toStringValue(effect.sillage),
      longevity: toStringValue(effect.longevity)
    },
    adjustments: adjustments ? {
      fresher: toStringValue(adjustments.fresher),
      softer: toStringValue(adjustments.softer),
      longerLasting: toStringValue(adjustments.longerLasting)
    } : undefined,
    safetyNote: toStringValue(raw?.safetyNote),
    rawText: toStringValue(raw?.rawText) || undefined,
    solveMode: raw?.solveMode === 'enum' || raw?.solveMode === 'heuristic' || raw?.solveMode === 'explain'
      ? raw.solveMode
      : undefined,
    targetVector: sanitizeTargetVector(raw?.targetVector),
    error: sanitizeVectorError(raw?.error)
  };
}
