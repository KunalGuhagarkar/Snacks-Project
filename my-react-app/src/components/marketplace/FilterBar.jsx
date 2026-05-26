const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'bestseller', label: 'Bestsellers' },
  { id: 'new', label: 'New Arrivals' },
  { id: 'under200', label: 'Under ₹200' },
  { id: 'gf', label: 'Gluten Free' },
  { id: 'veg', label: 'Pure Veg' },
];

export default function FilterBar({ activeFilter = 'all', setActiveFilter, totalCount = 0 }) {
  return (
    <div className="filter-section" id="browse">
      {/* 🚀 Encapsulating buttons enables scrollable X-axis overflow tracks on small screens */}
      <div className="filter-pills-track">
        {FILTERS.map((filt) => (
          <button 
            key={filt.id} 
            type="button" // Explicit type prevents accidental form submissions if placed inside a form
            className={`filter-pill ${activeFilter === filt.id ? 'on' : ''}`}
            onClick={() => setActiveFilter && setActiveFilter(filt.id)}
          >
            {filt.label}
          </button>
        ))}
      </div>
      
      {/* Handles count safely while database network requests are pending */}
      <span className="filter-count">
        Showing <strong>{totalCount}</strong> {totalCount === 1 ? 'product' : 'products'}
      </span>
    </div>
  );
}