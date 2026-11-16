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

// The PIN box is drawn by PinProvider, which registers itself here
let pinAsker = null;
export const setPinAsker = (fn) => {
  pinAsker = fn;
};

async function request(path, { method = 'GET', body, headers = {}, auth = true, pin = false } = {}) {
  const h = { 'Content-Type': 'application/json', ...headers };
  if (auth) {
    const t = getToken();
    if (t) h.Authorization = `Bearer ${t}`;
  }
  if (pin) {
    const value = pinAsker ? await pinAsker() : null;
    if (!value) throw new ApiError('Payment cancelled', 0);
    h['X-Payment-Pin'] = value;
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
  request('/wallet/send', { method: 'POST', body: p, headers: { 'Idempotency-Key': key }, pin: true });

// Businesses (owner)
export const myMerchants = () => request('/merchants/mine');
export const createMerchant = (p) => request('/merchants', { method: 'POST', body: p });
export const merchantSales = (id) => request(`/merchants/${id}/sales`);

// Browsing (public)
export const getCategory = (category) => request(`/catalog/category/${category}`, { auth: false });
export const getStore = (id) => request(`/catalog/merchants/${id}`, { auth: false });

// Products (owner)
export const addProduct = (merchantId, p) =>
  request(`/catalog/merchants/${merchantId}/products`, { method: 'POST', body: p });
export const removeProduct = (id) => request(`/catalog/products/${id}`, { method: 'DELETE' });

// Orders
export const createOrder = (p, key) =>
  request('/orders', { method: 'POST', body: p, headers: { 'Idempotency-Key': key }, pin: true });
export const myOrders = () => request('/orders/mine');
export const businessOrders = (merchantId) => request(`/orders/business/${merchantId}`);
export const completeOrder = (id) => request(`/orders/${id}/complete`, { method: 'POST' });

// Payment requests
export const createRequest = (p) => request('/requests', { method: 'POST', body: p });
export const incomingRequests = () => request('/requests/incoming');
export const outgoingRequests = () => request('/requests/outgoing');
export const payRequest = (id) => request(`/requests/${id}/pay`, { method: 'POST', pin: true });
export const declineRequest = (id) => request(`/requests/${id}/decline`, { method: 'POST' });
export const cancelRequest = (id) => request(`/requests/${id}/cancel`, { method: 'POST' });

// Security
export const securityStatus = () => request('/security/status');
export const setPin = (p) => request('/security/pin', { method: 'POST', body: p });
export const logoutAll = () => request('/security/logout-all', { method: 'POST' });
