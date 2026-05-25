export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || '';
export const AUTHORIZATION_SERVER_BASE_URL = process.env.AUTHORIZATION_SERVER_BASE_URL || '';
export const MCP_SERVER_BASE_URL = process.env.MCP_SERVER_BASE_URL || '';
export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Extracting interconnected routes to emphasize the dependencies.
export const PROTECTED_RESOURCE_METADATA_ROUTE = '/.well-known/oauth-protected-resource';
export const SSE_MESSAGES_ROUTE = '/messages';
