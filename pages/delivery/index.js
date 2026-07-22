import { useEffect, useState } from "react";
import Link from "next/link";
import DeliveryLayout from "@/components/delivery/DeliveryLayout";
import styles from "@/styles/delivery.module.css";
export default function DeliveryDashboard() {
  const [d, setD] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/delivery-manager/dashboard")
      .then((r) => r.json())
      .then((j) => (j.success ? setD(j.data) : setError(j.error?.message)));
  }, []);
  return (
    <DeliveryLayout title="Bhavya Delivery Dashboard">
      {error ? (
        <p className={styles.error}>{error}</p>
      ) : !d ? (
        <p>Loading delivery work…</p>
      ) : (
        <>
          <section className={styles.stats}>
            <div className={styles.stat}>
              <b>{d.orders.length}</b>Recent orders
            </div>
            <div className={styles.stat}>
              <b>₹{d.earnings.revenue.toFixed(2)}</b>Delivery revenue
            </div>
            <div className={styles.stat}>
              <b>₹{d.earnings.costs.toFixed(2)}</b>Recorded costs
            </div>
            <div className={styles.stat}>
              <b>₹{d.earnings.profit.toFixed(2)}</b>Delivery profit
            </div>
          </section>
          <section className={styles.grid}>
            {d.orders.map((o) => (
              <article className={styles.card} key={o.id}>
                <Link href={`/delivery/orders/${o.orderNumber}`}>
                  <span className={styles.badge}>{o.delivery.status}</span>
                  <strong>{o.orderNumber}</strong>
                  <p>
                    {o.customer.name} · {o.shippingAddress.city}
                  </p>
                  <small className={styles.muted}>
                    {o.delivery.zone} · {o.delivery.distanceKm ?? "Verify"} km
                  </small>
                </Link>
              </article>
            ))}
          </section>
        </>
      )}
    </DeliveryLayout>
  );
}
