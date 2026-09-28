import type { SelectionPlan, MaterialCandidate } from './materialSelector';
import type { BoothStep, FormulaResponse, NoteItem, TargetVector, VectorError } from './types';
import { TARGET_DIMS, targetVectorToArray, weightsToArray } from './intentVector';
import type { Lang } from './i18n';
import { displayNameList, localizeTerms } from './localization';

/**
 * 约束优化求解器（lib/optimizer.ts）
 *
 * 把「语言理解 + 香气向量 + 约束优化」落到数学求解：
 *
 *   minimize  Σ W_k · (Aw − y)²         加权最小二乘（W 为禁忌维度加权对角线）
 *   s.t.      Σ w = 1                    比例总和 100%
 *             lᵢ ≤ wᵢ ≤ uᵢ             每个原料比例落在 recommended usage 范围内
 *             角色覆盖：至少 1 top / 1 heart / 1 base
 *
 * 求解策略（枚举 + 投影梯度下降）：
 *   1. 从选材模块的候选池构建「原料-角色」候选对（同原料取最优角色）
 *   2. 枚举所有 3/4 原料组合，过滤不满足角色覆盖的组合
 *   3. 每组组合内用投影梯度下降（PGD）���确求解比例
 *   4. 剔除 <1% 的原料后重新归一化，再次校验结构
 *   5. 取总误差 ||Aw − y||² 最小的合法组合
 *
 * 所有维度先归一化到 [0,1] 再求解（避免强度与香调量纲偏置），
 * 展示时还原为 0-5。
 */

type PoolItem = {
  candidate: MaterialCandidate;
  role: 'top' | 'heart' | 'base';
};

type SolvedCombo = {
  items: PoolItem[];
  w: number[];
  AwRaw: number[];
  err2: number;
  l1: number;
};

export type SolverOutput = {
  formula: FormulaResponse;
  error: VectorError;
};

const DIM_LABELS: Record<(typeof TARGET_DIMS)[number], string> = {
  fresh: '清爽',
  sweet: '甜感',
  floral: '花香',
  woody: '木质',
  watery: '水感',
  warm: '温暖',
  intensity: '强度'
};

const DIM_LABELS_EN: Record<(typeof TARGET_DIMS)[number], string> = {
  fresh: 'Fresh',
  sweet: 'Sweet',
  floral: 'Floral',
  woody: 'Woody',
  watery: 'Aquatic',
  warm: 'Warm',
  intensity: 'Intensity'
};

const MAX_ITER = 3000;
const TOL = 1e-9;

/**
 * 同一种原料只进入候选池一次。双角色原料优先分配给候选更少的稀缺角色，
 * 避免四泵配置里玫瑰先占 heart 后导致 base 无候选，同时控制枚举规模。
 */
function buildPool(plan: SelectionPlan): PoolItem[] {
  const roles: Array<'top' | 'heart' | 'base'> = ['top', 'heart', 'base'];
  const best = new Map<string, PoolItem>();
  for (const role of roles) {
    for (const candidate of plan[role]) {
      const key = candidate.material.id;
      const existing = best.get(key);
      if (!existing || plan[role].length < plan[existing.role].length) {
        best.set(key, { candidate, role });
      }
    }
  }
  return [...best.values()];
}

function combinations<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  const current: T[] = [];
  function walk(start: number) {
    if (current.length === size) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < items.length; i++) {
      current.push(items[i]);
      walk(i + 1);
      current.pop();
    }
  }
  walk(0);
  return result;
}

/** 盒约束 + 和=1 的交替投影 */
function project(w: number[], lo: number[], hi: number[]): number[] {
  let current = w.map((x, i) => Math.min(Math.max(x, lo[i]), hi[i]));
  for (let iter = 0; iter < 80; iter++) {
    const sum = current.reduce((acc, x) => acc + x, 0);
    const delta = (sum - 1) / current.length;
    const next = current.map((x, i) => Math.min(Math.max(x - delta, lo[i]), hi[i]));
    if (next.every((x, i) => Math.abs(x - current[i]) < 1e-12)) return next;
    current = next;
  }
  return current;
}

