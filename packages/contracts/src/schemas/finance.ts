
import { z } from 'zod';
import { Money, ISODate, UUID, Currency } from './common';

export const Account = z.object({
  id: UUID,
  provider: z.string(),
  name: z.string(),
  iban: z.string().optional(),
  currency: Currency,
  createdAt: z.string().datetime().optional(),
});
export const Transaction = z.object({
  id: UUID,
  accountId: UUID,
  bookingDate: ISODate,
  valueDate: ISODate.optional(),
  description: z.string(),
  amount: Money,
  raw: z.any().optional(),
  categoryId: UUID.optional(),
  meta: z.record(z.any()).optional(),
});

export const AccountsResponse = z.object({
  accounts: z.array(Account),
  total: z.number(),
});

export const TransactionsResponse = z.object({
  transactions: z.array(Transaction),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

// Tipos útiles para consumidores (evita inferencias raras)
export type Account = z.infer<typeof Account>;
export type Transaction = z.infer<typeof Transaction>;
