import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Footer from "@/components/layout/Footer";
import EnquiryBadge from "@/components/enquiries/EnquiryBadge";
import { useAuth } from "@/context/AuthContext";
import styles from "@/styles/enquiries.module.css";
export default function EnquiryDetail() {
  const router = useRouter(),
    { user, loading } = useAuth(),
    [data, setData] = useState(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [sending, setSending] = useState(false);
  useEffect(() => {
    if (!loading && !user)
      router.replace(`/login?redirect=${encodeURIComponent(router.asPath)}`);
  }, [loading, user, router]);
  useEffect(() => {
    if (!user || !router.query.enquiryNumber) return;
    fetch(
      `/api/account/enquiries/${encodeURIComponent(router.query.enquiryNumber)}`,
    )
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw Error(b.error?.message || "Enquiry not found.");
        setData(b.data.enquiry);
      })
      .catch((e) => setError(e.message));
  }, [user, router.query.enquiryNumber]);
  const submit = async (e) => {
    e.preventDefault();
    if (message.trim().length < 2) return;
    setSending(true);
    try {
      const r = await fetch(
          `/api/account/enquiries/${encodeURIComponent(data.enquiryNumber)}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message }),
          },
        ),
        b = await r.json();
      if (!r.ok) throw Error(b.error?.message || "Could not send follow-up.");
      setData(b.data.enquiry);
      setMessage("");
      toast.success("Follow-up sent.");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };
  return (
    <>
      <Head>
        <title>Enquiry Details | The Cellphone Studio</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main className={styles.page}>
        <div className={styles.container}>
          <Link className={styles.back} href="/account/enquiries">
            ← Back to My Enquiries
          </Link>
          {error ? (
            <div className={`${styles.empty} ${styles.error}`}>{error}</div>
          ) : !data ? (
            <div className={styles.empty}>Loading enquiry…</div>
          ) : (
            <>
              <header className={styles.header}>
                <div>
                  <p>{data.enquiryNumber}</p>
                  <h1>{data.subject}</h1>
                </div>
                <EnquiryBadge value={data.status} />
              </header>
              <div className={styles.detailGrid}>
                <section className={styles.panel}>
                  <h2>Conversation</h2>
                  <div className={styles.conversation}>
                    {data.messages.map((m, i) => (
                      <article
                        className={`${styles.message} ${m.authorType === "ADMIN" || m.authorType === "SYSTEM" ? styles.admin : ""}`}
                        key={`${m.createdAt}-${i}`}
                      >
                        <strong>
                          {m.authorType === "CUSTOMER"
                            ? "You"
                            : "The Cellphone Studio"}
                        </strong>
                        <p>{m.message}</p>
                        <time>
                          {new Date(m.createdAt).toLocaleString("en-IN")}
                        </time>
                      </article>
                    ))}
                  </div>
                  {data.canReply && (
                    <form className={styles.reply} onSubmit={submit}>
                      <label htmlFor="followup">Add a follow-up</label>
                      <textarea
                        id="followup"
                        value={message}
                        maxLength={3000}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                      />
                      <button className={styles.primary} disabled={sending}>
                        {sending ? "Sending…" : "Send Follow-up"}
                      </button>
                    </form>
                  )}
                </section>
                <aside className={`${styles.panel} ${styles.side}`}>
                  <h2>Enquiry details</h2>
                  <dl>
                    <div>
                      <dt>Status</dt>
                      <dd>
                        <EnquiryBadge value={data.status} />
                      </dd>
                    </div>
                    <div>
                      <dt>Category</dt>
                      <dd>{data.category.replaceAll("_", " ")}</dd>
                    </div>
                    {data.orderNumber && (
                      <div>
                        <dt>Linked order</dt>
                        <dd>
                          <Link href={`/orders/${data.orderNumber}`}>
                            {data.orderNumber}
                          </Link>
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt>Created</dt>
                      <dd>
                        {new Date(data.createdAt).toLocaleString("en-IN")}
                      </dd>
                    </div>
                  </dl>
                </aside>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
