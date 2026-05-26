import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import "../App.css";
import apiFetch from "../config/api";
import { loadCartStorage, saveCartStorage, loadWishlistStorage, saveWishlistStorage } from "../utils/storage";

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
  const [wishlist, setWishlist] = useState(() => loadWishlistStorage());

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
  const abortControllers = useRef({});

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
    const ac = new AbortController();
    abortControllers.current.brands = ac;
    (async () => {
      try {
        const data = await apiFetch("/api/brands", { signal: ac.signal });
        if (Array.isArray(data)) setBrands(data.map(b => ({ ...b, id: b.id || b._id })));
      } catch (err) {
        if (err.name !== 'AbortError') console.error("Error loading brands matrix:", err);
      }
    })();
    return () => { ac.abort(); };
  }, []);

  // Fetch Static Assets (Categories Matrix)
  useEffect(() => {
    const ac = new AbortController();
    abortControllers.current.categories = ac;
    (async () => {
      try {
        const data = await apiFetch("/api/categories", { signal: ac.signal });
        if (Array.isArray(data)) setCategories(data.map(c => ({ ...c, id: c.id || c._id })));
      } catch (err) {
        if (err.name !== 'AbortError') console.error("Error loading categories matrix:", err);
      }
    })();
    return () => { ac.abort(); };
  }, []);

  // Dynamic Product Feed Fetcher Engine
  useEffect(() => {
    const ac = new AbortController();
    abortControllers.current.products = ac;
    const queryParams = new URLSearchParams({
      filter: activeFilter,
      brand: activeBrand,
      category: activeCat,
      search: debouncedSearchQuery.trim(),
    });

    (async () => {
      try {
        const data = await apiFetch(`/api/products?${queryParams.toString()}`, { signal: ac.signal });
        if (Array.isArray(data)) setProducts(data.map(p => ({ ...p, id: p.id || p._id })));
      } catch (err) {
        if (err.name !== 'AbortError') console.error("Error loading products:", err);
      } finally {
        setIsInitialLoading(false);
        setIsFiltering(false);
      }
    })();

    return () => { ac.abort(); };
  }, [activeFilter, activeBrand, activeCat, debouncedSearchQuery]);

  // Sync Global User Shopping Session Cart Upstream
  useEffect(() => {
    if (!currentUser?.id) {
      // restore cached cart when no user
      const cached = loadCartStorage();
      if (cached.length) setCartItems(cached);
      return;
    }
    const ac = new AbortController();
    abortControllers.current.cart = ac;

    (async () => {
      try {
        const data = await apiFetch(`/api/cart/${currentUser.id}`, { signal: ac.signal });
        const safeDataPayload = Array.isArray(data) ? data : data.items || [];
        const formattedCart = safeDataPayload.map((item) => ({
          id: item.product_id || item.id || item._id,
          name: item.name,
          price: item.price,
          category: item.category,
          brand_key: item.brand_key,
          quantity: item.quantity,
          stock_quantity: item.stock_quantity,
        }));
        setCartItems(formattedCart);
        saveCartStorage(formattedCart);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error("Cart sync down failure, recovering cached local copy:", err);
          const localCachedCart = loadCartStorage();
          if (localCachedCart.length) setCartItems(localCachedCart);
        }
      }
    })();

    return () => { ac.abort(); };
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
  const handleAddToCart = useCallback(async (e, productId, productName, customQty = 1) => {
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();

    const pid = productId;
    const productData = products.find((p) => (p.id === pid || p._id === pid)) || cartItems.find((item) => (item.id === pid || item._id === pid));
    if (!productData) {
      showToast("⚠️ Could not trace item specifications. Please refresh.");
      return;
    }

    const currentCartRecord = cartItems.find((item) => (item.id === pid || item._id === pid));
    const plannedQuantity = currentCartRecord ? currentCartRecord.quantity + customQty : customQty;
    const maxAvailableStock = productData.stock_quantity !== undefined ? productData.stock_quantity : 999;

    if (plannedQuantity > maxAvailableStock) {
      showToast(`⚠️ Only ${maxAvailableStock} units available for "${productName}".`);
      return;
    }

    setCartItems((prevItems) => {
      let nextItems;
      const existingItem = prevItems.find((item) => (item.id === pid || item._id === pid));
      if (existingItem) {
        nextItems = prevItems.map((item) =>
          (item.id === pid || item._id === pid)
            ? { ...item, quantity: item.quantity + customQty }
            : item
        );
      } else {
        nextItems = [...prevItems, { ...productData, id: productData.id || productData._id, quantity: customQty }];
      }
      saveCartStorage(nextItems);
      return nextItems;
    });

    if (currentUser?.id) {
      try {
        await apiFetch(`/api/cart`, {
          method: "POST",
          body: JSON.stringify({ userId: currentUser.id, productId: pid, quantity: customQty }),
        });
      } catch (err) {
        console.error("Failed to commit item update upstream:", err);
      }
    }
    showToast(`🛒 Added ${customQty}x "${productName}" to basket.`);
  }, [products, cartItems, currentUser, setCartItems, showToast]);

  const handleUpdateQuantity = useCallback(async (productId, change) => {
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

      saveCartStorage(nextItems);
      return nextItems;
    });

    if (stockReachedExceeded) {
      showToast(`⚠️ Cannot add more. Stock ceiling for "${targetProductName}" is capped at ${maxAvailableStock} units.`);
      return;
    }

    if (currentUser?.id) {
      try {
        if (updatedQuantity <= 0) {
          await apiFetch("/api/cart", {
            method: "DELETE",
            body: JSON.stringify({ userId: currentUser.id, productId }),
          });
        } else {
          await apiFetch("/api/cart", {
            method: "POST",
            body: JSON.stringify({ userId: currentUser.id, productId, quantity: change }),
          });
        }
      } catch (err) {
        console.error(err);
      }
    }
  }, [products, cartItems, currentUser, setCartItems, showToast]);

  const handleToggleWishlist = useCallback((e, id) => {
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    const stringId = String(id);
    setWishlist((prev) => {
      const next = { ...prev, [stringId]: !prev[stringId] };
      saveWishlistStorage(next);
      return next;
    });
  }, []);

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