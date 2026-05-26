import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../../config/api";
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
      const response = await fetch(`${API_BASE}/api/auth/login`, {
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
      // Handled case-insensitive database string variants (e.g., "admin", "Admin")
      if (data.user?.role?.toLowerCase() !== "admin" && !data.user?.isAdmin) {
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
    <div className="admin-login-wrapper">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <span className="admin-terminal-badge" aria-hidden="true">🛡️</span>
          <h2>Admin Terminal</h2>
          <p>Authorized Personnel Access Point</p>
        </div>

        {errorMsg && (
          <div className="admin-error-box" role="alert">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="admin-field-group">
            <label htmlFor="admin-email">Secure Email Address</label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@nalapaka.com"
              disabled={loading}
              autoComplete="email"
              required
            />
          </div>

          <div className="admin-field-group">
            <label htmlFor="admin-password">Access Passphrase</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-main admin-submit-btn"
            disabled={loading}
          >
            {loading ? "🔄 Verifying Identity Matrix..." : "Unlock Console 🔓"}
          </button>
        </form>

        <button
          onClick={() => navigate("/")}
          className="admin-back-btn"
          disabled={loading}
          type="button"
        >
          Return to Marketplace
        </button>
      </div>
    </div>
  );
}