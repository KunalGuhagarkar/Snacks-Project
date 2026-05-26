import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  currentUser,
}) {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");

  // Clear errors automatically whenever the drawer state toggles
  useEffect(() => {
    if (!isOpen) {
      setErrorMessage("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ==========================================
  // 💡 CART CALCULATIONS
  // ==========================================
  const subtotal = cartItems.reduce(
    (acc, item) => acc + Number(item.price) * item.quantity,
    0,
  );

  const freeShippingThreshold = 499;
  const shippingCharge = subtotal >= freeShippingThreshold || subtotal === 0 ? 0 : 49;
  const grandTotal = subtotal + shippingCharge;

  // ==========================================
  // 🚀 GO TO CHECKOUT PAGE
  // ==========================================
  const handleProceedCheckout = () => {
    if (!currentUser) {
      setErrorMessage("⚠️ Please sign in or register to complete your order checkout.");
      return;
    }

    if (cartItems.length === 0) {
      setErrorMessage("🛒 Your basket is currently empty.");
      return;
    }

    onClose();

    navigate("/checkout", {
      state: {
        cartItems,
        currentUser,
        subtotal,
        shippingCharge,
        grandTotal,
      },
    });
  };

  // Defensive close selector: Only trigger if the background overlay mask itself is targeted
  const handleBackdropClick = (e) => {
    if (e.target.classList.contains("cart-overlay")) {
      onClose();
    }
  };

  return (
    <div className="cart-overlay" onClick={handleBackdropClick}>
      <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        {/* ========================================== */}
        {/* HEADER */}
        {/* ========================================== */}
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
            Your Snack Basket
          </h2>

          <p
            style={{
              margin: 0,
              fontSize: "0.9rem",
              color: "var(--stone)",
            }}
          >
            Review your selected delicacies (
            {cartItems.reduce((a, c) => a + c.quantity, 0)} items)
          </p>
        </div>

        {/* ========================================== */}
        {/* INLINE ERROR MESSAGES */}
        {/* ========================================== */}
        {errorMessage && (
          <div 
            style={{
              background: "#fdf2f2",
              color: "#ec4899",
              padding: "12px 24px",
              fontSize: "0.85rem",
              textAlign: "center",
              borderBottom: "1px solid #fce7f3",
              fontWeight: "500"
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* ========================================== */}
        {/* ITEMS LIST */}
        {/* ========================================== */}
        <div
          className="drawer-body"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
          }}
        >
          {cartItems.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: "var(--stone)",
                padding: "64px 0",
              }}
            >
              <span style={{ fontSize: "3.5rem" }}>🥣</span>

              <p
                style={{
                  marginTop: "16px",
                  fontWeight: "bold",
                  fontSize: "1.1rem",
                  color: "var(--ink)",
                }}
              >
                Your basket is empty!
              </p>

              <p
                style={{
                  fontSize: "0.9rem",
                  color: "var(--stone-light)",
                }}
              >
                Explore our menu and add legendary regional snacks.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {cartItems.map((item) => (
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
                  {/* PRODUCT EMOJI */}
                  <div
                    style={{
                      fontSize: "2rem",
                      background: "var(--saffron-light)",
                      padding: "12px",
                      borderRadius: "12px",
                      border: "1px solid var(--cream-3)",
                    }}
                  >
                    {item.emoji}
                  </div>

                  {/* PRODUCT INFO */}
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

                    <div
                      style={{
                        fontWeight: "700",
                        color: "var(--saffron-dark)",
                      }}
                    >
                      ₹{Number(item.price) * item.quantity}
                    </div>
                  </div>

                  {/* QUANTITY CONTROLS */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      background: "var(--cream-2)",
                      borderRadius: "20px",
                      padding: "4px",
                      border: "1px solid var(--cream-3)",
                    }}
                  >
                    <button
                      onClick={() => {
                        onUpdateQuantity(item.id, -1);
                        setErrorMessage("");
                      }}
                      style={{
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        padding: "4px 12px",
                        fontWeight: "bold",
                        color: "var(--ink)",
                      }}
                    >
                      -
                    </button>

                    <span
                      style={{
                        padding: "0 4px",
                        fontSize: "0.9rem",
                        fontWeight: "700",
                        color: "var(--ink)",
                      }}
                    >
                      {item.quantity}
                    </span>

                    <button
                      onClick={() => {
                        onUpdateQuantity(item.id, 1);
                        setErrorMessage("");
                      }}
                      style={{
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        padding: "4px 12px",
                        fontWeight: "bold",
                        color: "var(--ink)",
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ========================================== */}
        {/* FOOTER */}
        {/* ========================================== */}
        {cartItems.length > 0 && (
          <div
            style={{
              background: "var(--cream)",
              padding: "24px",
              borderTop: "1px solid var(--cream-3)",
            }}
          >
            {/* FREE SHIPPING MESSAGE */}
            {subtotal < freeShippingThreshold && (
              <div
                style={{
                  background: "var(--saffron-light)",
                  padding: "10px",
                  borderRadius: "10px",
                  fontSize: "0.85rem",
                  color: "var(--saffron-dark)",
                  marginBottom: "16px",
                  textAlign: "center",
                  border: "1px solid rgba(224, 123, 42, 0.15)",
                }}
              >
                💡 Add ₹{freeShippingThreshold - subtotal} more for FREE shipping!
              </div>
            )}

            {/* TOTALS */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>Items Subtotal</span>
                <span>₹{subtotal}</span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>Delivery Fee</span>
                <span>
                  {shippingCharge === 0 ? "FREE" : `₹${shippingCharge}`}
                </span>
              </div>

              <hr style={{ border: "0", borderTop: "1px solid var(--cream-3)", margin: "4px 0" }} />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "1.2rem",
                  fontWeight: "700",
                }}
              >
                <span>Grand Total</span>
                <span style={{ color: "var(--saffron-dark)" }}>
                  ₹{grandTotal}
                </span>
              </div>
            </div>

            {/* CHECKOUT BUTTON */}
            <button
              className="btn-main"
              onClick={handleProceedCheckout}
              style={{
                width: "100%",
                margin: 0,
                padding: "16px",
                fontSize: "1.05rem",
                fontWeight: "700",
              }}
            >
              Proceed to Secure Checkout →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}