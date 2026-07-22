import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  FiBox,
  FiChevronRight,
  FiEdit3,
  FiEye,
  FiEyeOff,
  FiHeadphones,
  FiHeart,
  FiHome,
  FiLock,
  FiLogOut,
  FiMapPin,
  FiPhone,
  FiSave,
  FiShield,
  FiShoppingCart,
  FiStar,
  FiUser,
  FiX,
} from "react-icons/fi";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import styles from "@/styles/account.module.css";
import AddressManager from "@/components/account/AddressManager";
import AccountSecurityActivity from "@/components/account/AccountSecurityActivity";

const profileErrors = (values) => {
  const errors = {};
  if (values.name.trim().length < 2 || values.name.trim().length > 80)
    errors.name = "Full name must be between 2 and 80 characters.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
    errors.email = "Enter a valid email address.";
  const phone = values.phone
    .trim()
    .replace(/^(\+91|91)/, "")
    .replace(/\D/g, "");
  if (values.phone.trim() && !/^[6-9]\d{9}$/.test(phone))
    errors.phone = "Enter a valid 10-digit Indian mobile number.";
  return errors;
};

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, logout, refreshUser } = useAuth();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    if (user)
      fetch("/api/account/profile")
        .then((r) => r.json())
        .then((body) => setProfile(body.data?.profile || null))
        .catch(() => {});
  }, [user?.id]);
  useEffect(() => {
    if (!loading && !user) router.replace("/login?redirect=/account");
  }, [loading, router, user]);
  if (loading || !user)
    return (
      <>
        <Meta />
        <AccountSkeleton redirecting={!loading} />
        <Footer />
      </>
    );

  const firstName = user.name?.trim().split(/\s+/)[0];
  const initials =
    user.name
      ?.trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "CS";
  const memberSince = user.createdAt
    ? new Intl.DateTimeFormat("en-IN", {
        month: "long",
        year: "numeric",
      }).format(new Date(user.createdAt))
    : null;
  const confirmLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully.");
      await router.push("/");
    } catch {
      toast.error("Unable to log out. Please try again.");
    }
  };
  return (
    <>
      <Meta />
      <main className={styles.page}>
        <section className={styles.hero} aria-labelledby="account-title">
          <div className={styles.container}>
            <div>
              <p>MY ACCOUNT</p>
              <h1 id="account-title">
                Welcome Back{firstName ? `, ${firstName}` : ""}
              </h1>
              <span>
                Manage your profile, addresses, orders, wishlist, and account
                security from one place.
              </span>
            </div>
            <FiUser aria-hidden="true" />
          </div>
        </section>

        <section
          className={`${styles.container} ${styles.overview}`}
          id="overview"
          aria-label="Account overview"
        >
          <SummaryCard
            icon={FiBox}
            value={profile?.counts?.orders ?? 0}
            title="Orders"
            action="View Orders"
            href="/orders"
          />
          <SummaryCard
            icon={FiHeart}
            value={profile?.counts?.wishlistItems ?? wishlistCount}
            title="Wishlist"
            action="View Wishlist"
            href="/wishlist"
          />
          <SummaryCard
            icon={FiShoppingCart}
            value={cartCount}
            title="Cart"
            action="View Cart"
            href="/cart"
          />
          <SummaryCard
            icon={FiMapPin}
            value={profile?.counts?.savedAddresses ?? 0}
            title="Saved Addresses"
            action="Manage Addresses"
            href="#addresses"
          />
        </section>

        <section className={`${styles.container} ${styles.dashboard}`}>
          <aside className={styles.sidebar}>
            <div className={styles.identity}>
              <span>{initials}</span>
              <h2>{user.name || "Customer"}</h2>
              <p>{user.email}</p>
              <small>
                {user.role === "ADMIN" ? "Administrator" : "Customer"}
              </small>
            </div>
            <nav aria-label="Account sections">
              <a href="#overview">
                <FiHome /> Overview
              </a>
              <a href="#profile">
                <FiUser /> Personal Information
              </a>
              <a href="#addresses">
                <FiMapPin /> Saved Addresses
              </a>
              <a href="#security">
                <FiShield /> Security
              </a>
              <Link href="/account/enquiries">
                <FiHeadphones /> My Enquiries
              </Link>
              <Link href="/account/reviews">
                <FiStar /> My Reviews
              </Link>
              <Link href="/orders">
                <FiBox /> My Orders
              </Link>
              <Link href="/wishlist">
                <FiHeart /> Wishlist
              </Link>
              <Link href="/cart">
                <FiShoppingCart /> Cart
              </Link>
              <button type="button" onClick={() => setLogoutOpen(true)}>
                <FiLogOut /> Logout
              </button>
            </nav>
            <div className={styles.accountMeta}>
              <strong>Account Details</strong>
              {memberSince && (
                <span>
                  Member Since <b>{memberSince}</b>
                </span>
              )}
              <span>
                Account Type{" "}
                <b>{user.role === "ADMIN" ? "Administrator" : "Customer"}</b>
              </span>
            </div>
          </aside>

          <div className={styles.content}>
            <ProfileSection
              user={profile || user}
              refreshUser={refreshUser}
              router={router}
            />
            <AddressManager styles={styles} />
            <SecuritySection router={router} />
            <AccountSecurityActivity />
            <section className={styles.panel} aria-labelledby="quick-title">
              <Header
                label="ACCOUNT ACTIVITY"
                title="Quick Actions"
                icon={FiChevronRight}
              />
              <div className={styles.quickGrid}>
                <Quick
                  icon={FiHeadphones}
                  title="My Enquiries"
                  text="Track your support conversations and replies."
                  href="/account/enquiries"
                />
                <Quick
                  icon={FiStar}
                  title="My Reviews"
                  text="View and manage your verified-purchase reviews."
                  href="/account/reviews"
                />
                <Quick
                  icon={FiBox}
                  title="My Orders"
                  text="Review your previous and active orders."
                  href="/orders"
                />
                <Quick
                  icon={FiHeart}
                  title="Wishlist"
                  text="View smartphones and accessories you saved."
                  href="/wishlist"
                />
                <Quick
                  icon={FiShoppingCart}
                  title="Shopping Cart"
                  text="Review products waiting in your cart."
                  href="/cart"
                />
                <Quick
                  icon={FiHeadphones}
                  title="Contact Support"
                  text="Get help from The Cellphone Studio team."
                  href="/contact"
                />
              </div>
            </section>
          </div>
        </section>

        <section
          className={`${styles.container} ${styles.support}`}
          aria-labelledby="support-title"
        >
          <div>
            <p>WE ARE HERE TO HELP</p>
            <h2 id="support-title">Account Support</h2>
          </div>
          <div className={styles.supportGrid}>
            <Support
              title="Need Help With Your Account?"
              text="Contact our team for help with your profile, addresses, orders, or account access."
              href="/contact"
              action="Contact Us"
            />
            <Support
              title="Call The Store"
              text="Speak directly with our friendly Vapi store team."
              href="tel:+919377998836"
              action="+91 93779 98836"
            />
            <Support
              title="WhatsApp Support"
              text="Message us for quick help with your customer account."
              href="https://wa.me/919377998836?text=Hello%20The%20Cellphone%20Studio%2C%20I%20need%20help%20with%20my%20account."
              action="Chat on WhatsApp"
              external
            />
          </div>
        </section>
        <section className={`${styles.container} ${styles.logoutArea}`}>
          <div>
            <h2>Sign Out</h2>
            <p>Sign out securely from your customer account on this device.</p>
          </div>
          <button type="button" onClick={() => setLogoutOpen(true)}>
            <FiLogOut /> Logout
          </button>
        </section>
      </main>
      <Footer />
      {logoutOpen && (
        <LogoutModal
          onCancel={() => setLogoutOpen(false)}
          onConfirm={confirmLogout}
        />
      )}
    </>
  );
}

