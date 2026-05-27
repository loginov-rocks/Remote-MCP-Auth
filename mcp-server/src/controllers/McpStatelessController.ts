import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp';
import type { Response } from 'express';

import type { McpServerFactory } from '../mcp/McpServerFactory';
import type { McpAuthenticatedRequest } from '../middlewares/McpAuthMiddleware';

interface Options {
  mcpServerFactory: McpServerFactory;
}

export class McpStatelessController {
  private readonly mcpServerFactory: McpServerFactory;

  constructor({ mcpServerFactory }: Options) {
    this.mcpServerFactory = mcpServerFactory;

    this.postMcp = this.postMcp.bind(this);
    this.getMcp = this.getMcp.bind(this);
    this.deleteMcp = this.deleteMcp.bind(this);
  }

  public async postMcp(req: McpAuthenticatedRequest, res: Response): Promise<void> {
    console.log('New Stateless Streamable transport connected');

    const transport = new StreamableHTTPServerTransport();
    const mcpServer = this.mcpServerFactory.create();

    // Fires when the underlying connection goes away, whether the response completed normally, the client dropped, or
    // an error tore it down. There is no session here, and nothing is kept in a map: the transport and server exist
    // only for this single request, so the connection ending is the end of their whole life. Closing the transport
    // covers everything - that propagates through the server's onclose, releasing its handlers and failing any pending
    // work - so there is no need to close the server on its own. Attached before connect, so cleanup still runs if
    // connect or the request handling throws.
    res.on('close', () => {
      transport.close().catch((error) => {
        console.error('Failed to close Stateless Streamable transport', error);
      });
      console.log('Stateless Streamable transport closed');
    });

    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }

  public getMcp(req: McpAuthenticatedRequest, res: Response): void {
    return this.handleSessionRequest(req, res);
  }

  public deleteMcp(req: McpAuthenticatedRequest, res: Response): void {
    return this.handleSessionRequest(req, res);
  }

  private handleSessionRequest(req: McpAuthenticatedRequest, res: Response): void {
    console.log(`Rejecting ${req.method.toUpperCase()} message: Stateless Streamable transport does not support sessions`);

    res.status(405).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Method Not Allowed: Stateless Streamable transport does not support sessions',
      },
      id: null,
    });
  };
}
