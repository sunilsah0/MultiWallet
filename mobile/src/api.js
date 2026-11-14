import { API_URL } from './config';
import { loadToken } from './storage';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, headers = {}, auth = true } = {}) {
  const finalHeaders = { 'Content-Type': 'application/json', ...headers };
  if (auth) {
    const token = await loadToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Is the API running and the port Public?', 0);
  }

  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new ApiError(data?.error || 'Something went wrong', res.status);
  return data;
}

// A fresh key for each payment attempt. It stops double charges.
export const newKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const register = (payload) =>
  request('/auth/register', { method: 'POST', body: payload, auth: false });

export const login = (payload) =>
  request('/auth/login', { method: 'POST', body: payload, auth: false });

export const getWallet = () => request('/wallet');
export const getHistory = () => request('/wallet/history');

export const topup = (amountOre, key) =>
  request('/wallet/topup', {
    method: 'POST',
    body: { amount_ore: amountOre },
    headers: { 'Idempotency-Key': key },
  });

export const sendMoney = (payload, key) =>
  request('/wallet/send', {
    method: 'POST',
    body: payload,
    headers: { 'Idempotency-Key': key },
  });
