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
          <MetricSection title="Business overview" description="At-a-glance store performance" primary>
            <Metric icon={FiStar} value={`₹${data.orders.revenue.toLocaleString("en-IN")}`} label="Revenue" href="/admin/orders" />
            <Metric icon={FiShoppingBag} value={data.orders.today} label="Orders Today" href="/admin/orders" />
            <Metric icon={FiPackage} value={data.stats.activeProducts} label="Active Products" href="/admin/products" />
            <Metric icon={FiUsers} value={data.customers.active} label="Active Customers" href="/admin/customers" />
          </MetricSection>
          <MetricSection title="Needs attention" description="Items that may require action">
            <Metric icon={FiShoppingBag} value={data.orders.awaitingConfirmation} label="Awaiting Confirmation" href="/admin/orders" tone="warning" />
            <Metric icon={FiBox} value={data.stats.lowStock + data.stats.outOfStock} label="Stock Alerts" href="/admin/inventory" tone="danger" />
            <Metric icon={FiMessageSquare} value={data.enquiries.highPriority} label="High Priority Enquiries" href="/admin/enquiries" tone="warning" />
            <Metric icon={FiStar} value={data.reviews.pending} label="Pending Reviews" href="/admin/reviews" />
          </MetricSection>
          <MetricSection title="Store snapshot" description="Catalogue, customers, and support activity" compact>
            <Metric icon={FiPackage} value={data.stats.activeProducts + data.stats.inactiveProducts} label="Total Products" href="/admin/products" />
            <Metric icon={FiLayers} value={data.stats.totalCategories} label="Categories" href="/admin/categories" />
            <Metric icon={FiBox} value={data.stats.totalBrands} label="Brands" href="/admin/brands" />
            <Metric icon={FiMessageSquare} value={data.enquiries.open} label="Open Enquiries" href="/admin/enquiries" />
            <Metric icon={FiUsers} value={data.customers.newMonth} label="New This Month" href="/admin/customers" />
            <Metric icon={FiStar} value={data.reviews.averageRating.toFixed(1)} label="Average Rating" href="/admin/reviews" />
          </MetricSection>
          <section className={styles.twoColumn}>
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Order Pipeline</h2>
                <Link href="/admin/orders">View orders</Link>
              </div>
              <OrderPipeline orders={data.orders} />
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
function MetricSection({ title, description, primary, compact, children }) {
  return (
    <section className={styles.metricSection}>
      <div className={styles.sectionHeading}>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div
        className={`${styles.metricGrid} ${primary ? styles.primaryMetrics : ""} ${compact ? styles.compactMetrics : ""}`}
      >
        {children}
      </div>
    </section>
  );
}
function Metric({ icon: Icon, value, label, href, tone = "default" }) {
  return (
    <Link
      className={`${styles.stat} ${styles[`metric_${tone}`] || ""}`}
      href={href}
    >
      <span><Icon /></span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </Link>
  );
}
function OrderPipeline({ orders }) {
  const stages = [
      ["Awaiting confirmation", orders.awaitingConfirmation],
      ["Confirmed / processing", orders.active],
      ["Packed", orders.packed],
      ["Out for delivery", orders.outForDelivery],
      ["Ready for pickup", orders.readyForPickup],
      ["Delivered today", orders.deliveredToday],
    ],
    maximum = Math.max(1, ...stages.map(([, value]) => value));
  return (
    <div className={styles.pipeline}>
      {stages.map(([label, value]) => (
        <div className={styles.pipelineRow} key={label}>
          <span>{label}</span>
          <i><b style={{ width: `${(value / maximum) * 100}%` }} /></i>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
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
                  {u.phone || u.email || "No contact"} · {u.status}
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
