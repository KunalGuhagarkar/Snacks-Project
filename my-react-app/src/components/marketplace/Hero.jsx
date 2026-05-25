export default function Hero({ onActionToast }) {
  return (
    <section className="hero">
      <div>
        <div className="hero-eyebrow">
          🇮🇳 India's #1 Traditional Snacks Marketplace
        </div>
        <h1>
          One Platform.
          <br />
          Every <span className="highlight">Famous</span>
          <br />
          Snack in India.
        </h1>
        <p className="hero-sub">
          From Sweet Karam Coffee's Murukku to Kerala's Banana Chips — we bring
          500+ beloved snack brands from every corner of India to your doorstep.
        </p>
        <div className="hero-chips">
          <span className="hero-chip">🏠 Sweet Karam Coffee</span>
          <span className="hero-chip">🥥 Haldirams</span>
          <span className="hero-chip">🌶️ Grand Sweets</span>
          <span className="hero-chip">🫙 Adyar Ananda Bhavan</span>
          <span className="hero-chip">+496 more brands</span>
        </div>
        <div className="hero-actions">
          <a href="#browse" className="btn-hero">
            Explore Snacks
          </a>
          <a href="#brands" className="btn-hero-ghost">
            Browse Brands
          </a>
        </div>
        <div className="hero-stats">
          <div className="stat-item">
            <div className="stat-num">500+</div>
            <div className="stat-label">Brands listed</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">2,400+</div>
            <div className="stat-label">Snack products</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">28</div>
            <div className="stat-label">Indian states</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">4.8★</div>
            <div className="stat-label">Avg. rating</div>
          </div>
        </div>
      </div>

      <div className="hero-right">
        <div className="brand-mosaic">
          <div
            className="brand-card featured"
            onClick={() => onActionToast("Sweet Karam Coffee — 48 products")}
          >
            <div className="brand-card-icon">☕</div>
            <div>
              <div className="brand-card-name">Sweet Karam Coffee</div>
              <div className="brand-card-loc">📍 Chennai, Tamil Nadu</div>
              <div className="brand-card-items">48 products available</div>
              <div className="brand-card-tag">
                Murukku · Mixture · Filter Coffee
              </div>
            </div>
            <div className="brand-card-badge">Top Brand</div>
          </div>
          {[
            {
              id: "grand",
              emoji: "🍬",
              name: "Grand Sweets",
              loc: "Chennai",
              count: "36 products",
            },
            {
              id: "kerala",
              emoji: "🌴",
              name: "Kerala Foods Co.",
              loc: "Thrissur, Kerala",
              count: "22 products",
            },
            {
              id: "anand",
              emoji: "🪔",
              name: "Anand Sweets",
              loc: "Bengaluru",
              count: "41 products",
            },
            {
              id: "skrishna",
              emoji: "🥜",
              name: "Sri Krishna Sweets",
              loc: "Coimbatore",
              count: "29 products",
            },
          ].map((b) => (
            <div
              className="brand-card"
              key={b.id}
              onClick={() => onActionToast(`${b.name} — ${b.count}`)}
            >
              <div className="brand-card-icon">{b.emoji}</div>
              <div className="brand-card-name">{b.name}</div>
              <div className="brand-card-loc">📍 {b.loc}</div>
              <div className="brand-card-items">{b.count}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
