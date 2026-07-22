import Link from "next/link";
import styles from "@/styles/delivery.module.css";
export default function DeliveryLayout({ title, children }) {
  return (
    <main className={styles.shell}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <span className={styles.badge}>DELIVERY OPERATIONS</span>
            <h1>{title}</h1>
          </div>
          <nav className={styles.nav} aria-label="Delivery manager">
            <Link href="/delivery">Dashboard</Link>
            <Link href="/delivery/orders">Orders</Link>
            <Link href="/delivery/earnings">Earnings</Link>
          </nav>
        </header>
        {children}
      </div>
    </main>
  );
}
