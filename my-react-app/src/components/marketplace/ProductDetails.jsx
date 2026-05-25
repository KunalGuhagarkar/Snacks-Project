import { useState, useEffect } from 'react';
import "/src/styles/ProductDetails.css";

export default function ProductDetails({ product, onBack, onAddCart, currentCount = 0, onUpdateQuantity }) {
  // Local state keeps track of the chosen volume selection inside this screen session
  const [qty, setQty] = useState(1);

  // Sync state if user changes quantity elsewhere or if item is already inside the cart drawer
  useEffect(() => {
    if (currentCount > 0) {
      setQty(currentCount);
    } else {
      setQty(1);
    }
  }, [currentCount]);

  if (!product) return null;

  // 💡 BACKWARD COMPATIBILITY FIELD CHECKERS & FALLBACKS
  const displayDesc = product.description || product.desc || "No custom descriptive summary provided.";
  
  // 📷 RE-ROUTED PRODUCT IMAGE FILE MATCHING THE STOREFRONT RESOLVER
  const displayImage = product.product_image || 
                       product.image_url || 
                       product.image || 
                       "https://images.unsplash.com/photo-1589476993333-f55b84301219?w=500";

  const handleIncrement = () => {
    if (currentCount > 0 && onUpdateQuantity) {
      // If item exists in cart, update global state immediately
      onUpdateQuantity(product.id, 1);
    } else {
      // If it's a fresh choice, increment local state
      setQty(q => q + 1);
    }
  };

  const handleDecrement = () => {
    if (currentCount > 0 && onUpdateQuantity) {
      // If item exists in cart, update global state immediately
      onUpdateQuantity(product.id, -1);
    } else {
      // If it's a fresh choice, decrement local state safely
      setQty(q => Math.max(1, q - 1));
    }
  };

  const handleCommitToBasket = (e) => {
    if (currentCount > 0) {
      // Already tracked inside the cart loop
      return;
    }
    
    // Pass execution control back up to mount loop structure
    if (onAddCart) {
      // Loop execution match to build the initial state layer array correctly
      for (let i = 0; i < qty; i++) {
        onAddCart(e, product.id, product.name);
      }
    }
  };

  return (
    <div className="product-details-page">
      <div className="details-wrapper">
        
        {/* BREADCRUMB BACK CONTROL */}
        <button className="back-home-btn" onClick={onBack}>
          ← Back to Marketplace
        </button>

        <div className="product-details-container">
          
          {/* LEFT: Premium Graphic Asset Frame */}
          <div className="product-details-image-section">
            <div className="product-big-emoji-container" style={{ position: 'relative', overflow: 'hidden', borderRadius: '12px' }}>
              
              {/* 📷 RENDER RE-ROUTED PRODUCT IMAGE */}
              <img 
                src={displayImage} 
                alt={product.name} 
                className="product-details-main-img"
                style={{ width: '100%', height: '100%', minHeight: '320px', objectFit: 'cover', display: 'block' }}
              />

              {/* Floating Accent Emoji overlay retained over the image layout */}
              {product.emoji && (
                <div className="product-big-emoji-bg" style={{ position: 'absolute', top: '16px', left: '16px', fontSize: '1.5rem', backgroundColor: 'rgba(255,255,255,0.9)', padding: '4px 10px', borderRadius: '8px', zIndex: 2 }}>
                  {product.emoji}
                </div>
              )}

              {/* Badges system ('hot' or 'new' labels) */}
              {product.badge && (
                <span className={`details-badge ${product.badge}`} style={{ zIndex: 2 }}>
                  {product.badge === "hot" ? "🔥 Hot" : "✨ New"}
                </span>
              )}
            </div>
            <div className="product-meta-pill">📦 Genuine Regional Delicacy</div>
          </div>

          {/* RIGHT: Contextual Core Layout Details */}
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

            <p className="product-details-description">
              {displayDesc}
            </p>

            <div className="product-details-tags">
              {product.tags && product.tags.map((tag) => (
                <span key={tag} className={`pcard-tag tag-${tag}`}>
                  {tag.toUpperCase()}
                </span>
              ))}
            </div>

            <div className="product-price-tier">
              <div className="product-details-price">₹{product.price}</div>
              <span className="price-subtext">Inclusive of all local regional taxes</span>
            </div>

            {/* INTERACTIVE PURCHASE ACTIONS */}
            <div className="purchase-controls">
              <div className="details-quantity-selector">
                <button 
                  onClick={handleDecrement}
                  disabled={qty <= 1 && currentCount === 0}
                >
                  -
                </button>
                <span>{qty}</span>
                <button onClick={handleIncrement}>+</button>
              </div>

              <button
                className={`product-buy-btn btn-main ${currentCount > 0 ? 'added-lock' : ''}`}
                onClick={handleCommitToBasket}
                disabled={currentCount > 0}
                style={{
                  backgroundColor: currentCount > 0 ? '#10b981' : '',
                  color: currentCount > 0 ? '#fff' : ''
                }}
              >
                {currentCount > 0 
                  ? `✓ Live in Basket (${currentCount} Units)` 
                  : `Add To Basket • ₹ ${(parseFloat(product.price || 0) * qty).toFixed(2)}`
                }
              </button>
            </div>

            {/* VALUE PROPOSITION SIGNS */}
            <div className="trust-signals-grid">
              <div className="signal-card">
                <span>🚚</span>
                <div>
                  <h5>Direct Brand Shipping</h5>
                  <p>Dispatched straight from origin kitchens to preserve crispness.</p>
                </div>
              </div>
              <div className="signal-card">
                <span>🍃</span>
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