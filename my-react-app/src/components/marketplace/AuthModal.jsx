import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google"; // 👈 Integrated Google OAuth Component

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false); 
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState(""); 
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  // Reset internal states when closing the modal window
  const handleClose = () => {
    setError("");
    setSuccessMessage("");
    setIsForgotPassword(false);
    setIsSignUp(false);
    onClose();
  };

  // 🚀 HANDLER A: Google Authentication Handshake Pipeline
  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch("http://localhost:5000/api/auth/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: credentialResponse.credential }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Google authentication failed on verification.");

      setFormData({ name: "", email: "", password: "", phone: "" });
      
      // Mirror native account success handling to save user sessions to state
      onAuthSuccess(
        data.user,
        "Logged in successfully via Google! 🚀"
      );
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🚀 HANDLER B: Unified submit handler for Native Registration, Login, and Forgot Password
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    // 💡 Scenario A: Forgot Password Execution Route
    if (isForgotPassword) {
      if (!formData.email) {
        setError("Please enter your email address.");
        setLoading(false);
        return;
      }
      try {
        const response = await fetch("http://localhost:5000/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: formData.email }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to process recovery request.");
        
        setSuccessMessage("Recovery token generated and sent to your email! 🚀");
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Validation gate for normal login/registration routes
    if (!formData.email || !formData.password || (isSignUp && !formData.name)) {
      setError("Please fill in all required fields.");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    const targetEndpoint = isSignUp ? "register" : "login";

    try {
      const response = await fetch(
        `http://localhost:5000/api/auth/${targetEndpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Something went wrong.");

      setFormData({ name: "", email: "", password: "", phone: "" });
      setIsSignUp(false);
      onAuthSuccess(
        data.user,
        isSignUp ? "Account registered successfully! 🎉" : "Welcome back to Nalapaka! 👋"
      );
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="cart-overlay"
      onClick={handleClose}
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
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
          onClick={handleClose}
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
          <h2 style={{ fontFamily: "Fraunces, serif", color: "var(--ink)", margin: "0 0 8px 0", fontSize: "1.8rem" }}>
            नाल<span style={{ color: "var(--saffron)" }}>पाक</span>
          </h2>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--stone)" }}>
            {isForgotPassword 
              ? "Recover your account credentials" 
              : isSignUp ? "Create an account to track regional snack orders" : "Sign in to access your snack basket"}
          </p>
        </div>

        {/* Hide default navigation tabs if dealing with password recovery */}
        {!isForgotPassword && (
          <div style={{ display: "flex", background: "var(--cream-2)", borderRadius: "8px", padding: "4px", marginBottom: "20px" }}>
            <button
              type="button"
              onClick={() => { setIsSignUp(false); setError(""); }}
              style={{ flex: 1, padding: "8px", border: "none", borderRadius: "6px", background: !isSignUp ? "var(--white)" : "none", fontWeight: !isSignUp ? "700" : "500", color: "var(--ink)", cursor: "pointer", transition: "0.2s" }}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUp(true); setError(""); }}
              style={{ flex: 1, padding: "8px", border: "none", borderRadius: "6px", background: isSignUp ? "var(--white)" : "none", fontWeight: isSignUp ? "700" : "500", color: "var(--ink)", cursor: "pointer", transition: "0.2s" }}
            >
              Register
            </button>
          </div>
        )}

        {error && (
          <div style={{ background: "#fdf2f2", color: "#ec4899", padding: "10px", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "16px", textAlign: "center", border: "1px solid #fce7f3" }}>
            ⚠️ {error}
          </div>
        )}

        {successMessage && (
          <div style={{ background: "#f0fdf4", color: "#166534", padding: "10px", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "16px", textAlign: "center", border: "1px solid #bbf7d0" }}>
            ✅ {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          
          {/* Dynamic Input Matrix Form Selection Engine */}
          {isSignUp && !isForgotPassword && (
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "var(--ink)", marginBottom: "4px" }}>Full Name *</label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Enter your name" required style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--cream-3)", background: "var(--cream-2)", boxSizing: "border-box" }} />
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "var(--ink)", marginBottom: "4px" }}>Email Address *</label>
            <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="name@example.com" required style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--cream-3)", background: "var(--cream-2)", boxSizing: "border-box" }} />
          </div>

          {isSignUp && !isForgotPassword && (
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "var(--ink)", marginBottom: "4px" }}>Phone Number</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="Enter mobile number" style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--cream-3)", background: "var(--cream-2)", boxSizing: "border-box" }} />
            </div>
          )}

          {!isForgotPassword && (
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "var(--ink)", marginBottom: "4px" }}>Password *</label>
              <input type="password" name="password" value={formData.password} onChange={handleInputChange} placeholder="••••••••" required style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--cream-3)", background: "var(--cream-2)", boxSizing: "border-box" }} />
              
              {/* Forgot Password trigger anchor */}
              {!isSignUp && (
                <div style={{ textAlign: "right", marginTop: "6px" }}>
                  <span 
                    onClick={() => { setIsForgotPassword(true); setError(""); setSuccessMessage(""); }}
                    style={{ fontSize: "0.8rem", color: "var(--saffron)", cursor: "pointer", fontWeight: "500", textDecoration: "underline" }}
                  >
                    Forgot Password?
                  </span>
                </div>
              )}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-main" style={{ width: "100%", padding: "14px", margin: "10px 0 0 0", fontWeight: "700", fontSize: "1rem" }}>
            {loading ? "Processing..." : isForgotPassword ? "Send Recovery Link →" : isSignUp ? "Create Snack Account →" : "Sign In Safely →"}
          </button>

          {isForgotPassword && (
            <div style={{ textAlign: "center", marginTop: "4px" }}>
              <span 
                onClick={() => { setIsForgotPassword(false); setError(""); setSuccessMessage(""); }}
                style={{ fontSize: "0.85rem", color: "var(--stone)", cursor: "pointer", textDecoration: "underline" }}
              >
                Back to Login Terminal
              </span>
            </div>
          )}
        </form>

        {/* =====================================================================
            🌐 THE SOCIAL SEPARATOR & GOOGLE ONE-TAP BUTTON INTERFACE
            ===================================================================== */}
        {!isForgotPassword && (
          <>
            <div style={{ display: "flex", alignItems: "center", margin: "20px 0", gap: "10px" }}>
              <div style={{ flex: 1, height: "1px", backgroundColor: "var(--cream-3)" }}></div>
              <span style={{ color: "var(--stone)", fontSize: "0.85rem" }}>or</span>
              <div style={{ flex: 1, height: "1px", backgroundColor: "var(--cream-3)" }}></div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Google authorization window process collapsed.")}
                theme="filled_blue"
                shape="pill"
                text="continue_with"
                width="336px" // Perfectly matches typical inner content width targets
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}