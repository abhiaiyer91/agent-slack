import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(8000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Default provider
  SANDTERM_PROVIDER: z.string().default('local'),

  // Provider-specific
  DAYTONA_API_KEY: z.string().optional(),
  DAYTONA_API_URL: z.string().optional(),
  E2B_API_KEY: z.string().optional(),

  // AI
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  DEFAULT_AI_PROVIDER: z.enum(['anthropic', 'openai']).default('anthropic'),

  // Features
  ENABLE_AI: z.coerce.boolean().default(true),
  ENABLE_AUTO_FIX: z.coerce.boolean().default(true),
  ENABLE_COMMAND_ANALYSIS: z.coerce.boolean().default(true),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  // Don't exit, just use defaults
}

export const env = parsed.success ? parsed.data : envSchema.parse({});

export const config_ = {
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',

  server: {
    port: env.PORT,
    host: env.HOST,
  },

  defaultProvider: env.SANDTERM_PROVIDER,

  providers: {
    daytona: {
      apiKey: env.DAYTONA_API_KEY,
      apiUrl: env.DAYTONA_API_URL,
    },
    e2b: {
      apiKey: env.E2B_API_KEY,
    },
  },

  ai: {
    anthropicKey: env.ANTHROPIC_API_KEY,
    openaiKey: env.OPENAI_API_KEY,
    defaultProvider: env.DEFAULT_AI_PROVIDER,
    hasAnthropic: !!env.ANTHROPIC_API_KEY,
    hasOpenAI: !!env.OPENAI_API_KEY,
    isConfigured: !!env.ANTHROPIC_API_KEY || !!env.OPENAI_API_KEY,
  },

  features: {
    ai: env.ENABLE_AI,
    autoFix: env.ENABLE_AUTO_FIX,
    commandAnalysis: env.ENABLE_COMMAND_ANALYSIS,
  },
} as const;
