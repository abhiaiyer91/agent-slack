import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { daytonaService, DaytonaError } from '../services/daytona.service.js';
import { WorkspaceCreateSchema, WorkspaceUpdateSchema } from '../models/workspace.js';

export const workspacesRoutes: FastifyPluginAsync = async (fastify) => {
  // List workspaces
  fastify.get('/', async (request, reply) => {
    const { page = 1, perPage = 20 } = request.query as { page?: number; perPage?: number };
    const result = await daytonaService.listWorkspaces(page, perPage);
    return {
      workspaces: result.workspaces,
      total: result.total,
      page,
      perPage,
    };
  });

  // Create workspace
  fastify.post('/', async (request, reply) => {
    try {
      const body = WorkspaceCreateSchema.parse(request.body);
      const workspace = await daytonaService.createWorkspace(body);
      reply.code(201);
      return workspace;
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400);
        return { error: 'Validation error', details: error.errors };
      }
      if (error instanceof DaytonaError) {
        reply.code(error.statusCode || 500);
        return { error: error.message };
      }
      throw error;
    }
  });

  // Get workspace
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const workspace = await daytonaService.getWorkspace(id);
    if (!workspace) {
      reply.code(404);
      return { error: `Workspace not found: ${id}` };
    }
    return workspace;
  });

  // Update workspace
  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const body = WorkspaceUpdateSchema.parse(request.body);
      const workspace = await daytonaService.updateWorkspace(id, body);
      if (!workspace) {
        reply.code(404);
        return { error: `Workspace not found: ${id}` };
      }
      return workspace;
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.code(400);
        return { error: 'Validation error', details: error.errors };
      }
      throw error;
    }
  });

  // Delete workspace
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const success = await daytonaService.deleteWorkspace(id);
      if (!success) {
        reply.code(404);
        return { error: `Workspace not found: ${id}` };
      }
      reply.code(204);
      return;
    } catch (error) {
      if (error instanceof DaytonaError) {
        reply.code(error.statusCode || 500);
        return { error: error.message };
      }
      throw error;
    }
  });

  // Start workspace
  fastify.post('/:id/start', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const workspace = await daytonaService.startWorkspace(id);
      if (!workspace) {
        reply.code(404);
        return { error: `Workspace not found: ${id}` };
      }
      return workspace;
    } catch (error) {
      if (error instanceof DaytonaError) {
        reply.code(error.statusCode || 500);
        return { error: error.message };
      }
      throw error;
    }
  });

  // Stop workspace
  fastify.post('/:id/stop', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const workspace = await daytonaService.stopWorkspace(id);
      if (!workspace) {
        reply.code(404);
        return { error: `Workspace not found: ${id}` };
      }
      return workspace;
    } catch (error) {
      if (error instanceof DaytonaError) {
        reply.code(error.statusCode || 500);
        return { error: error.message };
      }
      throw error;
    }
  });

  // Execute command
  fastify.post('/:id/exec', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { command, workingDir, timeout } = request.body as {
      command: string;
      workingDir?: string;
      timeout?: number;
    };

    if (!command) {
      reply.code(400);
      return { error: 'Command is required' };
    }

    try {
      const result = await daytonaService.executeCommand(id, command, {
        workingDir,
        timeout,
      });
      return result;
    } catch (error) {
      if (error instanceof DaytonaError) {
        reply.code(error.statusCode || 500);
        return { error: error.message };
      }
      throw error;
    }
  });
};
