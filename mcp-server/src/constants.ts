export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || '';
export const MCP_BASE_URL = process.env.MCP_BASE_URL || '';
export const OAUTH_API_BASE_URL = process.env.OAUTH_API_BASE_URL || '';
export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Extracting interconnected routes to emphasize the dependencies.
export const PROTECTED_RESOURCE_METADATA_ROUTE = '/.well-known/oauth-protected-resource';
export const SSE_MESSAGES_ROUTE = '/messages';
