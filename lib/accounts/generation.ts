import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, requireSameOrigin, readJson, HttpError } from './http';
import { generationContext, getProfile, saveGeneration } from './repository';
import { validateAnswers } from './questionnaire';
import { assertExclusions } from './personalization';
export async function prepareGeneration(req: NextRequest, mode: string) {
  requireSameOrigin(req);
  const user = await requireUser(req), body = await readJson(req);
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > 2000) throw new HttpError(400,'请输入不超过2000字的本次需求。');
  const saved = await getProfile(user.id);
  const answers = body.questionnaire ? validateAnswers(body.questionnaire) : saved?.answers;
  if (!answers) throw new HttpError(428,'请先完成偏好问卷，也可以对不确定的问题选择说不清。');
  // Per-request preferences cannot remove account-level material exclusions.
  if (saved?.answers.ingredientExclusionAnswer === 'named' && body.questionnaire) {
    answers.ingredientExclusionAnswer = 'named';
    answers.ingredientExclusionText = [...new Set([saved.answers.ingredientExclusionText,answers.ingredientExclusionText].filter(Boolean))].join('、');
  }
  const previous = await generationContext(user.id,mode,body.currentGenerationId,body.sessionId);
  return { user,body,message,answers, mode, previous, sessionId:previous?.session_id || randomUUID(),
    profileVersion:body.questionnaire ? null : saved?.version || null,
    history:previous?.payload.history || [] };
}
export async function completeGeneration(ctx: Awaited<ReturnType<typeof prepareGeneration>>, response: any) {
  assertExclusions(response.formula,ctx.answers);
  const history = [...ctx.history,{role:'user',content:ctx.message},{role:'assistant',content:response.replyText}].slice(-12);
  const generationId = await saveGeneration(ctx.user.id,ctx.mode,ctx.sessionId,{...response,history,userInput:ctx.message},ctx.profileVersion);
  return NextResponse.json({...response,generationId,profileVersionUsed:ctx.profileVersion},{headers:{'Cache-Control':'no-store'}});
}
