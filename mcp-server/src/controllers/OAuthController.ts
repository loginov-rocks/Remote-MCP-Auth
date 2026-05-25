import type { Request, Response } from 'express';

interface Options {
  authorizationServerBaseUrl: string;
  mcpServerBaseUrl: string;
}

export class OAuthController {
  private readonly authorizationServerBaseUrl: string;
  private readonly mcpServerBaseUrl: string;

  // @deprecated
  private oauthWellKnown = null;

  constructor({ authorizationServerBaseUrl, mcpServerBaseUrl }: Options) {
    this.authorizationServerBaseUrl = authorizationServerBaseUrl;
    this.mcpServerBaseUrl = mcpServerBaseUrl;

    this.getAuthorizationServerMetadata = this.getAuthorizationServerMetadata.bind(this);
    this.getProtectedResourceMetadata = this.getProtectedResourceMetadata.bind(this);
  }

  // @deprecated
  public async getAuthorizationServerMetadata(req: Request, res: Response): Promise<void> {
    let wellKnown;
    try {
      wellKnown = await this.fetchOAuthWellKnown();
    } catch (error) {
      console.error('Failed to fetch OAuth well known', error);
      res.status(500).send('Internal Server Error');
      return;
    }

    res.json(wellKnown);
  }

  public async getProtectedResourceMetadata(req: Request, res: Response): Promise<void> {
    res.json({
      resource: this.mcpServerBaseUrl,
      authorization_servers: [
        this.authorizationServerBaseUrl,
      ],
      bearer_methods_supported: [
        'header',
      ],
    });
  }

  // @deprecated
  private async fetchOAuthWellKnown() {
    if (this.oauthWellKnown) {
      return this.oauthWellKnown;
    }

    const url = `${this.authorizationServerBaseUrl}/.well-known/oauth-authorization-server`;

    let response;
    try {
      response = await fetch(url);
    } catch (error) {
      console.error(`Failed to fetch "${url}"`, error);
      throw new Error(`Failed to fetch "${url}"`);
    }

    if (!response.ok) {
      throw new Error(`Unsuccessful response from "${url}"`);
    }

    this.oauthWellKnown = await response.json();

    return this.oauthWellKnown;
  }
}
