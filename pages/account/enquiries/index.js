import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Footer from "@/components/layout/Footer";
import EnquiryBadge from "@/components/enquiries/EnquiryBadge";
import { useAuth } from "@/context/AuthContext";
import styles from "@/styles/enquiries.module.css";
export default function MyEnquiries() {
  const { user, loading } = useAuth(),
    router = useRouter(),
    [status, setStatus] = useState("ALL"),
    [state, setState] = useState({ loading: true, data: null, error: "" });
  useEffect(() => {
    if (!loading && !user) router.replace("/login?redirect=/account/enquiries");
  }, [loading, user, router]);
  useEffect(() => {
    if (!user) return;
    setState((s) => ({ ...s, loading: true }));
    fetch(`/api/account/enquiries?status=${status}`)
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw Error(b.error?.message || "Unable to load enquiries.");
        return b.data;
      })
      .then((data) => setState({ loading: false, data, error: "" }))
      .catch((e) => setState({ loading: false, data: null, error: e.message }));
  }, [user, status]);
  return (
    <>
      <Head>
        <title>My Enquiries | The Cellphone Studio</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <div>
              <p>CUSTOMER SUPPORT</p>
              <h1>My Enquiries</h1>
            </div>
            <Link href="/contact">Create Enquiry</Link>
          </header>
          <div className={styles.filters}>
            <label>
              Status{" "}
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="ALL">All statuses</option>
                {[
                  "OPEN",
                  "IN_REVIEW",
                  "WAITING_FOR_CUSTOMER",
                  "WAITING_FOR_STORE",
                  "RESOLVED",
                  "CLOSED",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
          </div>
          {state.loading ? (
            <div className={styles.empty}>Loading enquiries…</div>
          ) : state.error ? (
            <div className={`${styles.empty} ${styles.error}`}>
              {state.error}
            </div>
          ) : state.data?.enquiries.length ? (
            <section className={styles.list}>
              {state.data.enquiries.map((e) => (
                <Link
                  className={styles.card}
                  href={`/account/enquiries/${e.enquiryNumber}`}
                  key={e.enquiryNumber}
                >
                  <div className={styles.cardTop}>
                    <h2>{e.subject}</h2>
                    <EnquiryBadge value={e.status} />
                  </div>
                  <p>
                    {e.messages?.[0]?.message ||
                      "Open enquiry to view the conversation."}
                  </p>
                  <div className={styles.meta}>
                    <strong>{e.enquiryNumber}</strong>
                    <span>{e.category.replaceAll("_", " ")}</span>
                    {e.orderNumber && <span>Order {e.orderNumber}</span>}
                    <time>
                      {new Date(e.updatedAt).toLocaleDateString("en-IN")}
                    </time>
                  </div>
                </Link>
              ))}
            </section>
          ) : (
            <div className={styles.empty}>
              <h2>No enquiries yet</h2>
              <p>
                When you contact support while signed in, your enquiries will
                appear here.
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
