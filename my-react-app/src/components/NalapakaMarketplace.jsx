import { useState, useMemo, useEffect, useCallback } from "react";
import "../App.css";

// Component Imports
import AnnouncementBar from "./marketplace/AnnouncementBar";
import Navbar from "./marketplace/Navbar";
import Hero from "./marketplace/Hero";
import MarqueeStrip from "./marketplace/MarqueeStrip";
import CategoryRow from "./marketplace/CategoryRow";
import BrandScroll from "./marketplace/BrandScroll";
import FilterBar from "./marketplace/FilterBar";
import ProductCard from "./marketplace/ProductCard";
import HowItWorks from "./marketplace/HowItWorks";
import Reviews from "./marketplace/Reviews";
import Footer from "./marketplace/Footer";
import AuthModal from "./marketplace/AuthModal";
import ProductDetails from "./marketplace/ProductDetails";
import CartDrawer from "./marketplace/CartDrawer";
import WishlistDrawer from "./marketplace/WishlistDrawer";
import ContactSupport from "./marketplace/ContactSupport";

export default function NalapakaMarketplace({
  cartItems = [],
  setCartItems,
  currentUser,
  setCurrentUser,
}) {
  const [wishlist, setWishlist] = useState(() => {
    const savedWish = localStorage.getItem("nalapaka_wishlist");
    return savedWish ? JSON.parse(savedWish) : {};
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeBrand, setActiveBrand] = useState("all");
  const [activeCat, setActiveCat] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: "" });

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // UX Optimization States
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);

  // Search Debouncing Tracker
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const changeFilter = (filterId) => {
    setIsFiltering(true);
    setActiveFilter(filterId);
  };
  const changeCategory = (catId) => {
    setIsFiltering(true);
    setActiveCat(catId);
  };
  const changeBrand = (brandId) => {
    setIsFiltering(true);
    setActiveBrand(brandId);
  };
  const changeSearch = (query) => {
    setIsFiltering(true);
    setSearchQuery(query);
  };

  // Fetch Static Assets (Brands Matrix)
  useEffect(() => {
    let isMounted = true;
    fetch("http://localhost:5000/api/brands")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && Array.isArray(data)) setBrands(data);
      })
      .catch((err) => console.error("Error loading brands matrix:", err));

    return () => { isMounted = false; };
  }, []);

  // Fetch Static Assets (Categories Matrix)
  useEffect(() => {
    let isMounted = true;
    fetch("http://localhost:5000/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && Array.isArray(data)) setCategories(data);
      })
      .catch((err) => console.error("Error loading categories matrix:", err));

    return () => { isMounted = false; };
  }, []);

  // Dynamic Product Feed Fetcher Engine
  useEffect(() => {
    let isMounted = true;
    const queryParams = new URLSearchParams({
      filter: activeFilter,
      brand: activeBrand,
      category: activeCat,
      search: debouncedSearchQuery.trim(),
    });

    fetch(`http://localhost:5000/api/products?${queryParams.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && Array.isArray(data)) setProducts(data);
      })
      .catch((err) => console.error("Error loading products:", err))
      .finally(() => {
        if (isMounted) {
          setIsInitialLoading(false);
          setIsFiltering(false);
        }
      });

    return () => { isMounted = false; };
  }, [activeFilter, activeBrand, activeCat, debouncedSearchQuery]);

  // Sync Global User Shopping Session Cart Upstream
  useEffect(() => {
    if (!currentUser?.id) return;
    let isMounted = true;

    fetch(`http://localhost:5000/api/cart/${currentUser.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        const safeDataPayload = Array.isArray(data) ? data : data.items || [];
        const formattedCart = safeDataPayload.map((item) => ({
          id: item.product_id || item.id,
          name: item.name,
          price: item.price,
          category: item.category,
          brand_key: item.brand_key,
          quantity: item.quantity,
          stock_quantity: item.stock_quantity,
        }));
        
        setCartItems(formattedCart);
        localStorage.setItem("nalapaka_cart", JSON.stringify(formattedCart));
      })
      .catch((err) => {
        console.error("Cart sync down failure, recovering cached local copy:", err);
        const localCachedCart = localStorage.getItem("nalapaka_cart");
        if (localCachedCart && isMounted) {
          setCartItems(JSON.parse(localCachedCart));
        }
      });

    return () => { isMounted = false; };
  }, [currentUser?.id, setCartItems]); // Memoized bounds prevent infinite closed-loop lifecycle execution

  // Toast System Cleaners
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ show: false, msg: "" }), 2800);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const showToast = useCallback((msg) => setToast({ show: true, msg }), []);

  const totalCartCount = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.quantity, 0),
    [cartItems]
  );
  const totalWishlistCount = useMemo(
    () => Object.values(wishlist).filter(Boolean).length,
    [wishlist]
  );

  const handleAuthSuccess = (userData, successMsg) => {
    setCurrentUser(userData);
    localStorage.setItem("nalapaka_user", JSON.stringify(userData));
    setIsModalOpen(false);
    showToast(successMsg);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("nalapaka_user");
    showToast("Logged out successfully!");
  };

  // Adaptive Multi-Sourced Item Ingestor
  const handleAddToCart = async (e, productId, productName, customQty = 1) => {
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();

    // Trace across active product feeds AND current cart records to bypass search isolation bugs
    const productData = products.find((p) => p.id === productId) || cartItems.find((item) => item.id === productId);
    if (!productData) {
      showToast("⚠️ Could not trace item specifications. Please refresh.");
      return;
    }

    const currentCartRecord = cartItems.find((item) => item.id === productId);
    const plannedQuantity = currentCartRecord ? currentCartRecord.quantity + customQty : customQty;
    const maxAvailableStock = productData.stock_quantity !== undefined ? productData.stock_quantity : 999;

    if (plannedQuantity > maxAvailableStock) {
      showToast(`⚠️ Only ${maxAvailableStock} units available for "${productName}".`);
      return;
    }

    setCartItems((prevItems) => {
      let nextItems;
      const existingItem = prevItems.find((item) => item.id === productId);
      if (existingItem) {
        nextItems = prevItems.map((item) =>
          item.id === productId
            ? { ...item, quantity: item.quantity + customQty }
            : item
        );
      } else {
        nextItems = [...prevItems, { ...productData, quantity: customQty }];
      }
      localStorage.setItem("nalapaka_cart", JSON.stringify(nextItems));
      return nextItems;
    });

    if (currentUser?.id) {
      try {
        await fetch("http://localhost:5000/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            productId,
            quantity: customQty,
          }),
        });
      } catch (err) {
        console.error("Failed to commit item update upstream:", err);
      }
    }
    showToast(`🛒 Added ${customQty}x "${productName}" to basket.`);
  };

  const handleUpdateQuantity = async (productId, change) => {
    let updatedQuantity = 0;
    let stockReachedExceeded = false;
    let targetProductName = "Item";

    const referenceProduct = products.find(p => p.id === productId) || cartItems.find(c => c.id === productId);
    const maxAvailableStock = referenceProduct ? (referenceProduct.stock_quantity !== undefined ? referenceProduct.stock_quantity : 999) : 999;
    if (referenceProduct) targetProductName = referenceProduct.name;

    setCartItems((prevItems) => {
      const matchedItem = prevItems.find((item) => item.id === productId);
      if (matchedItem && change > 0 && (matchedItem.quantity + change) > maxAvailableStock) {
        stockReachedExceeded = true;
        return prevItems; 
      }

      const nextItems = prevItems
        .map((item) => {
          if (item.id === productId) {
            updatedQuantity = item.quantity + change;
            return updatedQuantity > 0
              ? { ...item, quantity: updatedQuantity }
              : null;
          }
          return item;
        })
        .filter(Boolean);

      localStorage.setItem("nalapaka_cart", JSON.stringify(nextItems));
      return nextItems;
    });

    if (stockReachedExceeded) {
      showToast(`⚠️ Cannot add more. Stock ceiling for "${targetProductName}" is capped at ${maxAvailableStock} units.`);
      return;
    }

    if (currentUser?.id) {
      try {
        if (updatedQuantity <= 0) {
          await fetch("http://localhost:5000/api/cart", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: currentUser.id, productId }),
          });
        } else {
          await fetch("http://localhost:5000/api/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: currentUser.id,
              productId,
              quantity: change,
            }),
          });
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleToggleWishlist = (e, id) => {
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();

    const stringId = String(id);
    setWishlist((prev) => {
      const next = { ...prev, [stringId]: !prev[stringId] };
      localStorage.setItem("nalapaka_wishlist", JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="marketplace-container">
      <AnnouncementBar />
      <Navbar
        cartCount={totalCartCount}
        wishlistCount={totalWishlistCount}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAuth={() => setIsModalOpen(true)}
        onOpenSupport={() => setIsSupportOpen(true)}
        onActionToast={showToast}
        searchQuery={searchQuery}
        setSearchQuery={changeSearch}
        setActiveBrand={changeBrand}
        setActiveCat={changeCategory}
        setActiveFilter={changeFilter}
        filteredProducts={products}
        onCartClick={() => setIsCartOpen(true)}
        onWishlistClick={() => setIsWishlistOpen(true)}
        setSelectedProduct={setSelectedProduct}
      />

      {selectedProduct ? (
        (() => {
          const cartMatch = cartItems.find((item) => item.id === selectedProduct.id);
          const currentCount = cartMatch ? cartMatch.quantity : 0;
          return (
            <ProductDetails
              product={selectedProduct}
              onBack={() => setSelectedProduct(null)}
              currentCount={currentCount}
              onUpdateQuantity={handleUpdateQuantity}
              onAddCart={(e, id, name, qty) => handleAddToCart(e, id, name, qty)}
            />
          );
        })()
      ) : (
        <>
          <Hero onActionToast={showToast} />
          <MarqueeStrip />

          <CategoryRow
            activeCat={activeCat}
            setActiveCat={changeCategory}
            onActionToast={showToast}
            categories={categories}
          />
          <BrandScroll
            activeBrand={activeBrand}
            setActiveBrand={changeBrand}
            onActionToast={showToast}
            brands={brands}
          />
          <FilterBar
            activeFilter={activeFilter}
            setActiveFilter={changeFilter}
            totalCount={products.length}
          />

          <section className="products-section" style={{ position: "relative", minHeight: "400px" }}>
            {isFiltering && (
              <div className="filter-loading-overlay">
                <span>Refreshing catalog selection...</span>
              </div>
            )}

            <div className={`product-grid ${isFiltering ? "grid-faded" : ""}`}>
              {isInitialLoading ? (
                <div className="grid-notice-box">
                  <p>Pulling items...</p>
                </div>
              ) : products.length > 0 ? (
                products.map((p) => {
                  const cartMatch = cartItems.find((item) => item.id === p.id);
                  const currentCount = cartMatch ? cartMatch.quantity : 0;

                  return (
                    <div
                      key={p.id}
                      id={`product-${p.id}`}
                      onClick={() => setSelectedProduct(p)}
                      className="product-card-click-wrapper"
                    >
                      <ProductCard
                        product={p}
                        isWishlisted={!!wishlist[String(p.id)]}
                        currentCount={currentCount}
                        onToggleWishlist={handleToggleWishlist}
                        onAddCart={handleAddToCart}
                        onUpdateQuantity={handleUpdateQuantity}
                      />
                    </div>
                  );
                })
              ) : (
                <div className="grid-notice-box">
                  <p>No snacks found matching these filters.</p>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      <HowItWorks />
      <Reviews onActionToast={showToast} />
      <Footer />

      <div className={`toast ${toast.show ? "show" : ""}`}>{toast.msg}</div>
      
      {/* OVERLAY PORTALS */}
      <ContactSupport 
        isOpen={isSupportOpen} 
        onClose={() => setIsSupportOpen(false)} 
        currentUser={currentUser} 
        onActionToast={showToast} 
      />
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        currentUser={currentUser}
        setCartItems={setCartItems}
        showToast={showToast}
      />
      <WishlistDrawer
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        wishlist={wishlist}
        products={products}
        onToggleWishlist={handleToggleWishlist}
        onAddCart={handleAddToCart}
      />
      <AuthModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}