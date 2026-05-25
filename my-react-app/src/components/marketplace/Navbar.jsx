import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Navbar({
  cartCount,
  wishlistCount,
  currentUser,
  onLogout,
  onOpenAuth,
  onOpenSupport, // 👈 Captured modal activation prop here
  onActionToast,
  searchQuery,
  setSearchQuery,
  setActiveBrand,
  setActiveCat,
  setActiveFilter,
  filteredProducts,
  onCartClick,
  onWishlistClick,
  setSelectedProduct,
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();

  return (
    <nav style={{ position: "relative" }}>
      {/* ========================================== */}
      {/* LOGO */}
      {/* ========================================== */}
      <a
        href="#"
        className="logo"
        onClick={(e) => {
          e.preventDefault();
          navigate("/");
          if (setSelectedProduct) {
            setSelectedProduct(null);
          }
        }}
      >
        नाल<span>पाक</span>
      </a>

      {/* ========================================== */}
      {/* SEARCH BAR */}
      {/* ========================================== */}
      <div className="search-bar">
        <span className="search-icon">🔍</span>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setActiveBrand("all");
            setActiveCat("all");
            setActiveFilter("all");
          }}
          placeholder="Search snacks, brands..."
        />

        {searchQuery && (
          <button
            className="clear-search-btn"
            onClick={() => setSearchQuery("")}
          >
            ✕
          </button>
        )}

        {/* SEARCH RESULTS */}
        {searchQuery && filteredProducts.length > 0 && (
          <div className="search-dropdown">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="search-item"
                onClick={() => {
                  if (setSelectedProduct) {
                    setSelectedProduct(product);
                  } else {
                    const element = document.getElementById(
                      `product-${product.id}`,
                    );

                    if (element) {
                      element.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                    }
                  }
                  setSearchQuery("");
                }}
              >
                <span style={{ fontSize: "1.5rem" }}>
                  {product.emoji}
                </span>

                <div>
                  <strong>{product.name}</strong>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.8rem",
                      opacity: 0.7,
                    }}
                  >
                    {product.brand}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* RIGHT NAV */}
      {/* ========================================== */}
      <div className="nav-right">
        {/* CITY */}
        <div
          className="nav-city"
          onClick={() => onActionToast("Location settings coming soon")}
        >
          📍 <strong>Mumbai</strong>
        </div>

        {/* 📬 COMPLAINTS & QUERIES TRIGGER */}
        <button 
          className="nav-icon support-trigger-btn" 
          onClick={onOpenSupport}
          title="File a complaint or inquiry ticket"
          style={{
            background: "none",
            border: "none",
            fontSize: "1.1rem",
            cursor: "pointer",
            padding: "4px 8px",
            display: "flex",
            alignItems: "center",
            gap: "4px"
          }}
        >
          💬 <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--ink)" }}>Support</span>
        </button>

        {/* WISHLIST */}
        <button className="nav-icon" onClick={onWishlistClick}>
          ❤️{" "}
          {wishlistCount > 0 && (
            <span className="nav-badge">{wishlistCount}</span>
          )}
        </button>

        {/* CART */}
        <button className="nav-icon" onClick={onCartClick}>
          🛒 {cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
        </button>

        {/* ========================================== */}
        {/* AUTH SECTION */}
        {/* ========================================== */}
        {currentUser ? (
          <div style={{ position: "relative" }}>
            
            {/* PROFILE BUTTON */}
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              style={{
                background: "var(--cream)",
                border: "1px solid var(--cream-3)",
                padding: "8px 14px",
                borderRadius: "20px",
                cursor: "pointer",
                fontWeight: "600",
                color: "var(--ink)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              👤 {currentUser.name}
              <span style={{ fontSize: "0.7rem" }}>▼</span>
            </button>

            {/* DROPDOWN MENU */}
            {showProfileMenu && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "42px",
                  background: "var(--white)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                  borderRadius: "8px",
                  padding: "8px 0",
                  minWidth: "180px",
                  zIndex: 1000,
                  border: "1px solid var(--cream-2)",
                }}
              >
                {/* USER INFO */}
                <div
                  style={{
                    padding: "6px 16px",
                    fontSize: "0.75rem",
                    color: "var(--stone)",
                  }}
                >
                  Logged in as <br />
                  <strong style={{ color: "var(--ink)" }}>
                    {currentUser.email}
                  </strong>
                </div>

                <hr
                  style={{
                    border: "none",
                    borderTop: "1px solid var(--cream-2)",
                    margin: "6px 0",
                  }}
                />

                {/* ======================================================= */}
                {/* DYNAMIC ADMIN ACCESS GATE LINK */}
                {/* ======================================================= */}
                {(currentUser.role === "admin" || currentUser.isAdmin === true) && (
                  <>
                    <button
                      onClick={() => {
                        navigate("/admin");
                        setShowProfileMenu(false);
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        background: "var(--saffron-light, #fff5eb)",
                        border: "none",
                        padding: "10px 16px",
                        cursor: "pointer",
                        color: "#e07b2a",
                        fontSize: "0.9rem",
                        fontWeight: "700",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      🎛️ Admin Terminal
                    </button>
                    
                    <hr
                      style={{
                        border: "none",
                        borderTop: "1px solid var(--cream-2)",
                        margin: "6px 0",
                      }}
                    />
                  </>
                )}

                {/* USER ORDERS */}
                <button
                  onClick={() => {
                    navigate("/orders");
                    setShowProfileMenu(false);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    padding: "10px 16px",
                    cursor: "pointer",
                    color: "var(--ink)",
                    fontSize: "0.9rem",
                  }}
                >
                  📦 My Orders
                </button>

                {/* LOGOUT */}
                <button
                  onClick={() => {
                    onLogout();
                    setShowProfileMenu(false);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    padding: "10px 16px",
                    cursor: "pointer",
                    color: "#ec4899",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                  }}
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="btn-signin" onClick={onOpenAuth}>
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
}