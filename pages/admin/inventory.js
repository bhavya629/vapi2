import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FiClock, FiEdit3 } from "react-icons/fi";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminState from "@/components/admin/AdminState";
import { adminRequest, useAdminApi } from "@/hooks/useAdminApi";
import styles from "@/styles/admin.module.css";
export default function InventoryAdmin() {
  const router = useRouter();
  const [filters, setFilters] = useState({
    search: "",
    stockStatus: "",
    type: "",
    brand: "",
    ram: "",
    storage: "",
    colour: "",
    page: 1,
  });
  const [adjust, setAdjust] = useState(null),
    [historyId, setHistoryId] = useState(null);
  const path = useMemo(
    () =>
      `/api/admin/inventory?${new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== ""))}`,
    [filters],
  );
  const { data, loading, error, retry } = useAdminApi(path);
  useEffect(() => {
    if (router.isReady && router.query.product && data?.products) {
      const found = data.products.find((p) => p.id === router.query.product);
      if (found) setAdjust(found);
    }
  }, [data?.products, router.isReady, router.query.product]);
  const set = (k, v) => setFilters((x) => ({ ...x, [k]: v, page: 1 }));
  return (
    <AdminLayout title="Inventory" eyebrow="STOCK MANAGEMENT">
      <div className={styles.toolbar}>
        <input
          placeholder="Search product or SKU"
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
        />
        <select
          value={filters.type}
          onChange={(e) => set("type", e.target.value)}
        >
          <option value="">All types</option>
          <option value="SMARTPHONE">Smartphones</option>
          <option value="ACCESSORY">Accessories</option>
        </select>
        <select
          value={filters.stockStatus}
          onChange={(e) => set("stockStatus", e.target.value)}
        >
          <option value="">All stock</option>
          <option value="in-stock">In Stock</option>
          <option value="low-stock">Low Stock</option>
          <option value="out-of-stock">Out of Stock</option>
        </select>
        {filters.type === "SMARTPHONE" && (
          <>
            <input
              placeholder="Brand ID"
              value={filters.brand}
              onChange={(e) => set("brand", e.target.value)}
            />
            <input
              placeholder="RAM (e.g. 12GB)"
              value={filters.ram}
              onChange={(e) => set("ram", e.target.value)}
            />
            <input
              placeholder="Storage (e.g. 256GB)"
              value={filters.storage}
              onChange={(e) => set("storage", e.target.value)}
            />
            <input
              placeholder="Colour slug"
              value={filters.colour}
              onChange={(e) => set("colour", e.target.value)}
            />
          </>
        )}
      </div>
      {loading || error ? (
        <AdminState loading={loading} error={error} retry={retry} />
      ) : !data.products.length ? (
        <AdminState empty="No inventory products found." />
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Brand</th>
                  <th>Category</th>
                  <th>Variant</th>
                  <th>Current Stock</th>
                  <th>Threshold</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.name}</strong>
                    </td>
                    <td>{p.sku || "—"}</td>
                    <td>{p.brand.name}</td>
                    <td>{p.category.name}</td>
                    <td>
                      {p.variantColourId
                        ? `${p.ram} / ${p.storage} / ${p.colour}`
                        : "—"}
                    </td>
                    <td>{p.stock}</td>
                    <td>{p.lowStockThreshold}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${p.stockStatus === "OUT_OF_STOCK" ? styles.outStock : p.stockStatus === "LOW_STOCK" ? styles.lowStock : styles.inStock}`}
                      >
                        {p.stockStatus.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>
                      {new Intl.DateTimeFormat("en-IN", {
                        dateStyle: "medium",
                      }).format(new Date(p.updatedAt))}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button onClick={() => setAdjust(p)}>
                          <FiEdit3 />
                          Adjust
                        </button>
                        <button onClick={() => setHistoryId(p.id)}>
                          <FiClock />
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.pagination}>
            <span>{data.pagination.total} products</span>
            <div>
              <button
                disabled={filters.page <= 1}
                onClick={() => setFilters((x) => ({ ...x, page: x.page - 1 }))}
              >
                Previous
              </button>
              <button
                disabled={filters.page >= data.pagination.totalPages}
                onClick={() => setFilters((x) => ({ ...x, page: x.page + 1 }))}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
      {adjust && (
        <Adjustment
          product={adjust}
          onClose={() => setAdjust(null)}
          onSaved={() => {
            setAdjust(null);
            retry();
          }}
        />
      )}
      {historyId && (
        <History productId={historyId} onClose={() => setHistoryId(null)} />
      )}
    </AdminLayout>
  );
}
function Adjustment({ product, onClose, onSaved }) {
  const [form, setForm] = useState({
    adjustmentType: "ADD",
    quantity: 1,
    reason: "RESTOCK",
    note: "",
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const data = await adminRequest("/api/admin/inventory/adjust", "POST", {
        ...form,
        productId: product.productId || product.id,
        variantColourId: product.variantColourId,
        quantity: Number(form.quantity),
      });
      toast.success(`Stock updated to ${data.stock}.`);
      onSaved();
    } catch (err) {
      setErrors(err.fields || { _form: err.message });
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={styles.dialogBack}>
      <section className={styles.dialog} role="dialog" aria-modal="true">
        <h2>Adjust {product.name}</h2>
        <p>
          Current stock: <strong>{product.stock}</strong>
        </p>
        <form className={styles.modalForm} onSubmit={submit}>
          <label className={styles.field}>
            Adjustment
            <select
              value={form.adjustmentType}
              onChange={(e) =>
                setForm((x) => ({ ...x, adjustmentType: e.target.value }))
              }
            >
              <option>ADD</option>
              <option>REMOVE</option>
              <option>SET</option>
            </select>
            {errors.adjustmentType && <span>{errors.adjustmentType}</span>}
          </label>
          <label className={styles.field}>
            Quantity
            <input
              type="number"
              min="0"
              step="1"
              value={form.quantity}
              onChange={(e) =>
                setForm((x) => ({ ...x, quantity: e.target.value }))
              }
            />
            {errors.quantity && <span>{errors.quantity}</span>}
          </label>
          <label className={styles.field}>
            Reason
            <select
              value={form.reason}
              onChange={(e) =>
                setForm((x) => ({ ...x, reason: e.target.value }))
              }
            >
              <option value="RESTOCK">Restock</option>
              <option value="ADMIN_ADJUSTMENT">Admin adjustment</option>
              <option value="CORRECTION">Correction</option>
              <option value="RETURN">Return</option>
            </select>
          </label>
          <label className={styles.field}>
            Note
            <input
              value={form.note}
              onChange={(e) => setForm((x) => ({ ...x, note: e.target.value }))}
            />
          </label>
          {errors._form && <p>{errors._form}</p>}
          <div>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button className={styles.primary} disabled={busy}>
              {busy ? "Adjusting..." : "Save Adjustment"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
function History({ productId, onClose }) {
  const { data, loading, error, retry } = useAdminApi(
    `/api/admin/inventory/${productId}/history`,
  );
  return (
    <div className={styles.dialogBack}>
      <section className={styles.dialog} role="dialog" aria-modal="true">
        <h2>Inventory History</h2>
        {loading || error ? (
          <AdminState loading={loading} error={error} retry={retry} />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Before</th>
                  <th>Change</th>
                  <th>After</th>
                  <th>Reason</th>
                  <th>Admin</th>
                </tr>
              </thead>
              <tbody>
                {data.movements.map((m) => (
                  <tr key={m.id}>
                    <td>{new Date(m.createdAt).toLocaleString("en-IN")}</td>
                    <td>{m.previousStock}</td>
                    <td>
                      {m.quantityChange > 0
                        ? `+${m.quantityChange}`
                        : m.quantityChange}
                    </td>
                    <td>{m.newStock}</td>
                    <td>
                      {m.reason}
                      <small>{m.note}</small>
                    </td>
                    <td>{m.adminUser?.name || "System"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div>
          <button onClick={onClose}>Close</button>
        </div>
      </section>
    </div>
  );
}
