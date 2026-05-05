import { z } from 'zod';
import { config } from 'dotenv';

// Load environment variables from .env file if present
config();

const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error("Invalid environment variables:");
  console.error(parseResult.error.format());
  process.exit(1);
}

export const env = parseResult.data;
