import { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types';
import { NextFunction, Request, Response } from 'express';

import { TokenService } from '../services/TokenService';

interface Options {
  mcpBaseUrl: string;
  protectedResourceMetadataRoute: string;
  tokenService: TokenService;
}

export interface McpAuthenticatedRequest extends Request {
  auth?: AuthInfo;
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

  public requireAuth(req: McpAuthenticatedRequest, res: Response, next: NextFunction): void {
    const wwwAuthenticateHeader = `Bearer resource_metadata="${this.mcpBaseUrl}${this.protectedResourceMetadataRoute}"`;

    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
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

    const clientId = this.tokenService.validateToken(token);

    if (!clientId) {
      res.set('WWW-Authenticate', wwwAuthenticateHeader)
        .status(401)
        .send('Unauthorized');
      return;
    }

    req.auth = {
      clientId,
      scopes: [],
      token,
    };

    next();
  }
}
