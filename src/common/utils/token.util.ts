// src/auth/token.util.ts
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

export function generateRefreshTokenPlain(len = 48) {
  return randomBytes(len).toString('hex'); // long random string
}

export async function hashRefreshToken(token: string) {
  return bcrypt.hash(token, 10);
}

export async function verifyRefreshToken(token: string, hash: string) {
  return bcrypt.compare(token, hash);
}
