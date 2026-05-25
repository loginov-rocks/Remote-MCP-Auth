import { json, Request, Response, Router } from 'express';

import { PROTECTED_RESOURCE_METADATA_ROUTE, SSE_MESSAGES_ROUTE } from './constants';
import { mcpAuthMiddleware, mcpSseController, mcpStreamableController, oauthController } from './container';

export const router = Router();

// Health check.
router.get('/', (req: Request, res: Response) => {
  res.send('OK');
});

// SSE.
router.get('/sse', mcpAuthMiddleware.requireAuth, mcpSseController.getSse);
router.post(SSE_MESSAGES_ROUTE, mcpAuthMiddleware.requireAuth, mcpSseController.postMessages);

// Streamable HTTP.
router.post('/mcp', mcpAuthMiddleware.requireAuth, json(), mcpStreamableController.postMcp);
router.get('/mcp', mcpAuthMiddleware.requireAuth, json(), mcpStreamableController.getMcp);
router.delete('/mcp', mcpAuthMiddleware.requireAuth, json(), mcpStreamableController.deleteMcp);

// Auth-related.
router.get(PROTECTED_RESOURCE_METADATA_ROUTE, oauthController.getProtectedResourceMetadata);
// Deprecated as per 2025-06-18 Authorization spec, this endpoint should be provided by the authorization server, not
// by the MCP server. Leaving for backward compatibility.
router.get('/.well-known/oauth-authorization-server', oauthController.getAuthorizationServerMetadata);
