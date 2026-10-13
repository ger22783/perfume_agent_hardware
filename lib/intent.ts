import type { ScentFacets } from '@/data/ingredients';

export type IntentProfile = {
  rawText: string;
  desiredFacets: ScentFacets;
  scenarios: string[];
  moods: string[];
  dislikes: string[];
  constraints: string[];
  explanationLike: boolean;
  preferenceTargets?: Partial<ScentFacets & { intensity: number }>;
  materialPreferenceScores?: Record<string, number>;
  bannedMaterialIds?: string[];
};

const zeroFacets: ScentFacets = {
  fresh: 0,
  sweet: 0,
  floral: 0,
  woody: 0,
  watery: 0,
  warm: 0
};

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word.toLowerCase()));
}

function addFacet(profile: IntentProfile, facet: keyof ScentFacets, value: number) {
  profile.desiredFacets[facet] = Math.min(5, profile.desiredFacets[facet] + value);
}

function addUnique(target: string[], values: string[]) {
  values.forEach((value) => {
    if (!target.includes(value)) target.push(value);
  });
}

export function analyzeIntent(input: string): IntentProfile {
  const text = input.toLowerCase();
  const profile: IntentProfile = {
    rawText: input,
    desiredFacets: { ...zeroFacets },
    scenarios: [],
    moods: [],
    dislikes: [],
    constraints: [],
    explanationLike: includesAny(text, ['为什么', '为啥', '原因', '作用', '干嘛', 'why', 'reason', 'purpose'])
  };

  // 否定语境预检：用户说「不要太甜/别太甜」时，不能反向命中单字「甜」，
  // 而应写入「甜腻」禁忌。同理处理「不要太腻」。
  const notSweet = includesAny(text, ['不要甜', '不甜', '别太甜', '不要太甜', '不要腻', '不腻', '不要太腻', '不喜甜', '讨厌甜']);
  if (notSweet) {
    addUnique(profile.dislikes, ['甜腻']);
  }

  if (includesAny(text, ['清爽', '清新', '干净', '通透', '不甜', '解腻', '晒', 'fresh', 'clean', 'cool'])) {
    addFacet(profile, 'fresh', 4);
    addUnique(profile.moods, ['清爽', '干净']);
  }
  if (includesAny(text, ['甜', '香草', '甜品', '柔软', '亲密', 'sweet', 'vanilla']) && !notSweet) {
    addFacet(profile, 'sweet', 4);
    addFacet(profile, 'warm', 2);
    addUnique(profile.moods, ['甜暖', '柔软']);
  }
  if (includesAny(text, ['花', '茉莉', '玫瑰', '白花', '花香', 'floral', 'rose', 'jasmine'])) {
    addFacet(profile, 'floral', 4);
    addUnique(profile.moods, ['优雅', '浪漫']);
  }
  if (includesAny(text, ['木质', '乌木', '沉稳', '高级', '成熟', 'woody', 'wood'])) {
    addFacet(profile, 'woody', 4);
    addFacet(profile, 'warm', 1);
    addUnique(profile.moods, ['沉稳', '高级']);
  }
  if (includesAny(text, ['海', '雨', '水感', '湖', '湿润', '通透', 'watery', 'sea', 'rain'])) {
    addFacet(profile, 'watery', 4);
    addFacet(profile, 'fresh', 2);
    addUnique(profile.moods, ['水感', '安静']);
  }
  if (includesAny(text, ['温暖', '秋冬', '冬天', '咖啡', '书店', 'warm', 'coffee'])) {
    addFacet(profile, 'warm', 4);
    addUnique(profile.moods, ['温暖', '放松']);
  }
  if (includesAny(text, ['愉快', '开心', '高兴', '愉悦', '心情好', '快乐', 'happy', 'joy', 'cheerful', 'pleasant'])) {
    addUnique(profile.moods, ['愉快']);
  }

  if (includesAny(text, ['通勤', '上班', '面试', '日常', '校园', 'office', 'daily'])) addUnique(profile.scenarios, ['日常通勤']);
  if (includesAny(text, ['约会', '表白', '纪念日', '浪漫', 'date', 'romantic'])) addUnique(profile.scenarios, ['约会']);
  if (includesAny(text, ['运动', '夏天', '户外', '热', '晒', 'summer', 'sport'])) addUnique(profile.scenarios, ['夏日户外']);
  if (includesAny(text, ['阅读', '书店', '图书馆', '独处', '学习', 'library', 'study'])) addUnique(profile.scenarios, ['阅读独处']);
  if (includesAny(text, ['晚会', '婚礼', '拍照', '酒店', 'party', 'wedding'])) addUnique(profile.scenarios, ['正式场合']);
  if (includesAny(text, ['睡前', '放松', '治愈', 'calm', 'relax'])) addUnique(profile.scenarios, ['睡前放松']);

  if (includesAny(text, ['不要甜', '不甜', '别太甜', '不要腻', '不腻'])) addUnique(profile.dislikes, ['甜腻']);
  if (includesAny(text, ['不要花', '不花', '别太花', '不要玫瑰'])) addUnique(profile.dislikes, ['明显花香']);
  if (includesAny(text, ['不要木', '不要烟熏', '不沉重', '别太重'])) addUnique(profile.dislikes, ['厚重木质']);
  if (includesAny(text, ['低调', '轻一点', '不要太浓', '小白', '第一次'])) addUnique(profile.constraints, ['低门槛']);

  if (Object.values(profile.desiredFacets).every((value) => value === 0)) {
    profile.desiredFacets.fresh = 2;
    profile.desiredFacets.floral = 1;
    addUnique(profile.constraints, ['路演默认安全款']);
  }

  return profile;
}
