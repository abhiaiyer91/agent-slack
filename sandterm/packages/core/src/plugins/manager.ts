/**
 * Plugin System - Extensibility for sandterm
 * 
 * Allows third-party plugins to:
 * - Add new commands
 * - Add new providers
 * - Hook into events
 * - Extend the UI
 */

import { v4 as uuid } from 'uuid';
import type { Sandterm } from '../sandterm.js';
import type { SandtermEvent } from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('plugins');

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  
  // Lifecycle hooks
  onLoad?(sandterm: Sandterm): Promise<void> | void;
  onUnload?(): Promise<void> | void;
  
  // Event hooks
  onEvent?(event: SandtermEvent, sessionId: string): void;
  onCommand?(command: string, sessionId: string): { command: string; cancel?: boolean } | void;
  onOutput?(output: string, sessionId: string): string | void;
  
  // Custom commands
  commands?: PluginCommand[];
  
  // Custom providers (added to registry)
  providers?: PluginProvider[];
  
  // UI components (for web UI)
  components?: PluginComponent[];
}

export interface PluginCommand {
  name: string;
  description: string;
  usage: string;
  execute(args: string[], sandterm: Sandterm, sessionId: string): Promise<string>;
}

export interface PluginProvider {
  id: string;
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  factory: () => any; // SandboxProvider
}

export interface PluginComponent {
  name: string;
  position: 'sidebar' | 'toolbar' | 'panel' | 'overlay';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: any; // React component
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  main: string;
  dependencies?: Record<string, string>;
}

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private sandterm: Sandterm | null = null;

  /**
   * Initialize the plugin manager with a sandterm instance
   */
  init(sandterm: Sandterm): void {
    this.sandterm = sandterm;
    logger.info('Plugin manager initialized');
  }

  /**
   * Load a plugin
   */
  async loadPlugin(plugin: Plugin): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin already loaded: ${plugin.id}`);
    }

    logger.info({ id: plugin.id, name: plugin.name }, 'Loading plugin');

    // Call onLoad hook
    if (plugin.onLoad && this.sandterm) {
      await plugin.onLoad(this.sandterm);
    }

    // Register providers
    if (plugin.providers) {
      const { providerRegistry } = await import('../providers/registry.js');
      for (const provider of plugin.providers) {
        providerRegistry.register(provider.id, provider.factory);
        logger.info({ providerId: provider.id }, 'Registered plugin provider');
      }
    }

    this.plugins.set(plugin.id, plugin);
    logger.info({ id: plugin.id }, 'Plugin loaded');
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    logger.info({ id: pluginId }, 'Unloading plugin');

    // Call onUnload hook
    if (plugin.onUnload) {
      await plugin.onUnload();
    }

    this.plugins.delete(pluginId);
  }

  /**
   * Get all loaded plugins
   */
  listPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get a plugin by ID
   */
  getPlugin(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  /**
   * Execute plugin command handlers
   */
  processCommand(command: string, sessionId: string): { command: string; cancel: boolean } {
    let processedCommand = command;
    let cancel = false;

    for (const plugin of this.plugins.values()) {
      if (plugin.onCommand) {
        const result = plugin.onCommand(processedCommand, sessionId);
        if (result) {
          processedCommand = result.command;
          if (result.cancel) {
            cancel = true;
            break;
          }
        }
      }
    }

    return { command: processedCommand, cancel };
  }

  /**
   * Execute plugin output handlers
   */
  processOutput(output: string, sessionId: string): string {
    let processedOutput = output;

    for (const plugin of this.plugins.values()) {
      if (plugin.onOutput) {
        const result = plugin.onOutput(processedOutput, sessionId);
        if (result) {
          processedOutput = result;
        }
      }
    }

    return processedOutput;
  }

  /**
   * Notify plugins of an event
   */
  notifyEvent(event: SandtermEvent, sessionId: string): void {
    for (const plugin of this.plugins.values()) {
      if (plugin.onEvent) {
        try {
          plugin.onEvent(event, sessionId);
        } catch (error) {
          logger.error({ error, plugin: plugin.id }, 'Plugin event handler error');
        }
      }
    }
  }

  /**
   * Get all plugin commands
   */
  getCommands(): PluginCommand[] {
    const commands: PluginCommand[] = [];
    for (const plugin of this.plugins.values()) {
      if (plugin.commands) {
        commands.push(...plugin.commands);
      }
    }
    return commands;
  }

  /**
   * Execute a plugin command
   */
  async executeCommand(
    commandName: string,
    args: string[],
    sessionId: string
  ): Promise<string | null> {
    for (const plugin of this.plugins.values()) {
      const command = plugin.commands?.find(c => c.name === commandName);
      if (command && this.sandterm) {
        return command.execute(args, this.sandterm, sessionId);
      }
    }
    return null;
  }

  /**
   * Get all UI components from plugins
   */
  getComponents(position?: PluginComponent['position']): PluginComponent[] {
    const components: PluginComponent[] = [];
    for (const plugin of this.plugins.values()) {
      if (plugin.components) {
        for (const component of plugin.components) {
          if (!position || component.position === position) {
            components.push(component);
          }
        }
      }
    }
    return components;
  }
}

// Singleton instance
export const pluginManager = new PluginManager();

// ============================================================================
// Example plugins
// ============================================================================

/**
 * Example: Git shortcuts plugin
 */
export const gitShortcutsPlugin: Plugin = {
  id: 'git-shortcuts',
  name: 'Git Shortcuts',
  version: '1.0.0',
  description: 'Quick git command shortcuts',
  
  commands: [
    {
      name: 'gs',
      description: 'Git status',
      usage: 'gs',
      execute: async (_args, sandterm, sessionId) => {
        await sandterm.writeToSession(sessionId, 'git status\n');
        return 'Running git status...';
      },
    },
    {
      name: 'gp',
      description: 'Git push',
      usage: 'gp',
      execute: async (_args, sandterm, sessionId) => {
        await sandterm.writeToSession(sessionId, 'git push\n');
        return 'Pushing...';
      },
    },
    {
      name: 'gaa',
      description: 'Git add all',
      usage: 'gaa',
      execute: async (_args, sandterm, sessionId) => {
        await sandterm.writeToSession(sessionId, 'git add .\n');
        return 'Staging all changes...';
      },
    },
  ],
};

/**
 * Example: Command logger plugin
 */
export const commandLoggerPlugin: Plugin = {
  id: 'command-logger',
  name: 'Command Logger',
  version: '1.0.0',
  description: 'Logs all commands to console',
  
  onCommand(command, sessionId) {
    logger.info({ command, sessionId }, 'Command executed');
    return undefined; // Don't modify
  },
};
