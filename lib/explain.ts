import { boothMaterials } from '@/data/ingredients';
import type { FormulaResponse } from './types';
import type { Lang } from './i18n';
import { materialDescription, materialDisplayName, materialFamily, materialRoleText } from './localization';

const explanationTriggers = [
  '为什么',
  '为啥',
  '原因',
  '作用',
  '干嘛',
  '有什么用',
  '为什么要加',
  'why',
  'reason',
  'purpose'
];

function allNotes(formula: FormulaResponse, lang: Lang) {
  return [
    ...formula.formula.topNotes.map((item) => ({ ...item, role: lang === 'en' ? 'top notes' : '前调' })),
    ...formula.formula.heartNotes.map((item) => ({ ...item, role: lang === 'en' ? 'heart notes' : '中调' })),
    ...formula.formula.baseNotes.map((item) => ({ ...item, role: lang === 'en' ? 'base notes' : '后调' }))
  ];
}

export function isExplanationQuestion(message: string) {
  const text = message.toLowerCase();
  return explanationTriggers.some((trigger) => text.includes(trigger));
}

/** 优化求解模式的解释文案：定位 + 搭配理由（依据用户目标向量与原料库职责） */
export function buildOptimizedReply(formula: FormulaResponse, lang: Lang = 'zh'): string {
  const positioning = formula.fragrancePositioning;
  const target = formula.targetVector;
  const topNotes = formula.formula.topNotes;
  const heartNotes = formula.formula.heartNotes;
  const baseNotes = formula.formula.baseNotes;

  const nameList = (notes: Array<{ name: string }>) => notes.map((note) => materialDisplayName(note.name, lang)).join(lang === 'en' ? ', ' : '、') || '';

  const topNames = nameList(topNotes);
  const heartNames = nameList(heartNotes);
  const baseNames = nameList(baseNotes);

  // 依据目标向量，提炼用户最想要的气味方向（仅在用户非常明确提到时，阈值 ≥5，避免"无中生有"）
  const desires: string[] = [];
  if (target) {
    if (target.facets.fresh >= 5) desires.push(lang === 'en' ? 'freshness' : '想清爽');
    if (target.facets.watery >= 5) desires.push(lang === 'en' ? 'an aquatic, cooling feel' : '想要水感清凉');
    if (target.facets.floral >= 5) desires.push(lang === 'en' ? 'a floral character' : '想要花香');
    if (target.facets.woody >= 5) desires.push(lang === 'en' ? 'a grounded woody character' : '想要沉稳木质');
    if (target.facets.warm >= 5) desires.push(lang === 'en' ? 'warmth' : '想要温暖感');
    if (target.facets.sweet >= 5) desires.push(lang === 'en' ? 'a touch of sweetness' : '想要一点甜意');
  }

  const topReason = topNotes[0] ? materialRoleText(topNotes[0].name, lang) : (lang === 'en' ? 'It shapes the opening impression.' : '负责开场的第一印象');
  const heartReason = heartNotes[0] ? materialRoleText(heartNotes[0].name, lang) : (lang === 'en' ? 'It defines the main character.' : '负责主体气质');
  const baseReason = baseNotes[0] ? materialRoleText(baseNotes[0].name, lang) : (lang === 'en' ? 'It supports the finish.' : '负责收尾与留香');
  const stripPunct = (text: string) => text.replace(/[。！？!?]$/, '');

  const allNotes = [...topNotes, ...heartNotes, ...baseNotes];
  const main = allNotes.reduce((a, b) => (b.percentage > a.percentage ? b : a), allNotes[0]);

  if (lang === 'en') {
    const structureLine = desires.length
      ? `Because you asked for ${desires.join(', ')}, the top uses ${topNames}—${topReason} The heart centers on ${heartNames}—${heartReason} The base finishes with ${baseNames}—${baseReason}`
      : `The top uses ${topNames}—${topReason} The heart centers on ${heartNames}—${heartReason} The base finishes with ${baseNames}—${baseReason}`;
    const parts = [
      `This is a “${positioning.style}” formula with a ${positioning.keywords.join(', ')} profile, designed for ${positioning.suitableScenarios.join(', ')}.`,
      structureLine
    ];
    if (main) {
      parts.push(`${materialDisplayName(main.name, lang)} has the largest share at ${main.percentage}%, forming the backbone while the other materials add transitions and depth.`);
    }
    return parts.join(' ');
  }

  const parts: string[] = [];
  parts.push(`这版定位成「${positioning.style}」，关键词${positioning.keywords.join('、')}，适合${positioning.suitableScenarios.join('、')}。`);

  const desireLine = desires.length ? `考虑到你${desires.join('、')}，` : '';
  parts.push(
    `${desireLine}前调选了${topNames}——${stripPunct(topReason)}；` +
    `中调以${heartNames}为主体——${stripPunct(heartReason)}；` +
    `后调用${baseNames}收尾——${stripPunct(baseReason)}。`
  );

  if (main) {
    parts.push(`${main.name}占比最高（${main.percentage}%），构成这瓶香水的骨架，其余原料围绕它做层次与衔接。`);
  }

  return parts.join('');
}

