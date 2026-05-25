import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types';
import type { NextFunction, Request, Response } from 'express';

import type { StudentService } from '../services/StudentService';
import type { TokenService } from '../services/TokenService';

interface Options {
  mcpServerBaseUrl: string;
  protectedResourceMetadataRoute: string;
  studentService: StudentService;
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
  private readonly mcpServerBaseUrl: string;
  private readonly protectedResourceMetadataRoute: string;
  private readonly studentService: StudentService;
  private readonly tokenService: TokenService;

  constructor({ mcpServerBaseUrl, protectedResourceMetadataRoute, studentService, tokenService }: Options) {
    this.mcpServerBaseUrl = mcpServerBaseUrl;
    this.protectedResourceMetadataRoute = protectedResourceMetadataRoute;
    this.studentService = studentService;
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
    const wwwAuthenticateHeader = `Bearer resource_metadata="${this.mcpServerBaseUrl}${this.protectedResourceMetadataRoute}"`;

    if (!req.headers.authorization?.startsWith('Bearer ')) {
      res.set('WWW-Authenticate', wwwAuthenticateHeader).status(401).send('Unauthorized');
      return;
    }

    const token = req.headers.authorization.substring(7);

    if (!token) {
      res.set('WWW-Authenticate', wwwAuthenticateHeader).status(401).send('Unauthorized');
      return;
    }

    const verifiedToken = this.tokenService.verifyToken(token);

    if (!verifiedToken) {
      res.set('WWW-Authenticate', wwwAuthenticateHeader).status(401).send('Unauthorized');
      return;
    }

    const student = this.studentService.getStudent(verifiedToken.studentId);

    if (!student) {
      res.set('WWW-Authenticate', wwwAuthenticateHeader).status(401).send('Unauthorized');
      return;
    }

    req.auth = {
      token,
      clientId: verifiedToken.clientId,
      scopes: verifiedToken.scopes,
      expiresAt: verifiedToken.expiresAt,
      extra: {
        studentId: student.studentId,
      },
    };

    next();
  }
}
