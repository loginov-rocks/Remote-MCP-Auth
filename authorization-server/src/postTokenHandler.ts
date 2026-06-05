import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { createHash } from 'node:crypto';

import { deleteAuthCode, findAuthCode } from './authCodes.ts';
import { findClient } from './clients.ts';
import { issueTokens, verifyRefreshToken } from './tokens.ts';

class BadRequestError extends Error { }

function computeChallenge(verifier: string): string {
  return createHash('sha256')
    .update(verifier, 'utf8')
    .digest('base64url');
}

interface ExchangedClaims {
  clientId: string;
  resource?: string;
  scope?: string;
  studentId: string;
}

async function exchangeAuthorizationCode(params: Record<string, string>): Promise<ExchangedClaims> {
  // Error example: a required parameter is missing while the client is valid - the request shape is wrong, not the
  // caller - so per the specification the error is invalid_request.
  if (!params.code || !params.code_verifier) {
    throw new BadRequestError('invalid_request');
  }

  const authCode = await findAuthCode(params.code);

  // Error example: the client is valid but the grant doesn't exist - unknown, expired, or already redeemed - so the
  // fault is the grant and per the specification the error is invalid_grant.
  if (!authCode) {
    throw new BadRequestError('invalid_grant');
  }

  // Dispose early for single use.
  await deleteAuthCode(authCode.code);

  // Error example: the grant has expired, was issued to another client or redirect_uri, or the PKCE proof fails - it's
  // no longer valid for this caller and per the specification this is the same invalid_grant as a missing grant.
  if (Math.floor(Date.now() / 1000) > authCode.expiration
    || params.client_id !== authCode.clientId || params.redirect_uri !== authCode.redirectUri
    || computeChallenge(params.code_verifier) !== authCode.codeChallenge) {
    throw new BadRequestError('invalid_grant');
  }

  // Error example: the grant is valid but the requested resource isn't the audience it was bound to, so the target
  // is wrong and per RFC 8707 the error is invalid_target.
  if (params.resource !== authCode.resource) {
    throw new BadRequestError('invalid_target');
  }

  return {
    clientId: authCode.clientId,
    resource: authCode.resource,
    scope: authCode.scope,
    studentId: authCode.studentId,
  };
}

function exchangeRefreshToken(params: Record<string, string>): ExchangedClaims {
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

export async function postTokenHandler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  if (!event.body) {
    throw new Error('Missing request body');
  }

  const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  const params = Object.fromEntries(new URLSearchParams(body));
  // Strip the trailing slash Claude adds to the resource, keeping the minted and compared aud canonical.
  params.resource &&= params.resource.replace(/\/$/, '');
  console.log('postTokenParams', JSON.stringify(params));

  let claims: ExchangedClaims;
  try {
    const client = await findClient(params.client_id);

    // Error example: the client_id matches no registered client, so per the specification the error is invalid_client.
    if (!client) {
      throw new BadRequestError('invalid_client');
    }

    if (params.grant_type === 'authorization_code') {
      claims = await exchangeAuthorizationCode(params);
    } else if (params.grant_type === 'refresh_token') {
      claims = exchangeRefreshToken(params);
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
