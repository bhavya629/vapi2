import { useEffect, useState } from "react";
import Link from "next/link";
import DeliveryLayout from "@/components/delivery/DeliveryLayout";
import styles from "@/styles/delivery.module.css";
export default function DeliveryOrders() {
  const [d, setD] = useState(null),
    [status, setStatus] = useState("");
  useEffect(() => {
    fetch(`/api/delivery-manager/orders${status ? `?status=${status}` : ""}`)
      .then((r) => r.json())
      .then((j) => j.success && setD(j.data));
  }, [status]);
  return (
    <DeliveryLayout title="Delivery Orders">
      <div className={styles.panel}>
        <label>
          Filter status{" "}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option>AWAITING_DISTANCE_VERIFICATION</option>
            <option>AWAITING_SHIPPING_CONFIRMATION</option>
            <option>PACKAGING_PENDING</option>
            <option>SHIPPED</option>
            <option>DELIVERED</option>
          </select>
        </label>
      </div>
      <section className={styles.grid}>
        {d?.orders.map((o) => (
          <article className={styles.card} key={o.id}>
            <Link href={`/delivery/orders/${o.orderNumber}`}>
              <span className={styles.badge}>{o.delivery.status}</span>
              <strong>{o.orderNumber}</strong>
              <p>{o.customer.name}</p>
              <p className={styles.muted}>
                {o.shippingAddress.city}, {o.shippingAddress.state}
              </p>
              <b>₹{o.total.toFixed(2)}</b>
            </Link>
          </article>
        ))}
      </section>
    </DeliveryLayout>
  );
}
