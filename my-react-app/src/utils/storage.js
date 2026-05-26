export function loadCartStorage() {
  try {
    const raw = localStorage.getItem("nalapaka_cart");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveCartStorage(cart) {
  try {
    localStorage.setItem("nalapaka_cart", JSON.stringify(cart));
  } catch (e) {
    // ignore
  }
}

export function loadWishlistStorage() {
  try {
    const raw = localStorage.getItem("nalapaka_wishlist");
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function saveWishlistStorage(wishlist) {
  try {
    localStorage.setItem("nalapaka_wishlist", JSON.stringify(wishlist));
  } catch (e) {
    // ignore
  }
}
