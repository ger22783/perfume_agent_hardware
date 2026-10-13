import { NextRequest,NextResponse } from 'next/server';
import { requireUser,requireSameOrigin,readJson,failure,HttpError,isAdmin } from './http';
import { getGeneration,getProfile,saveFeedback } from './repository';
import { getAccountPool } from './database';
import { sessionsToCsv,summarizeSessions,type BoothRecordRow } from '@/lib/records';
export async function feedbackRoute(req:NextRequest,appMode:string){
  try {
    requireSameOrigin(req);
    const user=await requireUser(req),body=await readJson(req);
    if(typeof body.generationId!=='string')throw new HttpError(400,'请先生成具体配方。');
    await getGeneration(user.id,appMode,body.generationId);
    if(!Number.isInteger(body.rating)||body.rating<1||body.rating>5)throw new HttpError(400,'评分须为1至5的整数。');
    if(typeof body.comment!=='string'||body.comment.length>2000||typeof body.smelled!=='boolean'||!['current','global'].includes(body.scope))throw new HttpError(400,'反馈格式不正确。');
    const scope=body.scope==='global'&&await getProfile(user.id)?'global':'current';
    const result=await saveFeedback(user.id,body.generationId,body.rating,body.comment.trim(),body.smelled,scope);
    return NextResponse.json({ok:true,...result});
  }catch(error){return failure(error);}
}
export async function recordsRoute(req:NextRequest,appMode:string){
  try {
    const user=await requireUser(req);
    if(!isAdmin(user.id))throw new HttpError(403,'此页面需要管理员权限；个人数据请在“偏好与记忆”中导出。');
    const records=await listAccountRecords(appMode);
    const sessions=summarizeSessions(records);
    if(req.nextUrl.searchParams.get('format')==='csv')return new NextResponse(sessionsToCsv(sessions),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="perfume-account-records.csv"','Cache-Control':'no-store'}});
    return NextResponse.json({ok:true,storage:'database',sessions,records},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return failure(error);}
}

export async function listAccountRecords(appMode:string):Promise<BoothRecordRow[]>{
  const rows=(await getAccountPool().query(`SELECT g.*,f.rating,f.comment AS feedback_comment FROM account_generations g
      LEFT JOIN account_feedback f ON f.generation_id=g.id WHERE g.app_mode=$1 ORDER BY g.created_at DESC LIMIT 500`,[appMode])).rows;
    const records:BoothRecordRow[]=rows.flatMap((row,index)=>{
      const base={id:index,sessionId:row.session_id,createdAt:new Date(row.created_at).toISOString(),userInput:row.payload.userInput||null,history:row.payload.history||null,mode:row.payload.mode||null,replyText:row.payload.replyText||null,formula:row.payload.formula||null,rating:null,comment:null};
      return [{...base,type:'generation' as const},...(row.rating?[{...base,type:'feedback' as const,rating:Number(row.rating),comment:row.feedback_comment}]:[])];
    });
  return records;
}
