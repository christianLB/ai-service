import { z } from 'zod';

// Crypto provider enum
export const CryptoProviderEnum = z.enum(['binance', 'coinbase', 'kraken', 'cryptocom']);

// POST /crypto/config
export const cryptoConfigSchema = z.object({
  body: z.object({
    provider: CryptoProviderEnum,
    apiKey: z.string().min(1).max(256),
    secretKey: z.string().min(1).max(256),
    address: z.string().optional(),
  }),
});

// Response schemas
export const cryptoConfigResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .array(
      z.object({
        provider: CryptoProviderEnum,
        address: z.string().optional(),
        created_at: z.string(),
        updated_at: z.string(),
      })
    )
    .optional(),
  error: z.string().optional(),
});

export type CryptoConfigInput = z.infer<typeof cryptoConfigSchema>;
export type CryptoConfigResponse = z.infer<typeof cryptoConfigResponseSchema>;
