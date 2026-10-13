import { randomUUID } from 'crypto';
import { getAccountPool } from './database';
import { HttpError } from './http';
import { Answers, profileSummary } from './questionnaire';
export type SavedProfile = { answers: Answers; version: number; summary: string };
export async function getProfile(userId: string): Promise<SavedProfile | null> {
  const db = getAccountPool();
  const { rows } = await db.query(`SELECT p.answers,p.version,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('field',m.field,'value',m.value) ORDER BY m.confirmed_at,m.id)
      FROM account_memories m WHERE m.user_id=p.user_id AND m.status='confirmed'),'[]'::jsonb) AS memories
    FROM account_profiles p WHERE p.user_id=$1`,[userId]);
  if (!rows.length) return null;
  const answers: Answers = structuredClone(rows[0].answers);
  for (const memory of rows[0].memories) {
    if (memory.field === 'sweetnessPreference') answers.sweetnessPreference = memory.value;
    if (memory.field === 'presencePreference') answers.presencePreference = memory.value;
  }
  return { answers, version: rows[0].version, summary: profileSummary(answers) };
}
export async function saveProfile(userId: string, answers: Answers, expectedVersion: number) {
  const db = await getAccountPool().connect();
  try {
    await db.query('BEGIN');
    const { rows } = await db.query(`INSERT INTO account_profiles(user_id,answers) SELECT $1,$2::jsonb WHERE $3=0
      ON CONFLICT(user_id) DO UPDATE SET answers=EXCLUDED.answers,version=account_profiles.version+1,updated_at=NOW()
      WHERE account_profiles.version=$3 RETURNING version`,[userId,JSON.stringify(answers),expectedVersion]);
    // An existing row must still be updated when expectedVersion is nonzero.
    let version = rows[0]?.version;
    if (!version && expectedVersion > 0) {
      const updated = await db.query('UPDATE account_profiles SET answers=$2::jsonb,version=version+1,updated_at=NOW() WHERE user_id=$1 AND version=$3 RETURNING version',[userId,JSON.stringify(answers),expectedVersion]);
      version = updated.rows[0]?.version;
    }
    if (!version) throw new HttpError(409,'偏好已在另一处更新，请刷新后再修改。');
    await db.query("UPDATE account_memories SET status='superseded' WHERE user_id=$1 AND status IN ('confirmed','pending')",[userId]);
    await db.query('INSERT INTO account_profile_events(id,user_id,version,event) VALUES($1,$2,$3,$4)',[randomUUID(),userId,version,'questionnaire_saved']);
    await db.query('COMMIT');
    return getProfile(userId);
  } catch (error) { await db.query('ROLLBACK'); throw error; } finally { db.release(); }
}
export async function listMemories(userId: string) {
  return (await getAccountPool().query("SELECT id,field,value,evidence,status,created_at FROM account_memories WHERE user_id=$1 AND status IN ('pending','confirmed') ORDER BY created_at DESC",[userId])).rows;
}
export async function updateMemory(userId: string, id: string, action: string, expectedVersion: number) {
  if (!['confirm','revoke'].includes(action)) throw new HttpError(400,'记忆操作不正确。');
  const db = await getAccountPool().connect();
  try {
    await db.query('BEGIN');
    const profiles = await db.query('SELECT version FROM account_profiles WHERE user_id=$1 FOR UPDATE',[userId]);
    if (!profiles.rows.length || profiles.rows[0].version !== expectedVersion) throw new HttpError(409,'偏好版本已变化，请刷新后重试。');
    const result = await db.query("UPDATE account_memories SET status=$3,confirmed_at=CASE WHEN $3='confirmed' THEN NOW() ELSE confirmed_at END WHERE user_id=$1 AND id=$2 AND status IN ('pending','confirmed') RETURNING id",[userId,id,action === 'confirm' ? 'confirmed' : 'revoked']);
    if (!result.rows.length) throw new HttpError(404,'记忆不存在或已经失效。');
    const p = await db.query('UPDATE account_profiles SET version=version+1,updated_at=NOW() WHERE user_id=$1 RETURNING version',[userId]);
    await db.query('INSERT INTO account_profile_events(id,user_id,version,event) VALUES($1,$2,$3,$4)',[randomUUID(),userId,p.rows[0].version,`memory_${action}:${id}`]);
    await db.query('COMMIT');
    return getProfile(userId);
  } catch (error) { await db.query('ROLLBACK'); throw error; } finally { db.release(); }
}
export async function getGeneration(userId: string, appMode: string, id: string) {
  const { rows } = await getAccountPool().query('SELECT * FROM account_generations WHERE id=$1 AND user_id=$2 AND app_mode=$3',[id,userId,appMode]);
  if (!rows.length) throw new HttpError(404,'配方不存在或无权访问。');
  return rows[0];
}
export async function generationContext(userId: string, appMode: string, generationId: unknown, sessionId: unknown) {
  if (generationId) return getGeneration(userId,appMode,String(generationId));
  if (!sessionId) return null;
  const { rows } = await getAccountPool().query('SELECT * FROM account_generations WHERE user_id=$1 AND app_mode=$2 AND session_id=$3 ORDER BY created_at DESC LIMIT 1',[userId,appMode,String(sessionId)]);
  if (!rows.length) throw new HttpError(404,'会话不存在或无权访问，请开始新会话。');
  return rows[0];
}
export async function saveGeneration(userId: string, appMode: string, sessionId: string, payload: unknown, profileVersion: number | null) {
  const id = randomUUID();
  await getAccountPool().query('INSERT INTO account_generations(id,user_id,app_mode,session_id,profile_version,payload) VALUES($1,$2,$3,$4,$5,$6::jsonb)',[id,userId,appMode,sessionId,profileVersion,JSON.stringify(payload)]);
  return id;
}
export type MemoryCandidate = { field: string; value: string };
export function feedbackCandidates(comment: string, smelled: boolean, scope: string): MemoryCandidate[] {
  if (!smelled || scope !== 'global' || /朋友|别人|他人|friend|someone/i.test(comment)) return [];
  const result: MemoryCandidate[] = [];
  if (/太甜|低甜|不甜|少.*甜|less sweet|too sweet/i.test(comment)) result.push({field:'sweetnessPreference',value:'slight'});
  else if (/更甜|甜一点|more sweet|sweeter/i.test(comment)) result.push({field:'sweetnessPreference',value:'pronounced'});
  if (/太浓|淡一点|lighter|too strong/i.test(comment)) result.push({field:'presencePreference',value:'light'});
  else if (/浓一点|存在感强|stronger/i.test(comment)) result.push({field:'presencePreference',value:'noticeable'});
  return result;
}
export async function saveFeedback(userId: string, generationId: string, rating: number, comment: string, smelled: boolean, scope: string) {
  const db = await getAccountPool().connect();
  try {
    await db.query('BEGIN');
    const inserted = await db.query(`INSERT INTO account_feedback(id,user_id,generation_id,rating,comment,smelled,scope) VALUES($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT(user_id,generation_id) DO NOTHING RETURNING id`,[randomUUID(),userId,generationId,rating,comment,smelled,scope]);
    // Duplicate submissions never create another learning event.
    if (inserted.rows.length) for (const c of feedbackCandidates(comment,smelled,scope)) {
      await db.query('INSERT INTO account_memories(id,user_id,feedback_id,field,value,evidence) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),userId,inserted.rows[0].id,c.field,c.value,comment]);
    }
    await db.query('COMMIT');
    return { duplicate: !inserted.rows.length };
  } catch (error) { await db.query('ROLLBACK'); throw error; } finally { db.release(); }
}
