import { NextRequest,NextResponse } from 'next/server';
import { requireUser,requireSameOrigin,readJson,failure,HttpError } from '@/lib/accounts/http';
import { updateMemory,listMemories } from '@/lib/accounts/repository';
export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const user = await requireUser(req), body = await readJson(req);
    if (typeof body.id !== 'string' || !Number.isInteger(body.expectedVersion)) throw new HttpError(400,'记忆请求格式不正确。');
    const profile = await updateMemory(user.id,body.id,body.action,body.expectedVersion);
    return NextResponse.json({profile,memories:await listMemories(user.id)});
  } catch(error) { return failure(error); }
}
