import { boothMaterials } from '@/data/ingredients';
import type { Lang } from './i18n';

const TERM_EN: Record<string, string> = {
  清爽: 'fresh',
  干净: 'clean',
  水感: 'aquatic',
  安静: 'calm',
  甜暖: 'sweet and warm',
  柔软: 'soft',
  优雅: 'elegant',
  浪漫: 'romantic',
  沉稳: 'grounded',
  高级: 'refined',
  温暖: 'warm',
  放松: 'relaxing',
  愉快: 'uplifting',
  易接受: 'approachable',
  有个性: 'distinctive',
  有层次: 'layered',
  低门槛: 'easy to wear',
  日常通勤: 'daily commute',
  约会: 'date night',
  夏日户外: 'summer outdoors',
  阅读独处: 'reading and quiet time',
  正式场合: 'formal occasions',
  睡前放松: 'evening relaxation',
  日常使用: 'everyday wear',
  个性定制: 'personal styling'
};

const ROLE_EN: Record<string, string> = {
  'japanese-citrus': 'It brightens the opening and keeps heavier notes feeling light.',
  'sea-breeze-bell': 'It adds airy, aquatic freshness and creates more space in the blend.',
  'osmanthus-oolong': 'It forms a soft floral-tea heart and makes the blend more approachable.',
  'desert-rose': 'It adds a memorable floral-woody finish without becoming overly sweet.',
  'smoky-agarwood': 'It gives the drydown structure, depth, and a grounded woody finish.',
  'green-tea': 'It supplies a clean tea character and a crisp, easy-to-wear core.',
  'jasmine-floral-ring': 'It adds polish and a refined white-floral heart.',
  'coffee-hour': 'It adds gentle bitterness and warmth while keeping sweetness in check.',
  'french-vanilla': 'It adds a soft, intimate warmth; a small amount has a clear effect.',
  'bergamot-lime-kiss': 'It creates a lively citrus-fruit opening with a social, upbeat feel.',
  'watery-berry': 'It softens sharp edges with a sheer, lightly fruity transition.',
  'grand-hotel': 'It gives the heart more presence and a polished, formal character.'
};

const DESCRIPTION_EN: Record<string, string> = {
  'japanese-citrus': 'a bright citrus opening',
  'sea-breeze-bell': 'an airy marine freshness',
  'osmanthus-oolong': 'a soft osmanthus-tea heart',
  'desert-rose': 'a restrained rose with a woody finish',
  'smoky-agarwood': 'a deep, smoky woody base',
  'green-tea': 'a crisp green-tea freshness',
  'jasmine-floral-ring': 'a clean white-floral heart',
  'coffee-hour': 'a warm, gently bitter coffee nuance',
  'french-vanilla': 'a soft vanilla warmth',
  'bergamot-lime-kiss': 'a lively citrus-fruit opening',
  'watery-berry': 'a sheer, softly fruity aquatic note',
  'grand-hotel': 'a polished, expressive floral heart'
};

const FAMILY_EN: Record<string, string> = {
  'japanese-citrus': 'citrus',
  'sea-breeze-bell': 'marine floral',
  'osmanthus-oolong': 'floral tea',
  'desert-rose': 'floral woody',
  'smoky-agarwood': 'woody',
  'green-tea': 'green tea citrus',
  'jasmine-floral-ring': 'white floral',
  'coffee-hour': 'gourmand',
  'french-vanilla': 'gourmand',
  'bergamot-lime-kiss': 'fruity citrus',
  'watery-berry': 'aquatic fruity floral',
  'grand-hotel': 'opulent floral'
};

export function materialForName(name: string) {
  return boothMaterials.find((item) => item.nameZh === name || item.nameEn === name);
}

export function materialDisplayName(name: string, lang: Lang): string {
  const material = materialForName(name);
  return lang === 'en' ? material?.nameEn || name : material?.nameZh || name;
}

export function materialRoleText(name: string, lang: Lang): string {
  const material = materialForName(name);
  if (!material) return lang === 'en' ? 'It supports the overall scent structure.' : '负责补足香气结构。';
  return lang === 'en' ? ROLE_EN[material.id] || 'It supports the overall scent structure.' : material.professionalRole;
}

export function materialDescription(name: string, lang: Lang): string {
  const material = materialForName(name);
  if (!material) return lang === 'en' ? 'an element that supports the scent structure' : '补足配方里的气味层次';
  return lang === 'en' ? DESCRIPTION_EN[material.id] || 'a supporting scent element' : material.description;
}

export function materialFamily(name: string, lang: Lang): string {
  const material = materialForName(name);
  if (!material) return lang === 'en' ? 'the current accord' : '当前香调';
  return lang === 'en' ? FAMILY_EN[material.id] || 'fragrance' : material.family;
}

export function localizeTerm(value: string, lang: Lang): string {
  if (lang === 'zh') return value;
  return TERM_EN[value] || (/[^\x00-\x7F]/.test(value) ? '' : value);
}

export function localizeTerms(values: string[], lang: Lang, fallback: string[]): string[] {
  if (lang === 'zh') return values.length ? values : fallback;
  const translated = values.map((value) => localizeTerm(value, lang)).filter(Boolean);
  return translated.length ? translated : fallback;
}

export function displayNameList(names: string[], lang: Lang): string {
  const separator = lang === 'en' ? ', ' : '和';
  return names.map((name) => materialDisplayName(name, lang)).join(separator);
}
