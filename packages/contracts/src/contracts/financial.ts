
import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { AccountsResponse, TransactionsResponse } from '../schemas/finance';

const c = initContract();
export const financialContract = c.router({
  listAccounts: {
    method: 'GET',
    path: `/api/financial/accounts`,
    responses: { 200: AccountsResponse },
    query: z.object({ provider: z.string().optional() }),
    summary: 'List accounts',
  },
});
