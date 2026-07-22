import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import AdminHeader from "./AdminHeader";
import AdminProtectedRoute from "./AdminProtectedRoute";
import AdminSidebar from "./AdminSidebar";
import styles from "@/styles/admin.module.css";

export default function AdminLayout({
  title,
  eyebrow = "CATALOGUE ADMIN",
  children,
  actions,
}) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const signOut = async () => {
    try {
      await logout();
      toast.success("Logged out successfully.");
      await router.replace("/login");
    } catch {
      toast.error("Unable to log out.");
    }
  };
  return (
    <AdminProtectedRoute>
      <Head>
        <title>{title} | The Cellphone Studio Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <div
        className={`${styles.shell} ${collapsed ? styles.shellCollapsed : ""}`}
      >
        <AdminSidebar
          user={user}
          open={open}
          collapsed={collapsed}
          onClose={() => setOpen(false)}
          onCollapse={() => setCollapsed((x) => !x)}
          onLogout={signOut}
        />
        <div className={styles.main}>
          <AdminHeader
            user={user}
            onMenu={() => setOpen(true)}
            onLogout={signOut}
          />
          <div className={styles.content}>
            <div className={styles.pageHeader}>
              <div>
                <nav className={styles.breadcrumb} aria-label="Breadcrumb">
                  <Link href="/admin">Admin</Link>
                  <span>/</span>
                  <span>{title}</span>
                </nav>
                <p>{eyebrow}</p>
                <h1>{title}</h1>
              </div>
              {actions && <div className={styles.headerActions}>{actions}</div>}
            </div>
            {children}
          </div>
        </div>
      </div>
    </AdminProtectedRoute>
  );
}
