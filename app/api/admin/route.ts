import { NextRequest,NextResponse } from 'next/server';
import { requireUser,isAdmin,HttpError,failure } from '@/lib/accounts/http';
import { adminOverview,adminUserDetail } from '@/lib/accounts/admin';
export const dynamic = 'force-dynamic';
export async function GET(req:NextRequest) {
  try {
    const user=await requireUser(req);
    if(!isAdmin(user.id))throw new HttpError(403,'此入口仅向管理员开放。');
    const id=req.nextUrl.searchParams.get('userId');
    const data=id ? await adminUserDetail(id) : await adminOverview(req.nextUrl.searchParams.get('search') || '',Number(req.nextUrl.searchParams.get('page') || 1));
    return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
  } catch(error) {return failure(error);}
}
