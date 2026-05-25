
export default function Reviews({ onActionToast }) {
  return (
    <section className="reviews-section">
      <div className="section-title-row">
        <div className="section-title">What Snack Lovers Say</div>
        <span className="see-all" onClick={() => onActionToast("Review compilation modal opening")}>All reviews →</span>
      </div>
      <div className="reviews-grid">
        <div className="review-card">
          <div className="review-stars">★★★★★</div>
          <div className="review-text">"Finally, one place for all the snacks I grew up eating. Got Kai Murukku from Sweet Karam Coffee and Nendran chips from Kerala Foods — all in one order!"</div>
          <div className="review-user">
            <div className="review-avatar">🙋</div>
            <div>
              <div className="review-name">Lakshmi R.</div>
              <div className="review-loc">Mumbai, Maharashtra</div>
              <div className="review-item">Ordered from 3 brands</div>
            </div>
          </div>
        </div>
        <div className="review-card">
          <div className="review-stars">★★★★★</div>
          <div className="review-text">"I'm from Chennai but living in Delhi — Nalapaka literally cures my homesickness. The Grand Sweets Mysore Pak tasted exactly like I remember."</div>
          <div className="review-user">
            <div className="review-avatar">🧑</div>
            <div>
              <div className="review-name">Karthik S.</div>
              <div className="review-loc">Delhi, NCR</div>
              <div className="review-item">Ordered Grand Sweets</div>
            </div>
          </div>
        </div>
        <div className="review-card">
          <div className="review-stars">★★★★☆</div>
          <div className="review-text">"Love how I can discover small regional brands I'd never have heard of. Found this amazing Nippattu maker from Bengaluru through Nalapaka."</div>
          <div className="review-user">
            <div className="review-avatar">👩</div>
            <div>
              <div className="review-name">Deepa M.</div>
              <div className="review-loc">Pune, Maharashtra</div>
              <div className="review-item">Discovered 4 new brands</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}