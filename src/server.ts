import * as dotenv from 'dotenv';

import { createApp } from './app.js';
import type { ServerConfig } from '@common/types';

// Load environment variables
dotenv.config();

/**
 * Server entry point
 */
async function start(): Promise<void> {
  try {
    // Build server configuration from environment variables
    const config: ServerConfig = {
      port: parseInt(process.env.PORT || '3000', 10),
      host: process.env.HOST || '0.0.0.0',
      requestTimeout: parseInt(process.env.REQUEST_TIMEOUT_MS || '60000', 10),
      bodyLimit: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10) * 1024 * 1024, // Convert MB to bytes
      logLevel: process.env.LOG_LEVEL || 'info'
    };

    // Create and configure Fastify app
    const app = await createApp(config);

    // Start server
    await app.listen({ port: config.port, host: config.host });

    app.log.info(
      `🚀 Server listening on http://${config.host}:${config.port}`
    );
    app.log.info(
      `📝 Health check available at http://${config.host}:${config.port}/health`
    );
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing server gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing server gracefully');
  process.exit(0);
});

// Start the server
start();
