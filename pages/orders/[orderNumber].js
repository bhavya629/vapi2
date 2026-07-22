import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/context/AuthContext";
import Timeline from "@/components/orders/OrderStatusTimeline";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
  label,
} from "@/components/orders/OrderBadges";
import styles from "@/styles/orderRecords.module.css";
const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});
export default function Detail() {
  const router = useRouter(),
    { user, loading } = useAuth(),
    [order, setOrder] = useState(),
    [error, setError] = useState("");
  useEffect(() => {
    if (!loading && !user)
      router.replace(`/login?redirect=${encodeURIComponent(router.asPath)}`);
  }, [loading, user, router]);
  useEffect(() => {
    if (user && router.query.orderNumber)
      fetch(`/api/orders/${encodeURIComponent(router.query.orderNumber)}`)
        .then(async (r) => {
          const j = await r.json();
          if (!r.ok) throw new Error(j.error?.message);
          setOrder(j.data.order);
        })
        .catch((e) => setError(e.message));
  }, [user, router.query.orderNumber]);
  if (error)
    return (
      <>
        <main className={styles.empty}>
          <h1>{error}</h1>
          <Link href="/orders">Back to orders</Link>
        </main>
        <Footer />
      </>
    );
  if (!order)
    return (
      <>
        <main className={styles.loading}>
          <h1>Loading order...</h1>
        </main>
        <Footer />
      </>
    );
  return (
    <>
      <Head>
        <title>{order.orderNumber} | The Cellphone Studio</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main className={styles.page}>
        <header className={styles.hero}>
          <p>ORDER DETAILS</p>
          <h1>{order.orderNumber}</h1>
          <OrderStatusBadge value={order.status} />
          <span>
            {" "}
            Updated{" "}
            {new Date(order.updatedAt || order.placedAt).toLocaleString(
              "en-IN",
            )}
          </span>
        </header>
        <section className={styles.detail}>
          <div className={styles.card}>
            <h2>Items</h2>
            {order.items.map((i) => (
              <article className={styles.item} key={i.id}>
                {i.imageUrl && <img src={i.imageUrl} alt="" />}
                <div>
                  <small>{i.brandName}</small>
                  <h3>{i.productName}</h3>
                  {i.ram && (
                    <p>
                      {i.ram} · {i.storage} · {i.colourName}
                      <br />
                      <small>SKU: {i.sku}</small>
                    </p>
                  )}
                  <p>
                    {money.format(Number(i.unitPrice))} × {i.quantity}
                  </p>
                </div>
                <strong>{money.format(Number(i.lineTotal))}</strong>
              </article>
            ))}
          </div>
          <aside className={styles.card}>
            <h2>Order Summary</h2>
            <p>
              Subtotal <strong>{money.format(Number(order.subtotal))}</strong>
            </p>
            <p>
              Delivery charge{" "}
              <strong>
                {order.deliveryCharge === "0.00"
                  ? "To be confirmed"
                  : money.format(Number(order.deliveryCharge))}
              </strong>
            </p>
            <p>
              Total currently{" "}
              <strong>{money.format(Number(order.total))}</strong>
            </p>
            <hr />
            <p>
              Payment <PaymentStatusBadge value={order.paymentStatus} />
            </p>
            <p>
              Method <strong>{label(order.paymentMethod)}</strong>
            </p>
            {order.address && (
              <address>
                {order.address.recipientName}
                <br />
                {order.address.addressLine1}
                <br />
                {order.address.city}, {order.address.state}{" "}
                {order.address.postalCode}
              </address>
            )}
            <Link
              href={`/contact?order=${encodeURIComponent(order.orderNumber)}`}
            >
              Need Help With This Order?
            </Link>
          </aside>
          <div className={styles.card}>
            <h2>Order Tracking</h2>
            <Timeline order={order} />
            {order.delivery?.type && (
              <section aria-label="Delivery tracking">
                <h3>Delivery</h3>
                <p>
                  <strong>{label(order.delivery.status)}</strong> ·{" "}
                  {label(order.delivery.zone)}
                </p>
                {order.delivery.shippingChargeStatus ===
                  "PENDING_CONFIRMATION" && (
                  <p>
                    Our delivery manager will call you to confirm the outstation
                    shipping charge before payment or dispatch.
                  </p>
                )}
                {order.delivery.sameDayEligible && (
                  <p>Same-day local delivery is available for this order.</p>
                )}
                {order.delivery.courierName && (
                  <p>
                    Courier: {order.delivery.courierName}
                    {order.delivery.trackingNumber &&
                      ` · ${order.delivery.trackingNumber}`}
                  </p>
                )}
                {order.delivery.history?.map((event, index) => (
                  <p key={`${event.status}-${index}`}>
                    {label(event.status)}
                    {event.note ? ` — ${event.note}` : ""}
                  </p>
                ))}
              </section>
            )}
            {order.status === "CANCELLED" && (
              <p role="status">
                <strong>Cancellation:</strong> {order.cancellationReason}
              </p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
