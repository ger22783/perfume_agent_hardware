import { NextRequest,NextResponse } from 'next/server';
import { requireUser,requireSameOrigin,readJson,failure,HttpError } from '@/lib/accounts/http';
import { saveProfile } from '@/lib/accounts/repository';
import { validateAnswers } from '@/lib/accounts/questionnaire';
export async function PUT(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const user = await requireUser(req), body = await readJson(req);
    if (!Number.isInteger(body.expectedVersion) || body.expectedVersion < 0) throw new HttpError(400,'缺少有效的画像版本。');
    const answers = validateAnswers(body.answers);
    return NextResponse.json({profile:await saveProfile(user.id,answers,body.expectedVersion)});
  } catch(error) { return failure(error); }
}
