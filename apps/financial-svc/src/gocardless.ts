// GoCardless client helpers. Credentials are injected by callers.

type GcAccount = {
  id: string;
  iban?: string | null;
  currency?: string | null;
  name?: string | null;
  institution_id?: string | null;
  created?: string | null;
};

type GcTransaction = {
  id: string;
  amount: { value: string; currency: string };
  description?: string | null;
  booking_date?: string | null; // YYYY-MM-DD
  value_date?: string | null;
  status?: string | null;
  creditorName?: string | null;
  debtorName?: string | null;
  remittanceInformationUnstructured?: string | null;
};

async function gcFetch<T>(baseUrl: string, accessToken: string, path: string, init?: RequestInit): Promise<T> {
  if (!accessToken) {
    throw Object.assign(new Error("GoCardless access token not configured"), { statusCode: 400 });
  }
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...(init || {}),
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    const err: Error & { statusCode?: number } = new Error(`GoCardless API ${res.status}: ${text}`);
    err.statusCode = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

export async function listAccounts(baseUrl: string, accessToken: string): Promise<GcAccount[]> {
  const data = await gcFetch<{ results: GcAccount[] }>(baseUrl, accessToken, `/accounts/`);
  return data.results || [];
}

export async function listTransactions(baseUrl: string, accessToken: string, accountId: string): Promise<GcTransaction[]> {
  const data = await gcFetch<{ results: GcTransaction[] }>(baseUrl, accessToken, `/accounts/${encodeURIComponent(accountId)}/transactions/`);
  return data.results || [];
}

// Exchange secret_id/secret_key for an access token
export async function getAccessToken(baseUrl: string, secretId: string, secretKey: string): Promise<string> {
  const url = `${baseUrl}/token/new`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret_id: secretId, secret_key: secretKey }),
  });
  if (!res.ok) {
    const text = await res.text();
    const err: Error & { statusCode?: number } = new Error(`GoCardless token error ${res.status}: ${text}`);
    err.statusCode = res.status;
    throw err;
  }
  const data = await res.json() as { access?: string };
  if (!data.access) {
    throw Object.assign(new Error('Missing access token in GoCardless response'), { statusCode: 502 });
  }
  return data.access;
}
