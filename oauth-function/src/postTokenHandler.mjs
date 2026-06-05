import { createHash } from 'node:crypto';

import { deleteCode, findCode } from './authCodes.mjs';
import { findClient } from './clients.mjs';
import { issueTokens, verifyRefreshToken } from './tokens.mjs';

class BadRequestError extends Error { }

function computeChallenge(verifier) {
  return createHash('sha256')
    .update(verifier, 'utf8')
    .digest('base64url');
}

async function exchangeAuthorizationCode(params) {
  // Error example: a required parameter is missing while the client is valid - the request shape is wrong, not the
  // caller - so per the specification the error is invalid_request.
  if (!params.code || !params.code_verifier) {
    throw new BadRequestError('invalid_request');
  }

  const code = await findCode(params.code);

  // Error example: the client is valid but the grant doesn't exist - unknown, expired, or already redeemed - so the
  // fault is the grant and per the specification the error is invalid_grant.
  if (!code) {
    throw new BadRequestError('invalid_grant');
  }

  // Dispose early for single use.
  await deleteCode(code.code);

  // Error example: the grant exists but was issued to another client or redirect_uri, or the PKCE proof fails, so it
  // doesn't belong to this caller and per the specification this is the same invalid_grant as a missing grant.
  if (params.client_id !== code.clientId || params.redirect_uri !== code.redirectUri
    || computeChallenge(params.code_verifier) !== code.codeChallenge) {
    throw new BadRequestError('invalid_grant');
  }

  // Error example: the grant is valid but the requested resource isn't the audience it was bound to, so the target
  // is wrong and per RFC 8707 the error is invalid_target.
  if (params.resource !== code.resource) {
    throw new BadRequestError('invalid_target');
  }

  return {
    clientId: code.clientId,
    resource: code.resource,
    scope: code.scope,
    studentId: code.studentId,
  };
}

async function exchangeRefreshToken(params) {
  // Error example: the code branch's missing-parameter case for refresh_token - client fine, request incomplete - so
  // per the specification the error is invalid_request.
  if (!params.refresh_token) {
    throw new BadRequestError('invalid_request');
  }

  const verifiedToken = verifyRefreshToken(params.refresh_token);

  // Error example: the refresh token can't be verified or belongs to another client, both of which the specification
  // treats as a bad grant, so they collapse into one invalid_grant.
  if (!verifiedToken || params.client_id !== verifiedToken.clientId) {
    throw new BadRequestError('invalid_grant');
  }

  // Error example: the code branch's audience mismatch - grant valid but aimed at the wrong resource - so per
  // RFC 8707 the error is invalid_target.
  if (params.resource !== verifiedToken.resource) {
    throw new BadRequestError('invalid_target');
  }

  return {
    clientId: verifiedToken.clientId,
    resource: verifiedToken.resource,
    scope: verifiedToken.scope,
    studentId: verifiedToken.studentId,
  };
}

export async function postTokenHandler(event) {
  const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  const params = Object.fromEntries(new URLSearchParams(body));
  // Strip the trailing slash Claude adds to the resource, keeping the minted and compared aud canonical.
  params.resource &&= params.resource.replace(/\/$/, '');
  console.log('postTokenParams', JSON.stringify(params));

  let claims;
  try {
    const client = await findClient(params.client_id);

    // Error example: the client_id matches no registered client, so per the specification the error is invalid_client.
    if (!client) {
      throw new BadRequestError('invalid_client');
    }

    if (params.grant_type === 'authorization_code') {
      claims = await exchangeAuthorizationCode(params);
    } else if (params.grant_type === 'refresh_token') {
      claims = await exchangeRefreshToken(params);
    } else {
      // Error example: the client is valid and the request well-formed, only the grant_type is one we don't offer, so
      // per the specification the error is unsupported_grant_type.
      throw new BadRequestError('unsupported_grant_type');
    }
  } catch (error) {
    if (error instanceof BadRequestError) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error.message }),
      };
    }

    throw error;
  }

  const issuer = `https://${event.requestContext.domainName}`;
  const { accessToken, expiresIn, refreshToken } = issueTokens({ ...claims, issuer });

  return {
    statusCode: 200,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: refreshToken,
      scope: claims.scope,
    }),
  };
}
