import Link from "next/link";
import {
  FiBox,
  FiLayers,
  FiMessageSquare,
  FiUsers,
  FiPackage,
  FiPlus,
  FiShoppingBag,
  FiStar,
} from "react-icons/fi";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminState from "@/components/admin/AdminState";
import { useAdminApi } from "@/hooks/useAdminApi";
import styles from "@/styles/admin.module.css";
export default function AdminDashboard() {
  const { data, loading, error, retry } = useAdminApi("/api/admin/dashboard");
  return (
    <AdminLayout
      title="Operations Dashboard"
      actions={
        <>
          <Link href="/admin/orders">Manage Orders</Link>
          <Link href="/admin/products/new">
            <FiPlus />
            Add Product
          </Link>
          <Link className={styles.secondary} href="/admin/inventory">
            Manage Inventory
          </Link>
        </>
      }
    >
      {loading || error ? (
        <AdminState loading={loading} error={error} retry={retry} />
      ) : (
        <>
          <section className={styles.grid}>
            {[
              [
                FiPackage,
                data.stats.activeProducts + data.stats.inactiveProducts,
                "Total Products",
              ],
              [FiShoppingBag, data.orders.total, "Total Orders"],
              [FiShoppingBag, data.orders.today, "Today's Orders"],
              [
                FiStar,
                `₹${data.orders.revenue.toLocaleString("en-IN")}`,
                "Revenue",
              ],
              [
                FiUsers,
                data.customers.active + data.customers.suspended,
                "Customers",
              ],
              [
                FiBox,
                data.stats.lowStock + data.stats.outOfStock,
                "Low Stock Alerts",
              ],
              [
                FiShoppingBag,
                data.orders.awaitingConfirmation,
                "Awaiting Confirmation",
              ],
              [FiPackage, data.orders.active, "Confirmed / Processing"],
              [FiPackage, data.orders.packed, "Packed"],
              [FiShoppingBag, data.orders.outForDelivery, "Out for Delivery"],
              [FiShoppingBag, data.orders.readyForPickup, "Ready for Pickup"],
              [FiStar, data.orders.deliveredToday, "Delivered Today"],
              [FiBox, data.orders.cancelledToday, "Cancelled Today"],
              [FiPackage, data.stats.activeProducts, "Active Products"],
              [FiMessageSquare, data.enquiries.open, "Open Enquiries"],
              [
                FiMessageSquare,
                data.enquiries.highPriority,
                "High Priority Enquiries",
              ],
              [FiUsers, data.customers.active, "Active Customers"],
              [FiUsers, data.customers.newToday, "New Customers Today"],
              [FiUsers, data.customers.newMonth, "New Customers This Month"],
              [FiUsers, data.customers.suspended, "Suspended Customers"],
              [FiUsers, data.customers.withOrders, "Customers With Orders"],
              [FiStar, data.reviews.pending, "Pending Reviews"],
              [FiStar, data.reviews.averageRating.toFixed(1), "Average Rating"],
              [FiStar, data.reviews.hidden, "Hidden Reviews"],
            ].map(([Icon, value, label]) => (
              <article className={styles.stat} key={label}>
                <span>
                  <Icon />
                </span>
                <strong>{value}</strong>
                <small>{label}</small>
              </article>
            ))}
          </section>
          <section className={styles.twoColumn}>
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Sales Overview</h2>
                <span>Current catalogue</span>
              </div>
              <div
                className={styles.chartPlaceholder}
                aria-label="Sales chart placeholder"
              >
                <span style={{ height: "35%" }} />
                <span style={{ height: "58%" }} />
                <span style={{ height: "44%" }} />
                <span style={{ height: "76%" }} />
                <span style={{ height: "66%" }} />
                <span style={{ height: "90%" }} />
                <span style={{ height: "74%" }} />
              </div>
            </article>
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Best Selling Products</h2>
              </div>
              <div className={styles.productList}>
                {data.bestSelling.length ? (
                  data.bestSelling.map((p) => (
                    <div className={styles.productRow} key={p.name}>
                      <div>
                        <strong>{p.name}</strong>
                        <small>{p.quantity} units sold</small>
                      </div>
                      <b>₹{p.revenue.toLocaleString("en-IN")}</b>
                    </div>
                  ))
                ) : (
                  <p>No completed sales data yet.</p>
                )}
              </div>
            </article>
          </section>
          <section className={styles.twoColumn}>
            <ProductPanel
              title="Inventory Alerts"
              products={data.lowStockProducts}
            />
            <ProductPanel
              title="Recently Updated Products"
              products={data.recent}
            />
          </section>
          <CustomerPanel customers={data.customers.recent} />
          <ReviewPanel reviews={data.reviews.latest} />
          <section className={styles.twoColumn}>
            <OrderPanel orders={data.orders.recentOrders} />
            <EnquiryPanel enquiries={data.enquiries.recent} />
          </section>
        </>
      )}
    </AdminLayout>
  );
}
function ReviewPanel({ reviews }) {
  return (
    <article className={styles.panel} style={{ marginTop: 22 }}>
      <div className={styles.panelHeader}>
        <h2>Latest Reviews</h2>
        <Link href="/admin/reviews">View All</Link>
      </div>
      <div className={styles.productList}>
        {reviews.length ? (
          reviews.map((r) => (
            <div className={styles.productRow} key={r.id}>
              <div>
                <strong>{r.title}</strong>
                <small>
                  {r.product.name} · {r.user.name} · {r.status}
                </small>
              </div>
              <Link href={`/admin/reviews/${r.id}`}>Open</Link>
            </div>
          ))
        ) : (
          <p>No reviews yet.</p>
        )}
      </div>
    </article>
  );
}
function CustomerPanel({ customers }) {
  return (
    <article className={styles.panel} style={{ marginTop: 22 }}>
      <div className={styles.panelHeader}>
        <h2>Recent Registrations</h2>
        <Link href="/admin/customers">View All</Link>
      </div>
      <div className={styles.productList}>
        {customers.length ? (
          customers.map((u) => (
            <div className={styles.productRow} key={u.id}>
              <div>
                <strong>{u.name}</strong>
                <small>
                  {u.email} · {u.status}
                </small>
              </div>
              <Link href={`/admin/customers/${u.id}`}>Open</Link>
            </div>
          ))
        ) : (
          <p>No customer registrations.</p>
        )}
      </div>
    </article>
  );
}
function EnquiryPanel({ enquiries }) {
  return (
    <article className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>Recent Enquiries</h2>
        <Link href="/admin/enquiries">View All</Link>
      </div>
      <div className={styles.productList}>
        {enquiries.length ? (
          enquiries.map((e) => (
            <div className={styles.productRow} key={e.enquiryNumber}>
              <div>
                <strong>{e.enquiryNumber}</strong>
                <small>
                  {e.subject} · {e.status.replaceAll("_", " ")}
                </small>
              </div>
              <Link href={`/admin/enquiries/${e.enquiryNumber}`}>Open</Link>
            </div>
          ))
        ) : (
          <p>No enquiries yet.</p>
        )}
      </div>
    </article>
  );
}
function OrderPanel({ orders }) {
  return (
    <article className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>Recent Orders</h2>
        <Link href="/admin/orders">View All</Link>
      </div>
      <div className={styles.productList}>
        {orders.length ? (
          orders.map((o) => (
            <div className={styles.productRow} key={o.id}>
              <div>
                <strong>{o.orderNumber}</strong>
                <small>
                  {o.customerName} · {o.status.replaceAll("_", " ")}
                </small>
              </div>
              <Link href={`/admin/orders/${o.orderNumber}`}>Open</Link>
            </div>
          ))
        ) : (
          <p>No orders yet.</p>
        )}
      </div>
    </article>
  );
}
function ProductPanel({ title, products }) {
  return (
    <article className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>{title}</h2>
        <Link href="/admin/products">View All</Link>
      </div>
      <div className={styles.productList}>
        {products.length ? (
          products.map((p) => (
            <div className={styles.productRow} key={p.id}>
              <img src={p.imageUrl} alt="" />
              <div>
                <strong>{p.name}</strong>
                <small>
                  {p.brand.name} · {p.sku || "No SKU"}
                </small>
              </div>
              <span
                className={`${styles.badge} ${p.stockStatus === "OUT_OF_STOCK" ? styles.outStock : p.stockStatus === "LOW_STOCK" ? styles.lowStock : styles.inStock}`}
              >
                {p.stock}
              </span>
            </div>
          ))
        ) : (
          <p>No products in this section.</p>
        )}
      </div>
    </article>
  );
}
