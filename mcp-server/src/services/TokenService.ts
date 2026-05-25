import { type JwtPayload, verify } from 'jsonwebtoken';

interface Options {
  accessTokenSecret: string;
  mcpBaseUrl: string;
  oauthApiBaseUrl: string;
}

interface VerifiedToken {
  clientId: string;
  expiresAt: number;
  scopes: string[];
  studentId: string;
}

export class TokenService {
  private readonly accessTokenSecret: string;
  private readonly mcpBaseUrl: string;
  private readonly oauthApiBaseUrl: string;

  constructor({ accessTokenSecret, mcpBaseUrl, oauthApiBaseUrl }: Options) {
    this.accessTokenSecret = accessTokenSecret;
    this.mcpBaseUrl = mcpBaseUrl;
    this.oauthApiBaseUrl = oauthApiBaseUrl;
  }

  public verifyToken(token: string): VerifiedToken | null {
    let decoded;
    try {
      decoded = verify(token, this.accessTokenSecret, {
        algorithms: ['HS256'],
        audience: this.mcpBaseUrl,
        issuer: this.oauthApiBaseUrl,
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
