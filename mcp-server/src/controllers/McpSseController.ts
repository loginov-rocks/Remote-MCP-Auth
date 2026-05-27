import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse';
import type { Response } from 'express';

import type { McpServerFactory } from '../mcp/McpServerFactory';
import type { McpAuthenticatedRequest } from '../middlewares/McpAuthMiddleware';

interface Options {
  mcpServerFactory: McpServerFactory;
  sseMessagesRoute: string;
}

export class McpSseController {
  private readonly mcpServerFactory: McpServerFactory;
  private readonly sseMessagesRoute: string;

  private readonly transports: Map<string, SSEServerTransport> = new Map();

  constructor({ mcpServerFactory, sseMessagesRoute }: Options) {
    this.mcpServerFactory = mcpServerFactory;
    this.sseMessagesRoute = sseMessagesRoute;

    this.getSse = this.getSse.bind(this);
    this.postMessages = this.postMessages.bind(this);
  }

  public async getSse(req: McpAuthenticatedRequest, res: Response): Promise<void> {
    if (!req.auth?.extra?.studentId) {
      res.status(401).send('Unauthorized');
      return;
    }

    const transport = new SSEServerTransport(this.sseMessagesRoute, res);
    // Composite key to bind the session ID to the student and client ID. Survives token refresh.
    const transportKey = this.createTransportKey(req.auth.extra.studentId, req.auth.clientId, transport.sessionId);

    this.transports.set(transportKey, transport);

    // Fires when the underlying connection is actually torn down, regardless of whether the client disconnected or the
    // response was ended from the server side. In SSE, a session corresponds to this one long-lived response, so this
    // is the authoritative point at which the connection is gone - making the response-close event, not the transport,
    // the correct place to drop the session.
    res.on('close', () => {
      this.transports.delete(transportKey);
      console.log(`SSE transport "${transportKey}" closed`);
    });

    const mcpServer = this.mcpServerFactory.create();
    await mcpServer.connect(transport);

    console.log(`New SSE transport "${transportKey}" connected`);
  }

  public async postMessages(req: McpAuthenticatedRequest, res: Response): Promise<void> {
    if (!req.auth?.extra?.studentId) {
      res.status(401).send('Unauthorized');
      return;
    }

    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== 'string') {
      res.status(400).send('Missing or invalid session ID');
      return;
    }

    const transportKey = this.createTransportKey(req.auth.extra.studentId, req.auth.clientId, sessionId);
    const transport = this.transports.get(transportKey);

    if (!transport) {
      res.status(404).send(`No SSE transport found for session "${sessionId}"`);
      return;
    }

    console.log(`Routing POST message to SSE transport "${transportKey}"`);

    await transport.handlePostMessage(req, res);
  }

  /**
   * Initiates shutdown of each SSE transport by ending its response, which signals the stream to close and rejects any
   * pending outbound messages. This only starts disposal: it does not block until the OS sockets are gone. Final
   * socket teardown happens on a later tick and is gated by the HTTP server's own shutdown, not by this method
   * returning.
   */
  public async closeTransports(): Promise<void> {
    // Can be parallelized.
    for (const transport of this.transports.values()) {
      try {
        await transport.close();
      } catch (error) {
        console.error(`Failed to close SSE transport with session ID "${transport.sessionId}"`, error);
      }
    }

    this.transports.clear();
  }

  private createTransportKey(studentId: string, clientId: string, sessionId: string) {
    return JSON.stringify([studentId, clientId, sessionId]);
  }
}
