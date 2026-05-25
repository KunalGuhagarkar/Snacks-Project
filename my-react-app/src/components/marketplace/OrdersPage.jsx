import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function OrdersPage({ currentUser }) {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null); // 👈 Tracks highlighted card
  const [selectedOrderItems, setSelectedOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // ==========================================
  // FETCH ALL ORDERS
  // ==========================================
  useEffect(() => {
    let isMounted = true;

    const fetchOrders = async () => {
      if (!currentUser?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(
          `http://localhost:5000/api/orders/history/${currentUser.id}`,
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch orders");
        }

        if (isMounted) {
          setOrders(data || []);
        }
      } catch (err) {
        console.error("Order history error:", err);
        if (isMounted) setOrders([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchOrders();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // ==========================================
  // FETCH ORDER ITEMS
  // ==========================================
  const handleViewOrder = async (orderId) => {
    try {
      setSelectedOrderId(orderId); // Set active highlight instantly
      setLoadingDetails(true);
      setSelectedOrderItems([]);

      const response = await fetch(
        `http://localhost:5000/api/orders/items/${orderId}`,
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load order items");
      }

      setSelectedOrderItems(data);
    } catch (err) {
      console.error("Order details error:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // ==========================================
  // FORMAT DATE
  // ==========================================
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 🔒 UNLAUTHORIZED ANONYMOUS ACCESSIBLE STATE
  if (!currentUser) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8f5ef", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ background: "white", padding: "40px", borderRadius: "16px", textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", maxWidth: "400px" }}>
          <h2>Access Denied 🔐</h2>
          <p style={{ color: "#666", margin: "16px 0 24px" }}>Please log in from the marketplace home screen to review your past snack orders.</p>
          <button onClick={() => navigate("/")} style={{ width: "100%", padding: "12px", border: "none", background: "#d97706", color: "white", borderRadius: "10px", fontWeight: "600", cursor: "pointer" }}>
            Return to Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8f5ef", padding: "40px 20px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
          <div>
            <h1 style={{ margin: 0 }}>📦 My Orders</h1>
            <p style={{ color: "#777", marginTop: "6px" }}>Welcome back, {currentUser.name || "Snacker"}! Track your history below.</p>
          </div>
          <button onClick={() => navigate("/")} style={{ border: "none", background: "#eee", padding: "10px 16px", borderRadius: "10px", cursor: "pointer", fontWeight: "600" }}>
            ← Back Home
          </button>
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div style={{ background: "white", padding: "60px", textAlign: "center", borderRadius: "16px" }}>
            <h2>Loading orders...</h2>
          </div>
        ) : orders.length === 0 ? (
          <div style={{ background: "white", padding: "60px", textAlign: "center", borderRadius: "16px" }}>
            <h2>No Orders Yet 📦</h2>
            <p style={{ color: "#777", marginBottom: "20px" }}>Start shopping to see your orders here.</p>
            <button onClick={() => navigate("/")} style={{ border: "none", background: "#d97706", color: "white", padding: "10px 20px", borderRadius: "10px", fontWeight: "600", cursor: "pointer" }}>
              Browse Snacks
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "24px" }}>
            
            {/* LEFT PANELS: ORDERS LIST */}
            <div>
              {orders.map((order) => {
                const isSelected = selectedOrderId === order.id;
                return (
                  <div
                    key={order.id}
                    style={{
                      background: "white",
                      padding: "20px",
                      borderRadius: "16px",
                      marginBottom: "16px",
                      border: isSelected ? "2px solid #d97706" : "2px solid transparent",
                      boxShadow: isSelected ? "0 4px 12px rgba(217, 119, 6, 0.1)" : "none",
                      transition: "all 0.2s ease-in-out",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <h3 style={{ margin: "0 0 4px 0" }}>Order #{order.id}</h3>
                        <p style={{ color: "#777", margin: 0 }}>{formatDate(order.created_at)}</p>
                      </div>
                      <span style={{
                        padding: "6px 12px",
                        borderRadius: "999px",
                        background: order.order_status === "Delivered" ? "#dcfce7" : "#fef3c7",
                        color: order.order_status === "Delivered" ? "#166534" : "#92400e",
                        fontSize: "12px",
                        fontWeight: "600",
                        height: "fit-content"
                      }}>
                        {order.order_status}
                      </span>
                    </div>

                    <p style={{ margin: "14px 0" }}><strong>💰 Total:</strong> ₹{order.grand_total}</p>

                    <button
                      onClick={() => handleViewOrder(order.id)}
                      style={{
                        width: "100%",
                        padding: "10px",
                        border: "none",
                        background: isSelected ? "#78350f" : "#d97706",
                        color: "white",
                        borderRadius: "10px",
                        cursor: "pointer",
                        fontWeight: "600",
                        transition: "background 0.2s",
                      }}
                    >
                      {isSelected ? "Viewing Details" : "View Details"}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* RIGHT PANEL: STICKY RECEIPTS */}
            <div style={{ background: "white", padding: "20px", borderRadius: "16px", height: "fit-content", position: "sticky", top: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
              <h2 style={{ marginTop: 0, borderBottom: "2px solid #f8f5ef", paddingBottom: "10px" }}>🧾 Order Details</h2>

              {loadingDetails ? (
                <p style={{ color: "#777", textAlign: "center", padding: "20px 0" }}>🔄 Fetching item breakdown...</p>
              ) : selectedOrderItems.length === 0 ? (
                <p style={{ color: "#777", textAlign: "center", padding: "20px 0" }}>Select an order card on the left to see full line item breakdowns.</p>
              ) : (
                <>
                  <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "16px" }}>Viewing items for <strong>Order #{selectedOrderId}</strong></p>
                  {selectedOrderItems.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderBottom: "1px solid #eee",
                        padding: "12px 0",
                      }}
                    >
                      <div>
                        <span style={{ display: "block", fontWeight: "600" }}>{item.historical_name}</span>
                        <span style={{ fontSize: "0.85rem", color: "#777" }}>
                          ₹{item.historical_price} × {item.quantity}
                        </span>
                      </div>
                      <strong style={{ color: "#333" }}>₹{item.historical_price * item.quantity}</strong>
                    </div>
                  ))}
                </>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}