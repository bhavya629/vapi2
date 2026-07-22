import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminState from "@/components/admin/AdminState";
import { adminRequest, useAdminApi } from "@/hooks/useAdminApi";
import styles from "@/styles/admin.module.css";
const fields = [
  ["Store name", "storeName"],
  ["Contact email", "email", "email"],
  ["Phone", "phone"],
  ["WhatsApp", "whatsapp"],
  ["Address", "address"],
  ["Logo URL", "logoUrl"],
  ["Facebook URL", "facebookUrl"],
  ["Instagram URL", "instagramUrl"],
  ["YouTube URL", "youtubeUrl"],
];
export default function Settings() {
  const { data, loading, error, retry } = useAdminApi("/api/admin/settings"),
    [form, setForm] = useState(null),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (data?.settings) setForm(data.settings);
  }, [data]);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await adminRequest("/api/admin/settings", "PATCH", form);
      toast.success("Store settings saved.");
      retry();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminLayout title="Settings" eyebrow="STORE CONFIGURATION">
      {loading || error || !form ? (
        <AdminState loading={loading} error={error} retry={retry} />
      ) : (
        <>
          <form className={styles.formCard} onSubmit={save}>
            <h2>Store Information & Social Links</h2>
            <div className={styles.formGrid}>
              {fields.map(([label, key, type]) => (
                <label
                  className={`${styles.field} ${key === "address" ? styles.fieldFull : ""}`}
                  key={key}
                >
                  {label}
                  <input
                    type={type || "text"}
                    value={form[key] || ""}
                    onChange={(e) =>
                      setForm((x) => ({ ...x, [key]: e.target.value }))
                    }
                  />
                </label>
              ))}
            </div>
            <div className={styles.formActions}>
              <button className={styles.primary} disabled={busy}>
                {busy ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </form>
          <article className={styles.panel}>
            <h2>Delivery Configuration</h2>
            <p>
              Local radius, delivery charges, store coordinates, and India-wide
              shipping are managed separately.
            </p>
            <Link className={styles.primary} href="/admin/delivery-settings">
              Open Delivery Settings
            </Link>
          </article>
        </>
      )}
    </AdminLayout>
  );
}
