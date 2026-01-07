/**
 * @sandterm/providers - Built-in sandbox providers
 * 
 * Includes:
 * - Local: Run sandboxes locally using node-pty
 * - Daytona: Cloud workspaces using Daytona.io
 * - E2B: Cloud sandboxes using E2B (e2b.dev)
 * 
 * Each provider implements the SandboxProvider interface from @sandterm/core
 */

export { LocalProvider, createLocalProvider } from './local/index.js';
export { DaytonaProvider, createDaytonaProvider } from './daytona/index.js';
export { E2BProvider, createE2BProvider } from './e2b/index.js';

// Re-export types
export type { DaytonaProviderConfig } from './daytona/index.js';
export type { E2BProviderConfig } from './e2b/index.js';

// Provider registration helper
import { createLocalProvider } from './local/index.js';
import { createDaytonaProvider } from './daytona/index.js';
import { createE2BProvider } from './e2b/index.js';

/**
 * All built-in providers
 */
export const builtinProviders = {
  local: createLocalProvider,
  daytona: createDaytonaProvider,
  e2b: createE2BProvider,
} as const;

export type BuiltinProviderId = keyof typeof builtinProviders;
