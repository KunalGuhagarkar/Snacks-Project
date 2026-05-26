import React from "react";

const REVIEWS_DATA = [
  {
    id: "rev-001",
    rating: 5,
    starsText: "★★★★★",
    text: '"Finally, one place for all the snacks I grew up eating. Got Kai Murukku from Sweet Karam Coffee and Nendran chips from Kerala Foods — all in one order!"',
    avatar: "🙋",
    name: "Lakshmi R.",
    location: "Mumbai, Maharashtra",
    meta: "Ordered from 3 brands",
  },
  {
    id: "rev-002",
    rating: 5,
    starsText: "★★★★★",
    text: '"I\'m from Chennai but living in Delhi — Nalapaka literally cures my homesickness. The Grand Sweets Mysore Pak tasted exactly like I remember."',
    avatar: "🧑",
    name: "Karthik S.",
    location: "Delhi, NCR",
    meta: "Ordered Grand Sweets",
  },
  {
    id: "rev-003",
    rating: 4,
    starsText: "★★★★☆",
    text: '"Love how I can discover small regional brands I\'d never have heard of. Found this amazing Nippattu maker from Bengaluru through Nalapaka."',
    avatar: "👩",
    name: "Deepa M.",
    location: "Pune, Maharashtra",
    meta: "Discovered 4 new brands",
  },
];

export default function Reviews({ onActionToast }) {
  return (
    <section className="reviews-section" aria-labelledby="reviews-section-title">
      <div className="section-title-row">
        <h2 id="reviews-section-title" className="section-title">
          What Snack Lovers Say
        </h2>
        <span 
          className="see-all" 
          role="button"
          tabIndex={0}
          onClick={() => onActionToast?.("Review compilation modal opening")}
          onKeyDown={(e) => e.key === 'Enter' && onActionToast?.("Review compilation modal opening")}
        >
          All reviews →
        </span>
      </div>

      <div className="reviews-grid">
        {REVIEWS_DATA.map((review) => (
          <div key={review.id} className="review-card">
            <div 
              className="review-stars" 
              role="img" 
              aria-label={`${review.rating} out of 5 stars`}
            >
              {review.starsText}
            </div>

            <blockquote className="review-text">
              {review.text}
            </blockquote>

            <div className="review-user">
              <div className="review-avatar" aria-hidden="true">
                {review.avatar}
              </div>
              <div>
                <cite className="review-name">{review.name}</cite>
                <div className="review-loc">{review.location}</div>
                <div className="review-item">{review.meta}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}