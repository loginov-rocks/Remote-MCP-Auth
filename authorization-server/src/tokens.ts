import { createHmac } from 'node:crypto';

import { ACCESS_TOKEN_SECRET, ACCESS_TOKEN_TTL, REFRESH_TOKEN_SECRET, REFRESH_TOKEN_TTL } from './constants.ts';

function computeSignature(secret: string, header: string, payload: string): string {
  return createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url');
}

interface SignTokenParams {
  clientId: string;
  issuer: string;
  resource?: string;
  scope?: string;
  secret: string;
  studentId: string;
  ttl: number;
}

function signToken({ clientId, issuer, resource, scope, secret, studentId, ttl }: SignTokenParams): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const payload: Record<string, string | number> = {
    client_id: clientId,
    exp: Math.floor(Date.now() / 1000) + ttl,
    iss: issuer,
    sub: studentId,
  };

  if (resource) {
    payload.aud = resource;
  }

  if (scope) {
    payload.scope = scope;
  }

  const encodedHeader = Buffer.from(JSON.stringify(header), 'utf8').toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = computeSignature(secret, encodedHeader, encodedPayload);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

interface IssueTokensParams {
  clientId: string;
  issuer: string;
  resource?: string;
  scope?: string;
  studentId: string;
}

interface IssuedTokens {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}

export function issueTokens({ clientId, issuer, resource, scope, studentId }: IssueTokensParams): IssuedTokens {
  const claims = { clientId, issuer, resource, scope, studentId };
  const expiresIn = ACCESS_TOKEN_TTL;
  const accessToken = signToken({ ...claims, secret: ACCESS_TOKEN_SECRET, ttl: expiresIn });
  const refreshToken = signToken({ ...claims, secret: REFRESH_TOKEN_SECRET, ttl: REFRESH_TOKEN_TTL });

  return { accessToken, expiresIn, refreshToken };
}

interface VerifiedToken {
  clientId: string;
  issuer: string;
  resource?: string;
  scope?: string;
  studentId: string;
}

function verifyToken(secret: string, token: string): VerifiedToken | null {
  const [encodedHeader, encodedPayload, signature] = token.split('.');

  if (!encodedHeader || !encodedPayload || !signature) {
    return null;
  }

  if (computeSignature(secret, encodedHeader, encodedPayload) !== signature) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));

  if (!payload.sub || !payload.exp || Math.floor(Date.now() / 1000) > payload.exp) {
    return null;
  }

  return {
    clientId: payload.client_id,
    issuer: payload.iss,
    resource: payload.aud,
    scope: payload.scope,
    studentId: payload.sub,
  };
}

export function verifyRefreshToken(token: string): VerifiedToken | null {
  return verifyToken(REFRESH_TOKEN_SECRET, token);
}
