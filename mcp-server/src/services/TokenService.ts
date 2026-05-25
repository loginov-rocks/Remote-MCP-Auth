import { type JwtPayload, verify } from 'jsonwebtoken';

interface Options {
  accessTokenSecret: string;
  authorizationServerBaseUrl: string;
  mcpServerBaseUrl: string;
}

interface VerifiedToken {
  clientId: string;
  expiresAt: number;
  scopes: string[];
  studentId: string;
}

export class TokenService {
  private readonly accessTokenSecret: string;
  private readonly authorizationServerBaseUrl: string;
  private readonly mcpServerBaseUrl: string;

  constructor({ accessTokenSecret, authorizationServerBaseUrl, mcpServerBaseUrl }: Options) {
    this.accessTokenSecret = accessTokenSecret;
    this.authorizationServerBaseUrl = authorizationServerBaseUrl;
    this.mcpServerBaseUrl = mcpServerBaseUrl;
  }

  public verifyToken(token: string): VerifiedToken | null {
    let decoded;
    try {
      decoded = verify(token, this.accessTokenSecret, {
        algorithms: ['HS256'],
        audience: this.mcpServerBaseUrl,
        issuer: this.authorizationServerBaseUrl,
      }) as JwtPayload;
    } catch {
      return null;
    }

    if (!decoded.client_id || !decoded.exp || !decoded.sub) {
      return null;
    }

    return {
      clientId: decoded.client_id,
      expiresAt: decoded.exp,
      scopes: decoded.scope ? decoded.scope.split(' ') : [],
      studentId: decoded.sub,
    };
  }
}
