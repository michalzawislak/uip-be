import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { readFileSync } from 'fs';
import { join } from 'path';

import type { ServerConfig, AppConfig } from '@common/types';
import { GatewayService } from '@core/gateway/gateway.service';
import { registerGatewayRoutes } from '@core/gateway/gateway.controller';

/**
 * Creates and configures the Fastify application
 */
export async function createApp(config: ServerConfig): Promise<FastifyInstance> {
  // Load application configuration
  const appConfigPath = join(process.cwd(), 'config', 'app.config.json');
  const appConfig: AppConfig = JSON.parse(readFileSync(appConfigPath, 'utf-8'));

  // Create Fastify instance with logging
  const app = Fastify({
    logger: {
      level: config.logLevel || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname'
        }
      }
    },
    requestTimeout: config.requestTimeout,
    bodyLimit: config.bodyLimit,
    // Generate unique request IDs for tracking
    genReqId: () => `req_${Date.now()}_${Math.random().toString(36).substring(7)}`
  });

  // Register CORS plugin
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  });

  // Register multipart support for file uploads
  await app.register(multipart, {
    limits: {
      fileSize: appConfig.processing.maxFileSize,
      files: 10 // Max 10 files per request
    }
  });

  // Global error handler
  app.setErrorHandler((error, request, reply) => {
    request.log.error({
      err: error,
      requestId: request.id,
      url: request.url,
      method: request.method
    }, 'Request error');

    // Send appropriate error response
    const statusCode = (error as any).statusCode || 500;
    const code = (error as any).code || 'INTERNAL_ERROR';

    reply.status(statusCode).send({
      success: false,
      error: {
        code,
        message: error.message,
        requestId: request.id
      }
    });
  });

  // Health check endpoint
  app.get('/health', async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime()
    };
  });

  // Add request logging hook
  app.addHook('onRequest', async (request) => {
    request.log.info({
      requestId: request.id,
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip
    }, 'Incoming request');
  });

  // Add response logging hook
  app.addHook('onResponse', async (request, reply) => {
    request.log.info({
      requestId: request.id,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime
    }, 'Request completed');
  });

  // Initialize Gateway Service
  const gatewayService = new GatewayService();
  await gatewayService.initialize();

  // Register API routes
  await registerGatewayRoutes(app, gatewayService);

  app.log.info('Gateway routes registered');

  return app;
}
