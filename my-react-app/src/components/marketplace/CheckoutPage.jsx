import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { API_BASE } from "../../config/api";

// 🚀 UTILITY: Inject and await the Razorpay SDK dynamically before construction
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function CheckoutPage({
  cartItems: propCartItems,
  currentUser,
  setCartItems,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [dbCartItems, setDbCartItems] = useState([]);

  useEffect(() => {
    if (!currentUser?.id) return;
    const fetchDatabaseCart = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/cart/${currentUser.id}`);
        if (res.ok) {
          const data = await res.json();
          setDbCartItems(data);
        }
      } catch (err) {
        console.error("Failed to sync database cart:", err);
      }
    };
    fetchDatabaseCart();
  }, [currentUser]);

  const cartItems = useMemo(() => {
    if (dbCartItems && dbCartItems.length > 0) return dbCartItems;
    if (propCartItems && propCartItems.length > 0) return propCartItems;
    if (location.state?.cartItems && location.state.cartItems.length > 0)
      return location.state.cartItems;
    return [];
  }, [dbCartItems, propCartItems, location.state]);

  const subtotal = useMemo(() => {
    return cartItems.reduce(
      (acc, item) =>
        acc + Number(item.price || item.historical_price || 0) * item.quantity,
      0,
    );
  }, [cartItems]);

  const delivery = useMemo(() => {
    if (subtotal === 0 || subtotal >= 499) return 0;
    return 40; // Synchronized to match Postgres backend configuration
  }, [subtotal]);

  const grandTotal = useMemo(() => subtotal + delivery, [subtotal, delivery]);

  if (cartItems.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: "#fdfaf4", padding: "40px 20px", fontFamily: "sans-serif" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", textAlign: "center", background: "white", padding: "50px", borderRadius: "12px", border: "1px solid #ede3d0" }}>
          <h2>Your basket appears to be empty 📦</h2>
          <button
            onClick={() => navigate("/")}
            style={{ background: "#e07b2a", color: "white", border: "none", padding: "12px 24px", borderRadius: "8px", fontWeight: "700", cursor: "pointer", marginTop: "15px" }}
          >
            Browse Snacks Catalog
          </button>
        </div>
      </div>
    );
  }

  return (
    <CheckoutForm
      cartItems={cartItems}
      currentUser={currentUser}
      setCartItems={setCartItems}
      subtotal={subtotal}
      delivery={delivery}
      grandTotal={grandTotal}
      navigate={navigate}
    />
  );
}

function CheckoutForm({
  cartItems,
  currentUser,
  setCartItems,
  subtotal,
  delivery,
  grandTotal,
  navigate,
}) {
  const [loading, setLoading] = useState(false);
  const autocompleteRef = useRef(null);
  
  const [formData, setFormData] = useState({
    fullName: currentUser?.name || "",
    phone: currentUser?.phone && currentUser?.phone !== "N/A" ? currentUser.phone : "",
    streetAddress: "",
    city: "",
    stateName: "",
    pincode: "",
  });

  // Modern Google Places Autocomplete Lifecycle Hook Setup
  useEffect(() => {
    let isMounted = true;
    let targetComponent = autocompleteRef.current;

    import("@googlemaps/js-api-loader")
      .then(({ setOptions, importLibrary }) => {
        if (!isMounted) return;
        setOptions({
          apiKey: "AIzaSyCMfPeKqoDLv-RQvc9ehDYqhrpK6WagV20",
          version: "weekly",
        });
        return importLibrary("places");
      })
      .then(() => {
        if (!isMounted || !targetComponent) return;

        // Custom elements accept direct property config values on compilation
        targetComponent.componentRestrictions = { country: "in" };

        const handlePlaceSelect = async (e) => {
          const place = e.target.value; // Modern event target payload exposes the native value object
          if (!place) return;

          await place.fetchFields({ fields: ["displayName", "addressComponents"] });

          if (!place.addressComponents) {
            return;
          }

          let streetNumber = "", route = "", sublocality = "", locality = "", administrativeArea = "", postalCode = "";

          for (const component of place.addressComponents) {
            const type = component.types[0];
            if (type === "street_number") streetNumber = component.longName;
            else if (type === "route") route = component.longName;
            else if (type === "sublocality_level_1" || type === "sublocality") sublocality = component.longName;
            else if (type === "locality") locality = component.longName;
            else if (type === "administrative_area_level_1") administrativeArea = component.longName;
            else if (type === "postal_code") postalCode = component.longName;
          }

          const builtStreet = [streetNumber, route, sublocality].filter(Boolean).join(", ") || place.displayName || "";

          setFormData((prev) => ({
            ...prev,
            streetAddress: builtStreet,
            city: locality || prev.city,
            stateName: administrativeArea || prev.stateName,
            pincode: postalCode || prev.pincode,
          }));
        };

        targetComponent.addEventListener("gmp-placeselect", handlePlaceSelect);
        
        // Save clean reference for the teardown routine
        targetComponent._handler = handlePlaceSelect;
      })
      .catch((err) => console.error("Google Maps Places UI Bootstrap Failure:", err));

    return () => {
      isMounted = false;
      if (targetComponent && targetComponent._handler) {
        targetComponent.removeEventListener("gmp-placeselect", targetComponent._handler);
      }
    };
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleProceedToPayment = async (e) => {
    e.preventDefault();
    if (!currentUser?.id) {
      alert("🔐 Authorization Required: Please log in to complete your transaction.");
      return;
    }

    setLoading(true);

    const isScriptLoaded = await loadRazorpayScript();
    if (!isScriptLoaded) {
      alert("🌐 Connection Error: Failed to fetch the Razorpay payment gateway.");
      setLoading(false);
      return;
    }

    const orderPayload = {
      userId: currentUser.id,
      addressDetails: {
        fullName: formData.fullName,
        phone: formData.phone,
        street: formData.streetAddress, 
        city: formData.city,
        stateName: formData.stateName,
        pincode: formData.pincode,
      },
      cartItems: cartItems.map((item) => ({
        product_id: item.product_id || item.id,
        name: item.name || item.historical_name,
        price: Number(item.price || item.historical_price || 0),
        quantity: item.quantity,
      })),
    };

    try {
      const response = await fetch(`${API_BASE}/api/orders/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Backend verification loop initiation crash failure.");
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Nalapaka Snacks",
        description: `Order Purchase Ref #${data.orderId}`,
        order_id: data.razorpayOrderId,
        handler: async function (paymentResponse) {
          try {
            setLoading(true);
            const verifyResponse = await fetch(`${API_BASE}/api/orders/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: data.orderId,
                razorpayPaymentId: paymentResponse.razorpay_payment_id,
                razorpayOrderId: paymentResponse.razorpay_order_id,
                razorpaySignature: paymentResponse.razorpay_signature,
              }),
            });

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              alert("🎉 Payment Success! Your order has been recorded.");
              setCartItems([]);
              localStorage.removeItem("nalapaka_cart");
              navigate("/orders?payment_success=true");
            } else {
              alert(`🛑 Payment Verification Check Failed: ${verifyData.error}`);
            }
          } catch (verifyErr) {
            console.error("Local signature checking loop crash:", verifyErr);
            alert("Failed to safely process checkout update states.");
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: orderPayload.addressDetails.fullName,
          contact: orderPayload.addressDetails.phone,
        },
        theme: { color: "#b5591a" },
        modal: {
          ondismiss: function () {
            setLoading(false);
          }
        }
      };

      const razorpayOverlayInstance = new window.Razorpay(options);
      razorpayOverlayInstance.open();

    } catch (err) {
      console.error("Razorpay Component Setup Crash Handlers:", err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const labelStyle = { display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#7a6a54", marginBottom: "4px" };
  const inputStyle = { width: "100%", padding: "12px", margin: "2px 0 14px 0", borderRadius: 8, border: "1px solid #bfb09a", background: "#fdfaf4", fontSize: "0.95rem", boxSizing: "border-box", color: "#1c1409" };

  return (
    <div style={{ minHeight: "100vh", background: "#fdfaf4", padding: "40px 20px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", borderBottom: "1px solid #ede3d0", paddingBottom: "16px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "2rem", color: "#1c1409" }}>🛎️ Secure Checkout</h1>
            <p style={{ margin: "4px 0 0 0", color: "#7a6a54", fontSize: "0.95rem" }}>
              Logged in as: <strong>{currentUser?.name || "Customer"}</strong> ({currentUser?.email})
            </p>
          </div>
          <button 
            onClick={() => navigate("/")} 
            disabled={loading} 
            style={{ border: "none", background: "#f5efe1", padding: "10px 18px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", color: "#1c1409" }}
          >
            ← Keep Shopping
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "30px", alignItems: "start" }}>
          <div style={{ background: "white", padding: "24px", borderRadius: "12px", border: "1px solid #ede3d0" }}>
            <h3 style={{ margin: "0 0 20px 0", paddingBottom: "8px", borderBottom: "2px solid #fdfaf4" }}>📍 Delivery Shipping Details</h3>
            <form onSubmit={handleProceedToPayment}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={labelStyle}>Full Name *</label>
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} required style={inputStyle} disabled={loading} />
                </div>
                <div>
                  <label style={labelStyle}>Mobile Phone Number *</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required style={inputStyle} disabled={loading} />
                </div>
              </div>

              <div style={{ marginTop: "6px", marginBottom: "14px" }}>
                <label style={labelStyle}>Street Address / Door No. *</label>
                <gmp-placeautocomplete 
                  ref={autocompleteRef}
                  style={{ width: "100%" }}
                >
                  <input 
                    type="text" 
                    name="streetAddress" 
                    value={formData.streetAddress} 
                    onChange={handleInputChange} 
                    required 
                    style={{ ...inputStyle, margin: 0 }} 
                    placeholder="Type or click map lookup components..." 
                    disabled={loading} 
                  />
                </gmp-placeautocomplete>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginTop: "6px" }}>
                <div>
                  <label style={labelStyle}>City *</label>
                  <input type="text" name="city" value={formData.city} onChange={handleInputChange} required style={inputStyle} disabled={loading} />
                </div>
                <div>
                  <label style={labelStyle}>State *</label>
                  <input type="text" name="stateName" value={formData.stateName} onChange={handleInputChange} required style={inputStyle} disabled={loading} />
                </div>
                <div>
                  <label style={labelStyle}>Pincode / Zip *</label>
                  <input type="text" name="pincode" value={formData.pincode} onChange={handleInputChange} required style={inputStyle} disabled={loading} />
                </div>
              </div>

              <button type="submit" disabled={loading} style={{ width: "100%", background: loading ? "#7a6a54" : "#b5591a", color: "white", border: "none", padding: "16px", borderRadius: "8px", fontSize: "1.1rem", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer", marginTop: "16px" }}>
                {loading ? "🔄 Contacting Razorpay Bridge..." : `Pay Securely ₹${grandTotal} →`}
              </button>
            </form>
          </div>

          <div style={{ background: "white", padding: "24px", borderRadius: "12px", border: "1px solid #ede3d0", position: "sticky", top: "20px" }}>
            <h3 style={{ margin: "0 0 16px 0", paddingBottom: "8px", borderBottom: "2px solid #fdfaf4" }}>🛒 Order Summary ({cartItems.length})</h3>
            <div style={{ maxHeight: "240px", overflowY: "auto", marginBottom: "16px" }}>
              {cartItems.map((item, idx) => (
                <div key={item.id || idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px dashed #ede3d0" }}>
                  <div>
                    <span style={{ fontWeight: "600", display: "block" }}>{item.name || item.historical_name}</span>
                    <span style={{ fontSize: "0.85rem", color: "#7a6a54" }}>₹{item.price || item.historical_price} × {item.quantity}</span>
                  </div>
                  <strong>₹{Number(item.price || item.historical_price || 0) * item.quantity}</strong>
                </div>
              ))}
            </div>

            <div style={{ background: "#fdfaf4", padding: "14px", borderRadius: "8px", border: "1px solid #ede3d0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span>Delivery Charges</span>
                <span style={{ color: delivery === 0 ? "#1f7a4a" : "#1c1409", fontWeight: delivery === 0 ? "600" : "normal" }}>
                  {delivery === 0 ? "FREE" : `₹${delivery}`}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.2rem", fontWeight: "700", marginTop: 10, paddingTop: 10, borderTop: "2px dashed #ede3d0" }}>
                <span>Grand Total</span>
                <span style={{ color: "#b5591a" }}>₹{grandTotal}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}