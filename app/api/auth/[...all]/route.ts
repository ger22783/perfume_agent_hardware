import { NextRequest } from 'next/server';
import { getAuth } from '@/lib/accounts/auth';
import { failure, readJson, requireSameOrigin } from '@/lib/accounts/http';
import { validatePasswordConfirmation } from '@/lib/accounts/registration';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function handler(req: NextRequest) {
  try {
    if (req.method === 'POST' && req.nextUrl.pathname.endsWith('/sign-up/email')) {
      requireSameOrigin(req);
      const body = await readJson(req);
      validatePasswordConfirmation(body);
      delete body.passwordConfirm;
      const headers = new Headers(req.headers);
      headers.delete('content-length');
      req = new NextRequest(req.url, { method:'POST', headers, body:JSON.stringify(body) });
    }
    return await getAuth().handler(req);
  } catch (error) { return failure(error); }
}
export { handler as GET, handler as POST };
