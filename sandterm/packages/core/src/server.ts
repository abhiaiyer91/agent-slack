/**
 * Sandterm Server - Fastify-based API and WebSocket server
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import type { WebSocket } from 'ws';
import { Sandterm, createSandterm } from './sandterm.js';
import { providerRegistry } from './providers/registry.js';
import { config_, env } from './utils/config.js';
import { logger } from './utils/logger.js';
import type { SandtermEvent } from './types/index.js';

export interface ServerConfig {
  port?: number;
  host?: string;
  provider: string;
  providerConfig?: Record<string, unknown>;
}

export async function createServer(serverConfig: ServerConfig) {
  const app = Fastify({ logger: false });

  await app.register(cors, { origin: true });
  await app.register(websocket);

  // Create sandterm instance
  const sandterm = createSandterm({
    provider: serverConfig.provider,
    providerConfig: serverConfig.providerConfig,
  });
  await sandterm.init();

  // =========================================================================
  // Health & Info
  // =========================================================================

  app.get('/health', async () => ({
    status: 'healthy',
    provider: sandterm.getProviderInfo(),
    timestamp: new Date().toISOString(),
  }));

  app.get('/api/v1', async () => ({
    name: 'sandterm',
    version: '0.1.0',
    provider: sandterm.getProviderInfo(),
    providers: providerRegistry.list(),
  }));

  // =========================================================================
  // Sandbox Routes
  // =========================================================================

  app.get('/api/v1/sandboxes', async () => {
    return sandterm.listSandboxes();
  });

  app.post('/api/v1/sandboxes', async (request, reply) => {
    const body = request.body as { name: string; template?: string; env?: Record<string, string> };
    const sandbox = await sandterm.createSandbox(body);
    reply.code(201);
    return sandbox;
  });

  app.get('/api/v1/sandboxes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const sandbox = await sandterm.getSandbox(id);
    if (!sandbox) {
      reply.code(404);
      return { error: 'Sandbox not found' };
    }
    return sandbox;
  });

  app.post('/api/v1/sandboxes/:id/start', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return await sandterm.startSandbox(id);
    } catch (e) {
      reply.code(400);
      return { error: String(e) };
    }
  });

  app.post('/api/v1/sandboxes/:id/stop', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return await sandterm.stopSandbox(id);
    } catch (e) {
      reply.code(400);
      return { error: String(e) };
    }
  });

  app.delete('/api/v1/sandboxes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await sandterm.deleteSandbox(id);
    reply.code(204);
  });

  // =========================================================================
  // Session Routes
  // =========================================================================

  const sessions: Map<string, { sandboxId: string }> = new Map();

  app.post('/api/v1/sessions', async (request, reply) => {
    const { sandboxId, ...options } = request.body as { 
      sandboxId: string; 
      shell?: string; 
      cols?: number; 
      rows?: number; 
    };
    
    try {
      const session = await sandterm.createSession(sandboxId, options);
      sessions.set(session.id, { sandboxId });
      reply.code(201);
      return { ...session, websocketUrl: `/ws/terminal/${session.id}` };
    } catch (e) {
      reply.code(400);
      return { error: String(e) };
    }
  });

  app.delete('/api/v1/sessions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await sandterm.closeSession(id);
    sessions.delete(id);
    reply.code(204);
  });

  app.get('/api/v1/sessions/:id/blocks', async (request) => {
    const { id } = request.params as { id: string };
    return sandterm.getBlocks(id);
  });

  // =========================================================================
  // AI Routes
  // =========================================================================

  app.post('/api/v1/ai/chat', async (request, reply) => {
    const { sessionId, prompt } = request.body as { sessionId: string; prompt: string };
    
    try {
      const response = await sandterm.chat(sessionId, prompt);
      return response;
    } catch (e) {
      reply.code(400);
      return { error: String(e) };
    }
  });

  // =========================================================================
  // WebSocket Terminal
  // =========================================================================

  app.get('/ws/terminal/:sessionId', { websocket: true }, (socket: WebSocket, request) => {
    const { sessionId } = request.params as { sessionId: string };
    
    logger.info({ sessionId }, 'WebSocket connected');

    // Send connected message
    socket.send(JSON.stringify({ type: 'connected', sessionId }));

    // Subscribe to events
    const unsubscribe = sandterm.on(sessionId, (event: SandtermEvent) => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(event));
      }
    });

    // Handle messages
    socket.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        switch (msg.type) {
          case 'input':
            await sandterm.writeToSession(sessionId, msg.data);
            break;
          case 'resize':
            await sandterm.resizeSession(sessionId, msg.cols, msg.rows);
            break;
          case 'ping':
            socket.send(JSON.stringify({ type: 'pong' }));
            break;
        }
      } catch (e) {
        logger.error({ error: e }, 'WebSocket message error');
      }
    });

    socket.on('close', () => {
      logger.info({ sessionId }, 'WebSocket disconnected');
      unsubscribe();
    });
  });

  // =========================================================================
  // Start
  // =========================================================================

  const port = serverConfig.port || config_.server.port;
  const host = serverConfig.host || config_.server.host;

  return {
    start: async () => {
      await app.listen({ port, host });
      logger.info(`🚀 Sandterm server running at http://${host}:${port}`);
      logger.info(`   Provider: ${sandterm.getProviderInfo().name}`);
      logger.info(`   API: http://${host}:${port}/api/v1`);
      logger.info(`   WebSocket: ws://${host}:${port}/ws/terminal/{sessionId}`);
    },
    stop: async () => {
      await app.close();
    },
    app,
    sandterm,
  };
}

// CLI entrypoint - providers should be registered by the app using @sandterm/providers package
export async function startServer(): Promise<void> {
  const provider = process.env.SANDTERM_PROVIDER || 'local';
  
  const server = await createServer({
    provider,
    providerConfig: {
      apiKey: provider === 'daytona' ? env.DAYTONA_API_KEY : env.E2B_API_KEY,
      apiUrl: env.DAYTONA_API_URL,
    },
  });
  
  await server.start();
}
