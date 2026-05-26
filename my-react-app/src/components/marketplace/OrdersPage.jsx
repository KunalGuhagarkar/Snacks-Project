import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function OrdersPage({ currentUser }) {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

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
  // ROUTING HANDLER FOR CUSTOMER DASHBOARD
  // ==========================================
  const handleViewOrderDetails = (orderId) => {
    // Navigate straight to the dashboard and instruct it to view this order
    navigate("/dashboard", {
      state: {
        targetOrderId: orderId,
        activeTab: "orders", 
      },
    });
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

        {/* LOADING & DISPLAY STATES */}
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
          <div className="orders-list-stack-centric">
            {orders.map((order) => (
              <div
                key={`order-uid-${order.id}`}
                id={`order-card-${order.id}`}
                className="order-summary-card"
              >
                <div className="order-card-row-top">
                  <div>
                    <h3>Order #{order.id}</h3>
                    <p className="order-timestamp">{formatDate(order.created_at)}</p>
                  </div>
                  <span className={`status-badge tag-${order.order_status?.toLowerCase().replace(/\s+/g, '-') || 'pending'}`}>
                    {order.order_status || 'Processing'}
                  </span>
                </div>

                <div className="order-card-row-bottom-split">
                  <p className="order-grand-sum">
                    <strong>💰 Total Amount:</strong> ₹{order.grand_total}
                  </p>

                  <button
                    type="button"
                    className="btn-details-trigger"
                    onClick={() => handleViewOrderDetails(order.id)}
                  >
                    View Details in Dashboard &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}