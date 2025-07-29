import { z } from 'zod';
import { WebhookEventType } from './response.types';

// Webhook configuration schema
export const webhookConfigSchema = z.object({
  id: z.string().uuid().optional(),
  url: z.string().url(),
  events: z.array(z.nativeEnum(WebhookEventType)).min(1),
  secret: z.string().min(16).optional(),
  isActive: z.boolean().default(true),
  headers: z.record(z.string()).optional(),
  retryPolicy: z.object({
    maxRetries: z.number().int().min(0).max(5).default(3),
    retryDelayMs: z.number().int().min(1000).default(5000),
    backoffMultiplier: z.number().min(1).max(3).default(2)
  }).optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

// Create webhook schema
export const createWebhookSchema = webhookConfigSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Update webhook schema
export const updateWebhookSchema = webhookConfigSchema.partial().omit({
  id: true,
  createdAt: true
});

// Webhook delivery status
export const WebhookDeliveryStatus = z.enum(['pending', 'success', 'failed', 'retrying']);

// Webhook delivery record
export const webhookDeliverySchema = z.object({
  id: z.string().uuid(),
  webhookId: z.string().uuid(),
  event: z.nativeEnum(WebhookEventType),
  payload: z.record(z.any()),
  status: WebhookDeliveryStatus,
  attempts: z.number().int(),
  lastAttemptAt: z.date(),
  nextRetryAt: z.date().optional().nullable(),
  responseStatus: z.number().int().optional().nullable(),
  responseBody: z.string().optional().nullable(),
  error: z.string().optional().nullable(),
  deliveredAt: z.date().optional().nullable(),
  createdAt: z.date()
});

// Types
export type WebhookConfig = z.infer<typeof webhookConfigSchema>;
export type CreateWebhook = z.infer<typeof createWebhookSchema>;
export type UpdateWebhook = z.infer<typeof updateWebhookSchema>;
export type WebhookDelivery = z.infer<typeof webhookDeliverySchema>;