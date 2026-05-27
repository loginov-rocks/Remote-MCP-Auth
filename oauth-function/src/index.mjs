import { getAuthorizationServerMetadataHandler } from './getAuthorizationServerMetadataHandler.mjs';
import { getAuthorizeHandler } from './getAuthorizeHandler.mjs';
import { getHandler } from './getHandler.mjs';
import { postAuthorizeHandler } from './postAuthorizeHandler.mjs';
import { postRegisterHandler } from './postRegisterHandler.mjs';
import { postTokenHandler } from './postTokenHandler.mjs';

const routes = [
  { method: 'get', path: '/', handler: getHandler },
  { method: 'get', path: '/.well-known/oauth-authorization-server', handler: getAuthorizationServerMetadataHandler },
  { method: 'post', path: '/oauth/register', handler: postRegisterHandler },
  { method: 'get', path: '/oauth/authorize', handler: getAuthorizeHandler },
  { method: 'post', path: '/oauth/authorize', handler: postAuthorizeHandler },
  { method: 'post', path: '/oauth/token', handler: postTokenHandler },
];

export const handler = async (event) => {
  console.log('event', JSON.stringify(event));

  const { requestContext: { http } } = event;

  const route = routes.find(({ method, path }) => (
    method === http.method.toLowerCase() && path === http.path.toLowerCase()
  ));

  if (!route) {
    console.error('Route not found');
    return { statusCode: 404 };
  }

  try {
    const response = await route.handler(event);

    console.log('response', JSON.stringify(response));

    return response;
  } catch (error) {
    console.error('An error was thrown when executing the handler:', error);
    return { statusCode: 500 };
  }
};
