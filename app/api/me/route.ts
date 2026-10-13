import { NextRequest,NextResponse } from 'next/server';
import { requireUser, failure, isAdmin } from '@/lib/accounts/http';
import { getProfile,listMemories } from '@/lib/accounts/repository';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    return NextResponse.json({user:{id:user.id,name:user.name,email:user.email,isAdmin:isAdmin(user.id)},profile:await getProfile(user.id),memories:await listMemories(user.id)}, {headers:{'Cache-Control':'no-store'}});
  } catch(error) { return failure(error); }
}
