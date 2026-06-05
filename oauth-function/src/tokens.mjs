import { createHmac } from 'node:crypto';

import { ACCESS_TOKEN_SECRET, ACCESS_TOKEN_TTL, REFRESH_TOKEN_SECRET, REFRESH_TOKEN_TTL } from './constants.mjs';

function computeSignature(secret, header, payload) {
  return createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url');
}

function signToken({ clientId, issuer, resource, scope, secret, studentId, ttl }) {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    exp: now + ttl,
    iss: issuer,
    sub: studentId,
  };

  if (clientId) {
    payload.client_id = clientId;
  }

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

function verifyToken(secret, token) {
  const [encodedHeader, encodedPayload, signature] = token.split('.');

  if (!encodedHeader || !encodedPayload || !signature) {
    return null;
  }

  if (computeSignature(secret, encodedHeader, encodedPayload) !== signature) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  const now = Math.floor(Date.now() / 1000);

  if (!payload.sub || !payload.exp || now > payload.exp) {
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

export function issueTokens({ clientId, issuer, resource, scope, studentId }) {
  const claims = { clientId, issuer, resource, scope, studentId };
  const expiresIn = ACCESS_TOKEN_TTL;
  const accessToken = signToken({ ...claims, secret: ACCESS_TOKEN_SECRET, ttl: expiresIn });
  const refreshToken = signToken({ ...claims, secret: REFRESH_TOKEN_SECRET, ttl: REFRESH_TOKEN_TTL });

  return { accessToken, expiresIn, refreshToken };
}

export function verifyRefreshToken(token) {
  return verifyToken(REFRESH_TOKEN_SECRET, token);
}
