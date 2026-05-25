import { useState, useMemo, useEffect } from "react";
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
import ContactSupport from "./marketplace/ContactSupport"; // Loaded support gateway modal

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
  const [isSupportOpen, setIsSupportOpen] = useState(false); // 👈 Added state hook
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeBrand, setActiveBrand] = useState("all");
  const [activeCat, setActiveCat] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: "" });

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);

  // 💾 Database state buckets
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const changeFilter = (filterId) => {
    setLoading(true);
    setActiveFilter(filterId);
  };
  const changeCategory = (catId) => {
    setLoading(true);
    setActiveCat(catId);
  };
  const changeBrand = (brandId) => {
    setLoading(true);
    setActiveBrand(brandId);
  };
  const changeSearch = (query) => {
    setLoading(true);
    setSearchQuery(query);
  };

  // Fetch brand items from database on initial render
  useEffect(() => {
    let isMounted = true;
    fetch("http://localhost:5000/api/brands")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && Array.isArray(data)) setBrands(data);
      })
      .catch((err) => console.error("Error loading brands matrix:", err));

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch category items from database on initial render
  useEffect(() => {
    let isMounted = true;
    fetch("http://localhost:5000/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && Array.isArray(data)) setCategories(data);
      })
      .catch((err) => console.error("Error loading categories matrix:", err));

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch product items dynamically combined with filters
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
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeFilter, activeBrand, activeCat, debouncedSearchQuery]);

  // Load backend cart tracking matrix
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
        const localCachedCart = localStorage.getItem("nalapaka_cart");
        if (localCachedCart && isMounted)
          setCartItems(JSON.parse(localCachedCart));
        console.log(err);
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser, setCartItems]);

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ show: false, msg: "" }), 2800);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const showToast = (msg) => setToast({ show: true, msg });
  const totalCartCount = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.quantity, 0),
    [cartItems],
  );
  const totalWishlistCount = useMemo(
    () => Object.values(wishlist).filter(Boolean).length,
    [wishlist],
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

  // Add fresh item with inventory checks
  const handleAddToCart = async (e, productId, productName) => {
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();

    if (!products || products.length === 0) return;
    const productData = products.find((p) => p.id === productId);
    if (!productData) return;

    const currentCartRecord = cartItems.find((item) => item.id === productId);
    const plannedQuantity = currentCartRecord ? currentCartRecord.quantity + 1 : 1;
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
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      } else {
        nextItems = [...prevItems, { ...productData, quantity: 1 }];
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
            quantity: 1,
          }),
        });
      } catch (err) {
        console.error(err);
      }
    }
    showToast(`${productName} added to basket`);
  };

  // Unified mutation updater with active boundary limits
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
        onOpenSupport={() => setIsSupportOpen(true)} // 👈 Connected navbar trigger
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
          const cartMatch = cartItems.find(
            (item) => item.id === selectedProduct.id,
          );
          const currentCount = cartMatch ? cartMatch.quantity : 0;
          return (
            <ProductDetails
              product={selectedProduct}
              onBack={() => setSelectedProduct(null)}
              currentCount={currentCount}
              onUpdateQuantity={handleUpdateQuantity}
              onAddCart={(e) =>
                handleAddToCart(e, selectedProduct.id, selectedProduct.name)
              }
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

          <section className="products-section">
            <div className="product-grid">
              {loading ? (
                <div style={{ color: "var(--stone)", padding: "48px 16px", gridColumn: "1 / -1", textAlign: "center" }}>
                  <p style={{ fontSize: "1.2rem", fontWeight: "bold" }}>Pulling items...</p>
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
                      style={{ cursor: "pointer", position: "relative" }}
                    >
                      <ProductCard
                        product={p}
                        isWishlisted={!!wishlist[String(p.id)]}
                        currentCount={currentCount}
                        onToggleWishlist={handleToggleWishlist}
                        onAddCart={(e, id, name) => handleAddToCart(e, id, name)}
                        onUpdateQuantity={handleUpdateQuantity}
                      />
                    </div>
                  );
                })
              ) : (
                <div style={{ color: "var(--stone)", padding: "48px 16px", gridColumn: "1 / -1", textAlign: "center" }}>
                  <p style={{ fontSize: "1.2rem", fontWeight: "bold" }}>No snacks found.</p>
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
      
      {/* 📬 MODAL PORTAL PORT OVERLAYS */}
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