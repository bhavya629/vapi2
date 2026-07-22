import styles from "@/styles/enquiries.module.css";
export default function EnquiryBadge({ value }) {
  return (
    <span
      className={`${styles.badge} ${styles[String(value || "").toLowerCase()] || ""}`}
    >
      {String(value || "").replaceAll("_", " ")}
    </span>
  );
}
