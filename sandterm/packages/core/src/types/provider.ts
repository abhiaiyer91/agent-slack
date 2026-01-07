/**
 * Provider Interface - The contract that ALL sandbox providers must implement
 * 
 * This is the core abstraction that makes sandterm provider-agnostic.
 * Implement this interface to add support for any sandbox provider:
 * - Daytona
 * - E2B
 * - CodeSandbox
 * - Gitpod
 * - Fly.io
 * - Docker
 * - Local
 * - Your own!
 */

import type { Sandbox, SandboxCreateOptions, TerminalSession, TerminalSessionOptions } from './index.js';

export interface SandboxProvider {
  /**
   * Unique identifier for this provider
   * @example 'daytona', 'e2b', 'local'
   */
  readonly id: string;

  /**
   * Human-readable name
   * @example 'Daytona.io', 'E2B', 'Local Docker'
   */
  readonly name: string;

  /**
   * Provider description
   */
  readonly description: string;

  /**
   * Initialize the provider with configuration
   */
  init(config: ProviderConfig): Promise<void>;

  /**
   * Check if provider is properly configured and ready
   */
  isReady(): boolean;

  // =========================================================================
  // Sandbox Lifecycle
  // =========================================================================

  /**
   * Create a new sandbox environment
   */
  createSandbox(options: SandboxCreateOptions): Promise<Sandbox>;

  /**
   * Get a sandbox by ID
   */
  getSandbox(id: string): Promise<Sandbox | null>;

  /**
   * List all sandboxes
   */
  listSandboxes(): Promise<Sandbox[]>;

  /**
   * Start a stopped sandbox
   */
  startSandbox(id: string): Promise<Sandbox>;

  /**
   * Stop a running sandbox
   */
  stopSandbox(id: string): Promise<Sandbox>;

  /**
   * Delete a sandbox
   */
  deleteSandbox(id: string): Promise<void>;

  // =========================================================================
  // Terminal Operations
  // =========================================================================

  /**
   * Create a terminal session in a sandbox
   */
  createSession(sandboxId: string, options?: TerminalSessionOptions): Promise<TerminalSession>;

  /**
   * Write data to a terminal session
   */
  writeToSession(sessionId: string, data: string): Promise<void>;

  /**
   * Resize a terminal session
   */
  resizeSession(sessionId: string, cols: number, rows: number): Promise<void>;

  /**
   * Close a terminal session
   */
  closeSession(sessionId: string): Promise<void>;

  /**
   * Subscribe to terminal output
   * @returns Unsubscribe function
   */
  onSessionOutput(sessionId: string, handler: (data: string) => void): () => void;

  // =========================================================================
  // Command Execution (Optional - for providers that support direct exec)
  // =========================================================================

  /**
   * Execute a command directly (without interactive terminal)
   */
  exec?(sandboxId: string, command: string, options?: ExecOptions): Promise<ExecResult>;
}

export interface ProviderConfig {
  /**
   * API key or token for authentication
   */
  apiKey?: string;

  /**
   * API base URL (for self-hosted or custom endpoints)
   */
  apiUrl?: string;

  /**
   * Provider-specific options
   */
  [key: string]: unknown;
}

export interface ExecOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Provider factory function type
 */
export type ProviderFactory = () => SandboxProvider;

/**
 * Provider registration
 */
export interface ProviderRegistration {
  id: string;
  factory: ProviderFactory;
}
