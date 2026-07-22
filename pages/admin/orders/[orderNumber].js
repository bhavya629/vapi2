import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminState from "@/components/admin/AdminState";
import Timeline from "@/components/orders/OrderStatusTimeline";
import {
  FulfilmentBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
  label,
} from "@/components/orders/OrderBadges";
import styles from "@/styles/adminOrders.module.css";
const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});
export default function Detail() {
  const router = useRouter(),
    [order, setOrder] = useState(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [internal, setInternal] = useState("");
  async function load() {
    if (!router.query.orderNumber) return;
    try {
      const r = await fetch(
          `/api/admin/orders/${encodeURIComponent(router.query.orderNumber)}`,
        ),
        j = await r.json();
      if (!r.ok) throw new Error(j.error?.message);
      setOrder(j.data.order);
      setInternal(j.data.order.internalNote || "");
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, [router.query.orderNumber]);
  async function mutate(path, method, body) {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/orders/${order.orderNumber}${path}`, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
        j = await r.json();
      if (!r.ok) throw new Error(j.error?.message);
      toast.success("Order updated.");
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (error || !order)
    return (
      <AdminLayout title="Order Details">
        <AdminState loading={!error} error={error} retry={load} />
      </AdminLayout>
    );
  const action = async (s) => {
      if (confirm(`Change order to ${label(s)}?`))
        mutate("/status", "PATCH", {
          status: s,
          note: prompt("Optional customer-visible note:") || "",
          customerVisible: true,
        });
    },
    cancel = () => {
      const reason = prompt("Cancellation reason (required):");
      if (reason && confirm("Cancel and restore or release inventory?"))
        mutate("/cancel", "POST", {
          reason,
          customerVisibleNote: "Your order was cancelled by the store.",
        });
    };
  return (
    <AdminLayout title={order.orderNumber} eyebrow="ORDER DETAILS">
      <div className={styles.header}>
        <div>
          <OrderStatusBadge value={order.status} />
          <FulfilmentBadge value={order.fulfilmentMethod} />
          <PaymentStatusBadge value={order.paymentStatus} />
        </div>
        <time>{new Date(order.placedAt).toLocaleString("en-IN")}</time>
      </div>
      <section className={styles.actions}>
        <h2>Allowed Next Actions</h2>
        {order.allowedTransitions
          .filter((x) => x !== "CANCELLED")
          .map((s) => (
            <button disabled={busy} onClick={() => action(s)} key={s}>
              {label(s)}
            </button>
          ))}
        {order.allowedTransitions.includes("CANCELLED") && (
          <button className={styles.danger} disabled={busy} onClick={cancel}>
            Cancel Order
          </button>
        )}
      </section>
      <div className={styles.grid}>
        <Panel title="Customer & Fulfilment">
          <p>
            {order.customerName}
            <br />
            {order.customerEmail}
            <br />
            {order.customerPhone}
          </p>
          {order.address ? (
            <address>
              {order.address.recipientName}
              <br />
              {order.address.line1}
              <br />
              {order.address.city}, {order.address.state}{" "}
              {order.address.postalCode}
            </address>
          ) : (
            <p>Store Pickup · The Cellphone Studio, Vapi</p>
          )}
        </Panel>
        <Panel title="Pricing">
          <p>
            Subtotal <b>{money.format(Number(order.subtotal))}</b>
          </p>
          <p>
            Total <b>{money.format(Number(order.total))}</b>
          </p>
          <p>
            {label(order.paymentMethod)} · {label(order.paymentStatus)}
          </p>
        </Panel>
        <section className={`${styles.panel} ${styles.wide}`}>
          <h2>Payment Attempts</h2>
          {order.payments?.length ? (
            order.payments.map((p, i) => (
              <article className={styles.item} key={p.providerOrderId}>
                <div>
                  <strong>Razorpay Attempt {order.payments.length - i}</strong>
                  <p>
                    Provider order: <code>{p.providerOrderId}</code>
                  </p>
                  <p>
                    Provider payment:{" "}
                    <code>{p.providerPaymentId || "Pending"}</code>
                  </p>
                  <small>
                    {p.errorDescription || "No provider error recorded."}
                  </small>
                </div>
                <div>
                  <OrderStatusBadge value={p.status} />
                  <p>
                    {money.format(Number(p.amount))} {p.currency}
                  </p>
                  {p.verifiedAt && (
                    <small>
                      Verified {new Date(p.verifiedAt).toLocaleString("en-IN")}
                    </small>
                  )}
                </div>
              </article>
            ))
          ) : (
            <p>
              No online payment attempts. No manual Mark Paid or refund action
              is available.
            </p>
          )}
        </section>
        <section className={`${styles.panel} ${styles.wide}`}>
          <h2>Items</h2>
          {order.items.map((i) => (
            <article className={styles.item} key={i.id}>
              {i.imageUrl && <img src={i.imageUrl} alt="" />}
              <div>
                <small>{i.brandName}</small>
                <h3>{i.productName}</h3>
                <p>
                  {money.format(Number(i.unitPrice))} × {i.quantity}
                </p>
                {i.ram && (
                  <p>
                    {i.ram} · {i.storage} · {i.colourName}
                    <br />
                    <small>SKU: {i.sku}</small>
                  </p>
                )}
              </div>
              <b>{money.format(Number(i.lineTotal))}</b>
            </article>
          ))}
        </section>
        <Panel title="Private Admin Note">
          <textarea
            maxLength="1000"
            value={internal}
            onChange={(e) => setInternal(e.target.value)}
          />
          <button
            disabled={busy}
            onClick={() =>
              mutate("/notes", "PATCH", { internalNote: internal })
            }
          >
            Save Private Note
          </button>
        </Panel>
        <Panel title="Status Timeline">
          <Timeline order={order} admin />
        </Panel>
      </div>
    </AdminLayout>
  );
}
function Panel({ title, children }) {
  return (
    <section className={styles.panel}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
