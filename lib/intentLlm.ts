import type { ScentFacets } from '@/data/ingredients';
import { analyzeIntent, type IntentProfile } from './intent';
import type { Lang } from './i18n';
import { getLlmConfig } from './llmConfig';

type RawIntent = {
  desiredFacets?: Partial<Record<keyof ScentFacets, unknown>>;
  scenarios?: unknown;
  moods?: unknown;
  dislikes?: unknown;
  constraints?: unknown;
  explanationLike?: unknown;
};

const facetKeys: Array<keyof ScentFacets> = ['fresh', 'sweet', 'floral', 'woody', 'watery', 'warm'];

function extractJsonObject(content: string) {
  const text = content.trim();
  try {
    return JSON.parse(text);
  } catch {
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const stripped = fenceMatch ? fenceMatch[1].trim() : text;
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : stripped);
  }
}

function clampFacet(value: unknown) {
  const number = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return Math.max(0, Math.min(5, Math.round(number)));
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 6);
}

function mergeUnique(base: string[], extra: string[]): string[] {
  return [...base, ...extra].filter((value, index, arr) => value && arr.indexOf(value) === index).slice(0, 8);
}

function normalizeIntent(raw: RawIntent, input: string, fallback: IntentProfile): IntentProfile {
  // facets 一律走本地规则：避免 LLM 对用户的隐含偏好做无中生有的推断
  // （如「气温高」并不等于「想要清凉」，「晚上」不等于「想要温暖」）
  const desiredFacets = fallback.desiredFacets;

  // 本地规则做底座，LLM 结果是增强：合并去重，避免 LLM 漏识别时丢失本地已识别的场景/情绪
  return {
    rawText: input,
    desiredFacets,
    scenarios: mergeUnique(fallback.scenarios, stringArray(raw.scenarios)),
    moods: mergeUnique(fallback.moods, stringArray(raw.moods)),
    dislikes: mergeUnique(fallback.dislikes, stringArray(raw.dislikes)),
    constraints: mergeUnique(fallback.constraints, stringArray(raw.constraints)),
    explanationLike: typeof raw.explanationLike === 'boolean' ? raw.explanationLike : fallback.explanationLike
  };
}

export async function analyzeIntentWithLLM(input: string, lang: Lang = 'zh'): Promise<{ intent: IntentProfile; source: 'llm' | 'local' }> {
  const fallback = analyzeIntent(input);
  const config = getLlmConfig();
  if (!config) return { intent: fallback, source: 'local' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 700,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: [
              '你是专业调香 Agent 的需求理解模块，只负责把用户自然语言解析成 JSON，不生成配方。',
              'facets 取值 0-5：fresh 清爽干净，sweet 甜感美食，floral 花香，woody 木质烟熏，watery 水感海风雨后，warm 温暖咖啡香草。',
              '要识别反向需求，例如“不甜”“不要奶茶感”“不要寺庙感”“别太浓”“不要玫瑰”。',
              'scenarios、moods、dislikes、constraints 用简短中文词组。不要编造原料名。',
              `用户界面语言是 ${lang === 'en' ? '英文' : '中文'}，但此 JSON 仅供内部算法使用，数组值仍使用上述中文规范词。`,
              '只输出 JSON，结构为 {"desiredFacets":{"fresh":0,"sweet":0,"floral":0,"woody":0,"watery":0,"warm":0},"scenarios":[],"moods":[],"dislikes":[],"constraints":[],"explanationLike":false}'
            ].join('\n')
          },
          { role: 'user', content: input }
        ]
      })
    });

    if (!response.ok) return { intent: fallback, source: 'local' };
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';
    if (!content) return { intent: fallback, source: 'local' };
    return { intent: normalizeIntent(extractJsonObject(content), input, fallback), source: 'llm' };
  } catch {
    return { intent: fallback, source: 'local' };
  } finally {
    clearTimeout(timeout);
  }
}
