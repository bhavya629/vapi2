import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiMonitor, FiShield } from "react-icons/fi";
import styles from "@/styles/account-security.module.css";
export default function AccountSecurityActivity() {
  const [sessions, setSessions] = useState([]),
    [events, setEvents] = useState([]),
    [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        fetch("/api/account/sessions").then((r) => r.json()),
        fetch("/api/account/login-history").then((r) => r.json()),
      ]);
      setSessions(a.data?.sessions || []);
      setEvents(b.data?.events || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const revoke = async (id) => {
    const r = await fetch(`/api/account/sessions/${id}`, { method: "DELETE" }),
      b = await r.json();
    if (!r.ok)
      return toast.error(b.error?.message || "Unable to revoke session.");
    toast.success("Session signed out.");
    load();
  };
  const all = async () => {
    if (
      !window.confirm(
        "Sign out all other devices? Your current session will remain active.",
      )
    )
      return;
    const r = await fetch("/api/account/sessions", { method: "DELETE" }),
      b = await r.json();
    if (!r.ok)
      return toast.error(b.error?.message || "Unable to revoke sessions.");
    toast.success(`${b.data.revokedCount} other session(s) signed out.`);
    load();
  };
  return (
    <>
      <section className={styles.panel}>
        <header>
          <FiMonitor />
          <div>
            <p>ACCOUNT SECURITY</p>
            <h2>Active Sessions</h2>
          </div>
        </header>
        {loading ? (
          <p>Loading active sessions…</p>
        ) : (
          <div className={styles.list}>
            {sessions.map((s) => (
              <article key={s.sessionId}>
                <div>
                  <strong>
                    {s.deviceLabel} {s.isCurrent && <span>Current device</span>}
                  </strong>
                  <small>
                    Last active {new Date(s.lastUsedAt).toLocaleString("en-IN")}{" "}
                    · Signed in{" "}
                    {new Date(s.createdAt).toLocaleDateString("en-IN")}
                  </small>
                </div>
                {!s.isCurrent && (
                  <button onClick={() => revoke(s.sessionId)}>Revoke</button>
                )}
              </article>
            ))}
            {!sessions.length && <p>No active tracked sessions.</p>}
          </div>
        )}
        <button
          className={styles.secondary}
          onClick={all}
          disabled={!sessions.some((s) => !s.isCurrent)}
        >
          Sign Out All Other Devices
        </button>
      </section>
      <section className={styles.panel}>
        <header>
          <FiShield />
          <div>
            <p>LOGIN ACTIVITY</p>
            <h2>Recent Security Activity</h2>
          </div>
        </header>
        <div className={styles.list}>
          {events.map((e) => (
            <article key={e.id}>
              <div>
                <strong>{e.label}</strong>
                <small>
                  {e.deviceLabel} ·{" "}
                  {new Date(e.createdAt).toLocaleString("en-IN")}
                </small>
              </div>
              <span className={e.success ? styles.good : styles.bad}>
                {e.success ? "Successful" : "Unsuccessful"}
              </span>
            </article>
          ))}
          {!events.length && <p>No security activity recorded yet.</p>}
        </div>
      </section>
    </>
  );
}
