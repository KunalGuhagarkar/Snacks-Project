import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../styles/CustomerDashboard.css";

export default function CustomerDashboard({ currentUser }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [selectedTrackedOrder, setSelectedTrackedOrder] = useState(null);
  const [activeSection, setActiveSection] = useState("profile");
  // 💾 Cache the last looked-up order locally so moving between tabs doesn't delete it
  const [lastViewedOrderCache, setLastViewedOrderCache] = useState(null);

  const STAGES = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered"];

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveSection(location.state.activeTab);
    }
    
    if (location.state?.targetOrderId) {
      const fetchSpecificOrder = async () => {
        try {
          const res = await fetch(`http://localhost:5000/api/orders/details/${location.state.targetOrderId}`);
          const data = await res.json();
          if (res.ok) {
            setSelectedTrackedOrder(data);
            setLastViewedOrderCache(data); // Save to cache
          } else {
            console.error("Backend validation issue during lookup:", data.error);
          }
        } catch (err) {
          console.error("Error fetching milestone tracking context:", err);
        }
      };
      
      fetchSpecificOrder();
    }
  }, [location.state]);

  const getCurrentStageIndex = (status) => {
    const normalized = status?.toLowerCase().trim().replace(/\s+/g, ' ') || "";
    if (normalized === "cancelled" || normalized === "returned") return -1;
    
    return STAGES.findIndex(stage => stage.toLowerCase().trim() === normalized);
  };

  return (
    <div className="cd-dashboard-global-container">
      
      {/* 🌐 TOP NAVIGATION BAR */}
      <header className="cd-navbar-header">
        <div className="cd-nav-brand-group" onClick={() => navigate("/orders")} style={{ cursor: "pointer" }}>
          <span className="cd-nav-logo-icon">🍲</span>
          <h1 className="cd-nav-brand-title">Nalapaka Orders</h1>
        </div>
        
        <div className="cd-nav-meta-links">
          <span className="cd-nav-breadcrumb-indicator">
            Account Hub &gt; <strong style={{ color: "#e67e22" }}>{activeSection.toUpperCase()}</strong>
          </span>
          <button className="cd-nav-home-direct-btn" onClick={() => navigate("/orders")}>
            &larr; Back to Orders Page
          </button>
        </div>
      </header>

      <div className="cd-dashboard-workspace-layout">
        
        {/* 🗂️ SIDEBAR NAVIGATION CONTROL DOCK */}
        <aside className="cd-sidebar-navigation-dock">
          <div className="cd-user-profile-summary-badge">
            <div className="cd-avatar-placeholder">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
            </div>
            <h4>{currentUser?.name || "Guest Customer"}</h4>
            <p>{currentUser?.email || "No email bound"}</p>
          </div>
          
          <nav className="cd-sidebar-menu-links">
            <button 
              className={`cd-tab-anchor-btn ${activeSection === "profile" ? "active-dock" : ""}`}
              onClick={() => setActiveSection("profile")}
            >
              👤 My Profile Metrics
            </button>
            <button 
              className={`cd-tab-anchor-btn ${activeSection === "orders" ? "active-dock" : ""}`}
              onClick={() => {
                setActiveSection("orders");
                // 🔥 FIXED: Restore from fallback cache state instead of blowing it away to null
                if (lastViewedOrderCache) {
                  setSelectedTrackedOrder(lastViewedOrderCache);
                }
              }}
            >
              📦 Order Live Tracker
            </button>
          </nav>

          <div className="cd-sidebar-footer-info">
            <p>Need support with an order?</p>
            <button className="cd-sidebar-help-btn" onClick={() => navigate("/")}>Marketplace Storefront</button>
          </div>
        </aside>

        {/* 💻 MAIN WORKSPACE STAGE AREA */}
        <main className="cd-main-workspace-slate">
          
          {/* VIEW CASE A: DEEP VIEW STEP LIVE TRACKING IS ACTIVE */}
          {activeSection === "orders" && selectedTrackedOrder ? (
            <div className="cd-status-page-wrapper animated-fade-in">
              <div className="cd-status-header-strip">
                <button 
                  className="cd-status-back-btn" 
                  onClick={() => {
                    setSelectedTrackedOrder(null);
                    setLastViewedOrderCache(null); // Clear cache completely if user hits explicit clear
                  }}
                >
                  &larr; Return to Order Selection List
                </button>
                <h2>Tracking Reference Order: <span style={{ color: "#e67e22" }}>#{selectedTrackedOrder.id}</span></h2>
              </div>

              {/* VISUAL PIPELINE PROGRESS TIMELINE CARD */}
              <div className="cd-tracking-timeline-card">
                {selectedTrackedOrder.order_status?.toLowerCase().trim() === "cancelled" ? (
                  <div className="cd-cancelled-banner-alert">
                    <h3>🚨 This order was Cancelled</h3>
                    <p>Refund adjustments have been processed natively back to your original source account layout.</p>
                  </div>
                ) : selectedTrackedOrder.order_status?.toLowerCase().trim() === "returned" ? (
                  <div className="cd-cancelled-banner-alert" style={{ backgroundColor: "#fef3c7", borderColor: "#f59e0b" }}>
                    <h3 style={{ color: "#b45309" }}>📦 This order was Returned</h3>
                    <p style={{ color: "#78350f" }}>The item return lifecycle is complete. Thank you for shopping with Nalapaka.</p>
                  </div>
                ) : (
                  <div className="cd-pipeline-progress-track">
                    {STAGES.map((stage, idx) => {
                      const currentStageIndex = getCurrentStageIndex(selectedTrackedOrder.order_status);
                      const isCompleted = idx <= currentStageIndex;
                      const isActive = idx === currentStageIndex;
                      
                      return (
                        <div 
                          key={stage} 
                          className={`cd-timeline-node-step ${isCompleted ? "node-passed" : ""} ${isActive ? "node-current-pulse" : ""}`}
                        >
                          <div className="cd-node-indicator-circle">
                            {isCompleted ? "✓" : idx + 1}
                          </div>
                          <span className="cd-node-label-caption">{stage}</span>
                          {idx < STAGES.length - 1 && <div className="cd-connecting-pipeline-wire"></div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ITEM SUMMARY INVOICE BREAKDOWN CARD */}
              <div className="cd-status-receipt-card">
                <h3>📋 Purchased Manifest Summary</h3>
                <p className="cd-status-timestamp-meta">
                  Transaction Timestamp: {new Date(selectedTrackedOrder.created_at).toLocaleString("en-IN")}
                </p>
                <hr className="cd-divider-dashed" />
                
                <div className="cd-receipt-items-container">
                  {selectedTrackedOrder.items && selectedTrackedOrder.items.length > 0 ? (
                    selectedTrackedOrder.items.map((item) => (
                      <div key={item.id} className="cd-receipt-status-row">
                        <span>{item.historical_name} <strong style={{ color: "#7f8c8d" }}>× {item.quantity}</strong></span>
                        <span>₹{Number(item.historical_price) * parseInt(item.quantity || 1, 10)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="cd-empty-notice">No individual item details appended to this tracking manifest.</p>
                  )}
                </div>

                <hr className="cd-divider-dashed" />
                <div className="cd-receipt-grand-total-row">
                  <span>Grand Total Settled (Tax Incl.)</span>
                  <strong style={{ fontSize: "1.3rem", color: "#27ae60" }}>₹{selectedTrackedOrder.grand_total}</strong>
                </div>
              </div>
            </div>
          ) : null}

          {/* VIEW CASE B: PROFILE SETTINGS VIEW */}
          {activeSection === "profile" && (
            <div className="cd-profile-editor-card animated-fade-in">
              <div className="cd-section-title-header">
                <h2>Account Profile Metrics</h2>
                <p>Manage your core parameters and credentials registered across the marketplace system backend.</p>
              </div>
              <div className="cd-profile-fields-grid">
                <div className="cd-profile-field-node">
                  <label>Customer Full Name</label>
                  <input type="text" value={currentUser?.name || "Nalapaka User"} disabled />
                </div>
                <div className="cd-profile-field-node">
                  <label>Primary E-mail Address</label>
                  <input type="text" value={currentUser?.email || "Not Bound"} disabled />
                </div>
                <div className="cd-profile-field-node">
                  <label>System Identification ID Hash</label>
                  <input type="text" value={currentUser?.id || "Null"} disabled style={{ fontFamily: "monospace", color: "#7f8c8d" }} />
                </div>
              </div>
            </div>
          )}

          {/* VIEW CASE C: ORDERS TAB ACTIVE BUT NO SPECIFIC INVOICE CLICKED YET */}
          {activeSection === "orders" && !selectedTrackedOrder && (
            <div className="cd-history-empty-card animated-fade-in">
              <div className="cd-empty-state-icon-bubble">📦</div>
              <h2>Live Status Progress Tracker</h2>
              <p>Select an ongoing distribution tracking loop from your main order transaction histories tab to launch the live shipment timeline graph dashboard.</p>
              <button className="cd-action-history-jump" onClick={() => navigate("/orders")}>
                Go Back to My Orders History Page
              </button>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}