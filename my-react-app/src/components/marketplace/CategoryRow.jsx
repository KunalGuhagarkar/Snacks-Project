export default function CategoryRow({ 
  activeCat = 'all', 
  setActiveCat, 
  onActionToast,
  categories = [] // 👈 Dynamic array injected straight from your database state pipeline
}) {
  
  // Safe handler to prevent event bubbling and unintended render ticks
  const handleCategoryClick = (id) => {
    if (setActiveCat) {
      setActiveCat(id);
    }
  };

  const handleSeeAllClick = (e) => {
    e.stopPropagation();
    if (onActionToast) {
      onActionToast("Browsing entire snack menu configuration");
    }
  };

  return (
    <section className="cat-section">
      <div className="section-title-row">
        <h2 className="section-title">Shop by Category</h2>
        <button 
          type="button"
          className="see-all-btn" 
          onClick={handleSeeAllClick}
          style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
        >
          See all →
        </button>
      </div>

      <div className="cat-row">
        {/* Hardcoded baseline configuration for "All Snacks" state */}
        <div 
          className={`cat-pill ${activeCat === 'all' ? 'active' : ''}`}
          onClick={() => handleCategoryClick('all')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleCategoryClick('all');
            }
          }}
        >
          <div className="cat-pill-details">
            <div className="cat-pill-name">All Snacks</div>
          </div>
        </div>

        {/* Dynamically mapped categories sourced from the database */}
        {categories.map((cat) => (
          <div 
            key={cat.id} 
            className={`cat-pill ${activeCat === cat.id ? 'active' : ''}`}
            onClick={() => handleCategoryClick(cat.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleCategoryClick(cat.id);
              }
            }}
          >
            <div className="cat-pill-details">
              <div className="cat-pill-name">{cat.label}</div>
              {cat.product_count !== undefined && (
                <div className="cat-pill-count">
                  {cat.product_count} {cat.product_count === 1 ? 'item' : 'items'}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}