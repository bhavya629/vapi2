import Link from "next/link";
import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminState from "@/components/admin/AdminState";
import {
  FulfilmentBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
  label,
} from "@/components/orders/OrderBadges";
import styles from "@/styles/adminOrders.module.css";
const defaults = {
  search: "",
  status: "ALL",
  paymentStatus: "ALL",
  paymentMethod: "ALL",
  fulfilmentMethod: "ALL",
  dateFrom: "",
  dateTo: "",
  sort: "newest",
  page: 1,
};
const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});
export default function Orders() {
  const [f, setF] = useState(defaults),
    [state, setState] = useState({ loading: true, data: null, error: "" }),
    [version, setVersion] = useState(0);
  useEffect(() => {
    const c = new AbortController(),
      timer = setTimeout(async () => {
        setState((s) => ({ ...s, loading: true, error: "" }));
        try {
          const q = new URLSearchParams(
            Object.entries(f).filter(([, v]) => v !== ""),
          );
          const r = await fetch(`/api/admin/orders?${q}`, { signal: c.signal }),
            j = await r.json();
          if (!r.ok) throw new Error(j.error?.message);
          setState({ loading: false, data: j.data, error: "" });
        } catch (e) {
          if (e.name !== "AbortError")
            setState({ loading: false, data: null, error: e.message });
        }
      }, 250);
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [f, version]);
  const select = (k, opts) => (
    <select
      aria-label={k}
      value={f[k]}
      onChange={(e) => setF({ ...f, [k]: e.target.value, page: 1 })}
    >
      {opts.map((x) => (
        <option value={x} key={x}>
          {label(x)}
        </option>
      ))}
    </select>
  );
  return (
    <AdminLayout title="Orders" eyebrow="ORDER OPERATIONS">
      <section className={styles.filters}>
        <input
          aria-label="Search orders"
          placeholder="Search order, customer, phone or email"
          value={f.search}
          onChange={(e) => setF({ ...f, search: e.target.value, page: 1 })}
        />
        {select("status", [
          "ALL",
          "PENDING_CONFIRMATION",
          "CONFIRMED",
          "PROCESSING",
          "PACKED",
          "READY_FOR_PICKUP",
          "OUT_FOR_DELIVERY",
          "DELIVERED",
          "CANCELLED",
        ])}
        {select("paymentStatus", [
          "ALL",
          "PENDING",
          "PAID",
          "FAILED",
          "REFUNDED",
        ])}
        {select("paymentMethod", [
          "ALL",
          "CASH_ON_DELIVERY",
          "PAY_AT_STORE",
          "ONLINE",
        ])}
        {select("fulfilmentMethod", ["ALL", "DELIVERY", "STORE_PICKUP"])}
        {select("sort", [
          "newest",
          "oldest",
          "total-high",
          "total-low",
          "recently-updated",
        ])}
        <input
          type="date"
          aria-label="From date"
          value={f.dateFrom}
          onChange={(e) => setF({ ...f, dateFrom: e.target.value, page: 1 })}
        />
        <input
          type="date"
          aria-label="To date"
          value={f.dateTo}
          onChange={(e) => setF({ ...f, dateTo: e.target.value, page: 1 })}
        />
        <button onClick={() => setF(defaults)}>Clear Filters</button>
      </section>
      {state.loading || state.error ? (
        <AdminState
          loading={state.loading}
          error={state.error}
          retry={() => setVersion((v) => v + 1)}
        />
      ) : !state.data.orders.length ? (
        <div className={styles.empty}>
          <h2>No orders found</h2>
        </div>
      ) : (
        <>
          <div className={styles.table}>
            {state.data.orders.map((o) => (
              <article key={o.id}>
                <div>
                  <strong>{o.orderNumber}</strong>
                  <small>
                    {new Date(o.placedAt).toLocaleDateString("en-IN")}
                  </small>
                </div>
                <div>
                  <strong>{o.customerName}</strong>
                  <small>{o.customerPhone}</small>
                </div>
                <span>{o.itemCount} items</span>
                <FulfilmentBadge value={o.fulfilmentMethod} />
                <div>
                  {label(o.paymentMethod)}
                  <PaymentStatusBadge value={o.paymentStatus} />
                </div>
                <OrderStatusBadge value={o.status} />
                <strong>{money.format(Number(o.total))}</strong>
                <Link href={`/admin/orders/${o.orderNumber}`}>
                  View Details
                </Link>
              </article>
            ))}
          </div>
          <nav className={styles.pagination}>
            {Array.from(
              { length: state.data.pagination.pages },
              (_, i) => i + 1,
            ).map((p) => (
              <button
                className={p === f.page ? styles.current : ""}
                onClick={() => setF({ ...f, page: p })}
                key={p}
              >
                {p}
              </button>
            ))}
          </nav>
        </>
      )}
    </AdminLayout>
  );
}
