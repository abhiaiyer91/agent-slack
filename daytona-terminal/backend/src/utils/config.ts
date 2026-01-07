import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(8000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Daytona
  DAYTONA_API_URL: z.string().url().default('https://api.daytona.io'),
  DAYTONA_API_KEY: z.string().optional(),
  DAYTONA_DEFAULT_IMAGE: z.string().default('daytonaio/workspace:latest'),
  DAYTONA_WORKSPACE_TIMEOUT: z.coerce.number().default(3600),

  // AI - Multi-model support
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  
  // Default AI model
  DEFAULT_AI_MODEL: z.string().default('claude-sonnet-4-20250514'),

  // Terminal
  TERMINAL_DEFAULT_SHELL: z.string().default('/bin/bash'),
  TERMINAL_DEFAULT_COLS: z.coerce.number().default(120),
  TERMINAL_DEFAULT_ROWS: z.coerce.number().default(40),
  TERMINAL_SCROLLBACK: z.coerce.number().default(10000),

  // WebSocket
  WS_HEARTBEAT_INTERVAL: z.coerce.number().default(30000),
  WS_MAX_MESSAGE_SIZE: z.coerce.number().default(1048576),

  // Features
  ENABLE_PREDICTIVE_COMMANDS: z.coerce.boolean().default(true),
  ENABLE_AUTO_FIX: z.coerce.boolean().default(true),
  ENABLE_COMMAND_ANALYSIS: z.coerce.boolean().default(true),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const config_ = {
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
  
  server: {
    port: env.PORT,
    host: env.HOST,
  },

  daytona: {
    apiUrl: env.DAYTONA_API_URL,
    apiKey: env.DAYTONA_API_KEY,
    defaultImage: env.DAYTONA_DEFAULT_IMAGE,
    workspaceTimeout: env.DAYTONA_WORKSPACE_TIMEOUT,
    isConfigured: !!env.DAYTONA_API_KEY,
  },

  ai: {
    anthropicKey: env.ANTHROPIC_API_KEY,
    openaiKey: env.OPENAI_API_KEY,
    defaultModel: env.DEFAULT_AI_MODEL,
    hasAnthropic: !!env.ANTHROPIC_API_KEY,
    hasOpenAI: !!env.OPENAI_API_KEY,
    isConfigured: !!env.ANTHROPIC_API_KEY || !!env.OPENAI_API_KEY,
  },

  terminal: {
    defaultShell: env.TERMINAL_DEFAULT_SHELL,
    defaultCols: env.TERMINAL_DEFAULT_COLS,
    defaultRows: env.TERMINAL_DEFAULT_ROWS,
    scrollback: env.TERMINAL_SCROLLBACK,
  },

  websocket: {
    heartbeatInterval: env.WS_HEARTBEAT_INTERVAL,
    maxMessageSize: env.WS_MAX_MESSAGE_SIZE,
  },

  features: {
    predictiveCommands: env.ENABLE_PREDICTIVE_COMMANDS,
    autoFix: env.ENABLE_AUTO_FIX,
    commandAnalysis: env.ENABLE_COMMAND_ANALYSIS,
  },
} as const;

export type Config = typeof config_;
