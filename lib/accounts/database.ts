import { Pool } from 'pg';
let pool: Pool | undefined;
export function getAccountPool() {
  const connectionString = process.env.AUTH_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString || connectionString.includes('[SENSITIVE]')) throw new Error('账号数据库尚未配置。');
  pool ||= new Pool({ connectionString, max: 3, idleTimeoutMillis: 10000, connectionTimeoutMillis: 10000 });
  return pool;
}
export const businessSchema = `
CREATE TABLE IF NOT EXISTS account_profiles (
 user_id TEXT PRIMARY KEY REFERENCES perfume_user(id) ON DELETE CASCADE,
 answers JSONB NOT NULL, version INTEGER NOT NULL DEFAULT 1, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS account_generations (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES perfume_user(id) ON DELETE CASCADE,
 app_mode TEXT NOT NULL, session_id TEXT NOT NULL, profile_version INTEGER,
 payload JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS account_generations_owner ON account_generations(user_id,app_mode,session_id,created_at DESC);
CREATE TABLE IF NOT EXISTS account_feedback (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES perfume_user(id) ON DELETE CASCADE,
 generation_id TEXT NOT NULL REFERENCES account_generations(id) ON DELETE CASCADE,
 rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), comment TEXT NOT NULL,
 smelled BOOLEAN NOT NULL DEFAULT FALSE, scope TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(user_id,generation_id)
);
CREATE TABLE IF NOT EXISTS account_memories (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES perfume_user(id) ON DELETE CASCADE,
 feedback_id TEXT NOT NULL REFERENCES account_feedback(id) ON DELETE CASCADE,
 field TEXT NOT NULL, value TEXT NOT NULL, evidence TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(feedback_id,field)
);
CREATE INDEX IF NOT EXISTS account_memories_owner ON account_memories(user_id,status,created_at);
ALTER TABLE account_memories ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS account_profile_events (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES perfume_user(id) ON DELETE CASCADE,
 version INTEGER NOT NULL, event TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;
