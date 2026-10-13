import type { ScentFacets } from '@/data/ingredients';
import type { IntentProfile } from './intent';
import type { TargetVector } from './types';

/**
 * 意图 → 目标香气向量 映射模块。
 *
 * 把用户意图量化为可优化的 7 维目标向量 y（6 维香调 + 强度），
 * 同时产出加权对角线 W（用户明确禁忌的维度权重更大）和硬禁忌原料。
 *
 * 这是「语言理解 + 香气向量 + 约束优化」链路的第二环：
 *  意图(IntentProfile) → 目标向量 y / 权重 W / 禁忌 → 优化求解器
 */

const zeroWeights: ScentFacets & { intensity: number } = {
  fresh: 1,
  sweet: 1,
  floral: 1,
  woody: 1,
  watery: 1,
  warm: 1,
  intensity: 1
};

function bumpWeight(weights: ScentFacets & { intensity: number }, facet: keyof ScentFacets | 'intensity', factor: number) {
  weights[facet] = Math.min(5, weights[facet] * factor);
}

/** 低门槛约束关键词：命中时强度目标取 2（用户想要不浓、轻一点的香气） */
const LOW_INTENSITY_WORDS = ['低门槛', '小白', '第一次', '低调', '轻一点', '不要太浓', '清新淡雅'];

/** 高存在感关键词：命中时强度目标取 3（默认值即 3，这里保持语义完整） */
const HIGH_INTENSITY_WORDS = ['有记忆点', '隆重', '浓烈', '存在感'];

/**
 * 由意图构建目标向量。
 * - facets 直接来自意图解析的 desiredFacets（0-5）
 * - intensity 目标：低门槛/不要太浓 → 2，默认 3
 * - weights：禁忌维度加权（甜×3、明显花香×2、厚重木质×2、低门槛强度×1.5）
 * - banned：当前规则引擎不产出具体原料名，保留空数组接口（materialSelector 已做硬过滤）
 */
export function buildTargetVector(profile: IntentProfile): TargetVector {
  const facets: ScentFacets = { ...profile.desiredFacets };

  let intensity = 3;
  if (profile.constraints.some((item) => LOW_INTENSITY_WORDS.some((word) => item.includes(word) || word.includes(item)))) {
    intensity = 2;
  }
  if (profile.scenarios.some((item) => item.includes('正式场合'))) {
    intensity = Math.max(intensity, 3);
  }
  if (profile.constraints.some((item) => HIGH_INTENSITY_WORDS.some((word) => item.includes(word) || word.includes(item)))) {
    intensity = 4;
  }

  Object.assign(facets, Object.fromEntries(Object.entries(profile.preferenceTargets || {}).filter(([key]) => key !== 'intensity')));
  if (profile.preferenceTargets?.intensity !== undefined) intensity = profile.preferenceTargets.intensity;
  const weights = { ...zeroWeights };
  if (profile.dislikes.includes('甜腻')) bumpWeight(weights, 'sweet', 3);
  if (profile.dislikes.includes('明显花香')) bumpWeight(weights, 'floral', 2);
  if (profile.dislikes.includes('厚重木质')) bumpWeight(weights, 'woody', 2);
  if (intensity <= 2) bumpWeight(weights, 'intensity', 1.5);

  return {
    facets,
    intensity,
    weights,
    banned: profile.bannedMaterialIds || []
  };
}

/** 目标向量 → 长度为 7 的数值数组（供求解器使用），顺序与 DIMS 一致 */
export const TARGET_DIMS: Array<keyof ScentFacets | 'intensity'> = ['fresh', 'sweet', 'floral', 'woody', 'watery', 'warm', 'intensity'];

export function targetVectorToArray(target: TargetVector): number[] {
  return TARGET_DIMS.map((dim) => (dim === 'intensity' ? target.intensity : target.facets[dim]));
}

export function weightsToArray(target: TargetVector): number[] {
  return TARGET_DIMS.map((dim) => target.weights[dim]);
}