/**
 * 在给定子集内求解比例（投影梯度下降 + 回溯线搜索）。
 * y / W 为归一化目标向量与权重；yRaw 为 0-5 量纲目标（用于误差展示）。
 * 返回 null 表示结构不合法（剔除小比例后缺调性）。
 */
function solveSubset(items: PoolItem[], y: number[], yRaw: number[], W: number[]): SolvedCombo | null {
  const n = items.length;
  const lo = items.map((item) => item.candidate.material.usageRange[0] / 100);
  const hi = items.map((item) => item.candidate.material.usageRange[1] / 100);

  const A: number[][] = TARGET_DIMS.map((dim) => items.map((item) => {
    const material = item.candidate.material;
    if (dim === 'intensity') return material.intensity / 5;
    return material.facets[dim] / 5;
  }));

  const obj = (x: number[]): number => {
    let total = 0;
    for (let k = 0; k < 7; k++) {
      let residual = 0;
      for (let j = 0; j < n; j++) residual += A[k][j] * x[j];
      residual -= y[k];
      total += W[k] * residual * residual;
    }
    return total;
  };

  let w = project(new Array(n).fill(1 / n), lo, hi);
  let bestW = [...w];
  let bestF = obj(w);

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const grad = new Array(n).fill(0);
    for (let k = 0; k < 7; k++) {
      let residual = 0;
      for (let j = 0; j < n; j++) residual += A[k][j] * w[j];
      residual -= y[k];
      const scale = W[k] * residual;
      for (let j = 0; j < n; j++) grad[j] += A[k][j] * scale;
    }

    const f0 = obj(w);
    let eta = 1;
    let next = w;
    let f1 = f0;
    while (eta > 1e-6) {
      next = project(w.map((x, j) => x - eta * grad[j]), lo, hi);
      f1 = obj(next);
      const gradientNorm = grad.reduce((acc, g) => acc + g * g, 0);
      if (f1 <= f0 - 1e-4 * eta * gradientNorm) break;
      eta *= 0.5;
    }
    if (eta <= 1e-6) break;
    if (next.every((x, j) => Math.abs(x - w[j]) < TOL)) {
      w = next;
      break;
    }
    w = next;
    if (f1 < bestF) {
      bestF = f1;
      bestW = [...w];
    }
  }

  // 剔除 <1% 的原料并重新归一化
  const keepIdx: number[] = [];
  bestW.forEach((value, i) => {
    if (value >= 0.01) keepIdx.push(i);
  });
  if (keepIdx.length < 3) return null;
  const sum = keepIdx.reduce((acc, i) => acc + bestW[i], 0);
  const keptItems = items.filter((_, i) => keepIdx.includes(i));
  const keptW = keepIdx.map((i) => bestW[i] / sum);

  const roles = new Set(keptItems.map((item) => item.role));
  if (!(roles.has('top') && roles.has('heart') && roles.has('base'))) return null;

  // 还原 0-5 量纲计算预测香气与误差
  const AwRaw = TARGET_DIMS.map((dim, k) => keptItems.reduce((acc, item, j) => {
    const material = item.candidate.material;
    const value = dim === 'intensity' ? material.intensity : material.facets[dim];
    return acc + value * keptW[j];
  }, 0));
  const err2 = AwRaw.reduce((acc, actual, k) => acc + (actual - yRaw[k]) * (actual - yRaw[k]), 0);
  const l1 = AwRaw.reduce((acc, actual, k) => acc + Math.abs(actual - yRaw[k]), 0);

  return { items: keptItems, w: keptW, AwRaw, err2, l1 };
}

/** 喷距映射（与 validation.ts / generator.ts 保持一致） */
function sprayDistance(percentage: number): string {
  if (percentage >= 40) return '2-3cm';
  if (percentage >= 30) return '4-5cm';
  if (percentage >= 20) return '6-7cm';
  return '8-9cm';
}

