import { betterAuth } from 'better-auth';
import { getAccountPool } from './database';
let instance: ReturnType<typeof createAuth> | undefined;
function createAuth() {
  if (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32) throw new Error('账号密钥尚未配置。');
  const baseURL = process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.BETTER_AUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  return betterAuth({
    appName: 'Agent 修改', baseURL, secret: process.env.BETTER_AUTH_SECRET, database: getAccountPool(),
    trustedOrigins: [baseURL, ...(process.env.AUTH_TRUSTED_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean)],
    user: { modelName: 'perfume_user', deleteUser: { enabled: true } },
    session: { modelName: 'perfume_session', expiresIn: 60 * 60 * 24 * 7, cookieCache: { enabled: false } },
    account: { modelName: 'perfume_account', accountLinking: { enabled: false } },
    verification: { modelName: 'perfume_verification' },
    emailAndPassword: { enabled: true, minPasswordLength: 12, maxPasswordLength: 128 },
    rateLimit: { enabled: true, storage: 'database', modelName: 'perfume_rate_limit', window: 60, max: 60,
      customRules: { '/sign-in/email': { window: 60, max: 5 }, '/sign-up/email': { window: 60, max: 3 } } },
  });
}
export function getAuth() { return instance ||= createAuth(); }
