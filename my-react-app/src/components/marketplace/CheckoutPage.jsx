import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { API_ENDPOINTS } from "../../config/api";

export default function CheckoutPage({
  cartItems: propCartItems,
  currentUser,
  setCartItems,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [dbCartItems, setDbCartItems] = useState([]);

  const streetInputRef = useRef(null);

  const [formData, setFormData] = useState({
    fullName: currentUser?.name || "",
    phone:
      currentUser?.phone && currentUser?.phone !== "N/A"
        ? currentUser.phone
        : "",
    streetAddress: "",
    city: "",
    stateName: "",
    pincode: "",
  });

  // =========================================================================
  // 🗺️ MODERN DYNAMIC GOOGLE PLACES BINDING ENGINE (LATEST FUNCTIONAL API)
  // =========================================================================
  useEffect(() => {
    if (!streetInputRef.current) return;

    let autocompleteInstance = null;
    let isMounted = true;

    // Dynamically pull the latest modular loader functions
    import("@googlemaps/js-api-loader")
      .then(({ setOptions, importLibrary }) => {
        if (!isMounted) return;

        // Set global configurations securely
        setOptions({
          apiKey: "AIzaSyCMfPeKqoDLv-RQvc9ehDYqhrpK6WagV20", // Your validated 40-char API key
          version: "weekly",
        });

        // Async import the dedicated Places engine
        return importLibrary("places");
      })
      .then((library) => {
        // Double check ref presence and layout mount context before mounting autocomplete
        if (!library || !streetInputRef.current || !isMounted) return;

        const { Autocomplete } = library;

        autocompleteInstance = new Autocomplete(streetInputRef.current, {
          types: ["address"],
          componentRestrictions: { country: "in" }, // Focus matching exclusively onto India delivery zones
        });

        // Handle selection events when an autocomplete option is chosen
        autocompleteInstance.addListener("place_changed", () => {
          const place = autocompleteInstance.getPlace();

          if (!place.address_components) {
            setFormData((prev) => ({
              ...prev,
              streetAddress: streetInputRef.current.value,
            }));
            return;
          }

          let streetNumber = "";
          let route = "";
          let sublocality = "";
          let locality = "";
          let administrativeArea = "";
          let postalCode = "";

          // Deconstruct Google's geolocational data metrics array
          for (const component of place.address_components) {
            const componentType = component.types[0];

            switch (componentType) {
              case "street_number":
                streetNumber = component.long_name;
                break;
              case "route":
                route = component.long_name;
                break;
              case "sublocality_level_1":
              case "sublocality":
                sublocality = component.long_name;
                break;
              case "locality":
                locality = component.long_name;
                break;
              case "administrative_area_level_1":
                administrativeArea = component.long_name;
                break;
              case "postal_code":
                postalCode = component.long_name;
                break;
              default:
                break;
            }
          }

          const builtStreet =
            [streetNumber, route, sublocality].filter(Boolean).join(", ") ||
            place.name ||
            "";

          // Write values clean into state layout parameters simultaneously
          setFormData((prev) => ({
            ...prev,
            streetAddress: builtStreet,
            city: locality || prev.city,
            stateName: administrativeArea || prev.stateName,
            pincode: postalCode || prev.pincode,
          }));
        });
      })
      .catch((err) => {
        console.error("Critical Google Maps initialization failure:", err);
      });

    // Cleanup active listeners and intercept lingering hooks on clean unmount frame
    return () => {
      isMounted = false;
      if (window.google && window.google.maps && autocompleteInstance) {
        window.google.maps.event.clearInstanceListeners(autocompleteInstance);
      }
    };
  }, []); // Run exclusively once when the viewport component tree loads

  useEffect(() => {
    if (!currentUser?.id) return;

    const fetchDatabaseCart = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.cartUser(currentUser.id));
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
    return 49;
  }, [subtotal]);

  const grandTotal = useMemo(() => subtotal + delivery, [subtotal, delivery]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (!currentUser?.id) {
      alert(
        "🔐 Authorization Required: Please log in to complete your transaction.",
      );
      return;
    }
    if (cartItems.length === 0) {
      alert(
        "🛒 Your checkout cart is empty! Add products before checking out.",
      );
      return;
    }

    setLoading(true);

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
      const targetUrl =
        API_ENDPOINTS.submitOrder ||
        "http://localhost:5000/api/orders/checkout";

      const response = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to commit order execution pipeline.",
        );
      }

      alert(
        `🎉 Order Placed Successfully! Your Order Reference ID is #${data.orderId}`,
      );

      setCartItems([]);
      localStorage.removeItem("nalapaka_cart");
      navigate("/orders");
    } catch (err) {
      console.error("Critical Checkout Submission Failure:", err);
      alert(`❌ Transaction Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const labelStyle = {
    fontSize: "0.85rem",
    fontWeight: "600",
    color: "#7a6a54",
  };
  const inputStyle = {
    width: "100%",
    padding: "12px",
    margin: "6px 0 14px 0",
    borderRadius: 8,
    border: "1px solid #bfb09a",
    background: "#fdfaf4",
    fontSize: "0.95rem",
    boxSizing: "border-box",
    color: "#1c1409",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fdfaf4",
        padding: "40px 20px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "30px",
            borderBottom: "1px solid #ede3d0",
            paddingBottom: "16px",
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: "2rem", color: "#1c1409" }}>
              🛎️ Secure Checkout
            </h1>
            <p
              style={{
                margin: "4px 0 0 0",
                color: "#7a6a54",
                fontSize: "0.95rem",
              }}
            >
              Logged in as: <strong>{currentUser?.name || "Customer"}</strong> (
              {currentUser?.email})
            </p>
          </div>
          <button
            onClick={() => navigate("/")}
            disabled={loading}
            style={{
              border: "none",
              background: "#f5efe1",
              padding: "10px 18px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              color: "#1c1409",
            }}
          >
            ← Keep Shopping
          </button>
        </div>

        {cartItems.length === 0 ? (
          <div
            style={{
              background: "white",
              padding: "50px",
              textAlign: "center",
              borderRadius: "12px",
              border: "1px solid #ede3d0",
            }}
          >
            <h2>Your basket appears to be empty 📦</h2>
            <button
              onClick={() => navigate("/")}
              style={{
                background: "#e07b2a",
                color: "white",
                border: "none",
                padding: "12px 24px",
                borderRadius: "8px",
                fontWeight: "700",
                cursor: "pointer",
                marginTop: "15px",
              }}
            >
              Browse Snacks Catalog
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 380px",
              gap: "30px",
              alignItems: "start",
            }}
          >
            <div
              style={{
                background: "white",
                padding: "24px",
                borderRadius: "12px",
                border: "1px solid #ede3d0",
              }}
            >
              <h3
                style={{
                  margin: "0 0 20px 0",
                  paddingBottom: "8px",
                  borderBottom: "2px solid #fdfaf4",
                }}
              >
                📍 Delivery Shipping Details
              </h3>

              <form onSubmit={handlePlaceOrder}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                  }}
                >
                  <div>
                    <label style={labelStyle}>Full Name *</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      required
                      style={inputStyle}
                      placeholder="e.g. Lakshmi Raman"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Mobile Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      style={inputStyle}
                      placeholder="e.g. 9845012345"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div style={{ marginTop: "6px" }}>
                  <label style={labelStyle}>
                    Street Address / Door No. / Building (Google Autocomplete
                    Live) *
                  </label>
                  <input
                    ref={streetInputRef}
                    type="text"
                    name="streetAddress"
                    value={formData.streetAddress}
                    onChange={handleInputChange}
                    required
                    style={inputStyle}
                    placeholder="Type to search your location via Google Maps..."
                    disabled={loading}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "12px",
                    marginTop: "6px",
                  }}
                >
                  <div>
                    <label style={labelStyle}>City *</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      style={inputStyle}
                      placeholder="Mysuru"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>State *</label>
                    <input
                      type="text"
                      name="stateName"
                      value={formData.stateName}
                      onChange={handleInputChange}
                      required
                      style={inputStyle}
                      placeholder="Karnataka"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Pincode / Zip *</label>
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleInputChange}
                      required
                      style={inputStyle}
                      placeholder="570002"
                      disabled={loading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    background: loading ? "#7a6a54" : "#b5591a",
                    color: "white",
                    border: "none",
                    padding: "16px",
                    borderRadius: "8px",
                    fontSize: "1.1rem",
                    fontWeight: "700",
                    cursor: loading ? "not-allowed" : "pointer",
                    marginTop: "16px",
                  }}
                >
                  {loading
                    ? "🔄 Processing Secured Order..."
                    : `Complete Order & Pay ₹${grandTotal} →`}
                </button>
              </form>
            </div>

            <div
              style={{
                background: "white",
                padding: "24px",
                borderRadius: "12px",
                border: "1px solid #ede3d0",
                position: "sticky",
                top: "20px",
              }}
            >
              <h3
                style={{
                  margin: "0 0 16px 0",
                  paddingBottom: "8px",
                  borderBottom: "2px solid #fdfaf4",
                }}
              >
                🛒 Order Summary ({cartItems.length})
              </h3>
              <div
                style={{
                  maxHeight: "240px",
                  overflowY: "auto",
                  marginBottom: "16px",
                }}
              >
                {cartItems.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 0",
                      borderBottom: "1px dashed #ede3d0",
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: "600", display: "block" }}>
                        {item.name || item.historical_name}
                      </span>
                      <span style={{ fontSize: "0.85rem", color: "#7a6a54" }}>
                        ₹{item.price || item.historical_price} × {item.quantity}
                      </span>
                    </div>
                    <strong>
                      ₹
                      {Number(item.price || item.historical_price || 0) *
                        item.quantity}
                    </strong>
                  </div>
                ))}
              </div>

              <div
                style={{
                  background: "#fdfaf4",
                  padding: "14px",
                  borderRadius: "8px",
                  border: "1px solid #ede3d0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <span>Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <span>Delivery Charges</span>
                  <span
                    style={{
                      color: delivery === 0 ? "#1f7a4a" : "#1c1409",
                      fontWeight: delivery === 0 ? "600" : "normal",
                    }}
                  >
                    {delivery === 0 ? "FREE" : `₹${delivery}`}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "1.2rem",
                    fontWeight: "700",
                    marginTop: 10,
                    paddingTop: 10,
                    borderTop: "2px dashed #ede3d0",
                  }}
                >
                  <span>Grand Total</span>
                  <span style={{ color: "#b5591a" }}>₹{grandTotal}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
