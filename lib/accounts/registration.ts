import { HttpError } from './http';

export function validatePasswordConfirmation(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new HttpError(400, '注册信息格式不正确。');
  const body = input as Record<string, unknown>;
  if (typeof body.password !== 'string' || typeof body.passwordConfirm !== 'string') {
    throw new HttpError(400, '请填写密码并再次确认。');
  }
  if (body.password !== body.passwordConfirm) {
    throw new HttpError(400, '两次输入的密码不一致，请重新确认。');
  }
}
