import { NextRequest } from 'next/server';
import { recordsRoute } from '@/lib/accounts/routes';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) { return recordsRoute(req, 'hardware'); }
