import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import styles from "@/styles/reviews.module.css";
export default function ProductReviews({ productId }) {
  const { user } = useAuth(),
    [data, setData] = useState(null),
    [sort, setSort] = useState("newest"),
    [page, setPage] = useState(1),
    [form, setForm] = useState({ rating: 5, title: "", comment: "" }),
    [busy, setBusy] = useState(false);
  const load = () =>
    productId &&
    fetch(
      `/api/reviews/product/${encodeURIComponent(productId)}?sort=${sort}&page=${page}&limit=5`,
    )
      .then((r) => r.json())
      .then((b) => setData(b.data))
      .catch(() => toast.error("Unable to load reviews."));
  useEffect(() => {
    load();
  }, [productId, sort, page, user?.id]);
  const own = data?.eligibility?.ownReview;
  useEffect(() => {
    if (own)
      setForm({ rating: own.rating, title: own.title, comment: own.comment });
  }, [own?.id]);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const editing = Boolean(own),
        r = await fetch(editing ? `/api/reviews/${own.id}` : "/api/reviews", {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, ...(!editing ? { productId } : {}) }),
        }),
        b = await r.json();
      if (!r.ok) throw Error(b.error?.message || "Unable to save review.");
      toast.success("Review submitted for moderation.");
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!confirm("Delete your review permanently?")) return;
    const r = await fetch(`/api/reviews/${own.id}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("Review deleted.");
      setForm({ rating: 5, title: "", comment: "" });
      load();
    }
  };
  const act = async (id, type, body) => {
    if (!user) return toast.error("Sign in to continue.");
    const r = await fetch(`/api/reviews/${id}/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      b = await r.json();
    if (!r.ok)
      return toast.error(b.error?.message || "Unable to complete request.");
    toast.success(type === "vote" ? "Helpful vote saved." : "Review reported.");
    load();
  };
  if (!data)
    return <div className={styles.state}>Loading customer reviews…</div>;
  const summary = data.product,
    rounded = Math.round(summary.averageRating);
  return (
    <div className={styles.wrap}>
      <div className={styles.summary}>
        <strong>{summary.averageRating.toFixed(1)}</strong>
        <span aria-label={`${summary.averageRating} out of 5 stars`}>
          {"★".repeat(rounded)}
          {"☆".repeat(5 - rounded)}
        </span>
        <small>{summary.totalReviews} approved reviews</small>
        {[5, 4, 3, 2, 1].map((star) => (
          <div className={styles.breakdown} key={star}>
            <b>{star}★</b>
            <i>
              <span
                style={{
                  width: `${summary.totalReviews ? (summary.distribution[star] / summary.totalReviews) * 100 : 0}%`,
                }}
              />
            </i>
            <em>{summary.distribution[star]}</em>
          </div>
        ))}
      </div>
      <div className={styles.content}>
        <div className={styles.toolbar}>
          <h2>Customer Reviews</h2>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            aria-label="Sort reviews"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="highest">Highest Rating</option>
            <option value="lowest">Lowest Rating</option>
            <option value="helpful">Most Helpful</option>
          </select>
        </div>
        {data.reviews.map((r) => (
          <article className={styles.card} key={r.id}>
            <span className={styles.avatar}>{r.user.initials}</span>
            <div>
              <header>
                <strong>{r.user.name}</strong>
                <time>{new Date(r.createdAt).toLocaleDateString("en-IN")}</time>
              </header>
              <span className={styles.stars}>
                {"★".repeat(r.rating)}
                {"☆".repeat(5 - r.rating)}
              </span>
              <h3>{r.title}</h3>
              <p>{r.comment}</p>
              <small>✓ Verified Purchase</small>
              <footer>
                <button onClick={() => act(r.id, "vote", { helpful: true })}>
                  Helpful ({r.helpfulCount})
                </button>
                <button
                  onClick={() => {
                    const reason = prompt("Why are you reporting this review?");
                    if (reason) act(r.id, "report", { reason });
                  }}
                >
                  Report
                </button>
              </footer>
            </div>
          </article>
        ))}
        {!data.reviews.length && (
          <div className={styles.state}>No approved reviews yet.</div>
        )}
        <div className={styles.pagination}>
          <button disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {data.pagination.totalPages || 1}
          </span>
          <button
            disabled={page >= data.pagination.totalPages}
            onClick={() => setPage((x) => x + 1)}
          >
            Next
          </button>
        </div>
        {user && data.eligibility.verifiedPurchase && (
          <form className={styles.form} onSubmit={submit}>
            <h3>{own ? "Edit Your Review" : "Write a Review"}</h3>
            {own && (
              <p>
                Status: <b>{own.status}</b>. Edits return to moderation.
              </p>
            )}
            <label>
              Rating
              <select
                value={form.rating}
                onChange={(e) =>
                  setForm((f) => ({ ...f, rating: Number(e.target.value) }))
                }
              >
                {[5, 4, 3, 2, 1].map((x) => (
                  <option value={x} key={x}>
                    {x} stars
                  </option>
                ))}
              </select>
            </label>
            <label>
              Title
              <input
                minLength={5}
                maxLength={100}
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                required
              />
            </label>
            <label>
              Review
              <textarea
                minLength={20}
                maxLength={2000}
                value={form.comment}
                onChange={(e) =>
                  setForm((f) => ({ ...f, comment: e.target.value }))
                }
                required
              />
            </label>
            <div>
              <button disabled={busy}>
                {busy ? "Saving…" : own ? "Update Review" : "Submit Review"}
              </button>
              {own && (
                <button
                  type="button"
                  className={styles.delete}
                  onClick={remove}
                >
                  Delete Review
                </button>
              )}
            </div>
          </form>
        )}
        {user && !data.eligibility.verifiedPurchase && !own && (
          <p className={styles.notice}>
            Reviews are available after a paid order containing this product is
            delivered.
          </p>
        )}
      </div>
    </div>
  );
}
