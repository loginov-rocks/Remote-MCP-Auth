import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types';
import type { NextFunction, Request, Response } from 'express';

import type { TokenService } from '../services/TokenService';

interface Options {
  mcpBaseUrl: string;
  protectedResourceMetadataRoute: string;
  tokenService: TokenService;
}

export interface McpAuthenticatedRequest extends Request {
  auth?: AuthInfo & {
    extra: {
      studentId: string;
    };
  };
}

export class McpAuthMiddleware {
  private readonly mcpBaseUrl: string;
  private readonly protectedResourceMetadataRoute: string;
  private readonly tokenService: TokenService;

  constructor({ mcpBaseUrl, protectedResourceMetadataRoute, tokenService }: Options) {
    this.mcpBaseUrl = mcpBaseUrl;
    this.protectedResourceMetadataRoute = protectedResourceMetadataRoute;
    this.tokenService = tokenService;

    this.requireAuth = this.requireAuth.bind(this);
  }

  /**
   * Starter for authentication implementation. The contract is fixed: req.auth must hold an AuthInfo before the
   * transport runs. Everything up to that handoff is an explicit, ordered sequence rather than a single verify
   * callback, so each new concern becomes another step in the chain instead of logic scattered across tool handlers.
   * Add stages as auth grows multi-stage: principal resolution after token validation, tenant or revocation checks,
   * role enrichment, audit events - each independently testable and ordered.
   * Alternatively, use SDK's requireBearerAuth() to outsource control.
   */
  public requireAuth(req: McpAuthenticatedRequest, res: Response, next: NextFunction): void {
    const wwwAuthenticateHeader = `Bearer resource_metadata="${this.mcpBaseUrl}${this.protectedResourceMetadataRoute}"`;

    if (!req.headers.authorization?.startsWith('Bearer ')) {
      res.set('WWW-Authenticate', wwwAuthenticateHeader)
        .status(401)
        .send('Unauthorized');
      return;
    }

    const token = req.headers.authorization.substring(7);

    if (!token) {
      res.set('WWW-Authenticate', wwwAuthenticateHeader)
        .status(401)
        .send('Unauthorized');
      return;
    }

    const validationResponse = this.tokenService.validateToken(token);

    if (!validationResponse) {
      res.set('WWW-Authenticate', wwwAuthenticateHeader)
        .status(401)
        .send('Unauthorized');
      return;
    }

    req.auth = {
      clientId: validationResponse.clientId,
      extra: {
        studentId: validationResponse.studentId,
      },
      scopes: [],
      token,
    };

    next();
  }
}
