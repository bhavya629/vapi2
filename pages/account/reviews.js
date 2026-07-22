import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/context/AuthContext";
import styles from "@/styles/my-reviews.module.css";
export default function MyReviews() {
  const { user, loading } = useAuth(),
    router = useRouter(),
    [data, setData] = useState(null);
  const load = () =>
    fetch("/api/account/reviews")
      .then((r) => r.json())
      .then((b) => setData(b.data));
  useEffect(() => {
    if (!loading && !user) router.replace("/login?redirect=/account/reviews");
    if (user) load();
  }, [loading, user]);
  const remove = async (id) => {
    if (!confirm("Delete this review permanently?")) return;
    const r = await fetch(`/api/reviews/${id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("Review deleted.");
      load();
    }
  };
  return (
    <>
      <Head>
        <title>My Reviews | The Cellphone Studio</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main className={styles.page}>
        <header>
          <p>YOUR FEEDBACK</p>
          <h1>My Reviews</h1>
          <Link href="/account">Back to Account</Link>
        </header>
        {!data ? (
          <div className={styles.empty}>Loading reviews…</div>
        ) : data.reviews.length ? (
          <section>
            {data.reviews.map((r) => (
              <article key={r.id}>
                <img src={r.product.imageUrl} alt="" />
                <div>
                  <span>{r.product.name}</span>
                  <strong>
                    {"★".repeat(r.rating)}
                    {"☆".repeat(5 - r.rating)} · {r.status}
                  </strong>
                  <h2>{r.title}</h2>
                  <p>{r.comment}</p>
                  <small>
                    Updated {new Date(r.updatedAt).toLocaleDateString("en-IN")}
                  </small>
                  <div>
                    <Link
                      href={`${r.product.productType === "SMARTPHONE" ? "/product" : "/accessory"}/${r.product.slug}#reviews`}
                    >
                      View / Edit
                    </Link>
                    <button onClick={() => remove(r.id)}>Delete</button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <div className={styles.empty}>
            <h2>No reviews yet</h2>
            <p>
              Verified buyers can review products after their paid order is
              delivered.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
