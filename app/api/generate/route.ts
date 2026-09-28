import { NextRequest, NextResponse } from 'next/server';
import { activeMaterialIds } from '@/data/hardwareProfile';
import { buildFormulaExplanation, buildOptimizedReply, isExplanationQuestion } from '@/lib/explain';
import { generateFallback } from '@/lib/generator';
import { analyzeIntentWithLLM } from '@/lib/intentLlm';
import { buildTargetVector } from '@/lib/intentVector';
import { generateExplanation } from '@/lib/llm';
import { selectMaterials } from '@/lib/materialSelector';
import { solveFormula } from '@/lib/optimizer';
import { appendBoothRecord, createSessionId } from '@/lib/records';
import { sanitizeFormula } from '@/lib/types';
import { assertUsableError, assertUsableFormula } from '@/lib/validation';
import { explanationLlmEnabled } from '@/lib/llmConfig';
import type { Lang } from '@/lib/i18n';
import type { ChatMessage, FormulaResponse, GenerationSource, SolveMode } from '@/lib/types';

function normalizeHistory(history: unknown): ChatMessage[] {
  if (!Array.isArray(history)) return [];
  return history
    .filter((item: any) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
    .map((item: any) => ({ role: item.role, content: item.content }));
}

async function recordGeneration(input: {
  sessionId: string;
  userInput: string;
  history: ChatMessage[];
  mode: SolveMode;
  replyText: string;
  formula: any;
}) {
  await appendBoothRecord({
    type: 'generation',
    sessionId: input.sessionId,
    userInput: input.userInput,
    history: input.history,
    mode: input.mode,
    replyText: input.replyText,
    formula: input.formula
  });
}

/** 有模型 Key 时默认生成动态解释；API 失败时自动回退确定性模板。 */
async function buildReplyText(formula: FormulaResponse, mode: SolveMode, lang: Lang): Promise<{ text: string; source: GenerationSource }> {
  const template = mode === 'enum' ? buildOptimizedReply(formula, lang) : '';
  if (mode !== 'enum' || !explanationLlmEnabled()) {
    return { text: template, source: 'local' };
  }
  const llmText = await generateExplanation(formula, lang);
  return llmText ? { text: llmText, source: 'llm' } : { text: template, source: 'local' };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = String(body?.message || '').trim();
    const sessionId = String(body?.sessionId || createSessionId());
    const currentFormula = body?.currentFormula ? sanitizeFormula(body.currentFormula) : null;
    const lang: Lang = body?.lang === 'en' ? 'en' : 'zh';

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const messages: ChatMessage[] = [
      ...normalizeHistory(body?.history),
      { role: 'user', content: message }
    ];

    // 1) 解释类追问：保留当前配方，只解释（绝不重新生成）
    if (currentFormula && isExplanationQuestion(message)) {
      const response = {
        mode: 'explain' as const,
        sessionId,
        replyText: buildFormulaExplanation(message, currentFormula, lang),
        formula: currentFormula,
        ai: { intent: 'local' as const, explanation: 'local' as const }
      };

      await recordGeneration({
        sessionId,
        userInput: message,
        history: messages,
        mode: response.mode,
        replyText: response.replyText,
        formula: response.formula
      });

      return NextResponse.json(response);
    }

    const intentResult = await analyzeIntentWithLLM(message, lang);
    const intent = intentResult.intent;
    // 自动调配模式只允许选择当前四个泵实际装载的概念原料。
    const selectionPlan = selectMaterials(intent, activeMaterialIds);
    const target = buildTargetVector(intent);

    // 2) 还没有配方就问「为什么」：引导先生成，同时兜底返回一版配方
    if (!currentFormula && isExplanationQuestion(message)) {
      const fallback = await generateFallback(message, selectionPlan, lang);
      const response = {
        mode: 'heuristic' as const,
        sessionId,
        replyText: lang === 'en'
          ? 'This sounds like a question about a previous formula. Create one first or name the material you want to understand; once a formula exists, I can explain each ingredient without changing the ratios.'
          : '这个问题更像是在追问上一版配方的原因。你可以先生成一张试香卡，或者告诉我你想问哪一种原料；有了具体配方后，我会解释每个原料为什么被加入，而不会擅自改配方。',
        formula: sanitizeFormula(fallback.formula),
        ai: { intent: intentResult.source, explanation: 'local' as const }
      };

      await recordGeneration({
        sessionId,
        userInput: message,
        history: messages,
        mode: response.mode,
        replyText: response.replyText,
        formula: response.formula
      });

      return NextResponse.json(response);
    }

    // 3) 主链路：约束优化求解（语言理解 → 目标向量 → 候选池 → 枚举 + 投影梯度）
    try {
      const solved = solveFormula(selectionPlan, target, lang);
      if (!solved) {
        throw new Error('约束优化求解无可行解，已切换到本地规则。');
      }
      const formula = sanitizeFormula(solved.formula);
      assertUsableFormula(formula);
      assertUsableError(formula);
      const reply = await buildReplyText(formula, 'enum', lang);
      const response = {
        mode: 'enum' as const,
        sessionId,
        replyText: reply.text,
        formula,
        ai: { intent: intentResult.source, explanation: reply.source }
      };

      await recordGeneration({
        sessionId,
        userInput: message,
        history: messages,
        mode: response.mode,
        replyText: response.replyText,
        formula: response.formula
      });

      return NextResponse.json(response);
    } catch (solverError) {
      // 4) 兜底：启发式规则配方（保证展台现场永不宕机）
      const fallback = await generateFallback(message, selectionPlan, lang);
      const formula = sanitizeFormula(fallback.formula);
      assertUsableFormula(formula);
      const response = {
        mode: 'heuristic' as const,
        sessionId,
        replyText: fallback.replyText,
        formula,
        ai: { intent: intentResult.source, explanation: 'local' as const },
        debug: solverError instanceof Error ? solverError.message : 'Unknown solver error'
      };

      await recordGeneration({
        sessionId,
        userInput: message,
        history: messages,
        mode: response.mode,
        replyText: response.replyText,
        formula: response.formula
      });

      return NextResponse.json(response);
    }
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'failed to generate response'
    }, { status: 500 });
  }
}
