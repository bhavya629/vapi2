import { createContext, useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const CartContext = createContext(null);
const STORAGE_KEY = "cellphoneStudioCart";
const validTypes = new Set(["smartphone", "accessory"]);

function normalizeItem(product, productType, quantity = 1) {
  const rawId = product?.id;
  const validId =
    (typeof rawId === "string" && rawId.trim()) ||
    Number.isFinite(Number(rawId));
  if (
    !product ||
    product.isActive === false ||
    product.inStock === false ||
    !validTypes.has(productType) ||
    !validId ||
    typeof product.name !== "string" ||
    !Number.isFinite(Number(product.price)) ||
    Number(product.price) < 0
  )
    return null;
  const id = typeof rawId === "string" ? rawId.trim() : Number(rawId);
  const combinationId =
    typeof product.productVariantColourId === "string"
      ? product.productVariantColourId.trim()
      : null;
  const safeQuantity = Math.min(
    10,
    Math.max(1, Math.trunc(Number(quantity)) || 1),
  );
  return {
    cartKey: combinationId
      ? `${productType}-${id}-${combinationId}`
      : `${productType}-${id}`,
    id,
    productType,
    name: product.name,
    brand:
      typeof product.brand === "string"
        ? product.brand
        : "The Cellphone Studio",
    image: typeof product.image === "string" ? product.image : null,
    price: Number(product.price),
    originalPrice:
      Number(product.oldPrice || product.originalPrice) > Number(product.price)
        ? Number(product.oldPrice || product.originalPrice)
        : null,
    quantity: safeQuantity,
    stock:
      Number.isInteger(product.stock) && product.stock > 0
        ? product.stock
        : null,
    visual: Number.isInteger(product.visual) ? product.visual : 0,
    detailRoute:
      typeof product.detailRoute === "string" &&
      product.detailRoute.startsWith("/")
        ? product.detailRoute
        : productType === "smartphone"
          ? `/product/${id}`
          : `/accessory/${id}`,
    productId: id,
    productSlug: product.slug || product.productSlug || null,
    productVariantId: product.productVariantId || null,
    productVariantColourId: combinationId,
    ram: product.ram || null,
    storage: product.storage || null,
    colourName: product.colourName || null,
    sku: product.sku || null,
  };
}

function restoreItems() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeItem(item, item?.productType, item?.quantity))
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [cartReady, setCartReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCartItems(restoreItems());
      setCartReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (cartReady)
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems, cartReady]);

  const addToCart = (product, productType, quantity = 1, options = {}) => {
    const item = normalizeItem(product, productType, quantity);
    if (!item) return false;
    const updatedExisting = cartItems.some(
      (entry) => entry.cartKey === item.cartKey,
    );
    const existingItem = cartItems.find(
      (entry) => entry.cartKey === item.cartKey,
    );
    if (
      existingItem &&
      existingItem.quantity >= Math.min(existingItem.stock || 10, 10)
    ) {
      if (!options.silent) toast.error("Maximum cart quantity reached.");
      return false;
    }
    setCartItems((current) => {
      const existing = current.find((entry) => entry.cartKey === item.cartKey);
      if (!existing) return [...current, item];
      const maximum = Math.min(existing.stock || 10, 10);
      return current.map((entry) =>
        entry.cartKey === item.cartKey
          ? {
              ...entry,
              quantity: Math.min(maximum, entry.quantity + item.quantity),
            }
          : entry,
      );
    });
    if (!options.silent)
      toast.success(
        updatedExisting
          ? "Quantity updated in your cart."
          : `${item.name} added to cart.`,
      );
    return true;
  };

  const removeFromCart = (cartKey) => {
    setCartItems((items) => items.filter((item) => item.cartKey !== cartKey));
    toast.success("Item removed from cart.");
  };
  const updateQuantity = (cartKey, quantity) =>
    setCartItems((items) =>
      items.map((item) => {
        if (item.cartKey !== cartKey) return item;
        const numeric = Number(quantity);
        const maximum = Math.min(item.stock || 10, 10);
        if (!Number.isInteger(numeric) || numeric < 1 || numeric > maximum)
          return item;
        return { ...item, quantity: numeric };
      }),
    );
  const increaseQuantity = (cartKey) =>
    setCartItems((items) =>
      items.map((item) =>
        item.cartKey === cartKey
          ? {
              ...item,
              quantity: Math.min(
                Math.min(item.stock || 10, 10),
                item.quantity + 1,
              ),
            }
          : item,
      ),
    );
  const decreaseQuantity = (cartKey) =>
    setCartItems((items) =>
      items.map((item) =>
        item.cartKey === cartKey
          ? { ...item, quantity: Math.max(1, item.quantity - 1) }
          : item,
      ),
    );
  const clearCart = () => setCartItems([]);

  const value = useMemo(() => {
    const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const originalSubtotal = cartItems.reduce(
      (sum, item) => sum + (item.originalPrice || item.price) * item.quantity,
      0,
    );
    // Cart prices and stock are browsing conveniences only. A later checkout
    // phase must reload authoritative values from PostgreSQL before ordering.
    return {
      cartItems,
      cartCount,
      subtotal,
      totalSavings: Math.max(0, originalSubtotal - subtotal),
      cartReady,
      addToCart,
      removeFromCart,
      increaseQuantity,
      decreaseQuantity,
      updateQuantity,
      clearCart,
      isInCart: (id, type, combinationId) =>
        cartItems.some(
          (item) =>
            item.cartKey ===
            (combinationId
              ? `${type}-${id}-${combinationId}`
              : `${type}-${id}`),
        ),
      getItemQuantity: (id, type, combinationId) =>
        cartItems.find(
          (item) =>
            item.cartKey ===
            (combinationId
              ? `${type}-${id}-${combinationId}`
              : `${type}-${id}`),
        )?.quantity || 0,
    };
  }, [cartItems, cartReady]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
