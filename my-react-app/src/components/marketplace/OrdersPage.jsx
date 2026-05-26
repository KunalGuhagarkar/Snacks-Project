import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function OrdersPage({ currentUser }) {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedOrderItems, setSelectedOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // ==========================================
  // FETCH ALL ORDERS (WITH MOUNT CLEANUP)
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
  // FETCH ORDER ITEMS (WITH ASYNC GUARDS)
  // ==========================================
  const handleViewOrder = async (orderId) => {
    setSelectedOrderId(orderId); // Set active highlight instantly
    setLoadingDetails(true);
    setSelectedOrderItems([]);

    try {
      const response = await fetch(
        `http://localhost:5000/api/orders/items/${orderId}`,
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load order items");
      }

      // 🛡️ Guard: Only update state if the user is still looking at the same order
      if (selectedOrderId === orderId || document.getElementById(`order-card-${orderId}`)) {
        setSelectedOrderItems(data);
      }
    } catch (err) {
      console.error("Order details error:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // ==========================================
  // FORMAT DATE UTILITY
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

  // 🔒 UNAUTHORIZED STATE
  if (!currentUser) {
    return (
      <div className="orders-unauth-shroud">
        <div className="orders-unauth-card">
          <h2>Access Denied 🔐</h2>
          <p>Please log in from the marketplace home screen to review your past snack orders.</p>
          <button className="btn-primary-orange" onClick={() => navigate("/")} type="button">
            Return to Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page-wrapper">
      <div className="orders-max-container">
        
        {/* HEADER TRACK */}
        <div className="orders-page-header">
          <div>
            <h1>📦 My Orders</h1>
            <p>Welcome back, {currentUser.name || "Snacker"}! Track your history below.</p>
          </div>
          <button className="btn-back-home" onClick={() => navigate("/")} type="button">
            ← Back Home
          </button>
        </div>

        {/* LOADING TRACK */}
        {loading ? (
          <div className="orders-empty-card">
            <h2>Loading orders...</h2>
          </div>
        ) : orders.length === 0 ? (
          <div className="orders-empty-card">
            <h2>No Orders Yet 📦</h2>
            <p>Start shopping to see your orders here.</p>
            <button className="btn-primary-orange" onClick={() => navigate("/")} type="button">
              Browse Snacks
            </button>
          </div>
        ) : (
          <div className="orders-split-grid">
            
            {/* MASTER: ORDERS CARDS STACK */}
            <div className="orders-list-stack">
              {orders.map((order) => {
                const isSelected = selectedOrderId === order.id;
                return (
                  <div
                    key={`order-uid-${order.id}`}
                    id={`order-card-${order.id}`}
                    className={`order-summary-card ${isSelected ? "active-highlight" : ""}`}
                  >
                    <div className="order-card-row-top">
                      <div>
                        <h3>Order #{order.id}</h3>
                        <p className="order-timestamp">{formatDate(order.created_at)}</p>
                      </div>
                      <span className={`status-badge tag-${order.order_status?.toLowerCase() || 'pending'}`}>
                        {order.order_status || 'Processing'}
                      </span>
                    </div>

                    <p className="order-grand-sum">
                      <strong>💰 Total:</strong> ₹{order.grand_total}
                    </p>

                    <button
                      type="button"
                      className={`btn-details-trigger ${isSelected ? "active-viewing" : ""}`}
                      onClick={() => handleViewOrder(order.id)}
                    >
                      {isSelected ? "Viewing Details" : "View Details"}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* DETAIL: STICKY RECEIPT COMPONENT */}
            <div className="order-sticky-receipt-panel">
              <h2>🧾 Order Details</h2>

              {loadingDetails ? (
                <p className="receipt-placeholder-text">🔄 Fetching item breakdown...</p>
              ) : selectedOrderItems.length === 0 ? (
                <p className="receipt-placeholder-text">
                  Select an order card on the left to see full line item breakdowns.
                </p>
              ) : (
                <>
                  <p className="receipt-active-meta">
                    Viewing items for <strong>Order #{selectedOrderId}</strong>
                  </p>
                  
                  <div className="receipt-items-scrolltrack">
                    {selectedOrderItems.map((item, index) => (
                      <div
                        key={`lineitem-${item.id || index}-${selectedOrderId}`}
                        className="receipt-line-item"
                      >
                        <div>
                          <span className="line-item-title">{item.historical_name}</span>
                          <span className="line-item-pricing">
                            ₹{item.historical_price} × {item.quantity}
                          </span>
                        </div>
                        <strong className="line-item-subtotal">
                          ₹{item.historical_price * item.quantity}
                        </strong>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}