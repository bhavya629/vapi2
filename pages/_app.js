import "@/styles/globals.css";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/context/AuthContext";
import { useAuth } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <RoleAwareApp Component={Component} pageProps={pageProps} />
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}

function RoleAwareApp({ Component, pageProps }) {
  const router = useRouter();
  const { user, loading, isAdmin } = useAuth();
  const currentPath = (router.asPath || router.pathname).split(/[?#]/)[0];
  const isAdminRoute =
    currentPath === "/admin" || currentPath.startsWith("/admin/");

  useEffect(() => {
    if (
      !loading &&
      isAdmin &&
      (currentPath === "/login" || currentPath === "/")
    ) {
      router.replace("/admin");
    }
  }, [currentPath, isAdmin, loading, router]);

  const correctingAdminRoute =
    !loading &&
    user?.role === "ADMIN" &&
    (currentPath === "/login" || currentPath === "/");

  return (
    <>
      {!isAdminRoute && !correctingAdminRoute && <Navbar />}
      {!correctingAdminRoute && <Component {...pageProps} />}
      <Toaster />
    </>
  );
}
