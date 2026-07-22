import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  FiEdit2,
  FiEye,
  FiPlus,
  FiRefreshCw,
  FiShoppingBag,
} from "react-icons/fi";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminState from "@/components/admin/AdminState";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { adminRequest, useAdminApi } from "@/hooks/useAdminApi";
import styles from "@/styles/admin.module.css";

export default function ProductsAdmin() {
  const [filters, setFilters] = useState({
    search: "",
    type: "",
    brand: "",
    category: "",
    active: "",
    featured: "",
    stockStatus: "",
    sort: "",
    page: 1,
  });
  const [confirm, setConfirm] = useState(null),
    [busy, setBusy] = useState(false);
  const path = useMemo(
    () =>
      `/api/admin/products?${new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== ""))}`,
    [filters],
  );
  const { data, loading, error, retry } = useAdminApi(path);
  const { data: brandData } = useAdminApi("/api/admin/brands");
  const { data: categoryData } = useAdminApi("/api/admin/categories");
  const set = (key, value) =>
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  const toggle = async () => {
    setBusy(true);
    try {
      await adminRequest(
        `/api/admin/products/${confirm.id}`,
        confirm.isActive ? "DELETE" : "PATCH",
        confirm.isActive ? undefined : { isActive: true },
      );
      toast.success(
        confirm.isActive ? "Product deactivated." : "Product reactivated.",
      );
      setConfirm(null);
      retry();
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <AdminLayout
      title="Products"
      actions={
        <Link href="/admin/products/new">
          <FiPlus /> Add Product
        </Link>
      }
    >
      <div className={styles.toolbar}>
        <input
          value={filters.search}
          onChange={(event) => set("search", event.target.value)}
          placeholder="Search name, SKU, or slug"
        />
        <Filter
          value={filters.type}
          onChange={(event) => set("type", event.target.value)}
          options={[
            ["", "All types"],
            ["SMARTPHONE", "Smartphones"],
            ["ACCESSORY", "Accessories"],
          ]}
        />
        <Filter
          value={filters.active}
          onChange={(event) => set("active", event.target.value)}
          options={[
            ["", "All status"],
            ["true", "Active"],
            ["false", "Inactive"],
          ]}
        />
        <Filter
          value={filters.brand}
          onChange={(event) => set("brand", event.target.value)}
          options={[
            ["", "All brands"],
            ...(brandData?.brands || []).map((x) => [x.id, x.name]),
          ]}
        />
        <Filter
          value={filters.category}
          onChange={(event) => set("category", event.target.value)}
          options={[
            ["", "All categories"],
            ...(categoryData?.categories || []).map((x) => [x.id, x.name]),
          ]}
        />
        <Filter
          value={filters.featured}
          onChange={(event) => set("featured", event.target.value)}
          options={[
            ["", "Featured: All"],
            ["true", "Featured"],
            ["false", "Not Featured"],
          ]}
        />
        <Filter
          value={filters.stockStatus}
          onChange={(event) => set("stockStatus", event.target.value)}
          options={[
            ["", "All stock"],
            ["in-stock", "In Stock"],
            ["low-stock", "Low Stock"],
            ["out-of-stock", "Out of Stock"],
          ]}
        />
        <Filter
          value={filters.sort}
          onChange={(event) => set("sort", event.target.value)}
          options={[
            ["", "Recently updated"],
            ["name-asc", "Name"],
            ["price-asc", "Price low-high"],
            ["price-desc", "Price high-low"],
            ["stock-asc", "Stock low-high"],
          ]}
        />
      </div>
      {loading || error ? (
        <AdminState loading={loading} error={error} retry={retry} />
      ) : !data.products.length ? (
        <AdminState empty="No products match these filters." />
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Brand</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Featured</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <Image
                        className={styles.thumb}
                        src={product.imageUrl}
                        alt=""
                        width={42}
                        height={42}
                        unoptimized
                      />
                    </td>
                    <td>
                      <div className={styles.productCell}>
                        <div>
                          <strong>{product.name}</strong>
                          <small>{product.sku || "No SKU"}</small>
                        </div>
                      </div>
                    </td>
                    <td>{product.productType}</td>
                    <td>{product.brand.name}</td>
                    <td>{product.category.name}</td>
                    <td>₹{product.price.toLocaleString("en-IN")}</td>
                    <td>
                      <Status product={product} />
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${product.isActive ? styles.activeBadge : styles.inactiveBadge}`}
                      >
                        {product.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      {product.isFeatured ? (
                        <span className={`${styles.badge} ${styles.featured}`}>
                          Featured
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <Link
                          href={`/admin/products/${product.id}`}
                          aria-label={`View ${product.name}`}
                        >
                          <FiEye />
                        </Link>
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          aria-label={`Edit ${product.name}`}
                        >
                          <FiEdit2 />
                        </Link>
                        <Link
                          href={`/admin/inventory?product=${product.id}`}
                          aria-label={`Adjust ${product.name} stock`}
                        >
                          <FiShoppingBag />
                        </Link>
                        <button
                          onClick={() => setConfirm(product)}
                          aria-label={`${product.isActive ? "Deactivate" : "Reactivate"} ${product.name}`}
                        >
                          <FiRefreshCw />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.pagination}>
            <span>
              Page {data.pagination.page} of{" "}
              {Math.max(1, data.pagination.totalPages)} ·{" "}
              {data.pagination.total} products
            </span>
            <div>
              <button
                disabled={filters.page <= 1}
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    page: current.page - 1,
                  }))
                }
              >
                Previous
              </button>
              <button
                disabled={filters.page >= data.pagination.totalPages}
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    page: current.page + 1,
                  }))
                }
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
      {confirm && (
        <ConfirmDialog
          title={`${confirm.isActive ? "Deactivate" : "Reactivate"} Product?`}
          message={
            confirm.isActive
              ? "The product will disappear from the public catalogue but its history will remain."
              : "The product will become visible publicly when its brand and category are active."
          }
          confirmLabel={confirm.isActive ? "Deactivate" : "Reactivate"}
          onCancel={() => setConfirm(null)}
          onConfirm={toggle}
          busy={busy}
        />
      )}
    </AdminLayout>
  );
}
function Filter({ options, ...props }) {
  return (
    <select {...props}>
      {options.map(([value, text]) => (
        <option value={value} key={text}>
          {text}
        </option>
      ))}
    </select>
  );
}
function Status({ product }) {
  return (
    <span
      className={`${styles.badge} ${product.stockStatus === "OUT_OF_STOCK" ? styles.outStock : product.stockStatus === "LOW_STOCK" ? styles.lowStock : styles.inStock}`}
    >
      {product.stock}
    </span>
  );
}
