import { appendFile, mkdir } from 'fs/promises';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import type { ChatMessage, FormulaResponse, SolveMode } from './types';

const recordsRoot = process.env.VERCEL ? '/tmp/perfume-booth' : path.join(process.cwd(), 'runtime');
const recordsDir = path.join(recordsRoot, 'records');
const recordsFile = path.join(recordsDir, 'booth-sessions.jsonl');

export type BoothRecordPayload = {
  type: 'generation' | 'feedback';
  sessionId: string;
  createdAt: string;
  userInput?: string;
  history?: ChatMessage[];
  mode?: SolveMode | 'llm' | 'fallback';
  replyText?: string;
  formula?: FormulaResponse;
  rating?: number;
  comment?: string;
};

export type BoothRecordRow = {
  id: number;
  type: 'generation' | 'feedback';
  sessionId: string;
  createdAt: string;
  userInput: string | null;
  history: ChatMessage[] | null;
  mode: SolveMode | 'llm' | 'fallback' | null;
  replyText: string | null;
  formula: FormulaResponse | null;
  rating: number | null;
  comment: string | null;
};

export type BoothSessionSummary = {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  userInput: string | null;
  replyText: string | null;
  formula: FormulaResponse | null;
  mode: SolveMode | 'llm' | 'fallback' | null;
  rating: number | null;
  comment: string | null;
};

let tableReady: Promise<void> | null = null;
let databaseClient: ReturnType<typeof neon> | null = null;

function hasDatabase() {
  return Boolean(
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL
  );
}

function getDatabaseUrl() {
  return process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    '';
}

function getDatabaseClient() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) return null;
  databaseClient ||= neon(databaseUrl);
  return databaseClient;
}

function createSessionId() {
  return `booth_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function ensureTable() {
  if (!hasDatabase()) return;
  const db = getDatabaseClient();
  if (!db) return;

  tableReady ||= db`
    CREATE TABLE IF NOT EXISTS booth_records (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      session_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      user_input TEXT,
      history JSONB,
      mode TEXT,
      reply_text TEXT,
      formula JSONB,
      rating INTEGER,
      comment TEXT
    )
  `.then(() => undefined);

  await tableReady;
}

async function appendFileRecord(record: BoothRecordPayload) {
  try {
    await mkdir(recordsDir, { recursive: true });
    await appendFile(recordsFile, JSON.stringify(record) + '\n', 'utf8');
  } catch (error) {
    console.warn('Failed to persist booth record to local file', error);
  }
}

async function appendDatabaseRecord(record: BoothRecordPayload) {
  await ensureTable();
  if (!hasDatabase()) return false;

  const db = getDatabaseClient();
  if (!db) return false;
  const historyJson = record.history ? JSON.stringify(record.history) : null;
  const formulaJson = record.formula ? JSON.stringify(record.formula) : null;

  const inserted = await db`
    INSERT INTO booth_records (
      type,
      session_id,
      created_at,
      user_input,
      history,
      mode,
      reply_text,
      formula,
      rating,
      comment
    ) VALUES (
      ${record.type},
      ${record.sessionId},
      ${record.createdAt},
      ${record.userInput || null},
      ${historyJson}::jsonb,
      ${record.mode || null},
      ${record.replyText || null},
      ${formulaJson}::jsonb,
      ${record.rating ?? null},
      ${record.comment || null}
    )
    RETURNING id
  `;

  return Array.isArray(inserted) && inserted.length > 0;
}

export { createSessionId };

export async function appendBoothRecord(payload: Omit<BoothRecordPayload, 'createdAt'>) {
  const record: BoothRecordPayload = {
    ...payload,
    createdAt: new Date().toISOString()
  };

  if (hasDatabase()) {
    const savedToDatabase = await appendDatabaseRecord(record);
    if (!savedToDatabase) {
      throw new Error('Database insert did not return an id.');
    }
    return { storage: 'database' as const };
  }

  await appendFileRecord(record);
  return { storage: 'file' as const };
}

export async function listBoothRecords(limit = 100): Promise<BoothRecordRow[]> {
  await ensureTable();
  if (!hasDatabase()) return [];

  const db = getDatabaseClient();
  if (!db) return [];

  const safeLimit = Math.min(Math.max(limit, 1), 500);
  const result = await db.query(`
    SELECT
      id,
      type,
      session_id,
      created_at,
      user_input,
      history,
      mode,
      reply_text,
      formula,
      rating,
      comment
    FROM booth_records
    ORDER BY created_at DESC
    LIMIT ${safeLimit}
  `);

  const rows = Array.isArray(result) ? result as Record<string, any>[] : [];

  return rows.map((row) => ({
    id: Number(row.id),
    type: row.type,
    sessionId: row.session_id,
    createdAt: new Date(row.created_at).toISOString(),
    userInput: row.user_input,
    history: row.history,
    mode: row.mode,
    replyText: row.reply_text,
    formula: row.formula,
    rating: row.rating === null ? null : Number(row.rating),
    comment: row.comment
  }));
}

export function summarizeSessions(records: BoothRecordRow[]): BoothSessionSummary[] {
  const sessions = new Map<string, BoothSessionSummary>();
  const sorted = [...records].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  for (const record of sorted) {
    const current = sessions.get(record.sessionId) || {
      sessionId: record.sessionId,
      createdAt: record.createdAt,
      updatedAt: record.createdAt,
      userInput: null,
      replyText: null,
      formula: null,
      mode: null,
      rating: null,
      comment: null
    };

    current.updatedAt = record.createdAt;

    if (record.type === 'generation') {
      current.userInput = record.userInput;
      current.replyText = record.replyText;
      current.formula = record.formula;
      current.mode = record.mode;
    }

    if (record.type === 'feedback') {
      current.rating = record.rating;
      current.comment = record.comment;
    }

    sessions.set(record.sessionId, current);
  }

  return [...sessions.values()].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function csvCell(value: unknown) {
  const raw = value === null || value === undefined ? '' : String(value);
  const text = /^[\s]*[=+\-@]/.test(raw) ? "'" + raw : raw;
  return `"${text.replace(/"/g, '""')}"`;
}

export function sessionsToCsv(sessions: BoothSessionSummary[]) {
  const header = [
    'sessionId',
    'createdAt',
    'updatedAt',
    'userInput',
    'aiReply',
    'style',
    'topNotes',
    'heartNotes',
    'baseNotes',
    'rating',
    'feedback'
  ];

  const rows = sessions.map((session) => {
    const formula = session.formula;
    const formatNotes = (notes?: Array<{ name: string; percentage: number }>) =>
      notes?.map((item) => `${item.name} ${item.percentage}%`).join('; ') || '';

    return [
      session.sessionId,
      session.createdAt,
      session.updatedAt,
      session.userInput,
      session.replyText,
      formula?.fragrancePositioning?.style || '',
      formatNotes(formula?.formula?.topNotes),
      formatNotes(formula?.formula?.heartNotes),
      formatNotes(formula?.formula?.baseNotes),
      session.rating ?? '',
      session.comment
    ].map(csvCell).join(',');
  });

  return ['\uFEFF' + header.map(csvCell).join(','), ...rows].join('\n');
}
