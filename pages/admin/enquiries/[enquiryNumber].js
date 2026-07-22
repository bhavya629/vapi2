import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminState from "@/components/admin/AdminState";
import EnquiryBadge from "@/components/enquiries/EnquiryBadge";
import { adminRequest, useAdminApi } from "@/hooks/useAdminApi";
import eStyles from "@/styles/enquiries.module.css";
import styles from "@/styles/admin.module.css";
export default function AdminEnquiry() {
  const router = useRouter(),
    number = router.query.enquiryNumber,
    { data, loading, error, retry } = useAdminApi(
      number ? `/api/admin/enquiries/${encodeURIComponent(number)}` : null,
    ),
    [busy, setBusy] = useState(false),
    [reply, setReply] = useState(""),
    [visible, setVisible] = useState(true),
    [note, setNote] = useState("");
  const enquiry = data?.enquiry || data;
  useEffect(() => {
    if (enquiry) setNote(enquiry.internalNote || "");
  }, [enquiry?.enquiryNumber]);
  const mutate = async (path, method, body, success) => {
    setBusy(true);
    try {
      await adminRequest(path, method, body);
      toast.success(success);
      retry();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <AdminLayout
      title={enquiry?.subject || "Enquiry Details"}
      eyebrow={enquiry?.enquiryNumber || "SUPPORT ENQUIRY"}
      actions={<Link href="/admin/enquiries">Back to Enquiries</Link>}
    >
      {loading || error ? (
        <AdminState loading={loading} error={error} retry={retry} />
      ) : (
        <div className={eStyles.detailGrid}>
          <section className={eStyles.panel}>
            <div className={eStyles.cardTop}>
              <h2>Conversation</h2>
              <EnquiryBadge value={enquiry.status} />
            </div>
            <div className={eStyles.conversation}>
              {enquiry.messages.map((m, i) => (
                <article
                  className={`${eStyles.message} ${m.isCustomerVisible ? eStyles.admin : eStyles.internal}`}
                  key={`${m.createdAt}-${i}`}
                >
                  <strong>
                    {m.authorType}
                    {!m.isCustomerVisible && " · Internal"}
                  </strong>
                  <p>{m.message}</p>
                  <time>{new Date(m.createdAt).toLocaleString("en-IN")}</time>
                </article>
              ))}
            </div>
            <form
              className={eStyles.reply}
              onSubmit={(e) => {
                e.preventDefault();
                mutate(
                  `/api/admin/enquiries/${number}/messages`,
                  "POST",
                  { message: reply, customerVisible: visible },
                  "Message added.",
                );
                setReply("");
              }}
            >
              <label>
                New message
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  minLength={2}
                  maxLength={3000}
                  required
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={visible}
                  onChange={(e) => setVisible(e.target.checked)}
                />{" "}
                Visible to customer
              </label>
              <button className={eStyles.primary} disabled={busy}>
                Add Message
              </button>
            </form>
          </section>
          <aside className={`${eStyles.panel} ${eStyles.side}`}>
            <h2>Manage enquiry</h2>
            <dl>
              <div>
                <dt>Customer</dt>
                <dd>
                  {enquiry.name}
                  <br />
                  {enquiry.email}
                  <br />
                  {enquiry.phone || "No phone"}
                </dd>
              </div>
              {enquiry.order?.orderNumber && (
                <div>
                  <dt>Order</dt>
                  <dd>
                    <Link href={`/admin/orders/${enquiry.order.orderNumber}`}>
                      {enquiry.order.orderNumber}
                    </Link>
                  </dd>
                </div>
              )}
              <div>
                <dt>Status</dt>
                <dd>
                  <select
                    value={enquiry.status}
                    disabled={busy}
                    onChange={(e) =>
                      mutate(
                        `/api/admin/enquiries/${number}/status`,
                        "PATCH",
                        { status: e.target.value, customerVisible: true },
                        "Status updated.",
                      )
                    }
                  >
                    <option>{enquiry.status}</option>
                    {enquiry.allowedTransitions.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </dd>
              </div>
              <div>
                <dt>Priority</dt>
                <dd>
                  <select
                    value={enquiry.priority}
                    disabled={busy}
                    onChange={(e) =>
                      mutate(
                        `/api/admin/enquiries/${number}/priority`,
                        "PATCH",
                        { priority: e.target.value },
                        "Priority updated.",
                      )
                    }
                  >
                    {["LOW", "NORMAL", "HIGH", "URGENT"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{enquiry.source.replaceAll("_", " ")}</dd>
              </div>
            </dl>
            <form
              className={eStyles.reply}
              onSubmit={(e) => {
                e.preventDefault();
                mutate(
                  `/api/admin/enquiries/${number}/internal-note`,
                  "PATCH",
                  { internalNote: note },
                  "Internal note saved.",
                );
              }}
            >
              <label>
                Private internal note
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={2000}
                />
              </label>
              <button className={styles.secondary} disabled={busy}>
                Save Private Note
              </button>
            </form>
          </aside>
        </div>
      )}
    </AdminLayout>
  );
}
