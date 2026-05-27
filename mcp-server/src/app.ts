import express from 'express';

import { PORT } from './constants';
import { mcpSseController, mcpStreamableController } from './container';
import { router } from './router';

const app = express();

app.use(router);

const server = app.listen(PORT, () => {
  console.log(`MCP server started on port ${PORT}`);
});

let isShuttingDown = false;

async function shutdown(): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  console.log('Shutting down MCP server...');

  // Can be parallelized.
  await mcpSseController.closeTransports();
  await mcpStreamableController.closeTransports();

  server.close(() => {
    console.log('MCP server shutdown complete');
    process.exit(0);
  });

  server.closeAllConnections();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
