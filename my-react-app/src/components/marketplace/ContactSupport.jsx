import { useState, useEffect, useCallback } from "react";
import "/src/styles/ContactSupport.css";

export default function ContactSupport({
  isOpen,
  onClose,
  currentUser,
  onActionToast,
}) {
  const [activeTab, setActiveTab] = useState("submit"); // "submit" | "history"
  const [subjectType, setSubjectType] = useState("General Inquiry");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Status ledger records tracking buckets
  const [tickets, setTickets] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Memoized tracking pull handler
  const fetchTicketHistory = useCallback(() => {
    if (!currentUser?.id) return;

    setLoadingHistory(true);
    fetch(`http://localhost:5000/api/users/support?userId=${currentUser.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Synchronization down.");
        return res.json();
      })
      .then((data) => {
        setTickets(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Error structural layout tracking sync:", err);
      })
      .finally(() => {
        setLoadingHistory(false);
      });
  }, [currentUser]);

  // Fetches ticket data immediately when the modal opens
  useEffect(() => {
    if (isOpen && currentUser?.id) {
      fetchTicketHistory();
    }
  }, [isOpen, currentUser?.id, fetchTicketHistory]);

  // Clean up component states gracefully ONLY when the modal transitions to hidden
  useEffect(() => {
    if (!isOpen) {
      setMessage("");
      setSubjectType("General Inquiry");
      setTickets([]);
      setActiveTab("submit");
    }
  }, [isOpen]);

  // Custom tab selection handler
  const handleTabChange = (targetTab) => {
    setActiveTab(targetTab);
    if (targetTab === "history" && currentUser?.id) {
      fetchTicketHistory();
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch("http://localhost:5000/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser?.id || null,
          name: currentUser?.name || "Guest User",
          email: currentUser?.email || "guest@nalapaka.com",
          subjectType: subjectType,
          message: message.trim(),
        }),
      });

      const responsePayload = await response.json();

      if (response.ok) {
        onActionToast("🚀 Inquiry submitted successfully!");
        setMessage("");

        if (currentUser?.id) {
          fetchTicketHistory();
          setActiveTab("history");
        } else {
          onClose();
        }
      } else {
        onActionToast(`🛑 ${responsePayload.error || "Submission failed."}`);
      }
    } catch (err) {
      console.error("Client Network Fault Error:", err);
      onActionToast("🛑 Server drop. Communication failure.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="support-modal-backdrop" onClick={onClose}>
      <div
        className="support-modal-window"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Navigation Tab Layout Headers */}
        <div className="support-modal-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === "submit" ? "active" : ""}`}
            onClick={() => handleTabChange("submit")}
          >
            New Request
          </button>
          {currentUser?.id && (
            <button
              type="button"
              className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
              onClick={() => handleTabChange("history")}
            >
              Track Progress ({tickets.length})
            </button>
          )}
          <button type="button" className="modal-close-x" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Dynamic Context Panels */}
        <div className="support-modal-body">
          {activeTab === "submit" ? (
            <form onSubmit={handleSubmit} className="support-form">
              <h3>Send Our Kitchen Helpdesk a Message</h3>

              <div className="form-group">
                <label htmlFor="support-topic">Inquiry Topic Category</label>
                <select
                  id="support-topic"
                  value={subjectType}
                  onChange={(e) => setSubjectType(e.target.value)}
                >
                  <option value="General Inquiry">General Inquiry</option>
                  <option value="Order Issues">Order Issues & Tariff</option>
                  <option value="Payment Processing">Payment Processing</option>
                  <option value="Account Access">Account Access</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="support-msg">Detail Message payload</label>
                <textarea
                  id="support-msg"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what you need help with (order issue, custom request, tracking fault)..."
                  rows={5}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="support-submit-btn"
              >
                {submitting ? "Transmitting..." : "Submit Inquiry"}
              </button>
            </form>
          ) : (
            <div className="support-history-view">
              <h3>Live Support Status Ledger</h3>

              {loadingHistory ? (
                <div className="support-status-loader">
                  🔄 Syncing ticket logs...
                </div>
              ) : tickets.length === 0 ? (
                <div className="support-history-empty">
                  <p>
                    No historical queries mapped to your identity footprint profile.
                  </p>
                </div>
              ) : (
                <div className="tickets-status-list">
                  {tickets.map((ticket) => {
                    const currentStatus = ticket.status || "Pending";
                    return (
                      <div className="ticket-status-row" key={ticket.id}>
                        <div className="ticket-status-meta">
                          <span className="ticket-ref">#MSG-{ticket.id}</span>
                          <span
                            className={`status-pill status-${currentStatus.toLowerCase().replace(/\s+/g, "-")}`}
                          >
                            {currentStatus}
                          </span>
                        </div>
                        <div className="ticket-subject-badge">
                          Topic: {ticket.subjectType}
                        </div>
                        <p className="ticket-msg-snippet">"{ticket.message}"</p>
                        <span className="ticket-date">
                          Filed:{" "}
                          {ticket.createdAt
                            ? new Date(ticket.createdAt).toLocaleDateString("en-IN")
                            : "Recent"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}