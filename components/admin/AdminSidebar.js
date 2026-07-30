import Link from "next/link";
import { useRouter } from "next/router";
import {
  FiBox,
  FiChevronLeft,
  FiGrid,
  FiHome,
  FiImage,
  FiLayers,
  FiLogOut,
  FiMessageSquare,
  FiPackage,
  FiPercent,
  FiSettings,
  FiShoppingBag,
  FiStar,
  FiTruck,
  FiUsers,
  FiX,
} from "react-icons/fi";
import styles from "@/styles/admin.module.css";
const groups = [
  ["Overview", [["/admin", FiGrid, "Dashboard"]]],
  ["Catalogue", [
    ["/admin/products", FiPackage, "Products"],
    ["/admin/categories", FiLayers, "Categories"],
    ["/admin/brands", FiBox, "Brands"],
    ["/admin/inventory", FiShoppingBag, "Inventory"],
  ]],
  ["Commerce", [
    ["/admin/orders", FiTruck, "Orders"],
    ["/admin/customers", FiUsers, "Customers"],
    ["/admin/reviews", FiStar, "Reviews"],
  ]],
  ["Store", [
    ["/admin/coupons", FiPercent, "Coupons"],
    ["/admin/banners", FiImage, "Banners"],
    ["/admin/enquiries", FiMessageSquare, "Enquiries"],
    ["/admin/delivery-settings", FiTruck, "Delivery Settings"],
    ["/admin/settings", FiSettings, "Settings"],
  ]],
];
export default function AdminSidebar({
  user,
  open,
  collapsed,
  onClose,
  onCollapse,
  onLogout,
}) {
  const router = useRouter();
  return (
    <>
      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ""}`}>
        <div className={styles.brand}>
          <strong>THE CELLPHONE</strong>
          <span>STUDIO ADMIN</span>
          <button onClick={onClose} aria-label="Close admin menu">
            <FiX />
          </button>
        </div>
        <button
          className={styles.collapseButton}
          onClick={onCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <FiChevronLeft />
        </button>
        <nav aria-label="Admin navigation">
          {groups.map(([group, links]) => (
            <div className={styles.navGroup} key={group}>
              <small>{group}</small>
              {links.map(([href, Icon, label]) => (
                <Link
                  className={
                    router.pathname === href ||
                    (href !== "/admin" && router.pathname.startsWith(`${href}/`))
                      ? styles.active
                      : ""
                  }
                  href={href}
                  onClick={onClose}
                  title={collapsed ? label : undefined}
                  key={href}
                >
                  <Icon />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className={styles.adminUser}>
          <span>
            {user?.name
              ?.split(/\s+/)
              .map((x) => x[0])
              .slice(0, 2)
              .join("") || "A"}
          </span>
          <div>
            <strong>{user?.name}</strong>
            <small>{user?.phone || user?.email}</small>
          </div>
        </div>
        <Link className={styles.storeLink} href="/">
          <FiHome />
          <span>Back to Store</span>
        </Link>
        <button className={styles.logout} onClick={onLogout}>
          <FiLogOut />
          <span>Logout</span>
        </button>
      </aside>
      {open && (
        <button
          className={styles.overlay}
          onClick={onClose}
          aria-label="Close admin menu"
        />
      )}
    </>
  );
}
