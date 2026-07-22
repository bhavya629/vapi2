import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  FiBatteryCharging,
  FiCheck,
  FiChevronRight,
  FiCreditCard,
  FiHeart,
  FiHeadphones,
  FiMapPin,
  FiMinus,
  FiMusic,
  FiPlus,
  FiRefreshCw,
  FiShare2,
  FiShield,
  FiShoppingCart,
  FiSmartphone,
  FiStar,
  FiZap,
} from "react-icons/fi";
import Footer from "@/components/layout/Footer";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useProduct, useProducts } from "@/hooks/useCatalogue";
import styles from "@/styles/accessory-details.module.css";
import ProductReviews from "@/components/reviews/ProductReviews";

const tabs = [
  "Description",
  "Specifications",
  "Warranty",
  "Shipping",
  "Reviews",
];
const icons = {
  "Smart Watch": FiSmartphone,
  Earbuds: FiHeadphones,
  "Power Bank": FiBatteryCharging,
  Charger: FiZap,
  Cable: FiZap,
  "Mobile Cover": FiSmartphone,
  "Tempered Glass": FiShield,
  "Bluetooth Speaker": FiMusic,
};
const optionSets = {
  "Smart Watch": [
    ["Strap Color", ["Midnight", "Silver", "Blue"]],
    ["Dial Size", ["42mm", "46mm"]],
  ],
  Earbuds: [["Color", ["White", "Black", "Blue"]]],
  "Power Bank": [
    ["Capacity", ["10,000mAh", "20,000mAh"]],
    ["Color", ["Black", "Blue"]],
  ],
  Charger: [
    ["Wattage", ["25W", "45W", "65W"]],
    ["Port Type", ["USB-C", "Dual Port"]],
  ],
  Cable: [
    ["Length", ["1m", "1.5m", "2m"]],
    ["Connector", ["USB-C", "Lightning"]],
  ],
  "Mobile Cover": [
    ["Phone Model", ["iPhone 16", "Galaxy S25", "OnePlus 13"]],
    ["Color", ["Clear", "Black", "Blue"]],
  ],
  "Tempered Glass": [
    ["Compatible Model", ["iPhone 16", "Galaxy S25", "OnePlus 13"]],
  ],
  "Bluetooth Speaker": [["Color", ["Black", "Blue", "Red"]]],
};
const categorySpecs = {
  "Smart Watch": [
    ["Display", "AMOLED always-on"],
    ["Battery", "Up to 48 hours"],
    ["Connectivity", "Bluetooth 5.3, Wi-Fi"],
    ["Water Resistance", "5 ATM"],
  ],
  Earbuds: [
    ["Battery", "Up to 30 hours"],
    ["Connectivity", "Bluetooth 5.4"],
    ["Audio", "Active Noise Cancellation"],
    ["Charging", "USB-C fast charging"],
  ],
  "Power Bank": [
    ["Capacity", "20,000mAh"],
    ["Output", "22.5W fast charging"],
    ["Ports", "2 USB-A, 1 USB-C"],
    ["Safety", "12-layer protection"],
  ],
  Charger: [
    ["Charging Speed", "Up to 65W"],
    ["Ports", "USB-C PD"],
    ["Compatibility", "Android, iPhone, tablets"],
    ["Input", "100–240V"],
  ],
  Cable: [
    ["Material", "Braided nylon"],
    ["Charging", "Up to 100W"],
    ["Data Speed", "480 Mbps"],
    ["Length", "1.5 metres"],
  ],
  "Mobile Cover": [
    ["Material", "Impact-resistant TPU"],
    ["Protection", "Raised camera edges"],
    ["Compatibility", "Model-specific fit"],
    ["Weight", "32 g"],
  ],
  "Tempered Glass": [
    ["Hardness", "9H"],
    ["Material", "Tempered aluminosilicate"],
    ["Coating", "Oleophobic"],
    ["Thickness", "0.33 mm"],
  ],
  "Bluetooth Speaker": [
    ["Battery", "Up to 14 hours"],
    ["Connectivity", "Bluetooth 5.3"],
    ["Output", "30W RMS"],
    ["Water Resistance", "IP67"],
  ],
};
const reviews = [
  [
    "AD",
    "Aditi D.",
    5,
    "Premium quality and exactly as described. Delivery was very quick.",
  ],
  [
    "RM",
    "Rahul M.",
    5,
    "Works perfectly with my phone and feels built to last.",
  ],
  [
    "PK",
    "Priya K.",
    4,
    "Great value and neat packaging. Happy with the purchase.",
  ],
];
const visualNames = ["blue", "violet", "green", "orange"];
const relatedFilters = { type: "ACCESSORY", limit: 8, sort: "featured" };
const formatPrice = (value) => `₹${value.toLocaleString("en-IN")}`;

