import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';

import type { McpServerFactory } from '../mcp/McpServerFactory';
import type { McpAuthenticatedRequest } from '../middlewares/McpAuthMiddleware';

interface Options {
  mcpServerFactory: McpServerFactory;
}

export class McpStreamableController {
  private readonly mcpServerFactory: McpServerFactory;

  private readonly transports: Map<string, StreamableHTTPServerTransport> = new Map();

  constructor({ mcpServerFactory }: Options) {
    this.mcpServerFactory = mcpServerFactory;

    this.postMcp = this.postMcp.bind(this);
    this.getMcp = this.getMcp.bind(this);
    this.deleteMcp = this.deleteMcp.bind(this);
  }

  public async postMcp(req: McpAuthenticatedRequest, res: Response): Promise<void> {
    if (req.headers['mcp-session-id']) {
      return this.handleSessionRequest(req, res);
    }

    if (!req.auth?.extra?.studentId) {
      res.status(401).send('Unauthorized');
      return;
    }

    if (!isInitializeRequest(req.body)) {
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided and not an initialization request',
        },
        id: null,
      });
      return;
    }

    const studentId = req.auth.extra.studentId;
    const clientId = req.auth.clientId;

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        // Composite key to bind the session ID to the student and client ID. Survives token refresh.
        const transportKey = this.createTransportKey(studentId, clientId, sessionId);
        this.transports.set(transportKey, transport);
        console.log(`New Streamable transport "${transportKey}" connected`);
      },
    });

    // Fires when the session terminates - via a client DELETE or an explicit transport close - not when any single
    // response ends. A streamable session is owned by the transport and spans many separate requests, and its event
    // stream can drop and reconnect without ending the session, so cleanup must be bound to session-level termination
    // rather than to any one connection closing. This is invoked synchronously as part of closing the transport.
    transport.onclose = () => {
      if (transport.sessionId) {
        const transportKey = this.createTransportKey(studentId, clientId, transport.sessionId);
        this.transports.delete(transportKey);
        console.log(`Streamable transport "${transportKey}" closed`);
      }
    };

    const mcpServer = this.mcpServerFactory.create();
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }

  public getMcp(req: McpAuthenticatedRequest, res: Response): Promise<void> {
    return this.handleSessionRequest(req, res);
  }

  public deleteMcp(req: McpAuthenticatedRequest, res: Response): Promise<void> {
    return this.handleSessionRequest(req, res);
  }

  /**
   * Initiates shutdown of each streamable transport. Closing a transport ends its active streams, rejects pending
   * outbound messages, and triggers session-level termination synchronously. As with SSE, this only begins disposal;
   * the underlying sockets are not guaranteed to be closed until the HTTP server completes its own shutdown.
   */
  public async closeTransports(): Promise<void> {
    for (const transport of this.transports.values()) {
      await transport.close();
    }

    this.transports.clear();
  }

  private createTransportKey(studentId: string, clientId: string, sessionId: string) {
    return JSON.stringify([studentId, clientId, sessionId]);
  }

  private async handleSessionRequest(req: McpAuthenticatedRequest, res: Response): Promise<void> {
    if (!req.auth?.extra?.studentId) {
      res.status(401).send('Unauthorized');
      return;
    }

    const sessionId = req.headers['mcp-session-id'];

    if (!sessionId || typeof sessionId !== 'string') {
      res.status(400).send('Missing or invalid session ID');
      return;
    }

    const transportKey = this.createTransportKey(req.auth.extra.studentId, req.auth.clientId, sessionId);
    const transport = this.transports.get(transportKey);

    if (!transport) {
      res.status(404).send(`No Streamable transport found for session "${sessionId}"`);
      return;
    }

    const method = req.method.toUpperCase();

    console.log(`Routing ${method} message to Streamable transport "${transportKey}"`);

    if (method === 'POST') {
      await transport.handleRequest(req, res, req.body);
    } else {
      await transport.handleRequest(req, res);
    }
  };
}
