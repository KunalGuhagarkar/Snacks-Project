import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../../config/api";
import "./AdminDashboard.css";

export default function AdminDashboard({ currentUser, setCurrentUser }) {
  const navigate = useNavigate();

  // Core Management States
  const [activeTab, setActiveTab] = useState("core");
  const [stats, setStats] = useState({
    revenue: 0,
    totalOrders: 0,
    totalProducts: 0,
  });
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Advanced Selected Panel Focus State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Inventory Modal Management States
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProductId, setCurrentProductId] = useState(null);
  const [productForm, setProductForm] = useState({
    name: "",
    brand: "Nalapaka",
    description: "",
    price: "",
    image_url: "",
    category: "Snacks",
    stock_quantity: "100",
    weight: "250g",
    emoji: "😋",
  });

  // Authentication Helpers
  const handleCleanAuthRedirect = useCallback(() => {
    localStorage.removeItem("nalapaka_user_token");
    localStorage.removeItem("nalapaka_admin_token");
    localStorage.removeItem("nalapaka_user");
    setCurrentUser(null);
    navigate("/admin/login", { replace: true });
  }, [navigate, setCurrentUser]);

  const getAuthHeaders = useCallback(() => {
    const token =
      localStorage.getItem("nalapaka_admin_token") ||
      localStorage.getItem("nalapaka_user_token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, []);

  // Generic State Change Input Controller
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProductForm((prev) => ({ ...prev, [name]: value }));
  };

  // 📥 Async Data Fetching Handlers
  const fetchProducts = useCallback(async () => {
    try {
      const productsRes = await fetch(`${API_BASE}/api/products`);
      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data);
      }
    } catch (err) {
      console.error("Error updating catalog visualization items:", err);
    }
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE}/api/admin/support`, {
        headers,
      });
      if (res.ok) {
        const ticketData = await res.json();
        setTickets(ticketData);

        if (ticketData.length > 0) {
          setSelectedTicket(
            (prevTicket) =>
              prevTicket || {
                ...ticketData[0],
                status: ticketData[0].status || "Pending",
              },
          );
        }
      }
    } catch (err) {
      console.error("Error pulling database support logs:", err);
    }
  }, [getAuthHeaders]);

  const lastActiveElementRef = useRef(null);

  // Manage modal focus trapping and restore focus on close
  useEffect(() => {
    if (!showModal) {
      // restore focus to last active element when modal closes
      try {
        if (lastActiveElementRef.current && typeof lastActiveElementRef.current.focus === 'function') {
          lastActiveElementRef.current.focus();
        }
      } catch (err) {
        console.debug('Modal focus restore failed', err);
      }
      return;
    }

    const modal = document.querySelector('.ap-modal-window-card');
    if (!modal) return;

    const focusableSelectors = 'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(modal.querySelectorAll(focusableSelectors)).filter(el => !el.hasAttribute('disabled'));
    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];

    if (firstFocusable && typeof firstFocusable.focus === 'function') firstFocusable.focus();

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setShowModal(false);
      } else if (e.key === 'Tab') {
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
          }
        }
      }
    }

    modal.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      modal.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleKeyDown);
      try {
        if (lastActiveElementRef.current && typeof lastActiveElementRef.current.focus === 'function') {
          lastActiveElementRef.current.focus();
        }
      } catch (err) {
        console.debug('Modal cleanup focus restore failed', err);
      }
    };
  }, [showModal]);

  // Master Dashboard Core Lifecycle
  useEffect(() => {
    const fetchCoreDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        const headers = getAuthHeaders();
        const userRole = currentUser?.role?.toLowerCase() || "";
        const isAdminAuthorized = userRole === "admin";

        if (!headers.Authorization || !currentUser || !isAdminAuthorized) {
          handleCleanAuthRedirect();
          return;
        }

        // Fetch core stats and orders in parallel, then load products & tickets
        const [statsRes, ordersRes] = await Promise.all([
          fetch(`${API_BASE}/api/admin/stats`, { headers }),
            fetch(`${API_BASE}/api/admin/orders`, { headers }),
        ]);
        await Promise.all([fetchProducts(), fetchTickets()]);

        if (!statsRes.ok)
          throw new Error(`Server Analytics Synch Drop: ${statsRes.status}`);
        const statsData = await statsRes.json();
        setStats({
          revenue: parseFloat(statsData.revenue || 0),
          totalOrders: parseInt(statsData.totalOrders || 0, 10),
          totalProducts: parseInt(statsData.totalProducts || 0, 10),
        });

        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setOrders(ordersData);
          if (ordersData.length > 0) {
            setSelectedOrder((prevOrder) => {
              if (prevOrder) return prevOrder;
              const firstOrder = ordersData[0];
              const initialStatus =
                firstOrder.status || firstOrder.order_status || "Pending";
              return {
                ...firstOrder,
                status: initialStatus,
                order_status: initialStatus,
              };
            });
          }
        }
      } catch (err) {
        console.error(err);
        setError(`Operational Console Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchCoreDashboardData();
  }, [
    currentUser,
    getAuthHeaders,
    handleCleanAuthRedirect,
    fetchProducts,
    fetchTickets,
  ]);

  // 🔄 Pipeline Modification Controls
  const handleUpdateStatus = async (orderId, targetStatus) => {
    try {
      const formattedStatus = targetStatus
        .trim()
        .split(" ")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join(" ");

      const res = await fetch(
        `${API_BASE}/api/admin/orders/${orderId}/status`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({ status: formattedStatus }),
        },
      );

      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data.error || "Status pipeline shift rejected by server.",
        );

      setOrders((prevOrders) =>
        prevOrders.map((o) =>
          (o.id === orderId || o._id === orderId)
            ? { ...o, order_status: formattedStatus, status: formattedStatus }
            : o,
        ),
      );

      setSelectedOrder((prev) =>
        prev && (prev.id === orderId || prev._id === orderId)
          ? { ...prev, status: formattedStatus, order_status: formattedStatus }
          : prev,
      );
    } catch (err) {
      alert(`Pipeline Shift Failure: ${err.message}`);
    }
  };

  const handleUpdateTicketStatus = async (ticketId, targetStatus) => {
    try {
      let cleanStatus = targetStatus.trim();
      let formattedStatus = "";

      // Safe check: If your internal UI treats it as "Closed", swap it to what backend expects ("Spam")
      if (cleanStatus.toLowerCase() === "closed") {
        formattedStatus = "Spam";
      } else if (cleanStatus.toLowerCase() === "in progress") {
        formattedStatus = "In Progress"; // Explicit exception for correct casing
      } else {
        // Enforce basic title casing for standard statuses (Pending, Resolved, Spam)
        formattedStatus =
          cleanStatus.charAt(0).toUpperCase() +
          cleanStatus.slice(1).toLowerCase();
      }

      const res = await fetch(
        `${API_BASE}/api/admin/support/${ticketId}/status`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({ status: formattedStatus }),
        },
      );

      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data.error || "Ticket stage update rejected by server.",
        );

      setTickets((prevTickets) =>
        prevTickets.map((t) =>
          (t.id === ticketId || t._id === ticketId) ? { ...t, status: formattedStatus } : t,
        ),
      );

      setSelectedTicket((prev) =>
        prev && (prev.id === ticketId || prev._id === ticketId)
          ? { ...prev, status: formattedStatus }
          : prev,
      );
    } catch (err) {
      alert(`Ticket Stage Adjustment Failure: ${err.message}`);
    }
  };

  // Modal Configuration Openers
  const openCreateModal = () => {
    lastActiveElementRef.current = document.activeElement;
    setIsEditing(false);
    setCurrentProductId(null);
    setProductForm({
      name: "",
      brand: "Nalapaka",
      description: "",
      price: "",
      image_url: "",
      category: "Snacks",
      stock_quantity: "100",
      weight: "250g",
      emoji: "😋",
    });
    setShowModal(true);
  };

  const openEditModal = (product) => {
    lastActiveElementRef.current = document.activeElement;
    setIsEditing(true);
    setCurrentProductId(product.id || product._id);
    setProductForm({
      name: product.name || "",
      brand: product.brand || "Nalapaka",
      description: product.description || "",
      price: product.price || "",
      image_url: product.image_url || "",
      category: product.category || "Snacks",
      stock_quantity: product.stock_quantity || "100",
      weight: product.weight || "250g",
      emoji: product.emoji || "😋",
    });
    setShowModal(true);
  };

  const handleProductFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isEditing
        ? `${API_BASE}/api/admin/products/${currentProductId}`
        : `${API_BASE}/api/admin/products`;

      // Ensure numeric fields are typed correctly before sending to API
      const payload = {
        ...productForm,
        price: parseFloat(productForm.price) || 0,
        stock_quantity: parseInt(productForm.stock_quantity, 10) || 0,
      };

      const res = await fetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Database operation drop.");

      if (isEditing) {
        setProducts((prev) =>
          prev.map((p) => (p.id === currentProductId ? data.product : p)),
        );
        alert("SKU specifications updated successfully!");
      } else {
        setProducts((prev) => [data.product, ...prev]);
        setStats((prev) => ({
          ...prev,
          totalProducts: prev.totalProducts + 1,
        }));
        alert("SKU introduced successfully!");
      }
      setShowModal(false);
    } catch (err) {
      alert(`Deployment Interruption: ${err.message}`);
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Permanently remove item: "${name}"?`)) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/products/${id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );
      if (!res.ok) throw new Error("Erase block dropped by server.");
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setStats((prev) => ({
        ...prev,
        totalProducts: Math.max(0, prev.totalProducts - 1),
      }));
      alert("Catalog item wiped cleanly.");
    } catch (err) {
      alert(`Exception: ${err.message}`);
    }
  };

  const parseOrderItems = (itemsField) => {
    if (!itemsField) return [];
    if (Array.isArray(itemsField)) return itemsField;
    try {
      return typeof itemsField === "string" ? JSON.parse(itemsField) : [];
    } catch (e) {
      console.error("Failed to parse items array block", e);
      return [];
    }
  };

  if (loading) {
    return (
      <div className="ap-loading-shroud">
        <div className="ap-spinner" aria-hidden="true">
          🔄
        </div>
        <p>Syncing Master Operational Control Units...</p>
      </div>
    );
  }

  return (
    <div className="ap-dashboard-wrapper">
      {/* BRAND NAVIGATION HEADER */}
      <header className="ap-main-navbar">
        <div className="ap-navbar-container">
          <button
            className="ap-brand-logo-btn"
            onClick={() => setActiveTab("core")}
            type="button"
          >
            Nalapaka <span className="ap-brand-subtitle">Console Engine</span>
          </button>
          <nav className="ap-navbar-actions-group" aria-label="Dashboard views">
            <button
              className={`ap-navbar-tab-link ${activeTab === "core" ? "ap-active-tab" : ""}`}
              onClick={() => setActiveTab("core")}
              type="button"
            >
              🎛️ Matrix Overview
            </button>
            <button
              className={`ap-navbar-tab-link ${activeTab === "orders" ? "ap-active-tab" : ""}`}
              onClick={() => setActiveTab("orders")}
              type="button"
            >
              📋 Master Orders ({orders.length})
            </button>
            <button
              className={`ap-navbar-tab-link ${activeTab === "catalog" ? "ap-active-tab" : ""}`}
              onClick={() => setActiveTab("catalog")}
              type="button"
            >
              📦 Inventory Catalog ({products.length})
            </button>
            <button
              className={`ap-navbar-tab-link ${activeTab === "queries" ? "ap-active-tab" : ""}`}
              onClick={() => setActiveTab("queries")}
              type="button"
            >
              💬 Customer Queries ({tickets.length})
            </button>
          </nav>
          <button
            className="ap-navbar-logout-btn"
            onClick={handleCleanAuthRedirect}
            type="button"
          >
            Logout Terminal 🚪
          </button>
        </div>
      </header>

      <main className="ap-workspace-container" aria-hidden={showModal}>
        {error && (
          <div className="ap-alert-danger" role="alert">
            🛑 Dashboard Exception Trace: {error}
          </div>
        )}

        {/* METRICS MODULE */}
        {activeTab === "core" && (
          <>
            <div className="ap-workspace-header">
              <div className="ap-header-title-block">
                <h1>Storefront Core Engine Metrics</h1>
                <p className="ap-header-subtext">
                  Live diagnostic overview metrics capturing public checkout
                  sessions.
                </p>
              </div>
              <button
                className="ap-create-new-item-btn"
                onClick={openCreateModal}
                type="button"
              >
                ＋ Add New Inventory SKU
              </button>
            </div>
            <section className="ap-metrics-cards-grid">
              <div className="ap-metric-dashboard-card">
                <h5>Gross Processed Value</h5>
                <h2>
                  ₹
                  {stats.revenue.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </h2>
                <div className="ap-card-trend-up">
                  ▲ System liquid conversions
                </div>
              </div>
              <div className="ap-metric-dashboard-card">
                <h5>Active Invoices</h5>
                <h2>{stats.totalOrders} Invoices</h2>
                <div className="ap-card-trend-neutral">
                  ● Valid database checkout relays
                </div>
              </div>
              <div className="ap-metric-dashboard-card">
                <h5>Index Volume</h5>
                <h2>{stats.totalProducts} SKUs</h2>
                <div className="ap-card-trend-up">
                  ▲ Mapped market visibility
                </div>
              </div>
            </section>
          </>
        )}

        {/* HIGH DETAIL ORDERS SPLIT-SCREEN SYSTEM */}
        {activeTab === "orders" && (
          <div className="ap-orders-split-workspace">
            {/* LEFT PANE: MASTER STREAM INVOICE TABLE */}
            <div className="ap-orders-list-pane">
              <div className="ap-panel-inner-header">
                <h3>📋 Order Streaming Pipeline</h3>
                <span className="ap-count-badge">
                  {orders.length} Active Records
                </span>
              </div>

              {orders.length === 0 ? (
                <p className="ap-empty-dataset-text">
                  No invoices captured from live sales relays.
                </p>
              ) : (
                <div className="ap-pane-table-scroll">
                  <table className="ap-interactive-invoice-table">
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Customer / Contact</th>
                        <th>Grand Total</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => {
                        const currentStatus =
                          o.status || o.order_status || "Pending";
                        const isFocused =
                          selectedOrder && selectedOrder.id === o.id;
                        return (
                          <tr
                            key={o.id}
                            onClick={() => {
                              setSelectedOrder({
                                ...o,
                                status: currentStatus,
                                order_status: currentStatus,
                              });
                            }}
                            className={`ap-row-selectable ${isFocused ? "ap-row-focused" : ""}`}
                          >
                            <td>
                              <b>#{o.id}</b>
                            </td>
                            <td>
                              <div className="ap-tbl-user-name">
                                {o.customer_name || o.name || "Guest Checkout"}
                              </div>
                              <div className="ap-tbl-user-sub">
                                {o.customer_email ||
                                  o.email ||
                                  "No Email Profile"}
                              </div>
                            </td>
                            <td>
                              <b>
                                ₹
                                {parseFloat(
                                  o.total || o.grand_total || 0,
                                ).toFixed(2)}
                              </b>
                            </td>
                            <td>
                              <span
                                className={`ap-pipeline-indicator status-${currentStatus.toLowerCase().replace(/\s+/g, "-")}`}
                              >
                                {currentStatus}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* RIGHT PANE: ENHANCED ORDER DETAILS INSIGHT PANEL */}
            <div className="ap-orders-details-pane">
              {selectedOrder ? (
                <div className="ap-details-panel-sticky">
                  <div className="ap-panel-inner-header complex-border">
                    <div>
                      <h3>Invoice Summary #{selectedOrder.id}</h3>
                      <span className="ap-panel-timestamp">
                        Placed:{" "}
                        {selectedOrder.created_at
                          ? new Date(selectedOrder.created_at).toLocaleString(
                              "en-IN",
                            )
                          : "N/A"}
                      </span>
                    </div>
                    <span
                      className={`ap-pipeline-indicator status-${(selectedOrder.status || selectedOrder.order_status || "Pending").toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {selectedOrder.status ||
                        selectedOrder.order_status ||
                        "Pending"}
                    </span>
                  </div>

                  <div className="ap-control-pipeline-box">
                    <label>Fulfillment Pipeline Controls</label>
                    <div className="ap-pipeline-control-buttons">
                      {[
                        "Pending",
                        "Confirmed",
                        "Processing",
                        "Shipped",
                        "Delivered",
                        "Cancelled",
                        "Returned",
                      ].map((stage) => {
                        const activeStage =
                          selectedOrder.status ||
                          selectedOrder.order_status ||
                          "Pending";
                        const isSelected =
                          activeStage.toLowerCase() === stage.toLowerCase();

                        return (
                          <button
                            key={stage}
                            onClick={() =>
                              handleUpdateStatus(selectedOrder.id, stage)
                            }
                            className={`ap-pipeline-btn btn-${stage.toLowerCase().replace(/\s+/g, "-")} ${isSelected ? "active-stage-lock" : ""}`}
                            type="button"
                          >
                            {stage}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="ap-logistics-profile-card">
                    <h4>📦 Delivery & Customer Logistics Profile</h4>
                    <div className="ap-logistics-grid">
                      <div>
                        <span className="lbl">Client Identity:</span>
                        <span className="val">
                          {selectedOrder.customer_name ||
                            selectedOrder.name ||
                            "Guest User"}
                        </span>
                      </div>
                      <div>
                        <span className="lbl">Contact Vector:</span>
                        <span className="val">
                          {selectedOrder.customer_email ||
                            selectedOrder.email ||
                            "Unspecified Email"}
                        </span>
                      </div>
                      <div>
                        <span className="lbl">Contact Phone:</span>
                        <span className="val">
                          {selectedOrder.shipping_phone ||
                            selectedOrder.phone ||
                            selectedOrder.customer_phone ||
                            "No Phone Registered"}
                        </span>
                      </div>
                      <div className="full-width">
                        <span className="lbl">Fulfillment Address:</span>
                        <p className="val-address-block">
                          {selectedOrder.address_line_1
                            ? `${selectedOrder.address_line_1}${selectedOrder.address_line_2 ? `, ${selectedOrder.address_line_2}` : ""}, ${selectedOrder.city}, ${selectedOrder.state} - ${selectedOrder.postal_code}`
                            : selectedOrder.shipping_address ||
                              selectedOrder.address ||
                              selectedOrder.customer_address ||
                              "Standard Pickup Option Selected"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="ap-invoice-items-breakdown">
                    <h4>🛒 Cart Line-Items Inventory Matches</h4>
                    <div className="ap-breakdown-scroll-box">
                      {parseOrderItems(
                        selectedOrder.items || selectedOrder.order_items,
                      ).length === 0 ? (
                        <div className="ap-legacy-flat-bill">
                          <p>
                            No modern line-item array mapped. Reading flat total
                            aggregate pricing metrics.
                          </p>
                          <div className="ap-flat-row">
                            <span>Estimated Unit Allocation Package</span>{" "}
                            <b>
                              ₹
                              {parseFloat(
                                selectedOrder.total ||
                                  selectedOrder.grand_total ||
                                  0,
                              ).toFixed(2)}
                            </b>
                          </div>
                        </div>
                      ) : (
                        <div className="ap-line-items-stack">
                          {parseOrderItems(
                            selectedOrder.items || selectedOrder.order_items,
                          ).map((item, idx) => (
                            <div
                              className="ap-line-item-row"
                              key={item.id || idx}
                            >
                              <div className="ap-item-left-meta">
                                <span className="ap-item-avatar-emoji">
                                  {item.emoji || "📦"}
                                </span>
                                <div>
                                  <div className="ap-item-title-text">
                                    {item.name}
                                  </div>
                                  <div className="ap-item-sub-meta">
                                    Brand: {item.brand || "Nalapaka"} | Weight:{" "}
                                    {item.weight || "250g"}
                                  </div>
                                </div>
                              </div>
                              <div className="ap-item-right-price">
                                <span className="ap-qty-multiplier">
                                  {item.quantity || item.qty || 1}x
                                </span>
                                <b className="ap-calculated-sum">
                                  ₹
                                  {(
                                    parseFloat(item.price || 0) *
                                    (item.quantity || item.qty || 1)
                                  ).toFixed(2)}
                                </b>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="ap-panel-summary-footer-bill">
                      <div className="ap-receipt-row">
                        <span>Cart Subtotal</span>
                        <span>
                          ₹
                          {parseFloat(
                            selectedOrder.total ||
                              selectedOrder.grand_total ||
                              0,
                          ).toFixed(2)}
                        </span>
                      </div>
                      <div className="ap-receipt-row">
                        <span>Delivery Logistics Tariff</span>
                        <span className="ap-tariff-free">FREE</span>
                      </div>
                      <div className="ap-receipt-row master-total">
                        <span>Grand Bill Total</span>
                        <span>
                          ₹
                          {parseFloat(
                            selectedOrder.total ||
                              selectedOrder.grand_total ||
                              0,
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="ap-no-focus-placeholder">
                  <div className="ap-placeholder-graphic">📋</div>
                  <h3>No Active Invoice Focused</h3>
                  <p>
                    Select any ongoing streaming data invoice line-row from the
                    tracking feed pane on the left to pull deeper logistics
                    insights.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CATALOG MAINTENANCE VIEW MODULE */}
        {activeTab === "catalog" && (
          <div className="ap-table-workspace-card">
            <div className="ap-workspace-header inner-catalog-hdr">
              <div>
                <h2>Product Maintenance Catalog Matrix</h2>
                <p className="ap-catalog-hdr-subtext">
                  Review active marketplace visual cards and manage inventory
                  stock logs.
                </p>
              </div>
              <button
                className="ap-create-new-item-btn"
                onClick={openCreateModal}
                type="button"
              >
                ＋ Inject New SKU
              </button>
            </div>
            <div className="ap-catalog-grid-wrapper">
              {products.map((p) => (
                <div key={p.id} className="ap-product-entity-card">
                  <img
                    src={
                      p.image_url ||
                      "https://images.unsplash.com/photo-1589476993333-f55b84301219?w=500"
                    }
                    alt={p.name}
                    className="ap-catalog-card-img-cover"
                  />
                  <div className="ap-catalog-card-body">
                    <h4>
                      {p.emoji || "😋"} {p.name}
                    </h4>
                    <p className="ap-catalog-card-desc-text">
                      {p.description ||
                        "No custom descriptive summary provided."}
                    </p>
                    <div className="ap-catalog-meta-pills">
                      <span>... {p.brand}</span>
                      <span>... {p.weight || "250g"}</span>
                    </div>
                    <div className="ap-catalog-card-action-bar">
                      <div className="ap-catalog-pricing-meta">
                        <span className="price-tag">
                          ₹{parseFloat(p.price || 0).toFixed(2)}
                        </span>
                        <span className="stock-counter">
                          Logs: {p.stock_quantity || 0} units
                        </span>
                      </div>
                      <div className="ap-catalog-actions-group">
                        <button
                          onClick={() => openEditModal(p)}
                          className="ap-catalog-edit-btn"
                          type="button"
                        >
                          Edit SKU
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          className="ap-catalog-drop-btn"
                          type="button"
                        >
                          Wipe
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 💬 CUSTOMER SUPPORT QUERIES TRACKING FEED */}
        {activeTab === "queries" && (
          <div className="ap-orders-split-workspace">
            {/* LEFT SIDE: TICKET FEED LIST */}
            <div className="ap-orders-list-pane">
              <div className="ap-panel-inner-header">
                <h3>💬 Customer Help Tickets</h3>
                <span className="ap-count-badge">
                  {tickets.length} Total Messages
                </span>
              </div>

              {tickets.length === 0 ? (
                <p className="ap-empty-dataset-text">
                  No support records found in database tables.
                </p>
              ) : (
                <div className="ap-pane-table-scroll">
                  <table className="ap-interactive-invoice-table">
                    <thead>
                      <tr>
                        <th>Ticket ID</th>
                        <th>Subject / Issue</th>
                        <th>Sender</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.map((t) => {
                        const currentStatus = t.status || "Pending";
                        const isFocused =
                          selectedTicket && selectedTicket.id === t.id;
                        return (
                          <tr
                            key={t.id}
                            onClick={() =>
                              setSelectedTicket({ ...t, status: currentStatus })
                            }
                            className={`ap-row-selectable ${isFocused ? "ap-row-focused" : ""}`}
                          >
                            <td>
                              <b>#{t.id}</b>
                            </td>
                            <td>
                              <div className="ap-tbl-user-name text-weight-600">
                                {t.subject || "No Subject Provided"}
                              </div>
                              <div className="ap-tbl-user-sub truncate-text-block">
                                {t.message || t.description}
                              </div>
                            </td>
                            <td>
                              <div className="ap-tbl-user-name">
                                {t.name || "User"}
                              </div>
                              <div className="ap-tbl-user-sub">{t.email}</div>
                            </td>
                            <td>
                              <span
                                className={`ap-pipeline-indicator status-${currentStatus.toLowerCase().replace(/\s+/g, "-")}`}
                              >
                                {currentStatus}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* RIGHT SIDE: TICKET INTERACTION & STAGE MANAGEMENT PANE */}
            <div className="ap-orders-details-pane">
              {selectedTicket ? (
                <div className="ap-details-panel-sticky">
                  <div className="ap-panel-inner-header complex-border">
                    <div>
                      <h3>Ticket Inquiry #{selectedTicket.id}</h3>
                      <span className="ap-panel-timestamp">
                        User: {selectedTicket.name || "Anonymous Sender"}
                      </span>
                    </div>
                    {/* Fixed crash vulnerability here by adding safe optional chaining (?.) */}
                    <span
                      className={`ap-pipeline-indicator status-${(selectedTicket.status || "pending").toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {selectedTicket.status}
                    </span>
                  </div>

                  {/* STAGE ADJUSTMENT MODULE BLOCK */}
                  <div className="ap-control-pipeline-box">
                    <label>Update Ticket Stage Pipeline</label>
                    <div className="ap-pipeline-control-buttons">
                      {["Pending", "In Progress", "Resolved", "Spam"].map(
                        (stage) => {
                          const isSelected =
                            selectedTicket.status &&
                            selectedTicket.status.toLowerCase() ===
                              stage.toLowerCase();
                          return (
                            <button
                              key={stage}
                              onClick={() =>
                                handleUpdateTicketStatus(
                                  selectedTicket.id,
                                  stage,
                                )
                              }
                              className={`ap-pipeline-btn btn-${stage.toLowerCase().replace(/\s+/g, "-")} ${isSelected ? "active-stage-lock" : ""}`}
                              type="button"
                            >
                              {stage}
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>

                  {/* MESSAGE BODY CONTENT CONTAINER */}
                  <div className="ap-logistics-profile-card">
                    <h4>Inquiry Correspondence Text</h4>
                    <div
                      style={{
                        padding: "12px",
                        background: "#f8f9fa",
                        borderRadius: "6px",
                        border: "1px solid #e3e6f0",
                        marginTop: "8px",
                      }}
                    >
                      <p
                        style={{
                          fontWeight: "600",
                          marginBottom: "6px",
                          fontSize: "14px",
                        }}
                      >
                        Subject: {selectedTicket.subject || "No Subject Data"}
                      </p>
                      <p
                        style={{
                          whiteSpace: "pre-wrap",
                          color: "#4e73df",
                          fontSize: "13px",
                          lineHeight: "1.5",
                        }}
                      >
                        {selectedTicket.message ||
                          selectedTicket.description ||
                          "No diagnostic body context text sent."}
                      </p>
                    </div>
                    <div
                      style={{
                        marginTop: "12px",
                        fontSize: "12px",
                        color: "#858796",
                      }}
                    >
                      Reply Vector Address: <b>{selectedTicket.email}</b>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="ap-no-focus-placeholder">
                  <div className="ap-placeholder-graphic">💬</div>
                  <h3>No Active Support Record Focused</h3>
                  <p>
                    Select an inquiry from the customer feedback feed column on
                    the left to review communication threads or adjust lifecycle
                    stages.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 📥 INVENTORY MANAGEMENT MODAL LAYER (The missing link fixing your SKU UI window) */}
      {showModal && (
        <div className="ap-modal-backdrop-shroud">
          <div className="ap-modal-window-card" role="dialog" aria-modal="true" aria-labelledby="ap-modal-title">
            <div className="ap-modal-header">
              <h3 id="ap-modal-title">
                {isEditing
                  ? `📝 Modify SKU System Configuration: #${currentProductId}`
                  : "＋ Introduce New Product Entry"}
              </h3>
              <button
                className="ap-modal-close-x"
                onClick={() => setShowModal(false)}
                type="button"
              >
                ＆times;
              </button>
            </div>
            <form
              onSubmit={handleProductFormSubmit}
              className="ap-modal-form-body"
            >
              <div className="form-input-grid">
                <div className="input-group">
                  <label>Product Title / Name</label>
                  <input
                    type="text"
                    name="name"
                    value={productForm.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Brand Namespace</label>
                  <input
                    type="text"
                    name="brand"
                    value={productForm.brand}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Market Display Price (₹)</label>
                  <input
                    type="number"
                    name="price"
                    value={productForm.price}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Stock Allocation Qty</label>
                  <input
                    type="number"
                    name="stock_quantity"
                    value={productForm.stock_quantity}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Pack Weight (e.g. 250g)</label>
                  <input
                    type="text"
                    name="weight"
                    value={productForm.weight}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Identifier Emoji Icon</label>
                  <input
                    type="text"
                    name="emoji"
                    value={productForm.emoji}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="input-group full-width-field">
                <label>Resource Image URL String</label>
                <input
                  type="url"
                  name="image_url"
                  value={productForm.image_url}
                  onChange={handleInputChange}
                />
              </div>
              <div className="input-group full-width-field">
                <label>Product Context Description</label>
                <textarea
                  name="description"
                  rows="3"
                  value={productForm.description}
                  onChange={handleInputChange}
                ></textarea>
              </div>
              <div className="ap-modal-actions-footer">
                <button
                  type="button"
                  className="ap-btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel Block
                </button>
                <button type="submit" className="ap-btn-primary">
                  Commit Specifications to Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
