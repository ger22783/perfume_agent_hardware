import { boothMaterials, type BoothMaterial, type NoteRole, type ScentFacets } from '@/data/ingredients';
import type { IntentProfile } from './intent';

export type MaterialCandidate = {
  material: BoothMaterial;
  score: number;
  reasons: string[];
};

export type SelectionPlan = {
  intent: IntentProfile;
  candidates: MaterialCandidate[];
  top: MaterialCandidate[];
  heart: MaterialCandidate[];
  base: MaterialCandidate[];
  summary: string;
};

const facetLabels: Record<keyof ScentFacets, string> = {
  fresh: '清爽',
  sweet: '甜感',
  floral: '花香',
  woody: '木质',
  watery: '水感',
  warm: '温暖'
};

function overlapScore(left: string[], right: string[]) {
  const normalized = right.map((item) => item.toLowerCase());
  return left.reduce((score, item) => {
    const value = item.toLowerCase();
    return score + (normalized.some((target) => target.includes(value) || value.includes(target)) ? 1 : 0);
  }, 0);
}

function facetScore(intent: IntentProfile, material: BoothMaterial) {
  return (Object.keys(intent.desiredFacets) as Array<keyof ScentFacets>).reduce((score, facet) => {
    return score + intent.desiredFacets[facet] * material.facets[facet];
  }, 0);
}

function hasIntentText(values: string[], words: string[]) {
  const text = values.join(' ').toLowerCase();
  return words.some((word) => text.includes(word.toLowerCase()));
}

function dislikePenalty(intent: IntentProfile, material: BoothMaterial) {
  let penalty = 0;
  const dislikes = intent.dislikes;
  const constraints = intent.constraints;
  const text = [
    material.nameZh,
    material.family,
    material.description,
    material.professionalRole,
    ...material.moods,
    ...material.scenarios,
    ...material.avoidWhen
  ].join(' ');

  if (hasIntentText(dislikes, ['甜腻', '太甜', '奶茶', '糖', '香草', '美食']) && (material.facets.sweet >= 3 || text.includes('甜'))) penalty += 14;
  if (hasIntentText(dislikes, ['明显花香', '太花', '玫瑰', '茉莉', '白花']) && material.facets.floral >= 4) penalty += 12;
  if (hasIntentText(dislikes, ['厚重木质', '烟熏', '寺庙', '焚香', '沉重']) && (material.facets.woody >= 4 || text.includes('烟熏'))) penalty += 12;
  if (hasIntentText(dislikes, ['太浓', '攻击性', '存在感太强']) && material.intensity >= 4) penalty += 8;
  if (hasIntentText(constraints, ['低门槛', '第一次', '小白', '低调']) && material.intensity >= 4) penalty += 5;

  return penalty;
}

function reasonsFor(intent: IntentProfile, material: BoothMaterial) {
  const reasons: string[] = [];
  const bestFacet = (Object.keys(material.facets) as Array<keyof ScentFacets>)
    .sort((a, b) => material.facets[b] - material.facets[a])[0];

  if (material.facets[bestFacet] > 0) reasons.push(`${facetLabels[bestFacet]}特征匹配`);
  if (overlapScore(intent.scenarios, material.scenarios) > 0) reasons.push('场景匹配');
  if (overlapScore(intent.moods, material.moods) > 0) reasons.push('情绪匹配');
  reasons.push(material.professionalRole);

  return reasons.slice(0, 4);
}

function scoreMaterial(intent: IntentProfile, material: BoothMaterial): MaterialCandidate {
  const scenarioScore = overlapScore(intent.scenarios, material.scenarios) * 8;
  const moodScore = overlapScore(intent.moods, material.moods) * 5;
  const safeBoothBonus = material.intensity <= 3 ? 3 : 0;
  const score = facetScore(intent, material) + (intent.materialPreferenceScores?.[material.id] || 0) + scenarioScore + moodScore + safeBoothBonus - dislikePenalty(intent, material);

  return {
    material,
    score,
    reasons: reasonsFor(intent, material)
  };
}

function bestByRole(candidates: MaterialCandidate[], role: NoteRole, intent: IntentProfile) {
  const roleCandidates = candidates
    .filter((candidate) => candidate.material.noteRoles.includes(role))
    .sort((a, b) => b.score - a.score);
  const filtered = roleCandidates.filter((candidate) => {
    if (hasIntentText(intent.dislikes, ['甜腻', '太甜', '奶茶', '糖', '香草', '美食']) && candidate.material.facets.sweet >= 4) return false;
    if (hasIntentText(intent.dislikes, ['明显花香', '太花', '玫瑰', '茉莉', '白花']) && candidate.material.facets.floral >= 5) return false;
    if (hasIntentText(intent.dislikes, ['厚重木质', '烟熏', '寺庙', '焚香', '沉重']) && candidate.material.facets.woody >= 5) return false;
    if (hasIntentText(intent.dislikes, ['太浓', '攻击性', '存在感太强']) && candidate.material.intensity >= 4) return false;
    return true;
  });

  return (filtered.length ? filtered : roleCandidates)
    .slice(0, 4);
}

export function selectMaterials(intent: IntentProfile, allowedMaterialIds?: readonly string[]): SelectionPlan {
  const allowed = allowedMaterialIds ? new Set(allowedMaterialIds) : null;
  const candidates = boothMaterials
    .filter(material => !intent.bannedMaterialIds?.includes(material.id))
    .filter((material) => !allowed || allowed.has(material.id))
    .map((material) => scoreMaterial(intent, material))
    .sort((a, b) => b.score - a.score);

  const top = bestByRole(candidates, 'top', intent);
  const heart = bestByRole(candidates, 'heart', intent);
  const base = bestByRole(candidates, 'base', intent);
  const strongest = candidates.slice(0, 5).map((item) => item.material.nameZh).join('、');

  return {
    intent,
    candidates,
    top,
    heart,
    base,
    summary: `候选原料优先考虑：${strongest || '清爽花茶方向'}。`
  };
}

export function formatSelectionPlan(plan: SelectionPlan) {
  const format = (items: MaterialCandidate[]) => items.map((candidate) => {
    const material = candidate.material;
    return [
      `${material.nameZh} (${material.nameEn})`,
      `roles=${material.noteRoles.join('/')}`,
      `usage=${material.usageRange[0]}-${material.usageRange[1]}%`,
      `facets=${Object.entries(material.facets).map(([key, value]) => `${key}:${value}`).join(',')}`,
      `role=${material.professionalRole}`,
      `pairing=${material.pairingTips.join('；')}`,
      `avoid=${material.avoidWhen.join('；')}`,
      `score=${candidate.score}`
    ].join(' | ');
  }).join('\n');

  return [
    `用户意图：${plan.intent.rawText}`,
    `场景：${plan.intent.scenarios.join('、') || '未明确'}`,
    `情绪：${plan.intent.moods.join('、') || '未明确'}`,
    `避开：${plan.intent.dislikes.join('、') || '未明确'}`,
    plan.summary,
    '前调候选：',
    format(plan.top),
    '中调候选：',
    format(plan.heart),
    '后调候选：',
    format(plan.base)
  ].join('\n');
}
