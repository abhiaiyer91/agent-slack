/**
 * Provider Registry - Central registry for all sandbox providers
 * 
 * This allows dynamic registration and lookup of providers,
 * making it easy to add new providers without changing core code.
 */

import type { SandboxProvider, ProviderFactory, ProviderConfig } from '../types/provider.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('provider-registry');

class ProviderRegistry {
  private providers: Map<string, ProviderFactory> = new Map();
  private instances: Map<string, SandboxProvider> = new Map();

  /**
   * Register a new provider
   */
  register(id: string, factory: ProviderFactory): void {
    if (this.providers.has(id)) {
      logger.warn({ id }, 'Provider already registered, overwriting');
    }
    this.providers.set(id, factory);
    logger.info({ id }, 'Provider registered');
  }

  /**
   * Get or create a provider instance
   */
  async get(id: string, config?: ProviderConfig): Promise<SandboxProvider> {
    // Return existing instance if available
    if (this.instances.has(id)) {
      return this.instances.get(id)!;
    }

    // Create new instance
    const factory = this.providers.get(id);
    if (!factory) {
      throw new Error(`Provider not found: ${id}. Available: ${this.list().join(', ')}`);
    }

    const provider = factory();
    
    if (config) {
      await provider.init(config);
    }

    this.instances.set(id, provider);
    return provider;
  }

  /**
   * List all registered provider IDs
   */
  list(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is registered
   */
  has(id: string): boolean {
    return this.providers.has(id);
  }

  /**
   * Clear a provider instance (for reconfiguration)
   */
  clear(id: string): void {
    this.instances.delete(id);
  }

  /**
   * Clear all provider instances
   */
  clearAll(): void {
    this.instances.clear();
  }
}

// Singleton registry
export const providerRegistry = new ProviderRegistry();

/**
 * Decorator/helper to register a provider
 */
export function registerProvider(id: string, factory: ProviderFactory): void {
  providerRegistry.register(id, factory);
}
