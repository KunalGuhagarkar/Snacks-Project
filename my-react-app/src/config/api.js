const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const API_ENDPOINTS = {
  products: `${BASE_URL}/api/products`,
  auth: (action) => `${BASE_URL}/api/auth/${action}`,
  
  // ✅ FIXED: Routes changed to match standalone app.use("/api/cart", ...)
  cart: `${BASE_URL}/api/cart`,
  cartUser: (userId) => `${BASE_URL}/api/cart/${userId}`,
  
  // ✅ FIXED: Target endpoint explicitly maps to router.post("/checkout")
  submitOrder: `${BASE_URL}/api/orders/checkout`,
  
  orderHistory: (userId) => `${BASE_URL}/api/orders/history/${userId}`,
  orderItems: (orderId) => `${BASE_URL}/api/orders/items/${orderId}`,
  
  // 📍 SECURE ADMIN HUB PLUGINS
  adminStats: `${BASE_URL}/api/admin/stats`,
  adminOrders: `${BASE_URL}/api/admin/orders`,
  updateOrderStatus: (orderId) => `${BASE_URL}/api/admin/orders/${orderId}/status`,
  
  // 🍦 NEW CATALOG CRUD targets
  adminCreateProduct: `${BASE_URL}/api/admin/products`,
  adminUpdateProduct: (id) => `${BASE_URL}/api/admin/products/${id}`,
  adminDeleteProduct: (id) => `${BASE_URL}/api/admin/products/${id}`,
};