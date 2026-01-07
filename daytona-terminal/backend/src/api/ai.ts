import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { aiService } from '../services/ai.service.js';
import { terminalService } from '../services/terminal.service.js';
import { AICommandRequestSchema, AIAssistantType } from '../models/ai.js';

export const aiRoutes: FastifyPluginAsync = async (fastify) => {
  // List available AI assistants
  fastify.get('/assistants', async () => {
    return aiService.listAssistants();
  });

  // Get specific assistant
  fastify.get('/assistants/:type', async (request, reply) => {
    const { type } = request.params as { type: string };
    const assistant = aiService.getAssistant(type);
    if (!assistant) {
      reply.code(404);
      return { error: `Assistant not found: ${type}` };
    }
    return assistant;
  });

  // Create conversation
  fastify.post('/conversations', async (request, reply) => {
    const { sessionId, assistantType = 'claude', systemPrompt } = request.body as {
      sessionId: string;
      assistantType?: string;
      systemPrompt?: string;
    };

    if (!sessionId) {
      reply.code(400);
      return { error: 'sessionId is required' };
    }

    // Verify session exists
    const session = await terminalService.getSession(sessionId);
    if (!session) {
      reply.code(404);
      return { error: `Session not found: ${sessionId}` };
    }

    try {
      const validType = AIAssistantType.parse(assistantType);
      const conversation = await aiService.createConversation(sessionId, validType, systemPrompt);
      reply.code(201);
      return conversation;
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400);
        return { error: 'Invalid assistant type' };
      }
      throw error;
    }
  });

  // Get conversation
  fastify.get('/conversations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const conversation = await aiService.getConversation(id);
    if (!conversation) {
      reply.code(404);
      return { error: `Conversation not found: ${id}` };
    }
    return conversation;
  });

  // Send message
  fastify.post('/conversations/:id/message', async (request, reply) => {
    const { id } = request.params as { id: string };

    const conversation = await aiService.getConversation(id);
    if (!conversation) {
      reply.code(404);
      return { error: `Conversation not found: ${id}` };
    }

    try {
      const body = AICommandRequestSchema.parse(request.body);

      // Get terminal context if requested
      let terminalContext: string | undefined;
      if (body.includeTerminalContext) {
        terminalContext = terminalService.getContext(conversation.sessionId, 10000);
      }

      const response = await aiService.sendMessage(id, body, terminalContext);
      return response;
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400);
        return { error: 'Validation error', details: error.errors };
      }
      if (error instanceof Error) {
        reply.code(500);
        return { error: error.message };
      }
      throw error;
    }
  });

  // Delete conversation
  fastify.delete('/conversations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const success = await aiService.deleteConversation(id);
    if (!success) {
      reply.code(404);
      return { error: `Conversation not found: ${id}` };
    }
    reply.code(204);
    return;
  });

  // Clear conversation
  fastify.post('/conversations/:id/clear', async (request, reply) => {
    const { id } = request.params as { id: string };
    const success = await aiService.clearConversation(id);
    if (!success) {
      reply.code(404);
      return { error: `Conversation not found: ${id}` };
    }
    reply.code(204);
    return;
  });

  // Quick analyze (for inline error suggestions)
  fastify.post('/analyze', async (request, reply) => {
    const { sessionId, output } = request.body as {
      sessionId: string;
      output: string;
    };

    if (!sessionId || !output) {
      reply.code(400);
      return { error: 'sessionId and output are required' };
    }

    const result = await aiService.quickAnalyze(sessionId, output);
    return result || { suggestion: null, commands: [] };
  });

  // Get completions
  fastify.post('/completions', async (request, reply) => {
    const { sessionId, partial } = request.body as {
      sessionId: string;
      partial: string;
    };

    if (!sessionId) {
      reply.code(400);
      return { error: 'sessionId is required' };
    }

    const completions = await aiService.getCompletions(sessionId, partial || '');
    return { completions };
  });
};
