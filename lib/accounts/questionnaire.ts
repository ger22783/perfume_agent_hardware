export const QUESTIONNAIRE_VERSION = 'perfume-onboarding-zh-v1.1';
export const families = [
  ['citrus', '柑橘', '例如橙皮、柠檬皮'], ['floral', '花香', '例如玫瑰、茉莉、桂花'],
  ['tea', '茶香', '例如绿茶、乌龙茶'], ['green_herbal', '青草／草本', '例如青草、揉开的叶片'],
  ['woody', '木质', '例如木材、木屑；烟熏另问'], ['aquatic', '水感／海洋', '例如香水中的海风、水感香气'],
  ['fruity', '水果（不含柑橘）', '例如梨、桃、莓果'], ['gourmand', '甜食', '例如香草、焦糖']
] as const;
export const affinities = [['strongly_like','很喜欢'],['like','比较喜欢'],['neutral','没有明显喜恶'],['dislike','比较不喜欢'],['strongly_dislike','很不喜欢'],['unknown','没接触过或说不清']] as const;
export const contexts = [['commute','工作／通勤'],['study','学习／校园'],['leisure','休闲／出游'],['sport','运动前后'],['social','约会／聚会'],['formal','正式活动'],['relax','独处／放松'],['other','其他'],['unknown','没有固定场景／暂不确定']] as const;
export const avoidances = [['cloying','甜腻感'],['powdery','粉感'],['smoky','烟熏感'],['incense','焚香感'],['leather','皮革感'],['alcohol','明显的酒精气味'],['specific_floral','特定花香'],['other','其他气味'],['none','目前没有特别想避开的'],['unknown','不确定']] as const;
export const sweetness = [['almost_none','几乎没有甜感'],['slight','有一点甜感'],['medium','中等甜感'],['pronounced','明显甜感'],['strong','很强的甜感'],['varies','取决于场景，没有固定偏好'],['unknown','不确定']] as const;
export const presence = [['very_light','很轻：主要自己贴近时能闻到'],['light','较轻：靠近时能闻到'],['medium','中等：希望身边的人能察觉'],['noticeable','明显：希望香气容易被注意到'],['strong','很明显：偏好较强的存在感'],['varies','取决于场景，没有固定偏好'],['unknown','不确定']] as const;
export const experience = [['beginner','从未或很少使用'],['unfamiliar','使用过，但对不同香气还不太熟悉'],['familiar','经常使用，对自己的偏好比较了解'],['unspecified','不确定／暂不回答']] as const;
export const exploration = [['familiar','尽量贴近已经喜欢的气味'],['small_variation','以熟悉的气味为主，尝试一点变化'],['explore','愿意试试和平时不同的气味'],['unknown','不确定，先从已有偏好开始']] as const;
export type Answers = {
  questionnaireVersion: string; displayName: string; experienceLevel: string; usualContexts: string[]; contextOther: string;
  familyAffinity: Record<string, string>; sweetnessPreference: string; presencePreference: string;
  odorAvoidances: string[]; specificFloral: string; odorAvoidanceOtherText: string;
  ingredientExclusionAnswer: '' | 'named' | 'none_known' | 'unknown' | 'withheld'; ingredientExclusionText: string;
  explorationPreference: string; likedExamplesText: string; dislikedExamplesText: string;
};
export function emptyAnswers(name = ''): Answers {
  return { questionnaireVersion: QUESTIONNAIRE_VERSION, displayName: name, experienceLevel: '', usualContexts: [], contextOther: '', familyAffinity: {}, sweetnessPreference: '', presencePreference: '', odorAvoidances: [], specificFloral: '', odorAvoidanceOtherText: '', ingredientExclusionAnswer: '', ingredientExclusionText: '', explorationPreference: '', likedExamplesText: '', dislikedExamplesText: '' };
}
export class InputError extends Error { status = 400; }
function text(value: unknown, max: number, field: string) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' || value.length > max) throw new InputError(`${field}格式不正确或太长。`);
  return value.trim();
}
function choice(value: unknown, choices: readonly (readonly [string,string])[], field: string) {
  if (typeof value !== 'string' || !choices.some(([id]) => id === value)) throw new InputError(`请回答${field}，也可以选择不确定。`);
  return value;
}
function multi(value: unknown, choices: readonly (readonly [string,string])[], exclusive: string[], field: string) {
  if (!Array.isArray(value) || !value.length || value.length > choices.length) throw new InputError(`请回答${field}。`);
  const result = value.map(v => choice(v, choices, field));
  if (new Set(result).size !== result.length || (result.some(v => exclusive.includes(v)) && result.length !== 1)) throw new InputError(`${field}的选项互相冲突。`);
  return result;
}
export function validateAnswers(raw: unknown): Answers {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new InputError('问卷格式不正确。');
  const r = raw as Record<string, unknown>;
  if (r.questionnaireVersion !== QUESTIONNAIRE_VERSION) throw new InputError('问卷版本已更新，请刷新后填写。');
  const a = emptyAnswers(text(r.displayName,30,'昵称'));
  a.experienceLevel = choice(r.experienceLevel,experience,'使用经验');
  a.usualContexts = multi(r.usualContexts,contexts,['unknown'],'使用场景');
  a.contextOther = a.usualContexts.includes('other') ? text(r.contextOther,60,'其他场景') : '';
  const f = r.familyAffinity as Record<string, unknown> | undefined;
  for (const [id] of families) a.familyAffinity[id] = choice(f?.[id],affinities,'气味喜好');
  a.sweetnessPreference = choice(r.sweetnessPreference,sweetness,'甜感偏好');
  a.presencePreference = choice(r.presencePreference,presence,'存在感偏好');
  a.odorAvoidances = multi(r.odorAvoidances,avoidances,['none','unknown'],'避让气味');
  a.specificFloral = a.odorAvoidances.includes('specific_floral') ? text(r.specificFloral,120,'特定花香') : '';
  a.odorAvoidanceOtherText = a.odorAvoidances.includes('other') ? text(r.odorAvoidanceOtherText,120,'其他气味') : '';
  if (a.odorAvoidances.includes('specific_floral') && !a.specificFloral) throw new InputError('请填写希望避免的特定花香。');
  if (a.odorAvoidances.includes('other') && !a.odorAvoidanceOtherText) throw new InputError('请填写希望避免的其他气味。');
  a.ingredientExclusionAnswer = choice(r.ingredientExclusionAnswer,[['named','有'],['none_known','没有已知'],['unknown','不清楚'],['withheld','暂不提供']],'原料排除') as Answers['ingredientExclusionAnswer'];
  a.ingredientExclusionText = a.ingredientExclusionAnswer === 'named' ? text(r.ingredientExclusionText,300,'排除原料') : '';
  if (a.ingredientExclusionAnswer === 'named' && !a.ingredientExclusionText) throw new InputError('请填写要排除的具体原料。');
  a.explorationPreference = choice(r.explorationPreference,exploration,'探索意愿');
  a.likedExamplesText = text(r.likedExamplesText,300,'喜欢的例子');
  a.dislikedExamplesText = text(r.dislikedExamplesText,300,'不喜欢的例子');
  return a;
}
export function profileSummary(a: Answers) {
  const label = (items: readonly (readonly [string,string])[], id: string) => items.find(i => i[0] === id)?.[1] || id;
  const liked = families.filter(([id]) => ['like','strongly_like'].includes(a.familyAffinity[id])).map(([,name]) => name);
  const disliked = families.filter(([id]) => ['dislike','strongly_dislike'].includes(a.familyAffinity[id])).map(([,name]) => name);
  return [
    `常见场景：${a.usualContexts.map(id => label(contexts,id)).join('、')}${a.contextOther ? `（${a.contextOther}）` : ''}。`,
    liked.length ? `喜欢：${liked.join('、')}。` : '尚未声明喜欢的气味类别。',
    disliked.length ? `不喜欢：${disliked.join('、')}。` : '',
    `甜感：${label(sweetness,a.sweetnessPreference)}；存在感：${label(presence,a.presencePreference)}。`,
    `希望尽量避免：${a.odorAvoidances.map(id => label(avoidances,id)).join('、')}${a.specificFloral ? `（${a.specificFloral}）` : ''}${a.odorAvoidanceOtherText ? `（${a.odorAvoidanceOtherText}）` : ''}。`,
    a.ingredientExclusionAnswer === 'named' ? `原料排除要求：${a.ingredientExclusionText}（需核对材料实际组成）。` : '未提供具体原料排除项；这不代表没有安全风险。',
    `探索意愿：${label(exploration,a.explorationPreference)}。`,
    a.likedExamplesText ? `喜欢的参考原话：${a.likedExamplesText}` : '',
    a.dislikedExamplesText ? `不喜欢的参考原话：${a.dislikedExamplesText}` : ''
  ].filter(Boolean).join('\n');
}
