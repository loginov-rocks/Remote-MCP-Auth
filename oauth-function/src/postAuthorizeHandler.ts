import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

import { createAuthCode } from './authCodes.ts';
import { findClient } from './clients.ts';

export async function postAuthorizeHandler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  if (!event.body) {
    throw new Error('Missing request body');
  }

  const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  const params = Object.fromEntries(new URLSearchParams(body));
  // Strip the trailing slash Claude adds to the resource, keeping the minted and compared aud canonical.
  params.resource &&= params.resource.replace(/\/$/, '');
  console.log('postAuthorizeParams', JSON.stringify(params));

  const client = await findClient(params.client_id);

  // Error example: these values come from the submitted form and aren't verified yet, so there's no trusted callback
  // to redirect to - the error is returned directly per the specification.
  if (!client || !client.redirectUris.includes(params.redirect_uri)) {
    return { statusCode: 400 };
  }

  const redirectUrl = new URL(params.redirect_uri);
  redirectUrl.searchParams.set('iss', `https://${event.requestContext.domainName}`);
  if (params.state) {
    redirectUrl.searchParams.set('state', params.state);
  }

  if (params.decision === 'deny') {
    redirectUrl.searchParams.set('error', 'access_denied');

    return {
      statusCode: 302,
      headers: { Location: redirectUrl.toString() },
    };
  }

  // Error example: student_id is out of spec, a custom field, so the response is whatever our form needs.
  if (!params.student_id) {
    return { statusCode: 400 };
  }

  // Error example: code_challenge is required by the specification, and since the client and redirect_uri are already
  // verified, the error goes back to the client via redirect.
  if (!params.code_challenge) {
    redirectUrl.searchParams.set('error', 'invalid_request');

    return {
      statusCode: 302,
      headers: { Location: redirectUrl.toString() },
    };
  }

  const authCode = await createAuthCode({
    clientId: params.client_id,
    codeChallenge: params.code_challenge,
    redirectUri: params.redirect_uri,
    resource: params.resource !== '' ? params.resource : undefined,
    scope: params.scope !== '' ? params.scope : undefined,
    studentId: params.student_id,
  });

  redirectUrl.searchParams.set('code', authCode.code);

  return {
    statusCode: 302,
    headers: { Location: redirectUrl.toString() },
  };
}
