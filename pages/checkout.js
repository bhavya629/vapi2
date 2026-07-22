import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  FiCreditCard,
  FiMapPin,
  FiPackage,
  FiShoppingBag,
  FiTruck,
} from "react-icons/fi";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import styles from "@/styles/checkout.module.css";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});
const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
const blank = {
  label: "Home",
  recipientName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  landmark: "",
  city: "Vapi",
  district: "Valsad",
  state: "Gujarat",
  postalCode: "",
  country: "India",
  latitude: "",
  longitude: "",
};
export default function Checkout() {
  const router = useRouter(),
    { user, loading } = useAuth(),
    cart = useCart();
  useEffect(() => {
    if (!loading && !user) router.replace("/login?redirect=/checkout");
  }, [loading, user, router]);
  if (loading || !cart.cartReady || !user)
    return (
      <>
        <main className={styles.loading}>
          <h1>Preparing checkout...</h1>
        </main>
        <Footer />
      </>
    );
  return <CheckoutForm user={user} cart={cart} />;
}
function CheckoutForm({ user, cart }) {
  const router = useRouter(),
    [addresses, setAddresses] = useState([]),
    [addressId, setAddressId] = useState(""),
    [address, setAddress] = useState({
      ...blank,
      recipientName: user.name || "",
      phone: user.phone || "",
    }),
    [fulfilment, setFulfilment] = useState("DELIVERY"),
    [payment, setPayment] = useState("OFFLINE"),
    [saveAddress, setSaveAddress] = useState(false),
    [note, setNote] = useState(""),
    [quote, setQuote] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    key = useRef(null);
  const items = useMemo(
    () =>
      cart.cartItems.map((i) => ({
        productId: String(i.id),
        productVariantId: i.productVariantId || undefined,
        productVariantColourId: i.productVariantColourId || undefined,
        productType: i.productType.toUpperCase(),
        quantity: i.quantity,
      })),
    [cart.cartItems],
  );
  useEffect(() => {
    fetch("/api/account/addresses")
      .then((r) => r.json())
      .then((j) => {
        const list = j.data?.addresses || [];
        setAddresses(list);
        setAddressId(list.find((a) => a.isDefault)?.id || "");
      });
  }, []);
  useEffect(() => {
    if (!items.length) return;
    const newAddressReady =
      address.recipientName &&
      address.phone &&
      address.addressLine1 &&
      address.city &&
      address.state &&
      /^\d{6}$/.test(address.postalCode);
    if (fulfilment === "DELIVERY" && !addressId && !newAddressReady) {
      setQuote(null);
      return;
    }
    const timer = setTimeout(async () => {
      const r = await fetch("/api/orders/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          fulfilmentMethod: fulfilment,
          addressId: addressId || undefined,
          newAddress:
            fulfilment === "DELIVERY" && !addressId ? address : undefined,
        }),
      });
      const j = await r.json();
      if (r.ok) {
        setQuote(j.data);
        setError("");
      } else {
        setQuote(null);
        setError(j.error?.message || "Unable to verify your cart.");
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [items, fulfilment, addressId, address]);
  if (!items.length)
    return (
      <>
        <Head>
          <title>Checkout | The Cellphone Studio</title>
        </Head>
        <main className={styles.page}>
          <section className={`${styles.container} ${styles.empty}`}>
            <FiShoppingBag />
            <h2>Your Cart Is Empty</h2>
            <Link href="/smartphones">Browse Smartphones</Link>
          </section>
        </main>
        <Footer />
      </>
    );
  async function place(e) {
    e.preventDefault();
    if (!quote || busy) return;
    if (!key.current) key.current = crypto.randomUUID();
    setBusy(true);
    setError("");
    try {
      const online = payment === "ONLINE",
        payload = {
          items,
          fulfilmentMethod: fulfilment,
          paymentMethod: online
            ? "ONLINE"
            : fulfilment === "DELIVERY"
              ? "CASH_ON_DELIVERY"
              : "PAY_AT_STORE",
          addressId: (fulfilment === "DELIVERY" && addressId) || undefined,
          newAddress:
            fulfilment === "DELIVERY" && !addressId ? address : undefined,
          saveAddress,
          customerNote: note,
          idempotencyKey: key.current,
        };
      const r = await fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": key.current,
          },
          body: JSON.stringify(payload),
        }),
        j = await r.json();
      if (!r.ok) throw new Error(j.error?.message || "Unable to place order.");
      if (
        j.data.order.delivery?.shippingChargeStatus === "PENDING_CONFIRMATION"
      ) {
        cart.clearCart();
        toast.success(
          "Order saved. Our delivery manager will call to confirm shipping.",
        );
        return router.push(j.data.redirectPath);
      }
      if (!online) {
        cart.clearCart();
        toast.success("Order placed successfully.");
        return router.push(j.data.redirectPath);
      }
      const ready = await loadRazorpay();
      if (!ready)
        throw new Error(
          "Payment window could not be loaded. Your pending order is safe; retry from My Orders.",
        );
      const pr = await fetch("/api/payments/razorpay/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderNumber: j.data.order.orderNumber }),
        }),
        pj = await pr.json();
      if (!pr.ok)
        throw new Error(pj.error?.message || "Unable to start payment.");
      new window.Razorpay({
        key: pj.data.keyId,
        amount: pj.data.amount,
        currency: pj.data.currency,
        name: "The Cellphone Studio",
        description: "Order payment",
        order_id: pj.data.razorpayOrderId,
        prefill: pj.data.customer,
        theme: { color: "#0878c9" },
        retry: { enabled: true },
        handler: async (response) => {
          const vr = await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderNumber: pj.data.orderNumber,
                ...response,
              }),
            }),
            vj = await vr.json();
          if (!vr.ok) {
            toast.error(vj.error?.message || "Payment verification failed.");
            return;
          }
          cart.clearCart();
          toast.success("Payment verified successfully.");
          router.push(vj.data.redirectPath);
        },
        modal: {
          ondismiss: () => {
            toast("Payment remains pending. You can retry from My Orders.");
            router.push(
              `/payment/pending?order=${encodeURIComponent(pj.data.orderNumber)}`,
            );
          },
        },
      }).open();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Head>
        <title>Secure Checkout | The Cellphone Studio</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={`${styles.container} ${styles.heroInner}`}>
            <div>
              <p>SECURE CHECKOUT</p>
              <h1>Complete Your Order</h1>
              <span>
                Prices and availability are verified securely before your order
                is placed.
              </span>
            </div>
            <FiTruck />
          </div>
        </section>
        <form
          className={`${styles.container} ${styles.layout}`}
          onSubmit={place}
        >
          <div className={styles.formSections}>
            <section className={styles.card}>
              <header>
                <span>
                  <FiTruck />
                </span>
                <div>
                  <p>FULFILMENT</p>
                  <h2>Delivery Preference</h2>
                </div>
              </header>
              <div className={styles.radioGroup}>
                <label>
                  <input
                    type="radio"
                    checked={fulfilment === "DELIVERY"}
                    onChange={() => setFulfilment("DELIVERY")}
                  />{" "}
                  India delivery{" "}
                  <small>
                    Same-day within 50 km; outstation shipping is confirmed by
                    phone.
                  </small>
                </label>
                <label>
                  <input
                    type="radio"
                    checked={fulfilment === "STORE_PICKUP"}
                    onChange={() => setFulfilment("STORE_PICKUP")}
                  />{" "}
                  Store pickup{" "}
                  <small>Pay at the store after confirmation.</small>
                </label>
              </div>
            </section>
            {fulfilment === "DELIVERY" && (
              <section className={styles.card}>
                <header>
                  <span>
                    <FiMapPin />
                  </span>
                  <div>
                    <p>DELIVERY ADDRESS</p>
                    <h2>Where Should We Deliver?</h2>
                  </div>
                </header>
                {addresses.length > 0 && (
                  <label className={styles.field}>
                    Saved address
                    <select
                      value={addressId}
                      onChange={(e) => setAddressId(e.target.value)}
                    >
                      <option value="">Use a new address</option>
                      {addresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label} — {a.addressLine1}, {a.city}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {!addressId && (
                  <div className={styles.twoFields}>
                    {Object.entries(address)
                      .filter(([k]) => !["country", "label"].includes(k))
                      .map(([k, v]) => (
                        <label className={styles.field} key={k}>
                          {k.replace(/([A-Z])/g, " $1")}
                          <input
                            required={
                              ![
                                "addressLine2",
                                "landmark",
                                "district",
                                "latitude",
                                "longitude",
                              ].includes(k)
                            }
                            value={v || ""}
                            onChange={(e) =>
                              setAddress((x) => ({ ...x, [k]: e.target.value }))
                            }
                          />
                        </label>
                      ))}
                  </div>
                )}
                {!addressId && (
                  <label className={styles.check}>
                    <input
                      type="checkbox"
                      checked={saveAddress}
                      onChange={(e) => setSaveAddress(e.target.checked)}
                    />
                    <span>Save this address for future orders</span>
                  </label>
                )}
              </section>
            )}
            <section className={styles.card}>
              <header>
                <span>
                  <FiCreditCard />
                </span>
                <div>
                  <p>PAYMENT</p>
                  <h2>Payment Method</h2>
                </div>
              </header>
              <label className={styles.check}>
                <input
                  type="radio"
                  checked={payment === "OFFLINE"}
                  onChange={() => setPayment("OFFLINE")}
                />
                <span>
                  {fulfilment === "DELIVERY"
                    ? "Cash on Delivery"
                    : "Pay at Store"}
                </span>
              </label>
              <label className={styles.check}>
                <input
                  type="radio"
                  checked={payment === "ONLINE"}
                  onChange={() => setPayment("ONLINE")}
                />
                <span>Pay Online securely with Razorpay</span>
              </label>
            </section>
            <section className={styles.card}>
              <header>
                <span>
                  <FiPackage />
                </span>
                <div>
                  <p>ORDER REVIEW</p>
                  <h2>{cart.cartCount} Items</h2>
                </div>
              </header>
              {quote?.items.map((i) => (
                <article key={i.productId}>
                  <strong>{i.name}</strong> × {i.quantity}
                  <span> {money.format(Number(i.lineTotal))}</span>
                </article>
              ))}
              <label className={styles.field}>
                Order note (optional)
                <textarea
                  maxLength="500"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
            </section>
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
          </div>
          <aside className={styles.summary}>
            <h2>Order Summary</h2>
            <p>
              Subtotal{" "}
              <strong>{money.format(Number(quote?.subtotal || 0))}</strong>
            </p>
            <p>
              Delivery charge{" "}
              <strong>
                {quote?.deliveryCharge == null
                  ? "To be confirmed by phone"
                  : money.format(Number(quote.deliveryCharge))}
              </strong>
            </p>
            <p>
              Total currently{" "}
              <strong>{money.format(Number(quote?.total || 0))}</strong>
            </p>
            {quote?.warnings?.map((w) => (
              <small key={w}>{w}</small>
            ))}
            <button disabled={busy || !quote}>
              {busy
                ? "Processing..."
                : quote?.delivery?.requiresConfirmation
                  ? "Place Order for Shipping Confirmation"
                  : payment === "ONLINE"
                    ? "Continue to Secure Payment"
                    : "Place Order"}
            </button>
            <small>
              {payment === "ONLINE"
                ? "Your cart clears only after server-verified payment."
                : "Stock is deducted only after the database order succeeds."}
            </small>
          </aside>
        </form>
      </main>
      <Footer />
    </>
  );
}
