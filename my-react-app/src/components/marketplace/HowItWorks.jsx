export default function HowItWorks() {
  return (
    <section className="how-section" id="how-it-works">
      <div className="how-header">
        <h2 className="how-title">How Nalapaka Works</h2>
        <p className="how-sub">
          A marketplace connecting the best traditional regional snack brands with snack lovers across India.
        </p>
      </div>

      <div className="how-steps">
        <div className="how-step">
          <div className="how-num">01</div>
          <div className="how-icon" aria-hidden="true">🔍</div>
          <h3 className="how-step-title">Discover Brands</h3>
          <p className="how-step-desc">
            Browse 500+ verified snack makers from Tamil Nadu, Kerala, Karnataka, Andhra, and beyond.
          </p>
        </div>

        <div className="how-step">
          <div className="how-num">02</div>
          <div className="how-icon" aria-hidden="true">🛒</div>
          <h3 className="how-step-title">Pick Your Snacks</h3>
          <p className="how-step-desc">
            Add products from multiple iconic brands into a single combined cart. Filter and find your favorites.
          </p>
        </div>

        <div className="how-step">
          <div className="how-num">03</div>
          <div className="how-icon" aria-hidden="true">📦</div>
          <h3 className="how-step-title">Fresh Direct Shipping</h3>
          <p className="how-step-desc">
            Each brand packages and ships their items directly to you, ensuring maximum freshness and regional authenticity.
          </p>
        </div>

        <div className="how-step">
          <div className="how-num">04</div>
          <div className="how-icon" aria-hidden="true">😋</div>
          <h3 className="how-step-title">Snack & Review</h3>
          <p className="how-step-desc">
            Enjoy your authentic treats and share your review to help the community discover hidden culinary gems.
          </p>
        </div>
      </div>
    </section>
  );
}