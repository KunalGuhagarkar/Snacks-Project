import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Component Imports
import NalapakaMarketplace from "./components/NalapakaMarketplace";
import CheckoutPage from "./components/marketplace/CheckoutPage";
import OrdersPage from "./components/marketplace/OrdersPage";
import AdminLogin from "./components/admin/AdminLogin";
import AdminDashboard from "./components/admin/AdminDashboard";
import ResetPassword from "./components/marketplace/ResetPassword"; // 👈 Import your new recovery view component

// 📦 NEW ADDITION: Customer Dashboard View for Lifecycle Status Tracking
import CustomerDashboard from "./components/marketplace/CustomerDashboard"; 

function App() {
  // ==========================================================================
  // 💾 GLOBAL STATE INITIALIZATION
  // ==========================================================================
  const [cartItems, setCartItems] = useState(() => {
    const savedCart = localStorage.getItem("nalapaka_cart");
    return savedCart ? JSON.parse(savedCart) : [];
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem("nalapaka_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // ==========================================================================
  // 🔐 BACKEND AUTH SYNCHRONIZATION HANDLER
  // ==========================================================================
  const handleAdminAuthSuccess = (userData, token) => {
    setCurrentUser(userData);
    localStorage.setItem("nalapaka_user", JSON.stringify(userData));
    // The admin token is stored here to feed req.headers for all /api/admin paths
    if (token) {
      localStorage.setItem("nalapaka_admin_token", token);
    }
  };

  return (
    <Routes>
      /* 🛒 PUBLIC MARKETPLACE ROUTE */
      <Route
        path="/"
        element = {
          <NalapakaMarketplace
            cartItems={cartItems}
            setCartItems={setCartItems}
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
          />
        }
      />

      /* 🔑 STANDALONE PASSWORD RESET LANDING GATEWAY */
      <Route path="/reset-password" element={<ResetPassword />} /> {/* 👈 Added public fallback hook */}

      /* 📦 USER ORDER HISTORY ROUTE */
      <Route
        path="/orders"
        element = {
          currentUser ? (
            <OrdersPage currentUser={currentUser} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      /* 📊 NEW ADDITION: PROTECTED CUSTOMER DASHBOARD & LIVE STATUS TRACKER */
      <Route
        path="/dashboard"
        element = {
          currentUser ? (
            <CustomerDashboard currentUser={currentUser} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      /* 💳 CHECKOUT FLOW ROUTE */
      <Route
        path="/checkout"
        element = {
          <CheckoutPage
            cartItems={cartItems}
            setCartItems={setCartItems}
            currentUser={currentUser}
          />
        }
      />

      /* 🛡️ ADMIN LOGIN INTERFACE */
      <Route
        path="/admin/login"
        element = {
          currentUser && currentUser.role === "Admin" ? (
            <Navigate to="/admin/dashboard" replace />
          ) : (
            <AdminLogin onAuthSuccess={handleAdminAuthSuccess} />
          )
        }
      />

      /* 📊 PROTECTED ADMINISTRATIVE DASHBOARD ROUTE */
      <Route
        path="/admin/dashboard"
        element = {
          currentUser && currentUser.role === "Admin" ? (
            <AdminDashboard currentUser={currentUser} setCurrentUser={setCurrentUser} />
          ) : (
            <Navigate to="/admin/login" replace />
          )
        }
      />

      /* 🔄 FALLBACK WILDCARD ROUTE */
      <Route path="*" replace element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;