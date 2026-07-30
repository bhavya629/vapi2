import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import toast from "react-hot-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminState from "@/components/admin/AdminState";
import { adminRequest, useAdminApi } from "@/hooks/useAdminApi";
import styles from "@/styles/admin.module.css";
import r from "@/styles/admin-review.module.css";
export default function ReviewDetail() {
  const router = useRouter(),
    id = router.query.id,
    { data, loading, error, retry } = useAdminApi(
      id ? `/api/admin/reviews/${id}` : null,
    ),
    [busy, setBusy] = useState(false),
    review = data?.review;
  const update = async (status) => {
    setBusy(true);
    try {
      await adminRequest(`/api/admin/reviews/${id}`, "PATCH", { status });
      toast.success(`Review ${status.toLowerCase()}.`);
      retry();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (
      !confirm(
        "Delete this review permanently? Rating analytics will be recalculated.",
      )
    )
      return;
    try {
      await adminRequest(`/api/admin/reviews/${id}`, "DELETE");
      toast.success("Review deleted.");
      router.push("/admin/reviews");
    } catch (e) {
      toast.error(e.message);
    }
  };
  return (
    <AdminLayout
      title={review?.title || "Review Details"}
      eyebrow="REVIEW MODERATION"
      actions={<Link href="/admin/reviews">Back to Reviews</Link>}
    >
      {loading || error ? (
        <AdminState loading={loading} error={error} retry={retry} />
      ) : (
        <div className={r.grid}>
          <section className={r.card}>
            <p className={r.stars}>
              {"★".repeat(review.rating)}
              {"☆".repeat(5 - review.rating)}
            </p>
            <h2>{review.title}</h2>
            <p className={r.comment}>{review.comment}</p>
            <p>
              {review.verifiedPurchase ? "✓ Verified Purchase · " : ""}
              {review.helpfulCount} helpful · {review.reportCount} reports
            </p>
            <div className={r.actions}>
              {["APPROVED", "REJECTED", "HIDDEN", "PENDING"].map((x) => (
                <button
                  disabled={busy || review.status === x}
                  onClick={() => update(x)}
                  key={x}
                >
                  {x}
                </button>
              ))}
              <button className={r.delete} onClick={remove}>
                Delete
              </button>
            </div>
          </section>
          <aside className={r.card}>
            <h2>Review Context</h2>
            <p>
              <strong>Customer</strong>
              <br />
              {review.user.name}
              <br />
              {review.user.phone || review.user.email || "No contact"}
            </p>
            <p>
              <strong>Product</strong>
              <br />
              {review.product.name}
            </p>
            <p>
              <strong>Order</strong>
              <br />
              {review.order?.orderNumber || "No linked order"}
              <br />
              {review.order
                ? `${review.order.status} · ${review.order.paymentStatus}`
                : "Customer review"}
            </p>
            <p>
              <strong>Status</strong>
              <br />
              {review.status}
            </p>
            <h3>Reports</h3>
            {review.reports.length ? (
              review.reports.map((x) => (
                <p key={x.id}>
                  {x.reason}
                  <br />
                  <small>{new Date(x.createdAt).toLocaleString("en-IN")}</small>
                </p>
              ))
            ) : (
              <p>No reports.</p>
            )}
          </aside>
        </div>
      )}
    </AdminLayout>
  );
}
