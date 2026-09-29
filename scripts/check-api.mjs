import fs from 'node:fs';
import path from 'node:path';

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const result = {};
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

const localEnv = readEnvFile(path.resolve(process.cwd(), '.env.local'));
const env = { ...localEnv, ...process.env };

const openAiKey = env.OPENAI_API_KEY?.trim();
const deepSeekKey = env.DEEPSEEK_API_KEY?.trim();

let provider;
let apiKey;
let baseUrl;
let model;

if (openAiKey) {
  provider = 'OpenAI-compatible';
  apiKey = openAiKey;
  baseUrl = (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  model = env.OPENAI_MODEL || 'gpt-4.1-mini';
} else if (deepSeekKey) {
  provider = 'DeepSeek';
  apiKey = deepSeekKey;
  baseUrl = (env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/+$/, '');
  model = env.DEEPSEEK_MODEL || 'deepseek-chat';
} else {
  console.error('No API key found. Run "npm run setup:api" first.');
  process.exit(1);
}

console.log(`Provider: ${provider}`);
console.log(`Endpoint: ${baseUrl}/chat/completions`);
console.log(`Model: ${model}`);
console.log('Checking connectivity without printing your key...');

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15000);

try {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      max_tokens: 8,
      temperature: 0,
      messages: [
        { role: 'system', content: 'Reply with OK only.' },
        { role: 'user', content: 'Connection check' }
      ]
    })
  });

  if (!response.ok) {
    const body = (await response.text()).slice(0, 500);
    throw new Error(`HTTP ${response.status}: ${body}`);
  }

  const data = await response.json();
  const reply = String(data?.choices?.[0]?.message?.content || '').trim();
  if (!reply) throw new Error('The API returned no assistant content.');
  console.log(`API connected successfully. Model reply: ${reply}`);
} catch (error) {
  if (error instanceof Error && error.name === 'AbortError') {
    console.error('API check timed out after 15 seconds. Check the network, base URL, and proxy settings.');
  } else {
    console.error(`API check failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
}
