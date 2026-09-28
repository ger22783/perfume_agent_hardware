import { boothMaterials, type BoothMaterial, type NoteRole } from '@/data/ingredients';
import { analyzeIntent } from './intent';
import { buildTargetVector } from './intentVector';
import { selectMaterials, type SelectionPlan } from './materialSelector';
import type { BoothStep, FormulaResponse, NoteItem } from './types';
import type { Lang } from './i18n';
import { displayNameList, localizeTerms, materialRoleText } from './localization';

function distance(percentage: number): string {
  if (percentage >= 40) return '2-3cm';
  if (percentage >= 30) return '4-5cm';
  if (percentage >= 20) return '6-7cm';
  return '8-9cm';
}

function step(material: string, noteRole: BoothStep['noteRole'], percentage: number, lang: Lang): BoothStep {
  const sprayDistance = distance(percentage);
  return {
    material,
    noteRole,
    percentage,
    distance: sprayDistance,
    waitSeconds: 10,
    instruction: lang === 'en'
      ? `Dispense once from ${sprayDistance} away, then wait 10 seconds`
      : `喷 1 下，距离 ${sprayDistance}，等待 10 秒`
  };
}

function notesToSteps(topNotes: NoteItem[], heartNotes: NoteItem[], baseNotes: NoteItem[], lang: Lang): BoothStep[] {
  return [
    ...topNotes.map((item) => step(item.name, 'top', item.percentage, lang)),
    ...heartNotes.map((item) => step(item.name, 'heart', item.percentage, lang)),
    ...baseNotes.map((item) => step(item.name, 'base', item.percentage, lang))
  ];
}

function pickMaterial(plan: SelectionPlan, role: NoteRole, fallbackId: string, used: Set<string>) {
  const roleCandidates = role === 'top' ? plan.top : role === 'heart' ? plan.heart : plan.base;
  const candidate = roleCandidates.find((item) => !used.has(item.material.nameZh));
  const profileFallback = plan.candidates.find((item) => item.material.id === fallbackId && item.material.noteRoles.includes(role) && !used.has(item.material.nameZh));
  const anyRoleFallback = plan.candidates.find((item) => item.material.noteRoles.includes(role) && !used.has(item.material.nameZh));
  const material = candidate?.material || profileFallback?.material || anyRoleFallback?.material;
  if (!material) {
    throw new Error(`当前硬件原料无法补足 ${role} 调性。`);
  }
  used.add(material.nameZh);
  return material;
}

function clampUsage(material: BoothMaterial, desired: number) {
  const [min, max] = material.usageRange;
  return Math.max(min, Math.min(max, desired));
}

function buildNotes(plan: SelectionPlan) {
  const used = new Set<string>();
  const wantsWatery = plan.intent.desiredFacets.watery >= 4;

  // 先保留最稀缺的后调位置，避免双角色原料先被中调占用后无可用 base。
  const baseA = pickMaterial(plan, 'base', 'desert-rose', used);
  const topA = pickMaterial(plan, 'top', wantsWatery ? 'sea-breeze-bell' : 'japanese-citrus', used);
  const topB = pickMaterial(plan, 'top', 'japanese-citrus', used);
  const heartA = pickMaterial(plan, 'heart', 'osmanthus-oolong', used);
  const heartB = plan.heart.find((item) => !used.has(item.material.nameZh))?.material;

  let topNotes: NoteItem[] = [
    { name: topA.nameZh, percentage: clampUsage(topA, 22) },
    { name: topB.nameZh, percentage: clampUsage(topB, 18) }
  ];
  let heartNotes: NoteItem[] = [
    { name: heartA.nameZh, percentage: clampUsage(heartA, 28) }
  ];
  let baseNotes: NoteItem[] = [
    { name: baseA.nameZh, percentage: clampUsage(baseA, 24) }
  ];

  if (heartB && heartB.nameZh !== heartA.nameZh && topNotes.length + heartNotes.length + baseNotes.length < 4) {
    heartNotes.push({ name: heartB.nameZh, percentage: clampUsage(heartB, 8) });
  }

  const all = [...topNotes, ...heartNotes, ...baseNotes];
  const total = all.reduce((sum, item) => sum + item.percentage, 0);
  const delta = 100 - total;
  const target = heartNotes[0] || baseNotes[0] || topNotes[0];
  target.percentage += delta;

  topNotes = topNotes.filter((item) => item.percentage > 0);
  heartNotes = heartNotes.filter((item) => item.percentage > 0);
  baseNotes = baseNotes.filter((item) => item.percentage > 0);

  return { topNotes, heartNotes, baseNotes };
}

function roleText(materialName: string) {
  return boothMaterials.find((item) => item.nameZh === materialName)?.professionalRole || '负责补足香气结构。';
}

