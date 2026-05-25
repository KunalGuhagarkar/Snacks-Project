import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Automatically extract '?token=xyz...' from the browser URL address bar
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("❌ Missing security authorization token. This link is invalid.");
    }
  }, [token]);

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;

    if (newPassword.length < 6) {
      setError("⚠️ Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("⚠️ Passwords do not match. Please verify both inputs.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:5000/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to reset password security parameters.");
      }

      setSuccess(true);
      // Auto-redirect user back to your marketplace root layout window after 3 seconds
      setTimeout(() => {
        navigate("/");
      }, 3500);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "var(--cream-1, #faf8f5)", padding: "20px" }}>
      <div style={{ background: "#fff", width: "100%", maxWidth: "400px", padding: "32px", borderRadius: "16px", boxShadow: "0 12px 40px rgba(28, 20, 9, 0.1)" }}>
        
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h2 style={{ fontFamily: "Fraunces, serif", margin: "0 0 8px 0", fontSize: "1.8rem" }}>
            नाल<span style={{ color: "#e07b2a" }}>पाक</span>
          </h2>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#666" }}>Update Your Account Credentials</p>
        </div>

        {error && (
          <div style={{ background: "#fdf2f2", color: "#ec4899", padding: "10px", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "16px", textAlign: "center", border: "1px solid #fce7f3" }}>
            {error}
          </div>
        )}

        {success ? (
          <div style={{ background: "#f0fdf4", color: "#166534", padding: "16px", borderRadius: "8px", fontSize: "0.9rem", textAlign: "center", border: "1px solid #bbf7d0" }}>
            🎉 <strong>Success!</strong> Your password has been updated securely. Redirecting you to the home terminal to log in...
          </div>
        ) : (
          <form onSubmit={handleResetSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "4px" }}>New Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                required 
                disabled={!token || loading}
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "4px" }}>Confirm New Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                required 
                disabled={!token || loading}
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ddd", boxSizing: "border-box" }}
              />
            </div>

            <button 
              type="submit" 
              disabled={!token || loading} 
              className="btn-main" 
              style={{ width: "100%", padding: "14px", background: "#e07b2a", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "700", fontSize: "1rem", cursor: "pointer", marginTop: "10px" }}
            >
              {loading ? "Overriding Passkey..." : "Update Password →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}