function buildStep(item: PoolItem, percentage: number, lang: Lang): BoothStep {
  const distance = sprayDistance(percentage);
  return {
    material: item.candidate.material.nameZh,
    noteRole: item.role,
    percentage: Math.round(percentage),
    distance,
    waitSeconds: 10,
    instruction: lang === 'en'
      ? `Dispense once from ${distance} away, then wait 10 seconds`
      : `喷 1 下，距离 ${distance}，等待 10 秒`
  };
}

function buildFormula(items: PoolItem[], w: number[], plan: SelectionPlan, target: TargetVector, error: VectorError, lang: Lang): FormulaResponse {
  const topNotes: NoteItem[] = [];
  const heartNotes: NoteItem[] = [];
  const baseNotes: NoteItem[] = [];
  items.forEach((item, idx) => {
    const note: NoteItem = { name: item.candidate.material.nameZh, percentage: Math.round(w[idx] * 100) };
    if (item.role === 'top') topNotes.push(note);
    else if (item.role === 'heart') heartNotes.push(note);
    else baseNotes.push(note);
  });

  const allNotes = [...topNotes, ...heartNotes, ...baseNotes];
  // 最后一公里：Math.round 累积误差会让若干 round 后总和 ≠ 100（导致 validation 报错）。
  // 把差值补/扣到占比最大的那一项，保证 100% 恒成立。
  if (allNotes.length > 0) {
    const total = allNotes.reduce((sum, note) => sum + note.percentage, 0);
    if (total !== 100) {
      const max = allNotes.reduce((a, b) => (b.percentage > a.percentage ? b : a));
      max.percentage += 100 - total;
    }
  }
  const topNames = displayNameList(topNotes.map((note) => note.name), lang);
  const heartNames = displayNameList(heartNotes.map((note) => note.name), lang);
  const baseNames = displayNameList(baseNotes.map((note) => note.name), lang);

  const intent = plan.intent;
  const style = lang === 'en'
    ? intent.moods.includes('浪漫')
      ? 'Restrained floral signature'
      : intent.desiredFacets.watery >= 4
        ? 'Sheer aquatic blend'
        : intent.desiredFacets.warm >= 4
          ? 'Warm grounded blend'
          : 'Fresh everyday blend'
    : intent.moods.includes('浪漫')
      ? '克制花香记忆款'
      : intent.desiredFacets.watery >= 4
        ? '清透水感试香'
        : intent.desiredFacets.warm >= 4
          ? '温暖沉稳氛围香'
          : '清新日常款';
  const rawKeywords = [
    ...(intent.moods.length ? intent.moods.slice(0, 2) : ['易接受', '有个性']),
    ...(intent.constraints.includes('低门槛') ? ['低门槛'] : ['有层次'])
  ].slice(0, 3);
  const keywords = localizeTerms(rawKeywords, lang, ['approachable', 'distinctive', 'layered']);
  const scenarios = localizeTerms(intent.scenarios, lang, lang === 'en' ? ['everyday wear', 'personal styling'] : ['日常使用', '个性定制']);

  return {
    fragrancePositioning: {
      style,
      keywords,
      suitableScenarios: scenarios
    },
    formula: { topNotes, heartNotes, baseNotes },
    blendingSuggestion: {
      recommendedConcentration: lang === 'en'
        ? 'Aromacell blends the formula proportionally from top to heart to base notes.'
        : '配方按前调 → 中调 → 后调顺序，由 Aromacell 自动按比例调配。'
    },
    boothSteps: [...topNotes, ...heartNotes, ...baseNotes]
      .map((note) => {
        const item = items.find((candidate) => candidate.candidate.material.nameZh === note.name);
        return item ? buildStep(item, note.percentage, lang) : null;
      })
      .filter((step): step is BoothStep => step !== null),
    finalEffect: {
      opening: lang === 'en'
        ? `The top notes (${topNames || 'the opening accord'}) create a bright, approachable first impression.`
        : `${topNames || '前调'}先给出第一印象，让香气开场更明亮、更容易接近。`,
      heart: lang === 'en'
        ? `The heart (${heartNames || 'the central accord'}) defines the main character and gives the scent a clear theme.`
        : `${heartNames || '中调'}负责主体性格，让香气从单一气味变成有主题的体验。`,
      drydown: lang === 'en'
        ? `The base (${baseNames || 'the drydown accord'}) creates a stable, memorable finish.`
        : `${baseNames || '后调'}负责收尾和稳定度，让香水从新鲜开场过渡到有记忆点的尾调。`,
      sillage: lang === 'en'
        ? allNotes.some((note) => note.percentage >= 35) ? 'Moderate projection for close-range wear' : 'Light-to-moderate projection for an easy first wear'
        : allNotes.some((note) => note.percentage >= 35) ? '中等扩散，适合近距离闻香' : '轻到中等扩散，适合第一次体验',
      longevity: lang === 'en'
        ? 'Approximately 3–6 hours; check the drydown after 2–3 hours'
        : '约 3-6 小时留香，建议使用后 2-3 小时左右观察尾调变化'
    },
    adjustments: {
      fresher: lang === 'en' ? 'For a fresher version, increase Japanese Citrus or Sea Breeze Bell.' : '想更清爽，下一轮提高日系柑橘或海上风铃的比例。',
      softer: lang === 'en' ? 'For a softer version, add more Osmanthus Oolong.' : '想更柔和，下一轮增加桂花乌龙，让边缘更圆润。',
      longerLasting: lang === 'en' ? 'For a steadier drydown, slightly increase Desert Rose.' : '想让概念上的尾调更稳，下一轮可以小幅提高无人之境玫瑰。'
    },
    safetyNote: lang === 'en'
      ? 'Use as directed. Avoid contact with eyes, mouth, nose, and broken skin; patch-test first if you are sensitive.'
      : '请在工作人员指导下体验，避免接触眼睛、口鼻和伤口；敏感体质请先小范围测试。',
    targetVector: target,
    error,
    solveMode: 'enum'
  };
}

