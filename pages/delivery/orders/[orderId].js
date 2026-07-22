import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import DeliveryLayout from "@/components/delivery/DeliveryLayout";
import styles from "@/styles/delivery.module.css";
const statuses = [
  "AWAITING_ASSIGNMENT",
  "AWAITING_DISTANCE_VERIFICATION",
  "AWAITING_SHIPPING_CONFIRMATION",
  "SHIPPING_CONFIRMED",
  "PACKAGING_PENDING",
  "PACKED",
  "READY_FOR_DISPATCH",
  "OUT_FOR_DELIVERY",
  "SHIPPED",
  "DELIVERED",
  "DELIVERY_FAILED",
  "RETURNED",
  "CANCELLED",
];
export default function DeliveryOrder() {
  const r = useRouter(),
    [o, setO] = useState(null),
    [msg, setMsg] = useState("");
  const load = () =>
    r.query.orderId &&
    fetch(`/api/delivery-manager/orders/${r.query.orderId}`)
      .then((x) => x.json())
      .then((j) => (j.success ? setO(j.data.order) : setMsg(j.error?.message)));
  useEffect(load, [r.query.orderId]);
  async function act(action, body, method = "PATCH") {
    setMsg("");
    const url = ["contact", "shipping-confirmation"].includes(action)
        ? `/api/delivery-manager/orders/${r.query.orderId}/${action}`
        : `/api/delivery-manager/orders/${r.query.orderId}/${action}`,
      x = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      j = await x.json();
    setMsg(j.success ? "Saved successfully." : j.error?.message);
    if (j.success) load();
  }
  if (!o)
    return (
      <DeliveryLayout title="Delivery Order">
        <p>{msg || "Loading…"}</p>
      </DeliveryLayout>
    );
  return (
    <DeliveryLayout title={o.orderNumber}>
      <div className={styles.detail}>
        <section className={styles.panel}>
          <span className={styles.badge}>{o.delivery.status}</span>
          <h2>{o.customer.name}</h2>
          <p>
            {o.shippingAddress.recipientName} · {o.shippingAddress.phone}
          </p>
          <p>
            {o.shippingAddress.addressLine1}, {o.shippingAddress.city},{" "}
            {o.shippingAddress.state} {o.shippingAddress.postalCode}
          </p>
          <p>
            <b>Zone:</b> {o.delivery.zone} · <b>Distance:</b>{" "}
            {o.delivery.distanceKm ?? "Not verified"} km
          </p>
          <p>
            <b>Shipping:</b> {o.delivery.shippingChargeStatus}{" "}
            {o.delivery.shippingChargeStatus !== "PENDING_CONFIRMATION" &&
              `· ₹${o.deliveryCharge.toFixed(2)}`}
          </p>
          <h3>Items</h3>
          {o.items.map((i) => (
            <p key={i.id}>
              {i.quantity} × {i.name}
            </p>
          ))}
          <h3>Customer-visible history</h3>
          {o.delivery.history.map((h) => (
            <p key={h.id}>
              <b>{h.toStatus}</b>
              <br />
              <small>{h.note}</small>
            </p>
          ))}
        </section>
        <aside className={styles.panel}>
          <h2>Operations</h2>
          <div className={styles.form}>
            <button
              className={styles.primary}
              onClick={() => act("assign", {})}
            >
              Assign to me
            </button>
            <label>
              Verified distance (km)
              <input id="distance" type="number" step=".01" />
            </label>
            <button
              className={styles.primary}
              onClick={() =>
                act("distance", {
                  distanceKm: document.querySelector("#distance").value,
                })
              }
            >
              Save distance
            </button>
            <label>
              Delivery status
              <select id="status" defaultValue={o.delivery.status}>
                {statuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Public note
              <textarea id="publicNote" />
            </label>
            <button
              className={styles.primary}
              onClick={() =>
                act("status", {
                  status: document.querySelector("#status").value,
                  publicNote: document.querySelector("#publicNote").value,
                })
              }
            >
              Update status
            </button>
            {o.delivery.shippingChargeStatus === "PENDING_CONFIRMATION" && (
              <>
                <label>
                  Confirmed shipping charge
                  <input id="charge" type="number" min="1" />
                </label>
                <label>
                  Method
                  <select id="method">
                    <option>PHONE_CALL</option>
                    <option>WHATSAPP</option>
                    <option>SMS</option>
                    <option>EMAIL</option>
                  </select>
                </label>
                <button
                  className={styles.primary}
                  onClick={() =>
                    act(
                      "shipping-confirmation",
                      {
                        charge: document.querySelector("#charge").value,
                        method: document.querySelector("#method").value,
                        customerConsent: true,
                      },
                      "POST",
                    )
                  }
                >
                  Record customer confirmation
                </button>
              </>
            )}
            <label>
              Courier name
              <input
                id="courier"
                defaultValue={o.delivery.courier.name || ""}
              />
            </label>
            <label>
              Tracking number
              <input
                id="tracking"
                defaultValue={o.delivery.courier.trackingNumber || ""}
              />
            </label>
            <button
              className={styles.primary}
              onClick={() =>
                act("courier", {
                  name: document.querySelector("#courier").value,
                  trackingNumber: document.querySelector("#tracking").value,
                })
              }
            >
              Save courier
            </button>
            <label>
              Contact outcome
              <input id="outcome" placeholder="Customer confirmed" />
            </label>
            <button
              className={styles.primary}
              onClick={() =>
                act(
                  "contact",
                  {
                    channel: "PHONE_CALL",
                    outcome: document.querySelector("#outcome").value,
                  },
                  "POST",
                )
              }
            >
              Log phone call
            </button>
            {msg && <p role="status">{msg}</p>}
          </div>
        </aside>
      </div>
    </DeliveryLayout>
  );
}
