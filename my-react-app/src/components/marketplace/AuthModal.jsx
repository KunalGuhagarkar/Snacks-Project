import { useState } from "react";

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  // 💡 UPGRADED: Async handler loops dealing directly with the Express network layer
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password || (isSignUp && !formData.name)) {
      setError("Please fill in all required fields.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    // Determine target micro-route based on state selection
    const targetEndpoint = isSignUp ? "register" : "login";

    try {
      const response = await fetch(
        `http://localhost:5000/api/auth/${targetEndpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        // Displays exact database or validation issues caught by your Node server
        throw new Error(
          data.message || "Something went wrong during authorization.",
        );
      }

      // Clear input fields safely upon clean transaction return
      setFormData({ name: "", email: "", password: "", phone: "" });
      setIsSignUp(false);

      // Pass the actual Postgres database record up to your master controller layout
      onAuthSuccess(
        data.user,
        isSignUp
          ? "Account registered successfully! 🎉"
          : "Welcome back to Nalapaka! 👋",
      );
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div
      className="cart-overlay"
      onClick={onClose}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--white)",
          width: "100%",
          maxWidth: "400px",
          padding: "32px",
          borderRadius: "16px",
          boxShadow: "0 12px 40px rgba(28, 20, 9, 0.15)",
          animation: "slideIn 0.3s ease",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "none",
            border: "none",
            fontSize: "1.2rem",
            cursor: "pointer",
            color: "var(--stone)",
          }}
        >
          ✕
        </button>

        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h2
            style={{
              fontFamily: "Fraunces, serif",
              color: "var(--ink)",
              margin: "0 0 8px 0",
              fontSize: "1.8rem",
            }}
          >
            नाल<span style={{ color: "var(--saffron)" }}>पाक</span>
          </h2>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--stone)" }}>
            {isSignUp
              ? "Create an account to track regional snack orders"
              : "Sign in to access your snack basket"}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            background: "var(--cream-2)",
            borderRadius: "8px",
            padding: "4px",
            marginBottom: "20px",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setError("");
            }}
            style={{
              flex: 1,
              padding: "8px",
              border: "none",
              borderRadius: "6px",
              background: !isSignUp ? "var(--white)" : "none",
              fontWeight: !isSignUp ? "700" : "500",
              color: "var(--ink)",
              cursor: "pointer",
              transition: "0.2s",
            }}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setError("");
            }}
            style={{
              flex: 1,
              padding: "8px",
              border: "none",
              borderRadius: "6px",
              background: isSignUp ? "var(--white)" : "none",
              fontWeight: isSignUp ? "700" : "500",
              color: "var(--ink)",
              cursor: "pointer",
              transition: "0.2s",
            }}
          >
            Register
          </button>
        </div>

        {error && (
          <div
            style={{
              background: "#fdf2f2",
              color: "#ec4899",
              padding: "10px",
              borderRadius: "8px",
              fontSize: "0.85rem",
              marginBottom: "16px",
              textAlign: "center",
              border: "1px solid #fce7f3",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "14px" }}
        >
          {isSignUp && (
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  color: "var(--ink)",
                  marginBottom: "4px",
                }}
              >
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter your name"
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid var(--cream-3)",
                  background: "var(--cream-2)",
                  boxSizing: "border-box",
                }}
              />
            </div>
          )}

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: "600",
                color: "var(--ink)",
                marginBottom: "4px",
              }}
            >
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="name@example.com"
              required
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid var(--cream-3)",
                background: "var(--cream-2)",
                boxSizing: "border-box",
              }}
            />
          </div>

          {isSignUp && (
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  color: "var(--ink)",
                  marginBottom: "4px",
                }}
              >
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Enter mobile number"
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid var(--cream-3)",
                  background: "var(--cream-2)",
                  boxSizing: "border-box",
                }}
              />
            </div>
          )}

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: "600",
                color: "var(--ink)",
                marginBottom: "4px",
              }}
            >
              Password *
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="••••••••"
              required
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid var(--cream-3)",
                background: "var(--cream-2)",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            type="submit"
            className="btn-main"
            style={{
              width: "100%",
              padding: "14px",
              margin: "10px 0 0 0",
              fontWeight: "700",
              fontSize: "1rem",
            }}
          >
            {isSignUp ? "Create Snack Account →" : "Sign In Safely →"}
          </button>
        </form>
      </div>
    </div>
  );
}
