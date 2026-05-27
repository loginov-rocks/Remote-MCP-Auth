import { json, type Request, type Response, Router } from 'express';

import { PROTECTED_RESOURCE_METADATA_ROUTE, SSE_MESSAGES_ROUTE } from './constants';
import {
  mcpAuthMiddleware, mcpSseController, mcpStatelessController, mcpStreamableController, oauthController,
} from './container';

export const router = Router();

// Health check.
router.get('/', (req: Request, res: Response) => {
  res.send('OK');
});

// Streamable HTTP.
router.post('/mcp', mcpAuthMiddleware.requireAuth, json(), mcpStreamableController.postMcp);
router.get('/mcp', mcpAuthMiddleware.requireAuth, json(), mcpStreamableController.getMcp);
router.delete('/mcp', mcpAuthMiddleware.requireAuth, json(), mcpStreamableController.deleteMcp);

// Stateless Streamable HTTP.
router.post('/stateless', mcpAuthMiddleware.requireAuth, json(), mcpStatelessController.postMcp);
router.get('/stateless', mcpAuthMiddleware.requireAuth, json(), mcpStatelessController.getMcp);
router.delete('/stateless', mcpAuthMiddleware.requireAuth, json(), mcpStatelessController.deleteMcp);

// HTTP+SSE (deprecated), notice no json() middleware used here, because SSE transport reads a raw stream.
router.get('/sse', mcpAuthMiddleware.requireAuth, mcpSseController.getSse);
router.post(SSE_MESSAGES_ROUTE, mcpAuthMiddleware.requireAuth, mcpSseController.postMessages);

// Auth-related.
router.get(PROTECTED_RESOURCE_METADATA_ROUTE, oauthController.getProtectedResourceMetadata);
// Deprecated as per 2025-06-18 Authorization spec, this endpoint should be provided by the authorization server only,
// not by the MCP server. Leaving for backward compatibility.
router.get('/.well-known/oauth-authorization-server', oauthController.getAuthorizationServerMetadata);
