import Link from "next/link";
import { useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminState from "@/components/admin/AdminState";
import EnquiryBadge from "@/components/enquiries/EnquiryBadge";
import { useAdminApi } from "@/hooks/useAdminApi";
import styles from "@/styles/admin.module.css";
import c from "@/styles/admin-customers.module.css";
export default function Customers() {
  const [q, setQ] = useState({
      search: "",
      status: "ALL",
      registeredFrom: "",
      registeredTo: "",
      hasOrders: "ALL",
      sort: "newest",
      page: 1,
    }),
    url = useMemo(() => `/api/admin/customers?${new URLSearchParams(q)}`, [q]),
    { data, loading, error, retry } = useAdminApi(url),
    set = (k, v) => setQ((x) => ({ ...x, [k]: v, page: 1 }));
  return (
    <AdminLayout title="Customers" eyebrow="CUSTOMER MANAGEMENT">
      <div className={styles.toolbar}>
        <input
          placeholder="Search name, email or phone…"
          aria-label="Search customers"
          value={q.search}
          onChange={(e) => set("search", e.target.value)}
        />
        <select
          value={q.status}
          onChange={(e) => set("status", e.target.value)}
        >
          <option value="ALL">All statuses</option>
          {["ACTIVE", "SUSPENDED", "LOCKED"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <input
          type="date"
          aria-label="Registered from"
          value={q.registeredFrom}
          onChange={(e) => set("registeredFrom", e.target.value)}
        />
        <input
          type="date"
          aria-label="Registered to"
          value={q.registeredTo}
          onChange={(e) => set("registeredTo", e.target.value)}
        />
        <select
          value={q.hasOrders}
          onChange={(e) => set("hasOrders", e.target.value)}
        >
          <option value="ALL">Any order history</option>
          <option value="true">Has orders</option>
          <option value="false">No orders</option>
        </select>
        <select value={q.sort} onChange={(e) => set("sort", e.target.value)}>
          {[
            ["newest", "Newest"],
            ["oldest", "Oldest"],
            ["name-asc", "Name A–Z"],
            ["name-desc", "Name Z–A"],
            ["recently-active", "Recently active"],
            ["most-orders", "Most orders"],
          ].map((x) => (
            <option value={x[0]} key={x[0]}>
              {x[1]}
            </option>
          ))}
        </select>
        <button
          className={styles.secondary}
          onClick={() =>
            setQ({
              search: "",
              status: "ALL",
              registeredFrom: "",
              registeredTo: "",
              hasOrders: "ALL",
              sort: "newest",
              page: 1,
            })
          }
        >
          Clear
        </button>
      </div>
      {loading || error ? (
        <AdminState loading={loading} error={error} retry={retry} />
      ) : (
        <>
          <section className={`${styles.tableCard} ${c.tableOnly}`}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Orders</th>
                    <th>Wishlist</th>
                    <th>Enquiries</th>
                    <th>Joined</th>
                    <th>Last active</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.customers.map((x) => (
                    <tr key={x.id}>
                      <td>
                        <strong>{x.name}</strong>
                      </td>
                      <td>
                        {x.email}
                        <br />
                        <small>{x.phone || "No phone"}</small>
                      </td>
                      <td>
                        <EnquiryBadge value={x.status} />
                      </td>
                      <td>{x.counts.orders}</td>
                      <td>{x.counts.wishlistItems}</td>
                      <td>{x.counts.enquiries}</td>
                      <td>
                        {new Date(x.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td>
                        {x.lastLoginAt
                          ? new Date(x.lastLoginAt).toLocaleDateString("en-IN")
                          : "Never"}
                      </td>
                      <td>
                        <Link href={`/admin/customers/${x.id}`}>View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className={c.cards}>
            {data.customers.map((x) => (
              <article key={x.id}>
                <strong>{x.name}</strong>
                <p>
                  {x.email}
                  <br />
                  {x.phone || "No phone"}
                </p>
                <EnquiryBadge value={x.status} />
                <p>
                  {x.counts.orders} orders · {x.counts.enquiries} enquiries
                </p>
                <Link href={`/admin/customers/${x.id}`}>View Details</Link>
              </article>
            ))}
          </section>
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
        </>
      )}
    </AdminLayout>
  );
}
