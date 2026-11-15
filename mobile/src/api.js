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

// Businesses (owner)
export const myMerchants = () => request('/merchants/mine');
export const merchantSales = (id) => request(`/merchants/${id}/sales`);

// Browsing (public)
export const getCategory = (category) => request(`/catalog/category/${category}`, { auth: false });
export const getStore = (id) => request(`/catalog/merchants/${id}`, { auth: false });

// Orders
export const createOrder = (payload, key) =>
  request('/orders', {
    method: 'POST',
    body: payload,
    headers: { 'Idempotency-Key': key },
  });
export const myOrders = () => request('/orders/mine');
export const businessOrders = (merchantId) => request(`/orders/business/${merchantId}`);
export const completeOrder = (id) => request(`/orders/${id}/complete`, { method: 'POST' });

// Pay a business directly (used by QR payments)
export const payMerchant = (id, payload, key) =>
  request(`/merchants/${id}/pay`, {
    method: 'POST',
    body: payload,
    headers: { 'Idempotency-Key': key },
  });

// Who owns this phone number? (shown before paying)
export const lookupUser = (phone) => request(`/users/lookup?phone=${encodeURIComponent(phone)}`);

// Payment requests
export const createRequest = (payload) => request('/requests', { method: 'POST', body: payload });
export const incomingRequests = () => request('/requests/incoming');
export const outgoingRequests = () => request('/requests/outgoing');
export const payRequest = (id) => request(`/requests/${id}/pay`, { method: 'POST' });
export const declineRequest = (id) => request(`/requests/${id}/decline`, { method: 'POST' });
export const cancelRequest = (id) => request(`/requests/${id}/cancel`, { method: 'POST' });
