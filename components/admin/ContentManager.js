import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import { adminRequest, useAdminApi } from "@/hooks/useAdminApi";
import AdminState from "./AdminState";
import styles from "@/styles/admin.module.css";

const couponBlank = {
  code: "",
  description: "",
  type: "PERCENTAGE",
  value: "",
  minimumOrder: "",
  maximumDiscount: "",
  usageLimit: "",
  startsAt: new Date().toISOString().slice(0, 10),
  expiresAt: "",
  isActive: true,
};
const bannerBlank = {
  title: "",
  subtitle: "",
  imageUrl: "",
  mobileImageUrl: "",
  linkUrl: "",
  buttonLabel: "Shop Now",
  displayOrder: 0,
  isActive: true,
  startsAt: "",
  endsAt: "",
};
const dateValue = (v) => (v ? new Date(v).toISOString().slice(0, 10) : "");
export default function ContentManager({ type }) {
  const coupon = type === "coupon",
    endpoint = `/api/admin/${coupon ? "coupons" : "banners"}`,
    [search, setSearch] = useState(""),
    [editing, setEditing] = useState(null),
    [busy, setBusy] = useState(false),
    [errors, setErrors] = useState({});
  const path = useMemo(
    () =>
      coupon ? `${endpoint}?search=${encodeURIComponent(search)}` : endpoint,
    [coupon, endpoint, search],
  );
  const { data, loading, error, retry } = useAdminApi(path),
    rows = data?.[coupon ? "coupons" : "banners"] || [];
  const open = (row) =>
    setEditing(
      row
        ? {
            ...row,
            startsAt: dateValue(row.startsAt),
            expiresAt: dateValue(row.expiresAt),
            endsAt: dateValue(row.endsAt),
          }
        : { ...(coupon ? couponBlank : bannerBlank) },
    );
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await adminRequest(
        editing.id ? `${endpoint}/${editing.id}` : endpoint,
        editing.id ? "PATCH" : "POST",
        editing,
      );
      toast.success(`${coupon ? "Coupon" : "Banner"} saved.`);
      setEditing(null);
      retry();
    } catch (err) {
      setErrors(err.fields || { _form: err.message });
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(row) {
    if (!confirm(`Delete ${coupon ? row.code : row.title}?`)) return;
    try {
      await adminRequest(`${endpoint}/${row.id}`, "DELETE");
      toast.success("Deleted.");
      retry();
    } catch (e) {
      toast.error(e.message);
    }
  }
  return (
    <>
      <div className={styles.toolbar}>
        {coupon && (
          <input
            placeholder="Search coupon code"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
        <button className={styles.primary} onClick={() => open()}>
          <FiPlus /> Add {coupon ? "Coupon" : "Banner"}
        </button>
      </div>
      {loading || error ? (
        <AdminState loading={loading} error={error} retry={retry} />
      ) : !rows.length ? (
        <AdminState empty={`No ${coupon ? "coupons" : "banners"} yet.`} />
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {coupon ? (
                    <>
                      <th>Code</th>
                      <th>Discount</th>
                      <th>Usage</th>
                      <th>Expiry</th>
                    </>
                  ) : (
                    <>
                      <th>Banner</th>
                      <th>Order</th>
                      <th>Schedule</th>
                    </>
                  )}
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    {coupon ? (
                      <>
                        <td>
                          <strong>{row.code}</strong>
                          <small>{row.description}</small>
                        </td>
                        <td>
                          {row.type === "PERCENTAGE"
                            ? `${Number(row.value)}%`
                            : `₹${Number(row.value).toLocaleString("en-IN")}`}
                        </td>
                        <td>
                          {row.usedCount} / {row.usageLimit || "Unlimited"}
                        </td>
                        <td>
                          {new Date(row.expiresAt).toLocaleDateString("en-IN")}
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <strong>{row.title}</strong>
                          <small>{row.subtitle}</small>
                        </td>
                        <td>{row.displayOrder}</td>
                        <td>
                          {row.startsAt
                            ? new Date(row.startsAt).toLocaleDateString("en-IN")
                            : "Always"}{" "}
                          –{" "}
                          {row.endsAt
                            ? new Date(row.endsAt).toLocaleDateString("en-IN")
                            : "Open"}
                        </td>
                      </>
                    )}
                    <td>
                      <span
                        className={`${styles.badge} ${row.isActive ? styles.activeBadge : styles.inactiveBadge}`}
                      >
                        {row.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button onClick={() => open(row)} aria-label="Edit">
                          <FiEdit2 />
                        </button>
                        <button onClick={() => remove(row)} aria-label="Delete">
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {editing && (
        <div className={styles.dialogBack}>
          <section
            className={`${styles.dialog} ${styles.adminEditor}`}
            role="dialog"
            aria-modal="true"
          >
            <h2>
              {editing.id ? "Edit" : "Add"} {coupon ? "Coupon" : "Banner"}
            </h2>
            <form className={styles.modalForm} onSubmit={save}>
              {coupon ? (
                <CouponFields form={editing} set={setEditing} />
              ) : (
                <BannerFields form={editing} set={setEditing} />
              )}{" "}
              {errors._form && <p>{errors._form}</p>}
              <div>
                <button type="button" onClick={() => setEditing(null)}>
                  Cancel
                </button>
                <button className={styles.primary} disabled={busy}>
                  {busy ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
function input(set, key, type = "text") {
  return (e) =>
    set((x) => ({
      ...x,
      [key]: type === "checkbox" ? e.target.checked : e.target.value,
    }));
}
function CouponFields({ form, set }) {
  return (
    <>
      <label className={styles.field}>
        Code
        <input value={form.code} onChange={input(set, "code")} required />
      </label>
      <label className={styles.field}>
        Description
        <input
          value={form.description || ""}
          onChange={input(set, "description")}
        />
      </label>
      <label className={styles.field}>
        Type
        <select value={form.type} onChange={input(set, "type")}>
          <option value="PERCENTAGE">Percentage</option>
          <option value="FIXED">Fixed amount</option>
        </select>
      </label>
      {["value", "minimumOrder", "maximumDiscount", "usageLimit"].map((k) => (
        <label className={styles.field} key={k}>
          {k
            .replace(/[A-Z]/g, (m) => ` ${m}`)
            .replace(/^./, (m) => m.toUpperCase())}
          <input
            type="number"
            min="0"
            value={form[k] ?? ""}
            onChange={input(set, k)}
          />
        </label>
      ))}
      <label className={styles.field}>
        Starts
        <input
          type="date"
          value={form.startsAt}
          onChange={input(set, "startsAt")}
          required
        />
      </label>
      <label className={styles.field}>
        Expires
        <input
          type="date"
          value={form.expiresAt}
          onChange={input(set, "expiresAt")}
          required
        />
      </label>
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={input(set, "isActive", "checkbox")}
        />{" "}
        Active
      </label>
    </>
  );
}
function BannerFields({ form, set }) {
  return (
    <>
      {[
        "title",
        "subtitle",
        "imageUrl",
        "mobileImageUrl",
        "linkUrl",
        "buttonLabel",
      ].map((k) => (
        <label className={styles.field} key={k}>
          {k
            .replace(/[A-Z]/g, (m) => ` ${m}`)
            .replace(/^./, (m) => m.toUpperCase())}
          <input
            value={form[k] || ""}
            onChange={input(set, k)}
            required={["title", "imageUrl"].includes(k)}
          />
        </label>
      ))}
      <label className={styles.field}>
        Display order
        <input
          type="number"
          min="0"
          value={form.displayOrder}
          onChange={input(set, "displayOrder")}
        />
      </label>
      <label className={styles.field}>
        Starts
        <input
          type="date"
          value={form.startsAt || ""}
          onChange={input(set, "startsAt")}
        />
      </label>
      <label className={styles.field}>
        Ends
        <input
          type="date"
          value={form.endsAt || ""}
          onChange={input(set, "endsAt")}
        />
      </label>
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={input(set, "isActive", "checkbox")}
        />{" "}
        Active
      </label>
    </>
  );
}
