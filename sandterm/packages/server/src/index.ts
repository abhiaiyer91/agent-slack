#!/usr/bin/env node

/**
 * sandterm server - Start the sandterm API server
 */

import { createServer, providerRegistry, env } from '@sandterm/core';
import { 
  createLocalProvider, 
  createDaytonaProvider, 
  createE2BProvider 
} from '@sandterm/providers';

async function main() {
  const provider = process.env.SANDTERM_PROVIDER || 'local';

  // Register all built-in providers
  providerRegistry.register('local', createLocalProvider);
  providerRegistry.register('daytona', createDaytonaProvider);
  providerRegistry.register('e2b', createE2BProvider);

  console.log(`📦 Registered providers: ${providerRegistry.list().join(', ')}`);

  const server = await createServer({
    provider,
    providerConfig: {
      apiKey: provider === 'daytona' ? env.DAYTONA_API_KEY : env.E2B_API_KEY,
      apiUrl: env.DAYTONA_API_URL,
    },
  });

  await server.start();
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
