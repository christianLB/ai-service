
import { z } from 'zod';

export const Currency = z.string().min(3).max(3);
export const Money = z.object({
  amount: z.string().regex(/^\-?\d+(\.\d{1,8})?$/),
  currency: Currency,
});
export const ISODate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const UUID = z.string().uuid();
