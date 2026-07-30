import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import toast from "react-hot-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminState from "@/components/admin/AdminState";
import EnquiryBadge from "@/components/enquiries/EnquiryBadge";
import { adminRequest, useAdminApi } from "@/hooks/useAdminApi";
import c from "@/styles/admin-customers.module.css";
export default function CustomerDetail() {
  const router = useRouter(),
    id = router.query.customerId,
    { data, loading, error, retry } = useAdminApi(
      id ? `/api/admin/customers/${id}` : null,
    ),
    [dialog, setDialog] = useState(false),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    u = data?.customer;
  const change = async (status) => {
    if (status === "SUSPENDED" && reason.trim().length < 5)
      return toast.error("Enter a suspension reason.");
    setBusy(true);
    try {
      await adminRequest(`/api/admin/customers/${id}/status`, "PATCH", {
        status,
        reason: status === "SUSPENDED" ? reason : "Issue resolved",
      });
      toast.success(
        status === "SUSPENDED"
          ? "Customer suspended and sessions revoked."
          : "Customer reactivated.",
      );
      setDialog(false);
      setReason("");
      retry();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <AdminLayout
      title={u?.name || "Customer Details"}
      eyebrow="CUSTOMER ACCOUNT"
      actions={<Link href="/admin/customers">Back to Customers</Link>}
    >
      {loading || error ? (
        <AdminState loading={loading} error={error} retry={retry} />
      ) : (
        <div className={c.detail}>
          <section className={c.panel}>
            <div className={c.row}>
              <div>
                <h2>{u.name}</h2>
                <span>
                  {u.phone || "No phone"}{u.email ? ` · ${u.email}` : ""}
                </span>
              </div>
              <EnquiryBadge value={u.status} />
            </div>
            <div className={c.stats}>
              {Object.entries(u.counts).map(([k, v]) => (
                <div key={k}>
                  <strong>{v}</strong>
                  <span>{k.replaceAll("_", " ")}</span>
                </div>
              ))}
            </div>
            <div className={c.actions}>
              <Link
                href={`/admin/orders?search=${encodeURIComponent(u.phone || u.email || u.id)}`}
              >
                View Orders
              </Link>
              <Link
                href={`/admin/enquiries?search=${encodeURIComponent(u.phone || u.email || u.id)}`}
              >
                View Enquiries
              </Link>
              {u.status === "SUSPENDED" ? (
                <button onClick={() => change("ACTIVE")} disabled={busy}>
                  Reactivate Customer
                </button>
              ) : (
                <button className={c.danger} onClick={() => setDialog(true)}>
                  Suspend Customer
                </button>
              )}
            </div>
            {dialog && (
              <div className={c.dialog}>
                <strong>Suspend this customer?</strong>
                <span>
                  All active sessions will be revoked. Orders, payments,
                  addresses, wishlist and enquiries remain preserved.
                </span>
                <textarea
                  placeholder="Reason for suspension"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={500}
                />
                <div>
                  <button onClick={() => setDialog(false)}>Cancel</button>{" "}
                  <button
                    className={c.danger}
                    disabled={busy}
                    onClick={() => change("SUSPENDED")}
                  >
                    Confirm Suspension
                  </button>
                </div>
              </div>
            )}
          </section>
          <aside className={c.panel}>
            <h2>Account Information</h2>
            <p>Joined: {new Date(u.createdAt).toLocaleString("en-IN")}</p>
            <p>
              Last login:{" "}
              {u.lastLoginAt
                ? new Date(u.lastLoginAt).toLocaleString("en-IN")
                : "Never"}
            </p>
            <p>
              Last password change:{" "}
              {u.lastPasswordChangedAt
                ? new Date(u.lastPasswordChangedAt).toLocaleString("en-IN")
                : "Not recorded"}
            </p>
            <p>Successful payments: {u.paymentSummary.successfulPayments}</p>
            <p>
              Total paid: ₹
              {Number(u.paymentSummary.totalPaid).toLocaleString("en-IN")}
            </p>
          </aside>
          <section className={c.panel}>
            <h2>Recent Orders</h2>
            <div className={c.rows}>
              {u.orders.length ? (
                u.orders.map((o) => (
                  <div className={c.row} key={o.orderNumber}>
                    <div>
                      <strong>{o.orderNumber}</strong>
                      <small>
                        {o.status} · ₹{Number(o.total).toLocaleString("en-IN")}
                      </small>
                    </div>
                    <Link href={`/admin/orders/${o.orderNumber}`}>Open</Link>
                  </div>
                ))
              ) : (
                <p>No orders.</p>
              )}
            </div>
            <h2>Saved Addresses</h2>
            {u.addresses.map((a, i) => (
              <p key={i}>
                {a.label}: {a.city}, {a.state} {a.postalCode}
              </p>
            ))}
          </section>
          <section className={c.panel}>
            <h2>Recent Enquiries</h2>
            <div className={c.rows}>
              {u.enquiries.length ? (
                u.enquiries.map((e) => (
                  <div className={c.row} key={e.enquiryNumber}>
                    <div>
                      <strong>{e.subject}</strong>
                      <small>{e.status}</small>
                    </div>
                    <Link href={`/admin/enquiries/${e.enquiryNumber}`}>
                      Open
                    </Link>
                  </div>
                ))
              ) : (
                <p>No enquiries.</p>
              )}
            </div>
            <h2>Recent Security Activity</h2>
            {u.securityEvents.map((e) => (
              <div className={c.row} key={e.id}>
                <div>
                  <strong>{e.eventType.replaceAll("_", " ")}</strong>
                  <small>{e.deviceLabel}</small>
                </div>
                <time>{new Date(e.createdAt).toLocaleDateString("en-IN")}</time>
              </div>
            ))}
          </section>
        </div>
      )}
    </AdminLayout>
  );
}
