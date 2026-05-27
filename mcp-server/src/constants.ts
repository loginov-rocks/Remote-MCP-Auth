function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable "${name}"`);
  }

  return value;
}

export const ACCESS_TOKEN_SECRET = requireEnv('ACCESS_TOKEN_SECRET');
export const AUTHORIZATION_SERVER_BASE_URL = requireEnv('AUTHORIZATION_SERVER_BASE_URL');
export const MCP_SERVER_BASE_URL = requireEnv('MCP_SERVER_BASE_URL');
export const PORT = parseInt(requireEnv('PORT'), 10);

// Extracting interconnected routes to emphasize the dependencies.
export const PROTECTED_RESOURCE_METADATA_ROUTE = '/.well-known/oauth-protected-resource';
export const SSE_MESSAGES_ROUTE = '/messages';
