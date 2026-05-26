import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Extract token parameter safely
  const token = searchParams.get("token");

  // Keep a safe reference to the active redirect timeout to prevent unmounted navigation leaks
  const redirectTimerRef = useRef(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Validate presence of authorization parameter on mount
  useEffect(() => {
    if (!token) {
      setError("❌ Missing security authorization token. This link is invalid.");
    }

    // 🛡️ Guard Cleanup: Cancel any pending redirect timers if the user navigates away
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
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

      // 🔐 Security Wipe: Zero out password state values immediately upon backend confirmation
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(true);

      // Trigger safe reference redirect
      redirectTimerRef.current = setTimeout(() => {
        navigate("/");
      }, 3500);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-shroud">
      <div className="auth-card-panel">
        
        {/* LOGO TITLE SECTION */}
        <div className="auth-card-header">
          <h2 className="brand-title">
            नाल<span>पाक</span>
          </h2>
          <p className="brand-subtitle">Update Your Account Credentials</p>
        </div>

        {/* CONDITION STATE MESSAGES */}
        {error && (
          <div className="auth-message-box box-error" role="alert">
            {error}
          </div>
        )}

        {success ? (
          <div className="auth-message-box box-success" role="status">
            🎉 <strong>Success!</strong> Your password has been updated securely. 
            Redirecting you to the home terminal to log in...
          </div>
        ) : (
          <form onSubmit={handleResetSubmit} className="auth-form-stack">
            
            <div className="auth-input-group">
              <label htmlFor="new-password-field">New Password</label>
              <input 
                id="new-password-field"
                type="password" 
                placeholder="••••••••" 
                required 
                disabled={!token || loading}
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                autoComplete="new-password"
              />
            </div>

            <div className="auth-input-group">
              <label htmlFor="confirm-password-field">Confirm New Password</label>
              <input 
                id="confirm-password-field"
                type="password" 
                placeholder="••••••••" 
                required 
                disabled={!token || loading}
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                autoComplete="new-password"
              />
            </div>

            <button 
              type="submit" 
              disabled={!token || loading} 
              className="btn-auth-submit"
            >
              {loading ? "Overriding Passkey..." : "Update Password →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}