function AccessoryVisual({ category, variant, compact = false }) {
  const Icon = icons[category] || FiSmartphone;
  return (
    <div
      className={`${styles.visual} ${styles[variant]} ${compact ? styles.compactVisual : ""}`}
    >
      <span />
      <Icon aria-hidden="true" />
    </div>
  );
}

export default function AccessoryDetailsPage() {
  const { addToCart: addCartItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const router = useRouter();
  const {
    product: accessory,
    loading,
    error,
    notFound,
  } = useProduct(router.isReady ? router.query.id : null, "ACCESSORY");
  const { products: relatedCatalogue } = useProducts(relatedFilters);
  const [activeImage, setActiveImage] = useState(0);
  const [selections, setSelections] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [cartLabel, setCartLabel] = useState("Add to Cart");
  const [activeTab, setActiveTab] = useState("Description");
  const [pincode, setPincode] = useState("");
  const [delivery, setDelivery] = useState(false);
  const [sticky, setSticky] = useState(false);

  useEffect(() => {
    const onScroll = () => setSticky(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const addToCart = () => {
    if (!accessory?.inStock) return;
    addCartItem(accessory, "accessory", quantity);
    setCartLabel("Added");
    window.setTimeout(() => setCartLabel("Add to Cart"), 1500);
  };

  if (!router.isReady || loading)
    return (
      <>
        <main className={styles.statePage} aria-live="polite">
          <div className={styles.loader} />
          <h1>Loading accessory...</h1>
        </main>
        <Footer />
      </>
    );
  if (error)
    return (
      <>
        <Head>
          <title>Accessory Unavailable | The Cellphone Studio</title>
        </Head>
        <main className={styles.statePage}>
          <div className={styles.notFound}>!</div>
          <h1>We Could Not Load This Accessory</h1>
          <p>Please try again in a moment.</p>
          <Link href="/accessories">Back to Accessories</Link>
        </main>
        <Footer />
      </>
    );
  if (notFound || !accessory)
    return (
      <>
        <Head>
          <title>Accessory Not Found | The Cellphone Studio</title>
        </Head>
        <main className={styles.statePage}>
          <div className={styles.notFound}>?</div>
          <h1>Accessory Not Found</h1>
          <p>The requested accessory could not be found.</p>
          <Link href="/accessories">Back to Accessories</Link>
        </main>
        <Footer />
      </>
    );

  const sourceCategory =
    accessory.specifications?.sourceCategory || accessory.category;
  const choices = optionSets[sourceCategory] || [
    ["Variant", ["Standard", "Premium"]],
  ];
  const specifications = [
    ...(categorySpecs[sourceCategory] || []),
    ["Weight", "Lightweight design"],
    ["Warranty", "1 year official warranty"],
    ["Dimensions", "Compact and travel-friendly"],
  ];
  const related = [
    ...relatedCatalogue.filter(
      (item) =>
        item.category === accessory.category && item.id !== accessory.id,
    ),
    ...relatedCatalogue.filter(
      (item) =>
        item.category !== accessory.category && item.id !== accessory.id,
    ),
  ].slice(0, 4);
  const variant = visualNames[(accessory.visual + activeImage) % 4];
  const stars = Math.round(accessory.rating);
  const wished = isInWishlist(accessory.id, "accessory");

  return (
    <>
      <Head>
        <title>{accessory.name} | The Cellphone Studio</title>
        <meta
          name="description"
          content={accessory.shortDescription || accessory.description}
        />
        {process.env.NEXT_PUBLIC_SITE_URL && (
          <link
            rel="canonical"
            href={`${process.env.NEXT_PUBLIC_SITE_URL}/accessory/${accessory.slug}`}
          />
        )}
        <meta
          property="og:title"
          content={`${accessory.name} | The Cellphone Studio`}
        />
        <meta
          property="og:description"
          content={accessory.shortDescription || accessory.description}
        />
        {accessory.imageUrl && (
          <meta property="og:image" content={accessory.imageUrl} />
        )}
      </Head>
      <main className={styles.page}>
        <nav
          className={`${styles.container} ${styles.breadcrumb}`}
          aria-label="Breadcrumb"
        >
          <Link href="/">Home</Link>
          <FiChevronRight />
          <Link href="/accessories">Accessories</Link>
          <FiChevronRight />
          <span>{accessory.name}</span>
        </nav>
        <section
          className={`${styles.container} ${styles.productLayout}`}
          aria-labelledby="accessory-title"
        >
          <div className={styles.gallery}>
            <div
              className={styles.mainImage}
              role="img"
              aria-label={`${accessory.name} product view`}
            >
              <AccessoryVisual category={sourceCategory} variant={variant} />
            </div>
            <div className={styles.thumbnails}>
              {[0, 1, 2, 3].map((index) => (
                <button
                  className={activeImage === index ? styles.activeThumb : ""}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={`Show product view ${index + 1}`}
                  aria-pressed={activeImage === index}
                  key={index}
                >
                  <AccessoryVisual
                    category={sourceCategory}
                    variant={visualNames[(accessory.visual + index) % 4]}
                    compact
                  />
                </button>
              ))}
            </div>
          </div>
          <div className={styles.summary}>
            <p className={styles.brand}>{accessory.brand}</p>
            <h1 id="accessory-title">{accessory.name}</h1>
            <p className={styles.category}>{accessory.category}</p>
            <div className={styles.rating}>
              <span aria-label={`${accessory.rating} out of 5 stars`}>
                {"★".repeat(stars)}
                {"☆".repeat(5 - stars)}
              </span>
              <strong>{accessory.rating}</strong>
              <a href="#reviews">({accessory.reviews} Reviews)</a>
            </div>
            <p className={styles.stock}>
              <span />{" "}
              {accessory.inStock
                ? accessory.lowStock
                  ? `Only ${accessory.stock} left`
                  : "In Stock"
                : "Out of Stock"}
            </p>
            <div className={styles.price}>
              <p>
                MRP <del>{formatPrice(accessory.oldPrice)}</del>
              </p>
              <div>
                <strong>{formatPrice(accessory.price)}</strong>
                <span>{accessory.discount}% OFF</span>
              </div>
              <small>Inclusive of all taxes</small>
            </div>
            <p className={styles.emi}>
              <FiCreditCard /> Easy payment from{" "}
              <strong>
                {formatPrice(Math.ceil(accessory.price / 6))}/month
              </strong>
            </p>
            {choices.map(([label, values]) => {
              const selected =
                selections[`${accessory.id}-${label}`] || values[0];
              return (
                <fieldset className={styles.options} key={label}>
                  <legend>
                    {label}: <strong>{selected}</strong>
                  </legend>
                  <div>
                    {values.map((value) => (
                      <button
                        className={selected === value ? styles.selected : ""}
                        type="button"
                        onClick={() =>
                          setSelections((current) => ({
                            ...current,
                            [`${accessory.id}-${label}`]: value,
                          }))
                        }
                        key={value}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </fieldset>
              );
            })}
            <div className={styles.purchase}>
              <div className={styles.quantity}>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  aria-label="Decrease quantity"
                >
                  <FiMinus />
                </button>
                <span>{quantity}</span>
                <button
                  type="button"
                  onClick={() =>
                    setQuantity(
                      Math.min(Math.max(accessory.stock, 1), 5, quantity + 1),
                    )
                  }
                  aria-label="Increase quantity"
                >
                  <FiPlus />
                </button>
              </div>
              <button
                className={styles.addCart}
                type="button"
                onClick={addToCart}
                disabled={!accessory.inStock}
              >
                <FiShoppingCart />{" "}
                {accessory.inStock ? cartLabel : "Out of Stock"}
              </button>
              <button
                className={styles.buyNow}
                type="button"
                disabled={!accessory.inStock}
              >
                Buy Now
              </button>
            </div>
            <div className={styles.secondary}>
              <button
                type="button"
                onClick={() => toggleWishlist(accessory, "accessory")}
                aria-pressed={wished}
                aria-label={`${wished ? "Remove" : "Add"} ${accessory.name} ${wished ? "from" : "to"} wishlist`}
              >
                <FiHeart className={wished ? styles.filled : ""} />{" "}
                {wished ? "Wishlisted" : "Add to Wishlist"}
              </button>
              <button type="button">
                <FiShare2 /> Share
              </button>
            </div>
            <div className={styles.delivery}>
              <h2>
                <FiMapPin /> Check Delivery
              </h2>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  setDelivery(pincode.length === 6);
                }}
              >
                <label className={styles.srOnly} htmlFor="accessory-pincode">
                  Enter pincode
                </label>
                <input
                  id="accessory-pincode"
                  inputMode="numeric"
                  maxLength="6"
                  placeholder="Enter Pincode"
                  value={pincode}
                  onChange={(event) =>
                    setPincode(event.target.value.replace(/\D/g, ""))
                  }
                />
                <button type="submit">Check</button>
              </form>
              {delivery && (
                <p>
                  <FiCheck /> Same Day Delivery Available in Vapi
                </p>
              )}
            </div>
            <div className={styles.benefits}>
              <div>
                <FiShield />
                <span>
                  <strong>Official Warranty</strong>Brand coverage
                </span>
              </div>
              <div>
                <FiCheck />
                <span>
                  <strong>GST Invoice</strong>Available
                </span>
              </div>
              <div>
                <FiCreditCard />
                <span>
                  <strong>Secure Payment</strong>100% protected
                </span>
              </div>
              <div>
                <FiRefreshCw />
                <span>
                  <strong>Easy Replacement</strong>7-day support
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className={`${styles.container} ${styles.details}`}>
          <div
            className={styles.tabs}
            role="tablist"
            aria-label="Accessory information"
          >
            {tabs.map((tab) => (
              <button
                className={activeTab === tab ? styles.activeTab : ""}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                key={tab}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className={styles.panel} role="tabpanel">
            {activeTab === "Description" && (
              <div>
                <h2>Designed to work beautifully</h2>
                <p>
                  The {accessory.name} combines dependable everyday performance
                  with a refined, durable design. It is selected for genuine
                  quality, seamless compatibility and straightforward local
                  support.
                </p>
              </div>
            )}
            {activeTab === "Specifications" && (
              <div>
                <h2>Technical Specifications</h2>
                <dl>
                  {specifications.map(([key, value]) => (
                    <div key={key}>
                      <dt>{key}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            {activeTab === "Warranty" && (
              <div>
                <h2>Official Warranty</h2>
                <p>
                  Includes a one-year brand warranty against manufacturing
                  defects. Retain the original GST invoice for service claims.
                </p>
              </div>
            )}
            {activeTab === "Shipping" && (
              <div>
                <h2>Fast local delivery</h2>
                <p>
                  Eligible Vapi orders receive same-day delivery. Every item is
                  sealed, safely packed and checked before dispatch.
                </p>
              </div>
            )}
            {activeTab === "Reviews" && (
              <p>
                <a href="#reviews">View verified customer reviews below.</a>
              </p>
            )}
          </div>
        </section>

        <section
          className={`${styles.container} ${styles.reviews}`}
          id="reviews"
          aria-labelledby="reviews-title"
        >
          <ProductReviews productId={accessory.id} />
        </section>
        <section
          className={`${styles.container} ${styles.related}`}
          aria-labelledby="related-title"
        >
          <p>You may also like</p>
          <h2 id="related-title">Related Accessories</h2>
          <div>
            {related.map((item) => (
              <article className={styles.relatedCard} key={item.id}>
                <Link
                  href={item.route}
                  aria-label={`View ${item.name} details`}
                >
                  <div className={styles.relatedImage}>
                    <span>
                      {item.inStock ? `${item.discount}% OFF` : "OUT OF STOCK"}
                    </span>
                    <AccessoryVisual
                      category={
                        item.specifications?.sourceCategory || item.category
                      }
                      variant={visualNames[item.visual]}
                      compact
                    />
                  </div>
                  <div className={styles.relatedInfo}>
                    <p>{item.brand}</p>
                    <h3>{item.name}</h3>
                    <div>★ {item.rating}</div>
                    <strong>{formatPrice(item.price)}</strong>
                    {item.oldPrice && <del>{formatPrice(item.oldPrice)}</del>}
                  </div>
                </Link>
                <button type="button" disabled={!item.inStock}>
                  Add to Cart
                </button>
              </article>
            ))}
          </div>
        </section>
      </main>
      <div
        className={`${styles.sticky} ${sticky ? styles.stickyVisible : ""}`}
        aria-hidden={!sticky}
      >
        <div className={styles.container}>
          <div>
            <strong>{accessory.name}</strong>
            <span>{formatPrice(accessory.price)}</span>
          </div>
          <button
            type="button"
            onClick={addToCart}
            disabled={!accessory.inStock}
          >
            <FiShoppingCart /> {accessory.inStock ? cartLabel : "Out of Stock"}
          </button>
        </div>
      </div>
      <Footer />
    </>
  );
}

function LegacyReviewList() {
  return (
    <div className={styles.reviewList}>
      {reviews.map(([initials, name, stars, text]) => (
        <article key={name}>
          <span>{initials}</span>
          <div>
            <strong>{name}</strong>
            <small>
              {"★".repeat(stars)}
              {"☆".repeat(5 - stars)}
            </small>
            <p>{text}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
