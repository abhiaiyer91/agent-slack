import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { terminalService } from '../services/terminal.service.js';
import { TerminalSessionCreateSchema, TerminalResizeSchema } from '../models/session.js';

export const sessionsRoutes: FastifyPluginAsync = async (fastify) => {
  // List sessions
  fastify.get('/', async (request) => {
    const { workspaceId } = request.query as { workspaceId?: string };
    return terminalService.listSessions(workspaceId);
  });

  // Create session
  fastify.post('/', async (request, reply) => {
    try {
      const body = TerminalSessionCreateSchema.parse(request.body);
      const session = await terminalService.createSession(body);
      reply.code(201);
      return session;
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400);
        return { error: 'Validation error', details: error.errors };
      }
      if (error instanceof Error) {
        reply.code(400);
        return { error: error.message };
      }
      throw error;
    }
  });

  // Get session
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = await terminalService.getSession(id);
    if (!session) {
      reply.code(404);
      return { error: `Session not found: ${id}` };
    }
    return session;
  });

  // Close session
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const success = await terminalService.closeSession(id);
    if (!success) {
      reply.code(404);
      return { error: `Session not found: ${id}` };
    }
    reply.code(204);
    return;
  });

  // Resize session
  fastify.post('/:id/resize', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const { cols, rows } = TerminalResizeSchema.parse(request.body);
      await terminalService.resize(id, cols, rows);
      const session = await terminalService.getSession(id);
      return session;
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400);
        return { error: 'Validation error', details: error.errors };
      }
      if (error instanceof Error) {
        reply.code(400);
        return { error: error.message };
      }
      throw error;
    }
  });

  // Get terminal context (for AI)
  fastify.get('/:id/context', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { maxBytes = 10000 } = request.query as { maxBytes?: number };

    const session = await terminalService.getSession(id);
    if (!session) {
      reply.code(404);
      return { error: `Session not found: ${id}` };
    }

    const context = terminalService.getContext(id, maxBytes);
    return { context };
  });

  // Get command blocks
  fastify.get('/:id/blocks', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { limit = 20 } = request.query as { limit?: number };

    const session = await terminalService.getSession(id);
    if (!session) {
      reply.code(404);
      return { error: `Session not found: ${id}` };
    }

    const blocks = terminalService.getBlocks(id, limit);
    return { blocks };
  });

  // Get last block (for quick error checking)
  fastify.get('/:id/blocks/last', async (request, reply) => {
    const { id } = request.params as { id: string };

    const session = await terminalService.getSession(id);
    if (!session) {
      reply.code(404);
      return { error: `Session not found: ${id}` };
    }

    const block = terminalService.getLastBlock(id);
    return { block };
  });
};
