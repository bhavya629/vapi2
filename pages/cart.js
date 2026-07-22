import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  FiArrowRight,
  FiCheckCircle,
  FiChevronLeft,
  FiMinus,
  FiPlus,
  FiShield,
  FiShoppingBag,
  FiShoppingCart,
  FiSmartphone,
  FiTrash2,
  FiTruck,
  FiUsers,
  FiX,
} from "react-icons/fi";
import Footer from "@/components/layout/Footer";
import { useCart } from "@/context/CartContext";
import styles from "@/styles/cart.module.css";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default function CartPage() {
  const {
    cartItems,
    cartCount,
    subtotal,
    totalSavings,
    cartReady,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
    updateQuantity,
    clearCart,
  } = useCart();
  const [clearOpen, setClearOpen] = useState(false);
  const itemWord = cartCount === 1 ? "item" : "items";

  return (
    <>
      <Head>
        <title>Shopping Cart | The Cellphone Studio</title>
        <meta
          name="description"
          content="Review smartphones and accessories added to your cart before checkout at The Cellphone Studio, Vapi."
        />
        <meta name="robots" content="noindex,follow" />
      </Head>
      <main className={styles.page}>
        <section className={styles.hero} aria-labelledby="cart-title">
          <div className={`${styles.container} ${styles.heroInner}`}>
            <div>
              <p>Your Shopping Cart</p>
              <h1 id="cart-title">Review Your Cart</h1>
              <span>
                Check your selected smartphones and accessories before
                proceeding to checkout.
              </span>
              <strong aria-live="polite">
                {cartReady
                  ? `${cartCount} ${itemWord} in your cart`
                  : "Loading your cart"}
              </strong>
            </div>
            <FiShoppingCart aria-hidden="true" />
          </div>
        </section>

        {!cartReady ? (
          <section
            className={`${styles.container} ${styles.loading}`}
            aria-live="polite"
          >
            <div className={styles.spinner} />
            <h2>Loading your cart...</h2>
            <div className={styles.skeleton} />
            <div className={styles.skeleton} />
          </section>
        ) : cartItems.length === 0 ? (
          <EmptyCart />
        ) : (
          <>
            <section className={`${styles.container} ${styles.cartLayout}`}>
              <div className={styles.cartList}>
                <header>
                  <div>
                    <h2>Shopping Cart</h2>
                    <span>
                      {cartCount} {cartCount === 1 ? "Item" : "Items"}
                    </span>
                  </div>
                  <button type="button" onClick={() => setClearOpen(true)}>
                    <FiTrash2 /> Clear Cart
                  </button>
                </header>
                <div className={styles.items}>
                  {cartItems.map((item) => (
                    <CartItem
                      item={item}
                      key={item.cartKey}
                      onRemove={removeFromCart}
                      increase={increaseQuantity}
                      decrease={decreaseQuantity}
                      update={updateQuantity}
                    />
                  ))}
                </div>
              </div>
              <OrderSummary subtotal={subtotal} savings={totalSavings} />
            </section>
            <TrustCards />
            <BrowseCta />
          </>
        )}
      </main>
      {clearOpen && (
        <ClearModal
          onCancel={() => setClearOpen(false)}
          onConfirm={() => {
            clearCart();
            setClearOpen(false);
          }}
        />
      )}
      <Footer />
    </>
  );
}

function CartItem({ item, onRemove, increase, decrease, update }) {
  const maximum = Math.min(item.stock || 10, 10);
  const saving = item.originalPrice
    ? (item.originalPrice - item.price) * item.quantity
    : 0;
  return (
    <article className={styles.itemCard}>
      <Link
        className={styles.itemImage}
        href={item.detailRoute}
        aria-label={`View ${item.name} details`}
      >
        {item.image ? (
          <Image src={item.image} alt={item.name} fill sizes="140px" />
        ) : item.productType === "smartphone" ? (
          <FiSmartphone aria-hidden="true" />
        ) : (
          <FiShoppingBag aria-hidden="true" />
        )}
      </Link>
      <div className={styles.itemDetails}>
        <p>{item.brand}</p>
        <h3>
          <Link href={item.detailRoute}>{item.name}</Link>
        </h3>
        <span className={styles.typeBadge}>
          {item.productType === "smartphone" ? "Smartphone" : "Accessory"}
        </span>
        {item.productVariantColourId && (
          <p>
            <strong>
              {item.ram} · {item.storage} · {item.colourName}
            </strong>
            <br />
            <small>SKU: {item.sku}</small>
          </p>
        )}
        {item.stock && <span className={styles.inStock}>In Stock</span>}
        <p className={styles.deliveryNote}>
          Eligible for same-day delivery within Vapi, subject to availability
          and order confirmation.
        </p>
        <div className={styles.unitPrice}>
          <strong>{currency.format(item.price)}</strong>
          {item.originalPrice && (
            <del>{currency.format(item.originalPrice)}</del>
          )}
        </div>
      </div>
      <div className={styles.itemControls}>
        <div className={styles.stepper}>
          <button
            type="button"
            onClick={() => decrease(item.cartKey)}
            disabled={item.quantity <= 1}
            aria-label={`Decrease quantity of ${item.name}`}
          >
            <FiMinus />
          </button>
          <input
            aria-label={`Quantity of ${item.name}`}
            inputMode="numeric"
            value={item.quantity}
            onChange={(event) =>
              update(item.cartKey, Number(event.target.value))
            }
          />
          <button
            type="button"
            onClick={() => increase(item.cartKey)}
            disabled={item.quantity >= maximum}
            aria-label={`Increase quantity of ${item.name}`}
          >
            <FiPlus />
          </button>
        </div>
        {item.quantity >= maximum && <small>Maximum {maximum}</small>}
        <div className={styles.itemTotal}>
          <span>Item total</span>
          <strong>{currency.format(item.price * item.quantity)}</strong>
          {saving > 0 && <small>You save {currency.format(saving)}</small>}
        </div>
        <button
          className={styles.remove}
          type="button"
          onClick={() => onRemove(item.cartKey)}
        >
          <FiTrash2 /> Remove
        </button>
      </div>
    </article>
  );
}

