import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../App.css";

export default function AdminLogin({ onAuthSuccess }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please populate both administrative credentials.");
      return;
    }

    setErrorMsg("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Authentication rejected.");
      }

      // 🔐 CRITICAL GATEKEEPER: Prevent regular Customers from entering
      if (data.user?.role !== "Admin") {
        throw new Error("Access Denied: This account lacks master system permissions.");
      }

      // Persist token for backend middleware authorization (/api/admin/*)
      localStorage.setItem("nalapaka_admin_token", data.token);
      
      // Update core React context up in App.jsx
      onAuthSuccess(data.user, data.token);

      // 🚀 AUTOMATIC ROUTER REDIRECT
      navigate("/admin/dashboard");
    } catch (err) {
      setErrorMsg(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-wrapper" style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--light-bg, #f9f6f0)",
      padding: "20px"
    }}>
      <div className="admin-login-card" style={{
        background: "#ffffff",
        padding: "40px",
        borderRadius: "16px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
        width: "100%",
        maxWidth: "420px",
        border: "1px solid rgba(0,0,0,0.05)"
      }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <span style={{ fontSize: "3rem" }}>🛡️</span>
          <h2 style={{ fontSize: "1.8rem", fontWeight: "800", color: "#111", marginTop: "12px", marginBottom: "4px" }}>
            Admin Terminal
          </h2>
          <p style={{ color: "#777", fontSize: "0.9rem" }}>Authorized Personnel Access Point</p>
        </div>

        {errorMsg && (
          <div style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: "12px 16px",
            borderRadius: "8px",
            fontSize: "0.85rem",
            marginBottom: "20px",
            fontWeight: "500",
            border: "1px solid #fca5a5"
          }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Secure Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@nalapaka.com"
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                fontSize: "1rem"
              }}
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: "28px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Access Passphrase
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                fontSize: "1rem"
              }}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn-main"
            style={{
              width: "100%",
              padding: "14px",
              fontSize: "1rem",
              fontWeight: "bold",
              marginBottom: "16px"
            }}
            disabled={loading}
          >
            {loading ? "🔄 Verifying Identity Matrix..." : "Unlock Console 🔓"}
          </button>
        </form>

        <button
          onClick={() => navigate("/")}
          style={{
            background: "none",
            border: "none",
            color: "#666",
            width: "100%",
            textAlign: "center",
            fontSize: "0.9rem",
            cursor: "pointer",
            textDecoration: "underline"
          }}
          disabled={loading}
        >
          Return to Marketplace
        </button>
      </div>
    </div>
  );
}