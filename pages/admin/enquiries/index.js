import Link from "next/link";
import { useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminState from "@/components/admin/AdminState";
import EnquiryBadge from "@/components/enquiries/EnquiryBadge";
import { useAdminApi } from "@/hooks/useAdminApi";
import styles from "@/styles/admin.module.css";
export default function AdminEnquiries() {
  const [query, setQuery] = useState({
    search: "",
    status: "ALL",
    priority: "ALL",
    category: "ALL",
    source: "ALL",
    orderLinked: "ALL",
    page: 1,
  });
  const url = useMemo(
    () => `/api/admin/enquiries?${new URLSearchParams(query).toString()}`,
    [query],
  );
  const { data, loading, error, retry } = useAdminApi(url);
  const set = (key, value) =>
    setQuery((q) => ({ ...q, [key]: value, page: 1 }));
  return (
    <AdminLayout title="Customer Enquiries" eyebrow="SUPPORT OPERATIONS">
      <div className={styles.toolbar}>
        <input
          aria-label="Search enquiries"
          placeholder="Search reference, customer, email or order…"
          value={query.search}
          onChange={(e) => set("search", e.target.value)}
        />
        <select
          aria-label="Filter by status"
          value={query.status}
          onChange={(e) => set("status", e.target.value)}
        >
          <option value="ALL">All statuses</option>
          {[
            "OPEN",
            "IN_REVIEW",
            "WAITING_FOR_CUSTOMER",
            "WAITING_FOR_STORE",
            "RESOLVED",
            "CLOSED",
            "SPAM",
          ].map((x) => (
            <option value={x} key={x}>
              {x.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by priority"
          value={query.priority}
          onChange={(e) => set("priority", e.target.value)}
        >
          <option value="ALL">All priorities</option>
          {["LOW", "NORMAL", "HIGH", "URGENT"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          aria-label="Filter by category"
          value={query.category}
          onChange={(e) => set("category", e.target.value)}
        >
          <option value="ALL">All categories</option>
          {[
            "GENERAL",
            "PRODUCT_INFORMATION",
            "STOCK_AVAILABILITY",
            "ORDER_SUPPORT",
            "PAYMENT_SUPPORT",
            "DELIVERY_SUPPORT",
            "CANCELLATION_REQUEST",
            "RETURN_OR_REFUND",
            "WARRANTY_SUPPORT",
            "WEBSITE_SUPPORT",
            "OTHER",
          ].map((x) => (
            <option value={x} key={x}>
              {x.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by source"
          value={query.source}
          onChange={(e) => set("source", e.target.value)}
        >
          <option value="ALL">All sources</option>
          {["CONTACT_PAGE", "ACCOUNT", "ORDER_DETAIL", "GUEST"].map((x) => (
            <option value={x} key={x}>
              {x.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by order link"
          value={query.orderLinked}
          onChange={(e) => set("orderLinked", e.target.value)}
        >
          <option value="ALL">All enquiries</option>
          <option value="true">Order linked</option>
          <option value="false">Not order linked</option>
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
                  <th>Enquiry</th>
                  <th>Customer</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.enquiries.map((e) => (
                  <tr key={e.enquiryNumber}>
                    <td>
                      <strong>{e.enquiryNumber}</strong>
                      <br />
                      <small>{e.subject}</small>
                    </td>
                    <td>
                      {e.name}
                      <br />
                      <small>{e.email}</small>
                    </td>
                    <td>{e.category.replaceAll("_", " ")}</td>
                    <td>
                      <EnquiryBadge value={e.status} />
                    </td>
                    <td>
                      <EnquiryBadge value={e.priority} />
                    </td>
                    <td>{new Date(e.updatedAt).toLocaleDateString("en-IN")}</td>
                    <td className={styles.actions}>
                      <Link href={`/admin/enquiries/${e.enquiryNumber}`}>
                        Open
                      </Link>
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
                disabled={query.page <= 1}
                onClick={() => setQuery((q) => ({ ...q, page: q.page - 1 }))}
              >
                Previous
              </button>{" "}
              <button
                disabled={query.page >= data.pagination.totalPages}
                onClick={() => setQuery((q) => ({ ...q, page: q.page + 1 }))}
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
