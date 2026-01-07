import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { config_ } from './utils/config.js';
import { logger } from './utils/logger.js';
import { workspacesRoutes, sessionsRoutes, aiRoutes, websocketRoutes } from './api/index.js';

const app = Fastify({
  logger: false, // We use our own logger
});

// Register plugins
await app.register(cors, {
  origin: true,
  credentials: true,
});

await app.register(websocket, {
  options: {
    maxPayload: config_.websocket.maxMessageSize,
  },
});

// Health check
app.get('/health', async () => ({
  status: 'healthy',
  app: 'Daytona Terminal',
  version: '0.1.0',
  environment: config_.isDev ? 'development' : 'production',
  timestamp: new Date().toISOString(),
}));

// API info
app.get('/api/v1', async () => ({
  name: 'Daytona Terminal API',
  version: '0.1.0',
  endpoints: {
    workspaces: '/api/v1/workspaces',
    sessions: '/api/v1/sessions',
    ai: '/api/v1/ai',
    websocket: '/ws/terminal/{sessionId}',
  },
  integrations: {
    daytona: config_.daytona.isConfigured,
    claude: config_.ai.hasAnthropic,
    openai: config_.ai.hasOpenAI,
  },
  features: {
    predictiveCommands: config_.features.predictiveCommands,
    autoFix: config_.features.autoFix,
    commandAnalysis: config_.features.commandAnalysis,
  },
}));

// Register API routes
app.register(workspacesRoutes, { prefix: '/api/v1/workspaces' });
app.register(sessionsRoutes, { prefix: '/api/v1/sessions' });
app.register(aiRoutes, { prefix: '/api/v1/ai' });

// Register WebSocket routes
app.register(websocketRoutes, { prefix: '/ws' });

// Global error handler
app.setErrorHandler((error, request, reply) => {
  logger.error({ error, url: request.url }, 'Unhandled error');
  reply.code(500).send({ error: 'Internal server error' });
});

// Start server
const start = async () => {
  try {
    logger.info('🚀 Starting Daytona Terminal...');
    logger.info(`   Environment: ${config_.isDev ? 'development' : 'production'}`);
    logger.info(`   Daytona: ${config_.daytona.isConfigured ? '✓ configured' : '○ local mode'}`);
    logger.info(`   Claude: ${config_.ai.hasAnthropic ? '✓ enabled' : '○ not configured'}`);
    logger.info(`   OpenAI: ${config_.ai.hasOpenAI ? '✓ enabled' : '○ not configured'}`);
    logger.info(`   Auto-fix: ${config_.features.autoFix ? '✓ enabled' : '○ disabled'}`);
    logger.info(`   Predictive: ${config_.features.predictiveCommands ? '✓ enabled' : '○ disabled'}`);

    await app.listen({
      port: config_.server.port,
      host: config_.server.host,
    });

    logger.info(`✨ Server running at http://${config_.server.host}:${config_.server.port}`);
    logger.info(`   API: http://localhost:${config_.server.port}/api/v1`);
    logger.info(`   WebSocket: ws://localhost:${config_.server.port}/ws/terminal/{sessionId}`);
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down...');
  await app.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();
