import { useRouter } from "next/router";
import Link from "next/link";
import { useState } from "react";
import { FiBell, FiLogOut, FiMenu, FiSearch } from "react-icons/fi";
import styles from "@/styles/admin.module.css";
export default function AdminHeader({ user, onMenu, onLogout }) {
  const router = useRouter(),
    [search, setSearch] = useState("");
  return (
    <>
      <header className={styles.adminTopbar}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (search.trim())
              router.push(
                `/admin/products?search=${encodeURIComponent(search.trim())}`,
              );
          }}
        >
          <FiSearch />
          <input
            aria-label="Search admin products"
            placeholder="Search products or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        <Link className={styles.topIcon} href="/admin/enquiries" aria-label="Open customer enquiries">
          <FiBell />
        </Link>
        <div>
          <strong>{user?.name || "Administrator"}</strong>
          <small>Administrator</small>
        </div>
        <button className={styles.topLogout} onClick={onLogout}>
          <FiLogOut /> Logout
        </button>
      </header>
      <header className={styles.mobileHeader}>
        <button onClick={onMenu} aria-label="Open admin menu">
          <FiMenu />
        </button>
        <strong>Studio Admin</strong>
      </header>
    </>
  );
}
