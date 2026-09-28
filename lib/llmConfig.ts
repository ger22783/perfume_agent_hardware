export type LlmProvider = 'openai' | 'deepseek';

export type LlmConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  provider: LlmProvider;
};

function env(name: string) {
  return process.env[name]?.trim();
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, '');
}

/**
 * Resolve one OpenAI-compatible chat-completions endpoint.
 * Secrets remain server-side and are never returned to the browser.
 */
export function getLlmConfig(): LlmConfig | null {
  const openAiKey = env('OPENAI_API_KEY');
  if (openAiKey) {
    return {
      apiKey: openAiKey,
      baseUrl: normalizeBaseUrl(env('OPENAI_BASE_URL') || 'https://api.openai.com/v1'),
      model: env('OPENAI_MODEL') || 'gpt-4.1-mini',
      provider: 'openai'
    };
  }

  const deepSeekKey = env('DEEPSEEK_API_KEY');
  if (deepSeekKey) {
    return {
      apiKey: deepSeekKey,
      baseUrl: normalizeBaseUrl(env('DEEPSEEK_BASE_URL') || 'https://api.deepseek.com/v1'),
      model: env('DEEPSEEK_MODEL') || 'deepseek-chat',
      provider: 'deepseek'
    };
  }

  return null;
}

export function explanationLlmEnabled(): boolean {
  return getLlmConfig() !== null && env('EXPLAIN_LLM') !== 'false';
}
