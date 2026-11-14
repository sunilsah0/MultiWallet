const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const TOKEN_KEY = 'multiwallet_token';

// NOTE: localStorage is fine for a prototype. A production site should use
// httpOnly cookies so scripts cannot read the token.
export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setToken = (t) => {
  try { localStorage.setItem(TOKEN_KEY, t); } catch {}
};
export const clearToken = () => {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
};

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// A fresh key for each payment attempt. It stops double charges.
export const newKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

async function request(path, { method = 'GET', body, headers = {}, auth = true } = {}) {
  const h = { 'Content-Type': 'application/json', ...headers };
  if (auth) {
    const t = getToken();
    if (t) h.Authorization = `Bearer ${t}`;
  }

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: h,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Is the API running and port 3000 Public?', 0);
  }

  let data = null;
  try { data = await res.json(); } catch {}

  if (!res.ok) {
    if (res.status === 401 && auth) {
      clearToken();
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
    throw new ApiError(data?.error || 'Something went wrong', res.status);
  }
  return data;
}

// Accounts
export const register = (p) => request('/auth/register', { method: 'POST', body: p, auth: false });
export const login = (p) => request('/auth/login', { method: 'POST', body: p, auth: false });

// Wallet
export const getWallet = () => request('/wallet');
export const getHistory = () => request('/wallet/history');
export const topup = (amountOre, key) =>
  request('/wallet/topup', {
    method: 'POST',
    body: { amount_ore: amountOre },
    headers: { 'Idempotency-Key': key },
  });
export const sendMoney = (p, key) =>
  request('/wallet/send', { method: 'POST', body: p, headers: { 'Idempotency-Key': key } });

// Businesses
export const listMerchants = () => request('/merchants', { auth: false });
export const myMerchants = () => request('/merchants/mine');
export const createMerchant = (p) => request('/merchants', { method: 'POST', body: p });
export const merchantSales = (id) => request(`/merchants/${id}/sales`);
export const payMerchant = (id, p, key) =>
  request(`/merchants/${id}/pay`, { method: 'POST', body: p, headers: { 'Idempotency-Key': key } });