function ProfileSection({ user, refreshUser, router }) {
  const original = {
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
  };
  const [values, setValues] = useState(original),
    [editing, setEditing] = useState(false),
    [errors, setErrors] = useState({}),
    [saving, setSaving] = useState(false);
  const refs = { name: useRef(null), email: useRef(null), phone: useRef(null) };
  useEffect(() => {
    if (!editing) setValues(original);
  }, [user.name, user.email, user.phone, editing]);
  const save = async (event) => {
    event.preventDefault();
    const nextErrors = profileErrors(values);
    setErrors(nextErrors);
    const first = ["name", "email", "phone"].find((field) => nextErrors[field]);
    if (first) return refs[first].current?.focus();
    setSaving(true);
    try {
      const response = await axios.patch("/api/account/profile", {
        name: values.name,
        phone: values.phone,
      });
      setValues({
        name: response.data.user.name,
        email: response.data.user.email,
        phone: response.data.user.phone || "",
      });
      await refreshUser();
      setEditing(false);
      toast.success("Profile updated successfully.");
    } catch (error) {
      if (error.response?.status === 401) {
        await router.replace("/login?redirect=/account");
        return;
      }
      const field = error.response?.data?.field;
      if (field) {
        setErrors({ [field]: error.response.data.message });
        setTimeout(() => refs[field]?.current?.focus(), 0);
      } else
        toast.error(
          error.response?.data?.message || "Unable to update your profile.",
        );
    } finally {
      setSaving(false);
    }
  };
  const cancel = () => {
    setValues(original);
    setErrors({});
    setEditing(false);
  };
  return (
    <section
      className={styles.panel}
      id="profile"
      aria-labelledby="profile-title"
    >
      <Header
        label="PROFILE DETAILS"
        title="Personal Information"
        icon={FiUser}
      />
      <form onSubmit={save} noValidate>
        <div className={styles.formGrid}>
          {[
            ["name", "Full Name", "text", "name"],
            ["email", "Email Address", "email", "email"],
            ["phone", "Phone Number", "tel", "tel"],
          ].map(([field, label, type, auto]) => (
            <label key={field}>
              {label}
              <input
                ref={refs[field]}
                value={values[field]}
                type={type}
                autoComplete={auto}
                disabled={!editing || field === "email"}
                aria-invalid={Boolean(errors[field])}
                aria-describedby={errors[field] ? `${field}-error` : undefined}
                onChange={(e) =>
                  setValues((current) => ({
                    ...current,
                    [field]: e.target.value,
                  }))
                }
              />
              {errors[field] && (
                <span id={`${field}-error`} role="alert">
                  {errors[field]}
                </span>
              )}
            </label>
          ))}
        </div>
        <div className={styles.formActions}>
          {editing ? (
            <>
              <button
                className={styles.primaryButton}
                disabled={saving}
                type="submit"
              >
                <FiSave /> {saving ? "Saving Changes..." : "Save Changes"}
              </button>
              <button
                className={styles.secondaryButton}
                disabled={saving}
                type="button"
                onClick={cancel}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={() => setEditing(true)}
            >
              <FiEdit3 /> Edit Profile
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

function SecuritySection({ router }) {
  const [open, setOpen] = useState(false),
    [visible, setVisible] = useState({}),
    [values, setValues] = useState({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }),
    [errors, setErrors] = useState({}),
    [saving, setSaving] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    const e = {};
    if (!values.currentPassword)
      e.currentPassword = "Enter your current password.";
    if (
      values.newPassword.length < 10 ||
      !/[A-Z]/.test(values.newPassword) ||
      !/[a-z]/.test(values.newPassword) ||
      !/\d/.test(values.newPassword) ||
      !/[\W_]/.test(values.newPassword)
    )
      e.newPassword =
        "Use 10+ characters with uppercase, lowercase, a number, and a symbol.";
    if (values.confirmPassword !== values.newPassword)
      e.confirmPassword = "Passwords do not match.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await axios.post("/api/account/change-password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });
      toast.success(
        "Your password was changed and other sessions were signed out.",
      );
      setValues({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setOpen(false);
    } catch (error) {
      if (error.response?.status === 401)
        return router.replace("/login?redirect=/account");
      const field = error.response?.data?.field;
      if (field) setErrors({ [field]: error.response.data.message });
      else
        toast.error(
          error.response?.data?.message || "Unable to change your password.",
        );
    } finally {
      setSaving(false);
    }
  };
  return (
    <section
      className={styles.panel}
      id="security"
      aria-labelledby="security-title"
    >
      <Header
        label="ACCOUNT SECURITY"
        title="Password & Security"
        icon={FiShield}
      />
      <div className={styles.securityStatus}>
        <FiLock />
        <div>
          <strong>Password protected</strong>
          <p>Your account uses secure password authentication.</p>
        </div>
        <button
          className={styles.secondaryButton}
          type="button"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Cancel" : "Change Password"}
        </button>
      </div>
      {open && (
        <form className={styles.passwordForm} onSubmit={submit} noValidate>
          {[
            ["currentPassword", "Current Password", "current-password"],
            ["newPassword", "New Password", "new-password"],
            ["confirmPassword", "Confirm New Password", "new-password"],
          ].map(([field, label, auto]) => (
            <label key={field}>
              {label}
              <div className={styles.passwordInput}>
                <input
                  value={values[field]}
                  type={visible[field] ? "text" : "password"}
                  autoComplete={auto}
                  aria-invalid={Boolean(errors[field])}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [field]: e.target.value }))
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    setVisible((v) => ({ ...v, [field]: !v[field] }))
                  }
                  aria-label={`${visible[field] ? "Hide" : "Show"} ${label.toLowerCase()}`}
                >
                  {visible[field] ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {errors[field] && <span role="alert">{errors[field]}</span>}
            </label>
          ))}
          <button className={styles.primaryButton} disabled={saving}>
            {saving ? "Changing Password..." : "Change Password"}
          </button>
        </form>
      )}
    </section>
  );
}

