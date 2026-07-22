import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import toast from "react-hot-toast";
import { FiHeart, FiMenu, FiShoppingCart, FiX } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";

const navigationLinks = [
  { label: "Home", href: "/" },
  { label: "Smartphones", href: "/smartphones" },
  { label: "Accessories", href: "/accessories" },
  { label: "Gallery", href: "/gallery" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function Navbar() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = () => setDrawerOpen(false);

  const isNavigationLinkActive = (href) =>
    href === "/accessories"
      ? router.asPath === "/accessories" || router.asPath.startsWith("/accessory/")
      : router.asPath === href;

  const handleLogout = async () => {
    try {
      await logout();
      closeDrawer();
      await router.push("/");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to log out");
    }
  };

  return (
    <header className="site-header">
      <nav className="navbar" aria-label="Main navigation">
        <Link className="navbar-brand" href="/" aria-label="The Cellphone Studio home">
          <Image
            src="/images/logo.png"
            alt="The Cellphone Studio"
            width={180}
            height={90}
            priority
            unoptimized
            className="navbar-logo"
          />
        </Link>

        <div className="desktop-menu">
          {navigationLinks.map((link) => (
            <Link
              className={isNavigationLinkActive(link.href) ? "active" : ""}
              href={link.href}
              key={link.label}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {!loading && (
          <div className="desktop-auth">
            {user ? (
              <>
                <span className="navbar-greeting">Hello, {user.name}</span>
                <Link className={router.asPath === "/account" ? "account-link-active" : ""} href="/account">Account</Link>
                <Link className={router.asPath === "/orders" ? "account-link-active" : ""} href="/orders">Orders</Link>
                <Link className={`navbar-icon-link wishlist-link${router.asPath === "/wishlist" ? " wishlist-active" : ""}`} href="/wishlist" aria-label={`Wishlist with ${wishlistCount} ${wishlistCount === 1 ? "item" : "items"}`}>
                  <FiHeart />
                  {wishlistCount > 0 && <span className="navbar-wishlist-count">{wishlistCount > 99 ? "99+" : wishlistCount}</span>}
                </Link>
                <Link className="navbar-icon-link cart-link" href="/cart" aria-label={`Shopping cart with ${cartCount} ${cartCount === 1 ? "item" : "items"}`}>
                  <FiShoppingCart />
                  {cartCount > 0 && <span className="navbar-cart-count">{cartCount > 99 ? "99+" : cartCount}</span>}
                </Link>
                <button className="navbar-button" type="button" onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link className={`navbar-icon-link wishlist-link${router.asPath === "/wishlist" ? " wishlist-active" : ""}`} href="/wishlist" aria-label={`Wishlist with ${wishlistCount} ${wishlistCount === 1 ? "item" : "items"}`}>
                  <FiHeart />
                  {wishlistCount > 0 && <span className="navbar-wishlist-count">{wishlistCount > 99 ? "99+" : wishlistCount}</span>}
                </Link>
                <Link className="auth-button auth-button-primary" href="/login">
                  Login
                </Link>
                <Link className="auth-button auth-button-outline" href="/signup">
                  Signup
                </Link>
              </>
            )}
          </div>
        )}

        <button
          className={`menu-toggle${drawerOpen ? " open" : ""}`}
          type="button"
          onClick={() => setDrawerOpen((open) => !open)}
          aria-label={drawerOpen ? "Close menu" : "Open menu"}
          aria-expanded={drawerOpen}
          aria-controls="mobile-navigation"
        >
          {drawerOpen ? <FiX /> : <FiMenu />}
        </button>
      </nav>

      <button
        className={`drawer-overlay${drawerOpen ? " open" : ""}`}
        type="button"
        onClick={closeDrawer}
        aria-label="Close menu"
        tabIndex={drawerOpen ? 0 : -1}
      />

      <aside
        className={`mobile-drawer${drawerOpen ? " open" : ""}`}
        id="mobile-navigation"
        aria-hidden={!drawerOpen}
      >
        <div className="drawer-heading">
          <span>Menu</span>
          <button type="button" onClick={closeDrawer} aria-label="Close menu">
            <FiX />
          </button>
        </div>

        <div className="drawer-navigation">
          {navigationLinks.map((link) => (
            <Link href={link.href} key={link.label} onClick={closeDrawer}>
              {link.label}
            </Link>
          ))}
        </div>

        {!loading && (
          <div className="drawer-auth">
            {user ? (
              <>
                <span className="navbar-greeting">Hello, {user.name}</span>
                <Link className={router.asPath === "/account" ? "account-link-active" : ""} href="/account" onClick={closeDrawer}>Account</Link>
                <Link className={router.asPath === "/orders" ? "account-link-active" : ""} href="/orders" onClick={closeDrawer}>Orders</Link>
                <Link href="/wishlist" onClick={closeDrawer} aria-label={`Wishlist with ${wishlistCount} ${wishlistCount === 1 ? "item" : "items"}`}>
                  <FiHeart /> Wishlist {wishlistCount > 0 && <span className="drawer-wishlist-count">{wishlistCount > 99 ? "99+" : wishlistCount}</span>}
                </Link>
                <Link href="/cart" onClick={closeDrawer} aria-label={`Shopping cart with ${cartCount} ${cartCount === 1 ? "item" : "items"}`}>
                  <FiShoppingCart /> Cart {cartCount > 0 && <span className="drawer-cart-count">{cartCount > 99 ? "99+" : cartCount}</span>}
                </Link>
                <button className="navbar-button" type="button" onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/wishlist" onClick={closeDrawer} aria-label={`Wishlist with ${wishlistCount} ${wishlistCount === 1 ? "item" : "items"}`}>
                  <FiHeart /> Wishlist {wishlistCount > 0 && <span className="drawer-wishlist-count">{wishlistCount > 99 ? "99+" : wishlistCount}</span>}
                </Link>
                <Link className="auth-button auth-button-primary" href="/login" onClick={closeDrawer}>
                  Login
                </Link>
                <Link className="auth-button auth-button-outline" href="/signup" onClick={closeDrawer}>
                  Signup
                </Link>
              </>
            )}
          </div>
        )}
      </aside>
    </header>
  );
}
