export const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || "http://localhost:5000";

async function parseJsonSafe(res) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return null;
}

export async function apiFetch(path, options = {}) {
  const token =
    localStorage.getItem("nalapaka_admin_token") ||
    localStorage.getItem("nalapaka_user_token");

  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const err = data && data.error ? data.error : res.statusText || "API error";
    const e = new Error(err);
    e.status = res.status;
    e.body = data;
    throw e;
  }
  return data;
}

export default apiFetch;

export const API_ENDPOINTS = {
  products: `${API_BASE}/api/products`,
  auth: (action) => `${API_BASE}/api/auth/${action}`,

  cart: `${API_BASE}/api/cart`,
  cartUser: (userId) => `${API_BASE}/api/cart/${userId}`,

  submitOrder: `${API_BASE}/api/orders/checkout`,

  orderHistory: (userId) => `${API_BASE}/api/orders/history/${userId}`,
  orderItems: (orderId) => `${API_BASE}/api/orders/items/${orderId}`,

  adminStats: `${API_BASE}/api/admin/stats`,
  adminOrders: `${API_BASE}/api/admin/orders`,
  updateOrderStatus: (orderId) => `${API_BASE}/api/admin/orders/${orderId}/status`,

  adminCreateProduct: `${API_BASE}/api/admin/products`,
  adminUpdateProduct: (id) => `${API_BASE}/api/admin/products/${id}`,
  adminDeleteProduct: (id) => `${API_BASE}/api/admin/products/${id}`,
};