import { useState, useEffect } from 'react';
import "/src/styles/ProductDetails.css";

export default function ProductDetails({ 
  product, 
  onBack, 
  onAddCart, 
  currentCount = 0, 
  onUpdateQuantity 
}) {
  // Local track state for items not yet introduced into the cart ecosystem
  const [localQty, setLocalQty] = useState(1);

  // Sync state if item quantity changes globally or is removed completely
  useEffect(() => {
    if (currentCount > 0) {
      setLocalQty(currentCount);
    } else {
      setLocalQty(1);
    }
  }, [currentCount]);

  if (!product) return null;

  // Backward compatibility normalization
  const displayDesc = product.description || product.desc || "No custom descriptive summary provided.";
  const tagsArray = Array.isArray(product.tags) ? product.tags : [];
  const displayImage = product.product_image || 
                       product.image_url || 
                       product.image || 
                       "https://images.unsplash.com/photo-1589476993333-f55b84301219?w=500";

  const handleIncrement = () => {
    if (currentCount > 0 && onUpdateQuantity) {
      onUpdateQuantity(product.id, 1);
    } else {
      setLocalQty(prev => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (currentCount > 0 && onUpdateQuantity) {
      onUpdateQuantity(product.id, -1);
    } else {
      setLocalQty(prev => Math.max(1, prev - 1));
    }
  };

  const handleCommitToBasket = (e) => {
    if (currentCount > 0) return;
    
    // 🛡️ Passing quantity directly as a single transaction rather than running a loop
    if (onAddCart) {
      onAddCart(e, product.id, product.name, localQty);
    }
  };

  return (
    <div className="product-details-page">
      <div className="details-wrapper">
        
        {/* BREADCRUMB BACK ROW */}
        <button className="back-home-btn" onClick={onBack} type="button">
          ← Back to Marketplace
        </button>

        <div className="product-details-container">
          
          {/* LEFT IMAGE COL */}
          <div className="product-details-image-section">
            <div className="product-big-emoji-container">
              <img 
                src={displayImage} 
                alt={product.name || "Product Shot"} 
                className="product-details-main-img"
                loading="eager"
              />

              {product.emoji && (
                <div className="product-big-emoji-bg">
                  {product.emoji}
                </div>
              )}

              {product.badge && (
                <span className={`details-badge label-${product.badge.toLowerCase()}`}>
                  {product.badge === "hot" ? "🔥 Hot" : "✨ New"}
                </span>
              )}
            </div>
            <div className="product-meta-pill">📦 Genuine Regional Delicacy</div>
          </div>

          {/* RIGHT ACCENT META INFO COL */}
          <div className="product-details-content-section">
            <div className="pcard-brand-row">
              <span className="pcard-brand-dot"></span>
              <p className="product-details-brand">{product.brand}</p>
            </div>

            <h1 className="product-details-title">{product.name}</h1>
            
            <div className="product-specs-row">
              <span className="spec-item">⚖️ {product.weight || "250g"}</span>
              <span className="spec-divider">|</span>
              <span className="spec-item">📍 Authenticity Guaranteed</span>
            </div>

            <p className="product-details-description">{displayDesc}</p>

            <div className="product-details-tags">
              {tagsArray.map((tag, idx) => (
                <span key={`details-tag-${tag}-${idx}`} className={`pcard-tag tag-${tag}`}>
                  {tag.toUpperCase()}
                </span>
              ))}
            </div>

            <div className="product-price-tier">
              <div className="product-details-price">₹{product.price}</div>
              <span className="price-subtext">Inclusive of all local regional taxes</span>
            </div>

            {/* INTERACTIVE ROW CONTROLS */}
            <div className="purchase-controls">
              <div className="details-quantity-selector">
                <button 
                  type="button"
                  onClick={handleDecrement}
                  disabled={localQty <= 1 && currentCount === 0}
                  aria-label="Reduce quantity"
                >
                  -
                </button>
                <span aria-live="polite">{localQty}</span>
                <button 
                  type="button" 
                  onClick={handleIncrement}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className={`product-buy-btn btn-main ${currentCount > 0 ? 'added-lock' : ''}`}
                onClick={handleCommitToBasket}
                disabled={currentCount > 0}
              >
                {currentCount > 0 
                  ? `✓ Live in Basket (${currentCount} Units)` 
                  : `Add To Basket • ₹ ${(parseFloat(product.price || 0) * localQty).toFixed(2)}`
                }
              </button>
            </div>

            {/* VALUE SEALS */}
            <div className="trust-signals-grid">
              <div className="signal-card">
                <span className="signal-icon">🚚</span>
                <div>
                  <h5>Direct Brand Shipping</h5>
                  <p>Dispatched straight from origin kitchens to preserve crispness.</p>
                </div>
              </div>
              <div className="signal-card">
                <span className="signal-icon">🍃</span>
                <div>
                  <h5>100% Preservative Free</h5>
                  <p>Prepared traditionally using traditional family recipes.</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}