function buildFormula(plan: SelectionPlan, lang: Lang): FormulaResponse {
  const notes = buildNotes(plan);
  const allNotes = [...notes.topNotes, ...notes.heartNotes, ...notes.baseNotes];
  const topNames = displayNameList(notes.topNotes.map((item) => item.name), lang);
  const heartNames = displayNameList(notes.heartNotes.map((item) => item.name), lang);
  const baseNames = displayNameList(notes.baseNotes.map((item) => item.name), lang);
  const style = lang === 'en'
    ? plan.intent.moods.includes('浪漫')
      ? 'Restrained floral signature'
      : plan.intent.desiredFacets.watery >= 4
        ? 'Sheer aquatic blend'
        : plan.intent.desiredFacets.warm >= 4
          ? 'Warm grounded blend'
          : 'Fresh floral-tea blend'
    : plan.intent.moods.includes('浪漫')
      ? '克制花香记忆款'
      : plan.intent.desiredFacets.watery >= 4
        ? '清透水感试香'
        : plan.intent.desiredFacets.warm >= 4
          ? '温暖沉稳氛围香'
          : '清爽花茶日常香';
  const rawKeywords = [
    ...(plan.intent.moods.length ? plan.intent.moods.slice(0, 2) : ['易接受', '有个性']),
    ...(plan.intent.constraints.includes('低门槛') ? ['低门槛'] : ['有层次'])
  ].slice(0, 3);
  const keywords = localizeTerms(rawKeywords, lang, ['approachable', 'distinctive', 'layered']);
  const scenarios = localizeTerms(plan.intent.scenarios, lang, lang === 'en' ? ['everyday wear', 'personal styling'] : ['日常使用', '个性定制']);

  return {
    fragrancePositioning: {
      style,
      keywords,
      suitableScenarios: scenarios
    },
    formula: notes,
    blendingSuggestion: {
      recommendedConcentration: lang === 'en'
        ? 'Aromacell blends the formula proportionally from top to heart to base notes.'
        : '配方按前调 → 中调 → 后调顺序，由 Aromacell 自动按比例调配。'
    },
    boothSteps: notesToSteps(notes.topNotes, notes.heartNotes, notes.baseNotes, lang),
    finalEffect: {
      opening: lang === 'en' ? `The top notes (${topNames || 'the opening accord'}) create a bright, approachable first impression.` : `${topNames || '前调'}先给出第一印象，让香气开场更明亮、更容易接近。`,
      heart: lang === 'en' ? `The heart (${heartNames || 'the central accord'}) defines the main character and gives the scent a clear theme.` : `${heartNames || '中调'}负责主体性格，让香气从单一气味变成有主题的体验。`,
      drydown: lang === 'en' ? `The base (${baseNames || 'the drydown accord'}) creates a stable, memorable finish.` : `${baseNames || '后调'}负责收尾和稳定度，让香水从新鲜开场过渡到有记忆点的尾调。`,
      sillage: lang === 'en'
        ? allNotes.some((item) => item.percentage >= 35) ? 'Moderate projection for close-range wear' : 'Light-to-moderate projection for an easy first wear'
        : allNotes.some((item) => item.percentage >= 35) ? '中等扩散，适合近距离闻香' : '轻到中等扩散，适合第一次体验',
      longevity: lang === 'en' ? 'Approximately 3–6 hours; check the drydown after 2–3 hours' : '约 3-6 小时留香，建议使用后 2-3 小时左右观察尾调变化'
    },
    adjustments: {
      fresher: lang === 'en' ? 'For a fresher version, increase Japanese Citrus or Sea Breeze Bell.' : '想更清爽，下一轮提高日系柑橘或海上风铃的比例。',
      softer: lang === 'en' ? 'For a softer version, add more Osmanthus Oolong.' : '想更柔和，下一轮增加桂花乌龙，让边缘更圆润。',
      longerLasting: lang === 'en' ? 'For a steadier drydown, slightly increase Desert Rose.' : '想让概念上的尾调更稳，下一轮可以小幅提高无人之境玫瑰。'
    },
    safetyNote: lang === 'en'
      ? 'Use as directed. Avoid contact with eyes, mouth, nose, and broken skin; patch-test first if you are sensitive.'
      : '请在工作人员指导下体验，避免接触眼睛、口鼻和伤口；敏感体质请先小范围测试。'
  };
}

function buildReply(formula: FormulaResponse, lang: Lang) {
  const allNotes = [...formula.formula.topNotes, ...formula.formula.heartNotes, ...formula.formula.baseNotes];
  const main = allNotes.reduce((a, b) => (b.percentage > a.percentage ? b : a), allNotes[0]);
  const mainName = main?.name || formula.formula.heartNotes[0]?.name || (lang === 'en' ? 'the heart accord' : '中调主体');

  if (lang === 'en') {
    return [
      `This is a “${formula.fragrancePositioning.style}” formula: ${formula.fragrancePositioning.keywords.join(', ')}, suited to ${formula.fragrancePositioning.suitableScenarios.join(', ')}. `,
      `The blend is built around ${displayNameList([mainName], lang)}. ${materialRoleText(mainName, lang)}`
    ].join('');
  }

  return [
    `这版定位成「${formula.fragrancePositioning.style}」，关键词是${formula.fragrancePositioning.keywords.join('、')}，适合${formula.fragrancePositioning.suitableScenarios.join('、')}。`,
    `核心选材以${mainName}为主体：${roleText(mainName)}`
  ].join('');
}

export async function generateFallback(input: string, plan?: SelectionPlan, lang: Lang = 'zh') {
  const selectionPlan = plan || selectMaterials(analyzeIntent(input));
  const formula = buildFormula(selectionPlan, lang);
  const targetVector = buildTargetVector(selectionPlan.intent);

  return {
    mode: 'heuristic' as const,
    replyText: buildReply(formula, lang),
    formula: {
      ...formula,
      targetVector,
      solveMode: 'heuristic' as const
    }
  };
}
