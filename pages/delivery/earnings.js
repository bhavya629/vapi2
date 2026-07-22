import { useEffect, useState } from "react";
import DeliveryLayout from "@/components/delivery/DeliveryLayout";
import styles from "@/styles/delivery.module.css";
export default function Earnings() {
  const [d, setD] = useState(null);
  useEffect(() => {
    fetch("/api/delivery-manager/earnings")
      .then((r) => r.json())
      .then((j) => j.success && setD(j.data));
  }, []);
  return (
    <DeliveryLayout title="Delivery Earnings">
      {!d ? (
        <p>Loading…</p>
      ) : (
        <section className={styles.stats}>
          <div className={styles.stat}>
            <b>{d.orders}</b>Orders costed
          </div>
          <div className={styles.stat}>
            <b>₹{d.revenue.toFixed(2)}</b>Revenue
          </div>
          <div className={styles.stat}>
            <b>₹{d.costs.toFixed(2)}</b>Costs
          </div>
          <div className={styles.stat}>
            <b>₹{d.profit.toFixed(2)}</b>Profit
          </div>
        </section>
      )}
    </DeliveryLayout>
  );
}
