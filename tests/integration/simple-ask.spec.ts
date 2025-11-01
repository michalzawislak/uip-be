import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../../src/app';
import type { FastifyInstance } from 'fastify';

describe('Simple ASK Integration Test', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key';
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key';
    
    app = await createApp({
      port: 3001,
      host: '0.0.0.0',
      requestTimeout: 60000,
      bodyLimit: 10 * 1024 * 1024,
      logLevel: 'error'
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('should process simple question successfully', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/process',
      payload: {
        instruction: 'What is 2+2?',
        llm_config: 'CLAUDE_FAST'
      }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.message).toBeDefined();
    expect(body.result).toBeDefined();
    expect(body.metadata.toolsUsed).toContain('simple-ask');
  });

  it('should return error for missing instruction', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/process',
      payload: {}
    });

    expect(response.statusCode).toBe(400);
  });

  it('should list available tools', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/tools'
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.tools).toBeDefined();
    expect(Array.isArray(body.tools)).toBe(true);
    expect(body.tools.length).toBeGreaterThan(0);
  });
});

