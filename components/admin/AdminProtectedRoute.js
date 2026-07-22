import { useRouter } from "next/router";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import styles from "@/styles/admin.module.css";
export default function AdminProtectedRoute({ children }) {
  const router = useRouter();
  const { loading, isAuthenticated, isAdmin } = useAuth();
  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace("/login");
    else if (!loading && !isAdmin) router.replace("/");
  }, [loading, isAuthenticated, isAdmin, router]);
  if (loading || !isAuthenticated || !isAdmin)
    return (
      <main className={styles.guard} aria-live="polite">
        <div />
        <h1>
          {loading ? "Checking administrator access..." : "Redirecting..."}
        </h1>
      </main>
    );
  return children;
}