function Header({ label, title, icon: Icon }) {
  return (
    <div className={styles.sectionHeader}>
      <span>
        <Icon />
      </span>
      <div>
        <p>{label}</p>
        <h2 id={`${title.toLowerCase().replaceAll(" ", "-")}-title`}>
          {title}
        </h2>
      </div>
    </div>
  );
}
function SummaryCard({ icon: Icon, value, title, action, href }) {
  return (
    <article className={styles.summary}>
      <span>
        <Icon />
      </span>
      <div>
        <strong>{value}</strong>
        <h2>{title}</h2>
      </div>
      <Link href={href}>
        {action} <FiChevronRight />
      </Link>
    </article>
  );
}
function Quick({ icon: Icon, title, text, href }) {
  return (
    <Link className={styles.quick} href={href}>
      <span>
        <Icon />
      </span>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      <FiChevronRight />
    </Link>
  );
}
function Support({ title, text, href, action, external }) {
  return (
    <article>
      <FiHeadphones />
      <h3>{title}</h3>
      <p>{text}</p>
      <Link
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
      >
        {action}
      </Link>
    </article>
  );
}
function LogoutModal({ onCancel, onConfirm }) {
  const cancelRef = useRef(null);
  useEffect(() => {
    const key = (e) => e.key === "Escape" && onCancel();
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", key);
    };
  }, [onCancel]);
  return (
    <div
      className={styles.modalBackdrop}
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onCancel()}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-title"
      >
        <button
          className={styles.modalClose}
          onClick={onCancel}
          aria-label="Close sign out dialog"
        >
          <FiX />
        </button>
        <span>
          <FiLogOut />
        </span>
        <h2 id="logout-title">Sign Out of Your Account?</h2>
        <p>You will need to log in again to access your account and orders.</p>
        <div>
          <button
            ref={cancelRef}
            className={styles.secondaryButton}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button className={styles.dangerButton} onClick={onConfirm}>
            Logout
          </button>
        </div>
      </section>
    </div>
  );
}
function AccountSkeleton({ redirecting }) {
  return (
    <main className={styles.loading} aria-live="polite">
      <div className={styles.skeletonHero} />
      <div className={styles.skeletonGrid}>
        {[1, 2, 3, 4].map((item) => (
          <i key={item} />
        ))}
      </div>
      <div className={styles.skeletonBody}>
        <i />
        <i />
      </div>
      <h1>
        {redirecting ? "Redirecting to login..." : "Loading your account..."}
      </h1>
    </main>
  );
}
function Meta() {
  return (
    <Head>
      <title>My Account | The Cellphone Studio</title>
      <meta
        name="description"
        content="Manage your profile, addresses, orders, wishlist, and customer account at The Cellphone Studio, Vapi."
      />
      <meta name="robots" content="noindex,nofollow" />
    </Head>
  );
}
