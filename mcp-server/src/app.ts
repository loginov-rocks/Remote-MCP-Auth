import express from 'express';

import { PORT } from './constants';
import { mcpSseController } from './container';
import { router } from './router';

const app = express();

app.use(router);

const server = app.listen(PORT, () => {
  console.log(`App started on port ${PORT}`);
});

async function shutdown(): Promise<void> {
  console.log('Shutting down server...');

  await mcpSseController.closeTransports();

  server.close(() => {
    console.log('Server shutdown complete');
    process.exit(0);
  });

  server.closeAllConnections();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
