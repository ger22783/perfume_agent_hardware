import { getAccountPool } from './database';
import { getProfile } from './repository';
import { HttpError } from './http';

export async function adminOverview(search = '', page = 1) {
  const db = getAccountPool(), limit = 25;
  search = search.trim().slice(0, 100);
  page = Math.max(1, Math.min(100000, Math.floor(page) || 1));
  const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
  const filter = `WHERE u.email ILIKE $1 OR u.name ILIKE $1`;
  const stats = (await db.query(`SELECT
    (SELECT count(*)::int FROM perfume_user) AS users,
    (SELECT count(*)::int FROM account_profiles) AS profiles,
    (SELECT count(*)::int FROM account_generations) AS generations,
    (SELECT count(*)::int FROM account_feedback) AS feedback`)).rows[0];
  const total = (await db.query(`SELECT count(*)::int AS total FROM perfume_user u ${filter}`, [pattern])).rows[0].total;
  const users = (await db.query(`SELECT u.id,u.name,u.email,u."createdAt" AS created_at,p.version,p.updated_at,
    (SELECT count(*)::int FROM account_generations g WHERE g.user_id=u.id) AS generation_count,
    (SELECT count(*)::int FROM account_feedback f WHERE f.user_id=u.id) AS feedback_count
    FROM perfume_user u LEFT JOIN account_profiles p ON p.user_id=u.id ${filter}
    ORDER BY u."createdAt" DESC,u.id LIMIT $2 OFFSET $3`, [pattern,limit,(page-1)*limit])).rows;
  return { stats, users, total, page, pageSize:limit };
}

export async function adminUserDetail(userId: string) {
  if (!userId || userId.length > 200) throw new HttpError(400, '账号标识不正确。');
  const db = getAccountPool();
  const user = (await db.query('SELECT id,name,email,"createdAt" AS created_at FROM perfume_user WHERE id=$1', [userId])).rows[0];
  if (!user) throw new HttpError(404, '账号不存在。');
  const original = (await db.query('SELECT answers,version,updated_at FROM account_profiles WHERE user_id=$1', [userId])).rows[0] || null;
  const profile = await getProfile(userId);
  const memories = (await db.query('SELECT id,field,value,evidence,status,created_at,confirmed_at FROM account_memories WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100', [userId])).rows;
  const generations = (await db.query(`SELECT g.id,g.app_mode,g.profile_version,g.created_at,g.payload,
    f.rating,f.comment,f.smelled,f.scope FROM account_generations g LEFT JOIN account_feedback f ON f.generation_id=g.id
    WHERE g.user_id=$1 ORDER BY g.created_at DESC LIMIT 100`, [userId])).rows;
  return { user, original, profile, memories, generations, limit:100 };
}
