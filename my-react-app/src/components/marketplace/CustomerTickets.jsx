import { useState, useEffect } from 'react';
import '/src/styles/CustomerTickets.css'; // Styling file matching your design token patterns

export default function CustomerTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchUserTickets = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('nalapaka_user_token');
        
        const res = await fetch('http://localhost:5000/api/users/support', {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });

        if (!res.ok) {
          throw new Error('Failed to synchronize support logs.');
        }

        const data = await res.json();
        
        if (isMounted) {
          // Safeguard map arrays against structural backend trace failures
          setTickets(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUserTickets();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) return <div className="ticket-shroud">🔄 Loading your message logs...</div>;
  if (error) return <div className="ticket-alert-danger">🛑 Error: {error}</div>;

  return (
    <div className="customer-tickets-container">
      <div className="tickets-header">
        <h2>My Support Inquiries</h2>
        <p>Track open statuses and review communications with our help desk.</p>
      </div>

      {tickets.length === 0 ? (
        <div className="tickets-empty-state">
          <div className="empty-icon">💬</div>
          <h3>No support tickets filed</h3>
          <p>If you have questions about an order or delivery tariff, reach out via our contact form.</p>
        </div>
      ) : (
        <div className="tickets-history-stack">
          {tickets.map((ticket) => {
            const currentStatus = ticket.status || 'Pending';
            
            // Defends against both snake_case database responses and camelCase API structures
            const assignedTopic = ticket.subjectType || ticket.subject_type || 'General Inquiry';
            const timestamp = ticket.createdAt || ticket.created_at;

            return (
              <div className="ticket-item-card" key={ticket.id}>
                <div className="ticket-card-meta-row">
                  <span className="ticket-id-tag">Reference #{ticket.id}</span>
                  <span className={`ticket-status-badge status-${currentStatus.toLowerCase().replace(/\s+/g, '-')}`}>
                    {currentStatus}
                  </span>
                </div>

                <div className="ticket-card-body">
                  <div className="ticket-type-label">Category: <b>{assignedTopic}</b></div>
                  <p className="ticket-message-payload">"{ticket.message}"</p>
                </div>

                <div className="ticket-card-footer">
                  <span className="ticket-timestamp">
                    Filed on: {timestamp ? new Date(timestamp).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    }) : 'Recent'}
                  </span>
                  {currentStatus.toLowerCase() === 'resolved' && (
                    <span className="resolution-notice">✅ Check your inbox for our agent's resolution summary email.</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}