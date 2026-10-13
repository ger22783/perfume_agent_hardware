import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from './auth';
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function requireUser(req: Request) {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) throw new HttpError(401,'请先登录。');
  return session.user;
}
export function requireSameOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (!origin || !host) throw new HttpError(403,'请求来源不正确，请刷新页面后重试。');
  try {
    const url = new URL(origin);
    if (!['http:','https:'].includes(url.protocol) || url.host !== host) throw new Error('Origin mismatch');
  } catch { throw new HttpError(403,'请求来源不正确，请刷新页面后重试。'); }
}
export async function readJson(req: Request) {
  const raw = await req.text();
  if (raw.length > 24000) throw new HttpError(413,'输入内容太长。');
  try { return JSON.parse(raw); } catch { throw new HttpError(400,'请求格式不正确。'); }
}
export function failure(error: unknown) {
  const e = error as { status?: number; message?: string };
  if (typeof e.status === 'number' && e.status >= 400 && e.status < 500) return NextResponse.json({ error: e.message },{ status: e.status });
  console.error('Account request failed:', error instanceof Error ? error.name : 'Unknown');
  return NextResponse.json({ error: '服务暂时不可用，请稍后重试。' },{ status: 503 });
}
export function isAdmin(userId: string) { return (process.env.ADMIN_USER_IDS || '').split(',').map(s => s.trim()).includes(userId); }
