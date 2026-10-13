import { NextRequest } from 'next/server';
import { feedbackRoute } from '@/lib/accounts/routes';
export async function POST(req: NextRequest) { return feedbackRoute(req, 'hardware'); }
