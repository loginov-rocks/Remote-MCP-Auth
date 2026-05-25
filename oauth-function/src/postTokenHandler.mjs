import { createHash } from 'crypto';

import { deleteCode, findCode } from './authCodes.mjs';
import { createAccessToken, createRefreshToken, validateRefreshToken } from './tokens.mjs';

const computeChallenge = (verifier) => createHash('sha256')
  .update(verifier)
  .digest('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=/g, '');

export const postTokenHandler = async (event) => {
  const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  const params = Object.fromEntries(new URLSearchParams(body));

  // TODO: Validate params.
  console.log('params', JSON.stringify(params));

  let studentId = null;
  let scope = null;

  if (params.grant_type === 'authorization_code') {
    if (!params.code || !params.code_verifier) {
      return { statusCode: 400 };
    }

    let code;
    try {
      code = await findCode(params.code);
    } catch (error) {
      console.error(error);
      return { statusCode: 500 };
    }

    if (!code || !code.code || !code.codeChallenge || !code.studentId || !code.scope) {
      return { statusCode: 400 };
    }

    if (computeChallenge(params.code_verifier) !== code.codeChallenge) {
      return { statusCode: 400 };
    }

    try {
      await deleteCode(code.code);
    } catch (error) {
      console.error(error);
      return { statusCode: 500 };
    }

    studentId = code.studentId;
    scope = code.scope;
  } else if (params.grant_type === 'refresh_token') {
    if (!params.refresh_token) {
      return { statusCode: 400 };
    }

    const refreshTokenPayload = validateRefreshToken(params.refresh_token);

    if (!refreshTokenPayload) {
      return { statusCode: 400 };
    }

    studentId = refreshTokenPayload.sub;
    scope = refreshTokenPayload.scope;
  } else {
    return { statusCode: 400 };
  }

  const { accessToken, expiresIn } = createAccessToken(studentId, params.client_id, params.resource, scope);
  const { refreshToken } = createRefreshToken(studentId, scope);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: refreshToken,
      scope,
    }),
  };
};
