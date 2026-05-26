import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Navbar({
  cartCount,
  wishlistCount,
  currentUser,
  onLogout,
  onOpenAuth,
  onOpenSupport,
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
  const location = useLocation();
  const menuRef = useRef(null);

  // Close profile dropdown cleanly if a user clicks outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanly shut the profile menu down whenever the active route path transforms
  useEffect(() => {
    setShowProfileMenu(false);
  }, [location.pathname]);

  const handleSearchResultClick = (product) => {
    setSearchQuery("");
    
    // If the user isn't on the homepage marketplace layout track, redirect them first
    if (location.pathname !== "/") {
      navigate("/");
      // Allow the home DOM layout to fully mount before focusing the target element node
      setTimeout(() => {
        const element = document.getElementById(`product-${product.id}`);
        if (element) element.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return;
    }

    if (setSelectedProduct) {
      setSelectedProduct(product);
    } else {
      const element = document.getElementById(`product-${product.id}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  return (
    <nav className="main-navbar">
      {/* BRAND LOGO */}
      <a
        href="#"
        className="logo"
        onClick={(e) => {
          e.preventDefault();
          navigate("/");
          if (setSelectedProduct) setSelectedProduct(null);
        }}
      >
        नाल<span>पाक</span>
      </a>

      {/* SEARCH ENGINE TRACK */}
      <div className="search-bar-wrapper">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (setActiveBrand) setActiveBrand("all");
              if (setActiveCat) setActiveCat("all");
              if (setActiveFilter) setActiveFilter("all");
            }}
            placeholder="Search snacks, brands..."
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery("")}>
              ✕
            </button>
          )}
        </div>

        {/* SEARCH RESULTS DROPDOWN */}
        {searchQuery && filteredProducts.length > 0 && (
          <div className="search-dropdown">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="search-item"
                onClick={() => handleSearchResultClick(product)}
              >
                <span className="search-item-icon">{product.emoji || "🍿"}</span>
                <div className="search-item-content">
                  <div className="search-item-name">{product.name}</div>
                  <div className="search-item-brand">{product.brand || product.brand_key}</div>
                </div>
                <div className="search-item-price">₹{product.price}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* UTILITY NAVIGATION ROW */}
      <div className="nav-right">
        {/* GEOLOCATION HUB */}
        <div
          className="nav-city"
          onClick={() => onActionToast("Location settings coming soon")}
        >
          📍 <strong>Mumbai</strong>
        </div>

        {/* SUPPORT TICKETING TRIGGER */}
        <button 
          className="nav-icon support-trigger-btn" 
          onClick={onOpenSupport}
          title="File a complaint or inquiry ticket"
          type="button"
        >
          💬 <span className="support-trigger-text">Support</span>
        </button>

        {/* WISHLIST TRACK */}
        <button className="nav-icon" onClick={onWishlistClick} type="button">
          ❤️ {wishlistCount > 0 && <span className="nav-badge">{wishlistCount}</span>}
        </button>

        {/* SHOPPING CART TRACK */}
        <button className="nav-icon" onClick={onCartClick} type="button">
          🛒 {cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
        </button>

        {/* AUTHENTICATION PORTAL LINK */}
        {currentUser ? (
          <div className="profile-menu-container" ref={menuRef}>
            <button
              className="profile-dropdown-trigger"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              type="button"
            >
              👤 {currentUser.name} <span className="arrow-indicator">▼</span>
            </button>

            {showProfileMenu && (
              <div className="profile-dropdown-menu">
                <div className="user-meta-info">
                  Logged in as <br />
                  <strong>{currentUser.email}</strong>
                </div>
                
                <hr className="dropdown-divider" />

                {/* DYNAMIC ADMINISTRATIVE ACCESS GATE */}
                {(currentUser.role === "admin" || currentUser.isAdmin === true) && (
                  <>
                    <button
                      className="admin-terminal-btn"
                      onClick={() => navigate("/admin")}
                      type="button"
                    >
                      🎛️ Admin Terminal
                    </button>
                    <hr className="dropdown-divider" />
                  </>
                )}

                <button
                  className="dropdown-menu-item"
                  onClick={() => navigate("/orders")}
                  type="button"
                >
                  📦 My Orders
                </button>

                <button
                  className="dropdown-logout-btn"
                  onClick={onLogout}
                  type="button"
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="btn-signin" onClick={onOpenAuth} type="button">
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
}