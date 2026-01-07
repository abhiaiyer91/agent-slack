import type { FastifyPluginAsync } from 'fastify';
import type { WebSocket } from 'ws';
import { terminalService } from '../services/terminal.service.js';
import { aiService } from '../services/ai.service.js';
import { createLogger } from '../utils/logger.js';
import { config_ } from '../utils/config.js';

const logger = createLogger('websocket');

interface WSMessage {
  type: 'input' | 'resize' | 'ping' | 'analyze' | 'complete';
  data?: string;
  cols?: number;
  rows?: number;
}

interface WSOutMessage {
  type: 'output' | 'connected' | 'disconnected' | 'error' | 'pong' | 'block' | 'suggestion' | 'completions';
  data?: string;
  sessionId?: string;
  message?: string;
  block?: unknown;
  suggestion?: { text: string; commands: string[] };
  completions?: string[];
}

export const websocketRoutes: FastifyPluginAsync = async (fastify) => {
  // Terminal WebSocket
  fastify.get('/terminal/:sessionId', { websocket: true }, async (socket: WebSocket, request) => {
    const { sessionId } = request.params as { sessionId: string };
    
    logger.info({ sessionId }, 'WebSocket connection attempt');

    // Verify session exists
    const session = await terminalService.getSession(sessionId);
    if (!session) {
      const errorMsg: WSOutMessage = { type: 'error', message: 'Session not found' };
      socket.send(JSON.stringify(errorMsg));
      socket.close(4004, 'Session not found');
      return;
    }

    // Send connected message
    const connectedMsg: WSOutMessage = { type: 'connected', sessionId };
    socket.send(JSON.stringify(connectedMsg));
    logger.info({ sessionId }, 'WebSocket connected');

    // Subscribe to terminal output
    const unsubscribeOutput = terminalService.onOutput(sessionId, (data) => {
      if (socket.readyState === socket.OPEN) {
        const msg: WSOutMessage = { type: 'output', data };
        socket.send(JSON.stringify(msg));
      }
    });

    // Subscribe to command blocks (for error detection)
    const unsubscribeBlocks = terminalService.onBlock(sessionId, (block) => {
      if (socket.readyState === socket.OPEN) {
        const msg: WSOutMessage = { type: 'block', block };
        socket.send(JSON.stringify(msg));

        // If block has error, send auto-suggestion
        if (block.analysis?.hasError && config_.features.autoFix) {
          aiService.quickAnalyze(sessionId, block.output).then((result) => {
            if (result && socket.readyState === socket.OPEN) {
              const suggestionMsg: WSOutMessage = {
                type: 'suggestion',
                suggestion: { text: result.suggestion, commands: result.commands },
              };
              socket.send(JSON.stringify(suggestionMsg));
            }
          }).catch(() => {});
        }
      }
    });

    // Heartbeat
    const heartbeatInterval = setInterval(() => {
      if (socket.readyState === socket.OPEN) {
        socket.ping();
      }
    }, config_.websocket.heartbeatInterval);

    // Handle messages
    socket.on('message', async (rawData) => {
      try {
        const message: WSMessage = JSON.parse(rawData.toString());

        switch (message.type) {
          case 'input':
            if (message.data) {
              await terminalService.write(sessionId, message.data);
            }
            break;

          case 'resize':
            if (message.cols && message.rows) {
              await terminalService.resize(sessionId, message.cols, message.rows);
            }
            break;

          case 'ping':
            socket.send(JSON.stringify({ type: 'pong' }));
            break;

          case 'analyze':
            // Manual analyze request
            if (message.data) {
              const result = await aiService.quickAnalyze(sessionId, message.data);
              if (result) {
                const msg: WSOutMessage = {
                  type: 'suggestion',
                  suggestion: { text: result.suggestion, commands: result.commands },
                };
                socket.send(JSON.stringify(msg));
              }
            }
            break;

          case 'complete':
            // Get AI completions
            if (config_.features.predictiveCommands) {
              const completions = await aiService.getCompletions(sessionId, message.data || '');
              const msg: WSOutMessage = { type: 'completions', completions };
              socket.send(JSON.stringify(msg));
            }
            break;

          default:
            logger.warn({ type: message.type }, 'Unknown message type');
        }
      } catch (error) {
        logger.error({ error }, 'Failed to handle WebSocket message');
      }
    });

    // Handle close
    socket.on('close', () => {
      logger.info({ sessionId }, 'WebSocket disconnected');
      clearInterval(heartbeatInterval);
      unsubscribeOutput();
      unsubscribeBlocks();
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error({ error, sessionId }, 'WebSocket error');
    });
  });

  // Health check WebSocket
  fastify.get('/health', { websocket: true }, (socket: WebSocket) => {
    socket.send(JSON.stringify({ status: 'ok' }));
    socket.close();
  });
};
