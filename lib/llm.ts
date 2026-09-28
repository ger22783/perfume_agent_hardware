import { buildExplanationContext, getSystemPrompt } from './prompt';
import type { FormulaResponse } from './types';
import type { Lang } from './i18n';
import { getLlmConfig } from './llmConfig';

/**
 * LLM 客户端（改造后）
 *
 * 不再负责生成配方 —— 只提供可选的「解释文案增强」：
 * 模型输入配方结构 + 目标向量 + 误差，输出 ≤300 字人话解释。
 * 任何失败（无 key / 超时 / 非 JSON）都返回 null，由调用方回退模板文案。
 */

function extractJsonObject(content: string) {
  const text = content.trim();
  try {
    return JSON.parse(text);
  } catch {
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const stripped = fenceMatch ? fenceMatch[1].trim() : text;
    try {
      return JSON.parse(stripped);
    } catch {
      const jsonMatch = stripped.match(/\{[\s\S]*\}/);
      const candidate = jsonMatch ? jsonMatch[0] : stripped;
      return JSON.parse(candidate);
    }
  }
}

export async function generateExplanation(formula: FormulaResponse, lang: Lang = 'zh'): Promise<string | null> {
  const config = getLlmConfig();
  if (!config) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const context = buildExplanationContext(formula, lang);

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 800,
        temperature: 0.5,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: getSystemPrompt(lang) },
          { role: 'system', content: context }
        ]
      })
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('LLM 解释请求超过 8 秒，使用模板文案。');
      return null;
    }
    console.warn('LLM 解释请求失败：', error);
    return null;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    console.warn(`LLM 解释请求失败: ${response.status}`);
    return null;
  }

  const rawText = await response.text();
  let data: any;
  try {
    data = JSON.parse(rawText);
  } catch {
    return null;
  }

  const rawContent = data?.choices?.[0]?.message?.content || '';
  if (!rawContent) return null;

  try {
    const parsed = extractJsonObject(rawContent);
    const replyText = String(parsed?.replyText || '').trim();
    if (replyText.length < 10) return null;
    if (lang === 'en' && /[\u3400-\u9fff]/.test(replyText)) {
      console.warn('LLM returned Chinese copy for an English request; using the English template.');
      return null;
    }
    if (lang === 'zh' && !/[\u3400-\u9fff]/.test(replyText)) {
      console.warn('LLM returned non-Chinese copy for a Chinese request; using the Chinese template.');
      return null;
    }
    return replyText;
  } catch {
    return null;
  }
}