function OrderSummary({ subtotal, savings }) {
  return (
    <aside className={styles.summary} aria-labelledby="summary-title">
      <h2 id="summary-title">Order Summary</h2>
      <dl>
        <div>
          <dt>Subtotal</dt>
          <dd>{currency.format(subtotal)}</dd>
        </div>
        {savings > 0 && (
          <div className={styles.savings}>
            <dt>Product Savings</dt>
            <dd>−{currency.format(savings)}</dd>
          </div>
        )}
        <div>
          <dt>Delivery</dt>
          <dd>Confirmed separately</dd>
        </div>
        <div className={styles.total}>
          <dt>Total</dt>
          <dd>{currency.format(subtotal)}</dd>
        </div>
      </dl>
      <p>
        Final delivery charges, if applicable, will be confirmed during
        checkout.
      </p>
      <Link className={styles.checkout} href="/checkout">
        <span>Proceed to Checkout</span>
        <FiArrowRight />
      </Link>
      <Link className={styles.continue} href="/smartphones">
        <FiChevronLeft /> Continue Shopping
      </Link>
      <Link className={styles.browseAccessories} href="/accessories">
        Browse Accessories
      </Link>
      <div className={styles.summaryNotes}>
        <span>
          <FiShield /> Genuine products
        </span>
        <span>
          <FiUsers /> Local support
        </span>
        <span>
          <FiTruck /> Same-day delivery available within Vapi
        </span>
        <small>Protected checkout experience</small>
      </div>
    </aside>
  );
}

function TrustCards() {
  const cards = [
    [
      FiShield,
      "Genuine Products",
      "Shop smartphones and accessories sourced through trusted channels.",
    ],
    [
      FiUsers,
      "Local Support",
      "Call or WhatsApp our Vapi team whenever you need assistance.",
    ],
    [
      FiTruck,
      "Same-Day Delivery in Vapi",
      "Available subject to order confirmation, product availability, and delivery location.",
    ],
  ];
  return (
    <section
      className={`${styles.container} ${styles.trustCards}`}
      aria-label="Shopping benefits"
    >
      {cards.map(([Icon, title, text]) => (
        <article key={title}>
          <span>
            <Icon />
          </span>
          <div>
            <h2>{title}</h2>
            <p>{text}</p>
          </div>
        </article>
      ))}
    </section>
  );
}

function BrowseCta() {
  return (
    <section
      className={`${styles.container} ${styles.browseCta}`}
      aria-labelledby="browse-title"
    >
      <div>
        <p>Complete Your Cart</p>
        <h2 id="browse-title">Forgot Something?</h2>
        <span>
          Explore more smartphones and accessories before completing your order.
        </span>
      </div>
      <div>
        <Link href="/smartphones">Browse Smartphones</Link>
        <Link href="/accessories">Shop Accessories</Link>
      </div>
    </section>
  );
}

function EmptyCart() {
  return (
    <>
      <section className={`${styles.container} ${styles.empty}`}>
        <span>
          <FiShoppingCart />
        </span>
        <h2>Your Cart Is Empty</h2>
        <p>
          You have not added any smartphones or accessories yet. Explore our
          collection and find the right product for you.
        </p>
        <div>
          <Link href="/smartphones">Browse Smartphones</Link>
          <Link href="/accessories">Explore Accessories</Link>
        </div>
        <Link href="/">Return Home</Link>
      </section>
      <TrustCards />
      <BrowseCta />
    </>
  );
}

function ClearModal({ onCancel, onConfirm }) {
  const cancelRef = useRef(null);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onCancel]);
  return (
    <div
      className={styles.modalBackdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="clear-title"
      >
        <button
          className={styles.modalClose}
          type="button"
          onClick={onCancel}
          aria-label="Close confirmation"
        >
          <FiX />
        </button>
        <span>
          <FiTrash2 />
        </span>
        <h2 id="clear-title">Clear Your Cart?</h2>
        <p>This will remove every item currently saved in your cart.</p>
        <div>
          <button type="button" onClick={onCancel} ref={cancelRef}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm}>
            Clear Cart
          </button>
        </div>
      </div>
    </div>
  );
}
