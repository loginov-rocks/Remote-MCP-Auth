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

  public async closeTransports(): Promise<void> {
    for (const transport of this.transports.values()) {
      await transport.close();
    }

    this.transports.clear();
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

    res.on('close', () => {
      console.log(`SSE transport "${transportKey}" closed`);
      this.transports.delete(transportKey);
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
      res.status(404).send(`No transport found for session "${sessionId}"`);
      return;
    }

    console.log(`Routing POST message to transport "${transportKey}"`);

    await transport.handlePostMessage(req, res);
  }

  private createTransportKey(studentId: string, clientId: string, sessionId: string) {
    return JSON.stringify([studentId, clientId, sessionId]);
  }
}
