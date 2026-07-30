import Link from "next/link";
import { useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminState from "@/components/admin/AdminState";
import { useAdminApi } from "@/hooks/useAdminApi";
import styles from "@/styles/admin.module.css";
export default function Reviews() {
  const [q, setQ] = useState({
      search: "",
      status: "ALL",
      rating: "ALL",
      verified: "ALL",
      product: "",
      customer: "",
      dateFrom: "",
      sort: "newest",
      page: 1,
    }),
    url = useMemo(() => `/api/admin/reviews?${new URLSearchParams(q)}`, [q]),
    { data, loading, error, retry } = useAdminApi(url),
    set = (k, v) => setQ((x) => ({ ...x, [k]: v, page: 1 }));
  return (
    <AdminLayout title="Product Reviews" eyebrow="REVIEW MODERATION">
      <div className={styles.toolbar}>
        <input
          placeholder="Search product, customer or review…"
          value={q.search}
          onChange={(e) => set("search", e.target.value)}
        />
        <select
          value={q.status}
          onChange={(e) => set("status", e.target.value)}
        >
          <option value="ALL">All statuses</option>
          {["PENDING", "APPROVED", "REJECTED", "HIDDEN"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <input
          aria-label="Filter by product"
          placeholder="Product"
          value={q.product}
          onChange={(e) => set("product", e.target.value)}
        />
        <input
          aria-label="Filter by customer"
          placeholder="Customer"
          value={q.customer}
          onChange={(e) => set("customer", e.target.value)}
        />
        <input
          aria-label="Filter from date"
          type="date"
          value={q.dateFrom}
          onChange={(e) => set("dateFrom", e.target.value)}
        />
        <select
          value={q.rating}
          onChange={(e) => set("rating", e.target.value)}
        >
          <option value="ALL">All ratings</option>
          {[5, 4, 3, 2, 1].map((x) => (
            <option value={x} key={x}>
              {x} stars
            </option>
          ))}
        </select>
        <select
          value={q.verified}
          onChange={(e) => set("verified", e.target.value)}
        >
          <option value="ALL">Any purchase status</option>
          <option value="true">Verified purchase</option>
          <option value="false">Not verified</option>
        </select>
        <select value={q.sort} onChange={(e) => set("sort", e.target.value)}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
      </div>
      {loading || error ? (
        <AdminState loading={loading} error={error} retry={retry} />
      ) : (
        <section className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Review</th>
                  <th>Product</th>
                  <th>Customer</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th>Reports</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.reviews.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.title}</strong>
                      <br />
                      <small>{r.comment.slice(0, 70)}…</small>
                    </td>
                    <td>{r.product.name}</td>
                    <td>
                      {r.user.name}
                      <br />
                      <small>{r.user.phone || r.user.email || "No contact"}</small>
                    </td>
                    <td>{"★".repeat(r.rating)}</td>
                    <td>{r.status}</td>
                    <td>{r.reportCount}</td>
                    <td>{new Date(r.createdAt).toLocaleDateString("en-IN")}</td>
                    <td>
                      <Link href={`/admin/reviews/${r.id}`}>Open</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.pagination}>
            <span>
              Page {data.pagination.page} of {data.pagination.totalPages || 1}
            </span>
            <div>
              <button
                disabled={q.page <= 1}
                onClick={() => setQ((x) => ({ ...x, page: x.page - 1 }))}
              >
                Previous
              </button>{" "}
              <button
                disabled={q.page >= data.pagination.totalPages}
                onClick={() => setQ((x) => ({ ...x, page: x.page + 1 }))}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      )}
    </AdminLayout>
  );
}
