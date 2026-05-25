// WishlistDrawer.jsx

export default function WishlistDrawer({
  isOpen,
  onClose,
  wishlist,
  onToggleWishlist,
  onAddCart,
  products = [] // 🌟 FIX 1: Read dynamically from the database state instead of static file imports
}) {
  if (!isOpen) return null;

  // 🌟 FIX 2: Filter against real database products and enforce continuous String-based ID lookups
  const wishlistedItems = products.filter(
    (product) => !!wishlist[String(product.id)],
  );

  return (
    <div className="cart-overlay" onClick={onClose}>
      <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        {/* HEADER BLOCK */}
        <div
          className="modal-top"
          style={{
            padding: "24px",
            borderBottom: "1px solid var(--cream-3)",
            background: "var(--cream)",
          }}
        >
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
          <h2
            style={{
              fontFamily: "Fraunces, serif",
              color: "var(--ink)",
              margin: "0 0 4px 0",
            }}
          >
            Your Favorites
          </h2>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--stone)" }}>
            Your saved regional Indian snacks ({wishlistedItems.length} items)
          </p>
        </div>

        {/* SCROLLABLE SAVED ITEMS LIST */}
        <div
          className="drawer-body"
          style={{ flex: 1, overflowY: "auto", padding: "24px" }}
        >
          {wishlistedItems.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: "var(--stone)",
                padding: "64px 0",
              }}
            >
              <span style={{ fontSize: "3.5rem" }}>❤️</span>
              <p
                style={{
                  marginTop: "16px",
                  fontWeight: "bold",
                  fontSize: "1.1rem",
                  color: "var(--ink)",
                }}
              >
                Your wishlist is empty!
              </p>
              <p style={{ fontSize: "0.9rem", color: "var(--stone-light)" }}>
                Tap the heart icon on any snack to save it here for later.
              </p>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {wishlistedItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    gap: "16px",
                    alignItems: "center",
                    paddingBottom: "16px",
                    borderBottom: "1px solid var(--cream-2)",
                  }}
                >
                  {/* Item Emoji */}
                  <div
                    style={{
                      fontSize: "2rem",
                      background: "var(--cream)",
                      padding: "12px",
                      borderRadius: "12px",
                      border: "1px solid var(--cream-3)",
                    }}
                  >
                    {item.emoji || "🍿"}
                  </div>

                  {/* Item Details */}
                  <div style={{ flex: 1 }}>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: "1rem",
                        color: "var(--ink)",
                        fontWeight: "600",
                      }}
                    >
                      {item.name}
                    </h4>
                    <p
                      style={{
                        margin: "2px 0 6px",
                        fontSize: "0.8rem",
                        color: "var(--stone)",
                      }}
                    >
                      {item.brand}
                    </p>
                    <div style={{ fontWeight: "700", color: "var(--ink)" }}>
                      ₹{item.price}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {/* Add To Cart Shortcut */}
                    <button
                      onClick={(e) => {
                        onAddCart(e, item.id, item.name);
                      }}
                      style={{
                        background: "var(--saffron)",
                        color: "#fff",
                        border: "none",
                        padding: "8px 12px",
                        borderRadius: "20px",
                        cursor: "pointer",
                        fontWeight: "600",
                        fontSize: "0.85rem",
                      }}
                    >
                      🛒 Add
                    </button>

                    {/* Remove From Wishlist Button */}
                    <button
                      onClick={(e) => onToggleWishlist(e, item.id)}
                      style={{
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        fontSize: "1.2rem",
                        color: "var(--saffron-dark)",
                        padding: "4px",
                      }}
                      title="Remove from favorites"
                    >
                      ❤️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}