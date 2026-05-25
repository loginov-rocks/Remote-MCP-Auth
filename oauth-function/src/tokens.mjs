import { createHmac } from 'crypto';

import { ACCESS_TOKEN_SECRET, ACCESS_TOKEN_TTL, REFRESH_TOKEN_SECRET, REFRESH_TOKEN_TTL } from './constants.mjs';

const base64UrlEncode = (str) => Buffer.from(str)
  .toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=/g, '');

const base64UrlDecode = (str) => {
  str += '='.repeat((4 - str.length % 4) % 4);
  str = str.replace(/-/g, '+').replace(/_/g, '/');

  return Buffer.from(str, 'base64').toString();
}

// Custom implementation to avoid build dependencies.
const generateSignature = (secret, header, payload) => createHmac('sha256', secret)
  .update(`${header}.${payload}`)
  .digest('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=/g, '');

const generateJwt = (secret, sub, expiresIn, clientId) => {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub,
    exp: now + expiresIn,
  };

  if (clientId) {
    payload.client_id = clientId;
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  const signature = generateSignature(secret, encodedHeader, encodedPayload);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

const validateJwt = (secret, jwt) => {
  const [encodedHeader, encodedPayload, signature] = jwt.split('.');

  if (!encodedHeader || !encodedPayload || !signature) {
    return null;
  }

  if (generateSignature(secret, encodedHeader, encodedPayload) !== signature) {
    return null;
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload));
  const now = Math.floor(Date.now() / 1000);

  if (!payload.sub || !payload.exp || now > payload.exp) {
    return null;
  }

  return payload;
};

export const createAccessToken = (studentId, clientId) => {
  const expiresIn = ACCESS_TOKEN_TTL;
  const accessToken = generateJwt(ACCESS_TOKEN_SECRET, studentId, expiresIn, clientId);

  return { accessToken, expiresIn };
};

export const createRefreshToken = (studentId) => {
  const expiresIn = REFRESH_TOKEN_TTL;
  const refreshToken = generateJwt(REFRESH_TOKEN_SECRET, studentId, expiresIn);

  return { refreshToken, expiresIn };
};

export const validateRefreshToken = (token) => validateJwt(REFRESH_TOKEN_SECRET, token);
