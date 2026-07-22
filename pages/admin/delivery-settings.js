import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import styles from "@/styles/delivery.module.css";
export default function DeliverySettings() {
  const [data, setData] = useState(null),
    [message, setMessage] = useState("");
  useEffect(() => {
    fetch("/api/admin/delivery-settings")
      .then((r) => r.json())
      .then((j) => j.success && setData(j.data));
  }, []);
  async function save(e) {
    e.preventDefault();
    setMessage("");
    const r = await fetch("/api/admin/delivery-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
      j = await r.json();
    setMessage(
      j.success
        ? "Delivery settings saved."
        : j.error?.message || "Unable to save.",
    );
  }
  return (
    <AdminLayout title="India Delivery Settings">
      {!data ? (
        <p>Loading settings…</p>
      ) : (
        <form className={styles.settings} onSubmit={save}>
          <label>
            Store name
            <input
              value={data.storeName}
              onChange={(e) => setData({ ...data, storeName: e.target.value })}
            />
          </label>
          <label>
            Store address
            <textarea
              value={data.storeAddress}
              onChange={(e) =>
                setData({ ...data, storeAddress: e.target.value })
              }
            />
          </label>
          <div className={styles.row}>
            <label>
              Store latitude
              <input
                type="number"
                step="any"
                value={data.storeLatitude ?? ""}
                onChange={(e) =>
                  setData({ ...data, storeLatitude: e.target.value })
                }
              />
            </label>
            <label>
              Store longitude
              <input
                type="number"
                step="any"
                value={data.storeLongitude ?? ""}
                onChange={(e) =>
                  setData({ ...data, storeLongitude: e.target.value })
                }
              />
            </label>
          </div>
          <div className={styles.row}>
            <label>
              Local radius (km)
              <input
                type="number"
                value={data.localRadiusKm}
                onChange={(e) =>
                  setData({ ...data, localRadiusKm: e.target.value })
                }
              />
            </label>
            <label>
              Fixed local charge
              <input value="₹350" disabled />
            </label>
            <label>
              Same-day cutoff
              <input
                type="time"
                value={data.sameDayCutoff}
                onChange={(e) =>
                  setData({ ...data, sameDayCutoff: e.target.value })
                }
              />
            </label>
          </div>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={data.sameDayEnabled}
              onChange={(e) =>
                setData({ ...data, sameDayEnabled: e.target.checked })
              }
            />{" "}
            Same-day delivery enabled
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={data.indiaShippingEnabled}
              onChange={(e) =>
                setData({ ...data, indiaShippingEnabled: e.target.checked })
              }
            />{" "}
            India-wide shipping enabled
          </label>
          <button type="submit">Save settings</button>
          {message && <p role="status">{message}</p>}
        </form>
      )}
    </AdminLayout>
  );
}
