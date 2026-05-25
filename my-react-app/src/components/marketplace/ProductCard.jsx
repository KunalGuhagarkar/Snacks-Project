import { useState } from "react";

export default function ProductCard({
  product,
  isWishlisted,
  currentCount = 0,
  onToggleWishlist,
  onAddCart,
  onUpdateQuantity,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Guard: If product object itself is missing for any reason, render nothing safely
  if (!product) return null;

  // Backward compatibility field checkers & fallbacks
  const displayDesc = product.description || product.desc || "";
  const tagsArray = Array.isArray(product.tags) ? product.tags : [];

  // Image rendering pipeline
  const displayImage =
    product.product_image ||
    product.image_url ||
    product.image ||
    "https://images.unsplash.com/photo-1589476993333-f55b84301219?w=500";

  // Text truncation limits (e.g., characters limit before showing toggle)
  const TEXT_LIMIT = 75;
  const isLongText = displayDesc.length > TEXT_LIMIT;
  
  const renderDescription = () => {
    if (!isLongText || isExpanded) return displayDesc;
    return `${displayDesc.slice(0, TEXT_LIMIT)}...`;
  };

  return (
    <div 
      className="pcard" 
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%", /* Ensures full extension inside css grid tracks */
        boxSizing: "border-box"
      }}
    >
      <div
        className="pcard-img"
        style={{ position: "relative", overflow: "hidden", flexShrink: 0 }}
      >
        {/* Re-routed product image */}
        <img
          src={displayImage}
          alt={product.name}
          className="pcard-main-thumbnail"
          style={{
            width: "100%",
            height: "150px",
            objectFit: "cover",
            display: "block",
          }}
        />

        {/* Badges system */}
        {product.badge && (
          <span className={`pcard-badge ${product.badge}`}>
            {product.badge === "hot" ? "Hot" : "New"}
          </span>
        )}

        {/* Wishlist Heart Toggler */}
        <button
          className="pcard-wish"
          onClick={(e) => onToggleWishlist(e, product.id)}
          aria-label="Toggle wishlist"
        >
          {isWishlisted ? "❤️" : "🤍"}
        </button>

        {/* Item Weight Metadata Tag */}
        <div className="pcard-flag">{product.weight}</div>
      </div>

      <div 
        className="pcard-body" 
        style={{ 
          display: "flex", 
          flexDirection: "column", 
          flexGrow: 1, /* Pushes everything down uniformly */
          padding: "12px" 
        }}
      >
        <div className="pcard-brand">
          <span className="pcard-brand-dot"></span>
          {product.brand}
        </div>
        <div className="pcard-name">{product.name}</div>

        {/* Description Section with "Show more..." functionality */}
        <div 
          className="pcard-desc" 
          style={{ 
            flexGrow: 1, /* Absorbs variant heights to keep footer layout parallel */
            marginBottom: "8px" 
          }}
        >
          {renderDescription()}
          {isLongText && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation(); // Prevents opening detail sheet modal
                setIsExpanded(!isExpanded);
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent, #0076ff)",
                cursor: "pointer",
                padding: "0",
                marginLeft: "4px",
                font: "inherit",
                fontWeight: "600",
                fontSize: "0.85rem",
                display: "inline-block"
              }}
            >
              {isExpanded ? " Show less" : " Read more"}
            </button>
          )}
        </div>

        <div className="pcard-tags" style={{ marginTop: "auto", marginBottom: "12px" }}>
          {tagsArray.map((tag) => (
            <span key={tag} className={`pcard-tag tag-${tag}`}>
              {tag === "veg" ? "Veg" : tag === "gf" ? "Gluten Free" : "Spicy"}
            </span>
          ))}
        </div>

        <div className="pcard-footer" style={{ marginTop: "auto" }}>
          <div className="pcard-price">
            ₹{product.price}
            <sub> / pack</sub>
          </div>

          {/* Internalized button quantity engine */}
          {currentCount > 0 ? (
            <div
              className="pcard-add inline-qty-active-btn"
              onClick={(e) => e.stopPropagation()} // Stop product detail routing modal trigger
              style={{
                display: "flex",
                alignItems: "center",
                justify: "space-between",
                padding: "0 8px",
                gap: "12px",
                minWidth: "90px",
                cursor: "default",
              }}
            >
              <button
                onClick={() => onUpdateQuantity(product.id, -1)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "inherit",
                  fontWeight: "bold",
                  fontSize: "1.1rem",
                  cursor: "pointer",
                  padding: "0 4px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                －
              </button>

              <span
                style={{
                  fontWeight: "700",
                  fontSize: "0.95rem",
                  minWidth: "14px",
                  textAlign: "center",
                }}
              >
                {currentCount}
              </span>

              <button
                onClick={() => onUpdateQuantity(product.id, 1)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "inherit",
                  fontWeight: "bold",
                  fontSize: "1.1rem",
                  cursor: "pointer",
                  padding: "0 4px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                ＋
              </button>
            </div>
          ) : (
            <button
              className="pcard-add"
              onClick={(e) => onAddCart(e, product.id, product.name)}
            >
              Add +
            </button>
          )}
        </div>
      </div>
    </div>
  );
}