/**
 * 主入口：枚举 + PGD 求解最优配方。
 * 返回 null 表示求解失败（应回退启发式兜底）。
 */
export function solveFormula(plan: SelectionPlan, target: TargetVector, lang: Lang = 'zh'): SolverOutput | null {
  const pool = buildPool(plan);
  if (pool.length < 3) return null;

  const yRaw = targetVectorToArray(target);
  const y = yRaw.map((value) => value / 5);
  const W = weightsToArray(target);

  let best: SolvedCombo | null = null;
  for (const size of [3, 4]) {
    for (const combo of combinations(pool, size)) {
      const materialIds = new Set(combo.map((item) => item.candidate.material.id));
      if (materialIds.size !== combo.length) continue;
      const roles = new Set(combo.map((item) => item.role));
      if (!(roles.has('top') && roles.has('heart') && roles.has('base'))) continue;
      const solved = solveSubset(combo, y, yRaw, W);
      if (!solved) continue;
      if (!best || solved.err2 < best.err2) best = solved;
    }
  }

  if (!best) return null;

  const perDimension = TARGET_DIMS.map((dim, k) => ({
    dim,
    label: lang === 'en' ? DIM_LABELS_EN[dim] : DIM_LABELS[dim],
    target: yRaw[k],
    actual: Math.round(best!.AwRaw[k] * 100) / 100,
    diff: Math.round(Math.abs(best!.AwRaw[k] - yRaw[k]) * 100) / 100
  }));
  const error: VectorError = {
    perDimension,
    total: Math.round(best.err2 * 10000) / 10000,
    l1: Math.round(best.l1 * 10000) / 10000
  };

  const formula = buildFormula(best.items, best.w, plan, target, error, lang);
  return { formula, error };
}
