import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

import { getAuthorizationServerMetadataHandler } from './getAuthorizationServerMetadataHandler.ts';
import { getAuthorizeHandler } from './getAuthorizeHandler.ts';
import { getHandler } from './getHandler.ts';
import { postAuthorizeHandler } from './postAuthorizeHandler.ts';
import { postRegisterHandler } from './postRegisterHandler.ts';
import { postTokenHandler } from './postTokenHandler.ts';

const routes = [
  { method: 'get', path: '/', handler: getHandler },
  { method: 'get', path: '/.well-known/oauth-authorization-server', handler: getAuthorizationServerMetadataHandler },
  { method: 'post', path: '/oauth/register', handler: postRegisterHandler },
  { method: 'get', path: '/oauth/authorize', handler: getAuthorizeHandler },
  { method: 'post', path: '/oauth/authorize', handler: postAuthorizeHandler },
  { method: 'post', path: '/oauth/token', handler: postTokenHandler },
];

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  console.log('event', JSON.stringify(event));

  const { requestContext: { http } } = event;

  const route = routes.find(({ method, path }) => (
    method === http.method.toLowerCase() && path === http.path.toLowerCase()
  ));

  if (!route) {
    console.warn('Not Found');
    return { statusCode: 404 };
  }

  try {
    const response = await route.handler(event);

    console.log('response', JSON.stringify(response));

    return response;
  } catch (error) {
    console.error('Internal Server Error', error);
    return { statusCode: 500 };
  }
};
