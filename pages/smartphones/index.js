import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiHeart,
  FiSearch,
  FiShoppingCart,
  FiStar,
} from "react-icons/fi";
import Footer from "@/components/layout/Footer";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useBrands, useProducts } from "@/hooks/useCatalogue";
import styles from "@/styles/smartphones.module.css";

const sortMap = {
  featured: "featured",
  "price-low": "price-asc",
  "price-high": "price-desc",
  newest: "newest",
  "best-selling": "featured",
};

export default function SmartphonesPage() {
  const { addToCart: addCartItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [query, setQuery] = useState(""),
    [activeBrand, setActiveBrand] = useState("all"),
    [sort, setSort] = useState("featured"),
    [page, setPage] = useState(1),
    [added, setAdded] = useState([]);
  const filters = useMemo(
    () => ({
      type: "SMARTPHONE",
      search: query.trim(),
      brand: activeBrand,
      sort: sortMap[sort],
      page,
      limit: 16,
    }),
    [activeBrand, page, query, sort],
  );
  const { products, pagination, loading, error, retry } = useProducts(filters);
  const { brands } = useBrands("SMARTPHONE");
  const currentPage = pagination.page || page,
    totalPages = pagination.totalPages || 0;
  const chooseBrand = (slug) => {
    setActiveBrand((current) => (current === slug ? "all" : slug));
    setPage(1);
  };
  const addToCart = (product) => {
    if (!product.inStock) return;
    addCartItem(product, "smartphone");
    setAdded((items) => [...new Set([...items, product.id])]);
    window.setTimeout(
      () => setAdded((items) => items.filter((id) => id !== product.id)),
      1500,
    );
  };
  return (
    <>
      <Head>
        <title>Smartphones | The Cellphone Studio</title>
        <meta
          name="description"
          content="Explore genuine smartphones from leading brands at The Cellphone Studio."
        />
      </Head>
      <main className={styles.page}>
        <section className={styles.hero} aria-labelledby="smartphones-heading">
          <div className={`${styles.container} ${styles.heroInner}`}>
            <div className={styles.heroCopy}>
              <p>Smartphones</p>
              <h1 id="smartphones-heading">Find Your Perfect Smartphone</h1>
              <span>
                Explore genuine smartphones from leading brands with official
                warranty, easy EMI, and trusted local service.
              </span>
            </div>
            <div className={styles.heroPhones} aria-hidden="true">
              <div className={styles.heroPhoneBack}>
                <span />
              </div>
              <div className={styles.heroPhoneFront}>
                <span />
              </div>
            </div>
          </div>
        </section>
        <section
          className={`${styles.container} ${styles.brandsSection}`}
          aria-labelledby="brands-heading"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p>Shop by brand</p>
              <h2 id="brands-heading">Featured Brands</h2>
            </div>
          </div>
          <div className={styles.brandGrid}>
            {brands.map((brand) => {
              const active = activeBrand === brand.slug;
              return (
                <button
                  className={`${styles.brandCard} ${active ? styles.brandActive : ""}`}
                  type="button"
                  onClick={() => chooseBrand(brand.slug)}
                  aria-pressed={active}
                  key={brand.id}
                >
                  {active && (
                    <span className={styles.brandCheck}>
                      <FiCheck />
                    </span>
                  )}
                  <span className={styles.brandLogo}>
                    {brand.logoUrl ? (
                      <Image
                        src={brand.logoUrl}
                        alt=""
                        width={120}
                        height={54}
                      />
                    ) : (
                      brand.name
                    )}
                  </span>
                  <strong>{brand.name}</strong>
                  <small>{brand.productCount} products</small>
                </button>
              );
            })}
          </div>
        </section>
        <section
          className={`${styles.container} ${styles.catalog}`}
          aria-labelledby="products-heading"
        >
          <div className={styles.toolbar}>
            <div>
              <label className={styles.search}>
                <span className={styles.srOnly}>Search smartphones</span>
                <FiSearch aria-hidden="true" />
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search smartphones..."
                  type="search"
                />
              </label>
              <p aria-live="polite">
                {loading
                  ? "Loading products..."
                  : `${pagination.total || 0} products found`}
              </p>
            </div>
            <label className={styles.sort}>
              Sort by{" "}
              <select
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value);
                  setPage(1);
                }}
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">Newest</option>
                <option value="best-selling">Best Selling</option>
              </select>
            </label>
          </div>
          <h2 className={styles.srOnly} id="products-heading">
            Smartphone products
          </h2>
          {error ? (
            <CatalogueMessage
              title="We could not load smartphones"
              text={error}
              action="Try Again"
              onClick={retry}
            />
          ) : loading ? (
            <CatalogueMessage
              title="Loading smartphones..."
              text="Please wait while we retrieve the latest catalogue."
            />
          ) : products.length ? (
            <div className={styles.productGrid}>
              {products.map((product) => {
                const wished = isInWishlist(product.id, "smartphone"),
                  isAdded = added.includes(product.id);
                return (
                  <article className={styles.productCard} key={product.id}>
                    <Link
                      className={styles.productLink}
                      href={product.route}
                      aria-label={`View ${product.name} details`}
                    >
                      <div
                        className={`${styles.productVisual} ${styles[`visual${product.visual}`]}`}
                      >
                        <span className={styles.discount}>
                          {product.inStock
                            ? `${product.discount}% OFF`
                            : "OUT OF STOCK"}
                        </span>
                        {product.imageUrl &&
                        product.imageUrl !== "/images/product-placeholder.svg" ? (
                          <Image
                            className={styles.productImage}
                            src={product.imageUrl}
                            alt={product.name}
                            width={420}
                            height={420}
                            unoptimized
                          />
                        ) : (
                          <div
                            className={styles.phonePlaceholder}
                            role="img"
                            aria-label={`${product.name} image placeholder`}
                          >
                            <span />
                          </div>
                        )}
                      </div>
                      <div className={styles.productInfo}>
                        <p className={styles.productBrand}>{product.brand}</p>
                        <h3>{product.name}</h3>
                        <p className={styles.specs}>
                          {product.ram || "—"} RAM · {product.storage || "—"}{" "}
                          Storage
                        </p>
                        <div className={styles.rating}>
                          <FiStar />
                          <strong>{product.rating || "—"}</strong>
                          <span>({product.reviewCount})</span>
                        </div>
                        <div className={styles.prices}>
                          <strong>
                            ₹{product.price.toLocaleString("en-IN")}
                          </strong>
                          {product.oldPrice && (
                            <del>
                              ₹{product.oldPrice.toLocaleString("en-IN")}
                            </del>
                          )}
                        </div>
                        <p className={styles.emi}>
                          EMI from ₹
                          {Math.ceil(product.price / 12).toLocaleString(
                            "en-IN",
                          )}
                          /month
                        </p>
                      </div>
                    </Link>
                    <button
                      className={`${styles.wishlist} ${wished ? styles.wished : ""}`}
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        toggleWishlist(product, "smartphone");
                      }}
                      aria-label={`${wished ? "Remove" : "Add"} ${product.name} ${wished ? "from" : "to"} wishlist`}
                      aria-pressed={wished}
                    >
                      <FiHeart />
                    </button>
                    <button
                      className={`${styles.cartButton} ${isAdded ? styles.added : ""}`}
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        addToCart(product);
                      }}
                      disabled={isAdded || !product.inStock}
                    >
                      <FiShoppingCart />{" "}
                      {!product.inStock
                        ? "Out of Stock"
                        : isAdded
                          ? "Added"
                          : "Add to Cart"}
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <CatalogueMessage
              title="No smartphones found"
              text="Try another search or brand."
              action="View all smartphones"
              onClick={() => {
                setQuery("");
                setActiveBrand("all");
              }}
            />
          )}
          {!loading && !error && products.length > 0 && (
            <nav className={styles.pagination} aria-label="Product pages">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={currentPage === 1}
              >
                <FiChevronLeft /> Previous
              </button>
              {Array.from(
                { length: Math.min(3, totalPages) },
                (_, index) => index + 1,
              ).map((number) => (
                <button
                  className={currentPage === number ? styles.currentPage : ""}
                  type="button"
                  onClick={() => setPage(number)}
                  aria-current={currentPage === number ? "page" : undefined}
                  aria-label={`Page ${number}`}
                  key={number}
                >
                  {number}
                </button>
              ))}
              <button
                type="button"
                onClick={() =>
                  setPage((value) => Math.min(totalPages, value + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next <FiChevronRight />
              </button>
            </nav>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

function CatalogueMessage({ title, text, action, onClick }) {
  return (
    <div className={styles.empty} role="status">
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <button type="button" onClick={onClick}>
          {action}
        </button>
      )}
    </div>
  );
}
