export default function BrandScroll({ 
  activeBrand = 'all', 
  setActiveBrand, 
  onActionToast,
  brands = [] // 👈 Dynamically passed from the backend database state
}) {
  
  const handleBrandClick = (id) => {
    if (setActiveBrand) {
      setActiveBrand(id);
    }
  };

  const handleViewAllClick = (e) => {
    e.stopPropagation();
    if (onActionToast) {
      onActionToast("Viewing 500+ ecosystem providers");
    }
  };

  return (
    <section className="brands-section" id="brands">
      <div className="section-title-row">
        <h2 className="section-title">Featured Brands</h2>
        <button 
          type="button" 
          className="see-all-btn" 
          onClick={handleViewAllClick}
          style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
        >
          View all 500+ →
        </button>
      </div>

      <div className="brands-scroll">
        {/* Baseline hardcoded option for "All Brands" selection */}
        <div 
          className={`brand-chip ${activeBrand === 'all' ? 'selected' : ''}`} 
          onClick={() => handleBrandClick('all')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleBrandClick('all');
            }
          }}
        >
          <div className="brand-chip-info">
            <div className="brand-chip-name">All Brands</div>
          </div>
        </div>

        {/* Dynamically mapped items coming from your database API */}
        {brands.map((brand) => (
          <div 
            key={brand.id} 
            className={`brand-chip ${activeBrand === brand.id ? 'selected' : ''}`} 
            onClick={() => handleBrandClick(brand.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleBrandClick(brand.id);
              }
            }}
          >
            <div className="brand-chip-info">
              <div className="brand-chip-name">{brand.name}</div>
              {/* Optional verification checks handled via database fields */}
              {brand.is_verified && <div className="brand-chip-verified">✓ Verified</div>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}