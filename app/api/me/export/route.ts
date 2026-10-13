import { NextRequest,NextResponse } from 'next/server';
import { requireUser,failure } from '@/lib/accounts/http';
import { getAccountPool } from '@/lib/accounts/database';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
  try{
    const user=await requireUser(req), db=getAccountPool();
    const tables=['account_profiles','account_generations','account_feedback','account_memories','account_profile_events'];
    const data:Record<string,unknown>={user:{id:user.id,name:user.name,email:user.email}};
    for(const table of tables) data[table]=(await db.query(`SELECT * FROM ${table} WHERE user_id=$1`,[user.id])).rows;
    return new NextResponse(JSON.stringify(data,null,2),{headers:{'Content-Type':'application/json; charset=utf-8','Content-Disposition':'attachment; filename="my-perfume-data.json"','Cache-Control':'no-store'}});
  }catch(error){return failure(error);}
}