export function buildFormulaExplanation(message: string, formula: FormulaResponse, lang: Lang = 'zh') {
  const notes = allNotes(formula, lang);
  const mentionedNote = notes.find((note) => message.includes(note.name));
  const target = mentionedNote || notes.find((note) => {
    const material = boothMaterials.find((item) => item.nameZh === note.name);
    return material ? message.toLowerCase().includes(material.nameEn.toLowerCase()) : false;
  });

  if (target) {
    const material = boothMaterials.find((item) => item.nameZh === target.name);
    const family = materialFamily(target.name, lang);
    const description = materialDescription(target.name, lang);
    const moods = material?.moods?.slice(0, 3).join('、') || '整体氛围';

    if (lang === 'en') {
      const displayName = materialDisplayName(target.name, lang);
      return [
        `${displayName} is included for structure rather than to dominate the blend. It works within the ${target.role}.`,
        `It belongs to the ${family} family and makes up ${target.percentage}% of this formula, contributing ${description}.`,
        'Its job is to connect the surrounding notes more naturally. This answer explains the existing formula without changing it; ask for a fresher replacement or removal if you want a revision.'
      ].join(' ');
    }

    return [
      `这里加入「${target.name}」不是为了单独突出它，而是让它在${target.role}里承担结构作用。`,
      `它属于${family}，在这版配方中占 ${target.percentage}%，主要贡献是：${description}`,
      `从闻感上，它会把整体往「${moods}」的方向推，让前中后调之间衔接得更自然。`,
      '所以这一步我不会改动你的配方，只解释它在当前版本里的作用；如果你想换掉它，可以直接说“不要这个”或“换成更清爽的”。'
    ].join('');
  }

  const style = formula.fragrancePositioning.style || '这版香气';
  const noteSummary = notes.map((note) => `${note.role} ${materialDisplayName(note.name, lang)} ${note.percentage}%`).join(lang === 'en' ? '; ' : '；');

  if (lang === 'en') {
    return [
      `The “${formula.fragrancePositioning.style || 'current scent'}” formula starts from the requested mood and occasion, then assigns a clear job to each stage.`,
      `The current structure is: ${noteSummary}.`,
      'Top notes shape the first impression, heart notes define the main character, and base notes stabilize the finish.',
      'This is an explanation, so the formula stays unchanged unless you explicitly ask for a revision.'
    ].join(' ');
  }

  return [
    `这版「${style}」的逻辑是先确定场景和情绪，再用前中后调分工把体验做完整。`,
    `当前结构是：${noteSummary}。`,
    '前调负责第一下闻到的印象，中调负责主体性格，后调负责稳定度和留香感。',
    '你现在问的是配方解释，所以我会保留上一版配方不变；只有当你明确说“更清爽、不要玫瑰、换一个”时，我才会重新调整配方。'
  ].join('');
}
