import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  FiCheck,
  FiChevronRight,
  FiCreditCard,
  FiHeart,
  FiMapPin,
  FiMinus,
  FiPlus,
  FiRefreshCw,
  FiShare2,
  FiShield,
  FiShoppingCart,
  FiStar,
} from "react-icons/fi";
import Footer from "@/components/layout/Footer";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useProduct, useProducts } from "@/hooks/useCatalogue";
import styles from "@/styles/product-details.module.css";
import ProductReviews from "@/components/reviews/ProductReviews";

const gallery = [
  { label: "Front view", className: "blue" },
  { label: "Back view", className: "silver" },
  { label: "Camera detail", className: "graphite" },
  { label: "Side view", className: "gold" },
];
const tabs = [
  "Description",
  "Specifications",
  "Warranty",
  "Shipping",
  "Reviews",
];
const specs = [
  ["Processor", "Snapdragon 8 Elite, Octa Core"],
  ["RAM", "12 GB / 16 GB"],
  ["Storage", "256 GB / 512 GB"],
  ["Battery", "5,000 mAh"],
  ["Charging", "65W wired, 25W wireless"],
  ["Camera", "200 MP + 50 MP + 50 MP"],
  ["Front Camera", "32 MP"],
  ["Android Version", "Android 15"],
  ["Network", "5G, 4G LTE, Wi-Fi 7"],
  ["SIM", "Dual Nano SIM + eSIM"],
  ["Fingerprint", "Ultrasonic in-display"],
  ["Weight", "218 g"],
];
const reviews = [
  [
    "AR",
    "Aarav R.",
    5,
    "A truly premium flagship. The camera detail and battery life are outstanding.",
    "18 July 2026",
  ],
  [
    "NP",
    "Neha P.",
    5,
    "Beautiful display, fast delivery and the phone was perfectly sealed.",
    "14 July 2026",
  ],
  [
    "KS",
    "Kunal S.",
    5,
    "Performance is incredibly smooth. The store team also helped with setup.",
    "9 July 2026",
  ],
  [
    "DM",
    "Dev M.",
    4,
    "Excellent all-round phone. I would have liked a charger in the box.",
    "2 July 2026",
  ],
  [
    "RJ",
    "Riya J.",
    5,
    "Great cameras and a premium feel. EMI process was quick and simple.",
    "28 June 2026",
  ],
];
const visualNames = ["blue", "silver", "graphite", "gold"];
const relatedFilters = { type: "SMARTPHONE", limit: 8, sort: "featured" };
const formatPrice = (price) => `₹${Number(price || 0).toLocaleString("en-IN")}`;
function resolveSelection(product, variantId, colourId) {
  const variants = product?.variants || [];
  const variant =
    variants.find((v) => v.id === variantId) ||
    variants.find((v) => v.id === product?.defaultVariantId) ||
    variants[0];
  const combination =
    variant?.combinations.find((c) => c.productColourId === colourId) ||
    variant?.combinations.find((c) => c.id === product?.defaultCombinationId) ||
    variant?.combinations[0];
  return { variant, combination, colour: combination?.colour };
}

function PhoneVisual({ variant, compact = false }) {
  return (
    <div
      className={`${styles.phone} ${styles[variant]} ${compact ? styles.compactPhone : ""}`}
    >
      <span className={styles.screen} />
      <span className={styles.cameraOne} />
      <span className={styles.cameraTwo} />
      <span className={styles.cameraThree} />
    </div>
  );
}

export default function ProductDetailsPage() {
  const { addToCart: addCartItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const router = useRouter();
  const { product, loading, error, notFound } = useProduct(
    router.isReady ? router.query.id : null,
    "SMARTPHONE",
  );
  const { products: relatedCatalogue } = useProducts(relatedFilters);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [selectedColourId, setSelectedColourId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("Description");
  const [cartLabel, setCartLabel] = useState("Add to Cart");
  const [pincode, setPincode] = useState("");
  const [delivery, setDelivery] = useState(false);
  const [sticky, setSticky] = useState(false);

  useEffect(() => {
    const onScroll = () => setSticky(window.scrollY > 620);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (product?.hasVariants) {
      setSelectedVariantId(product.defaultVariantId);
      setSelectedColourId(product.defaultColourId);
      setActiveImage(0);
    }
  }, [product?.id, product?.defaultVariantId, product?.defaultColourId]);

  const addToCart = () => {
    const { variant, combination, colour } = resolveSelection(
      product,
      selectedVariantId,
      selectedColourId,
    );
    const primary =
      combination?.images.find((image) => image.isPrimary) ||
      combination?.images[0];
    const exact = combination
      ? {
          ...product,
          productVariantId: variant.id,
          productVariantColourId: combination.id,
          ram: variant.ram,
          storage: variant.storage,
          colourName: colour.name,
          sku: combination.sku,
          price: combination.price,
          oldPrice: combination.originalPrice,
          originalPrice: combination.originalPrice,
          stock: combination.stock,
          inStock: combination.inStock,
          image: primary?.imageUrl || product.imageUrl,
        }
      : product;
    if (!exact?.inStock) return;
    addCartItem(exact, "smartphone", quantity);
    setCartLabel("Added");
    window.setTimeout(() => setCartLabel("Add to Cart"), 1500);
  };

  if (!router.isReady || loading) {
    return (
      <>
        <main className={styles.statePage} aria-live="polite">
          <div className={styles.loader} />
          <h1>Loading product...</h1>
        </main>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Head>
          <title>Product Unavailable | The Cellphone Studio</title>
        </Head>
        <main className={styles.statePage}>
          <div className={styles.notFoundIcon}>!</div>
          <h1>We Could Not Load This Product</h1>
          <p>Please try again in a moment.</p>
          <Link href="/smartphones">Back to Smartphones</Link>
        </main>
        <Footer />
      </>
    );
  }

  if (notFound || !product) {
    return (
      <>
        <Head>
          <title>Product Not Found | The Cellphone Studio</title>
        </Head>
        <main className={styles.statePage}>
          <div className={styles.notFoundIcon}>?</div>
          <h1>Product Not Found</h1>
          <p>The requested smartphone could not be found.</p>
          <Link href="/smartphones">Back to Smartphones</Link>
        </main>
        <Footer />
      </>
    );
  }

  const relatedProducts = [
    ...relatedCatalogue.filter(
      (item) => item.brand === product.brand && item.id !== product.id,
    ),
    ...relatedCatalogue.filter(
      (item) => item.brand !== product.brand && item.id !== product.id,
    ),
  ].slice(0, 4);
  const selection = resolveSelection(
    product,
    selectedVariantId,
    selectedColourId,
  );
  const selected = selection.combination
    ? {
        ...product,
        price: selection.combination.price,
        oldPrice: selection.combination.originalPrice,
        stock: selection.combination.stock,
        inStock: selection.combination.inStock,
        sku: selection.combination.sku,
        images: selection.combination.images,
        specifications: selection.combination.specifications,
      }
    : product;
  const ramChoices = product.hasVariants
    ? [...new Set(product.variants.map((variant) => variant.ram))]
    : [product.ram].filter(Boolean);
  const selectedRam = selection.variant?.ram || product.ram;
  const storageChoices = product.hasVariants
    ? product.variants.filter((variant) => variant.ram === selectedRam)
    : [];
  const colourChoices = selection.variant?.combinations || [];
  const selectedImages = selected.images?.length
    ? selected.images
    : product.images;
  const exactSpecifications = selection.combination?.specifications || [];
  const productSpecs = exactSpecifications.length
    ? exactSpecifications.map((specification) => [
        specification.key,
        specification.value,
      ])
    : product.specifications && Object.keys(product.specifications).length
      ? Object.entries(product.specifications)
          .filter(
            ([key]) => !["visual", "newest", "sales", "badge"].includes(key),
          )
          .map(([key, value]) => [
            key.replace(/([A-Z])/g, " $1"),
            String(value),
          ])
      : specs.map(([key, value]) =>
          key === "RAM"
            ? [key, selectedRam]
            : key === "Storage"
              ? [key, selection.variant?.storage || product.storage]
              : [key, value],
        );
  const roundedRating = Math.round(product.rating);
  const wished = isInWishlist(product.id, "smartphone");

  return (
    <>
      <Head>
        <title>{product.name} | The Cellphone Studio</title>
        <meta
          name="description"
          content={product.shortDescription || product.description}
        />
        {process.env.NEXT_PUBLIC_SITE_URL && (
          <link
            rel="canonical"
            href={`${process.env.NEXT_PUBLIC_SITE_URL}/product/${product.slug}`}
          />
        )}
        <meta
          property="og:title"
          content={`${product.name} | The Cellphone Studio`}
        />
        <meta
          property="og:description"
          content={product.shortDescription || product.description}
        />
        {product.imageUrl && (
          <meta property="og:image" content={product.imageUrl} />
        )}
      </Head>
      <main className={styles.page}>
        <nav
          className={`${styles.container} ${styles.breadcrumb}`}
          aria-label="Breadcrumb"
        >
          <Link href="/">Home</Link>
          <FiChevronRight />
          <Link href="/smartphones">Smartphones</Link>
          <FiChevronRight />
          <span>{product.name}</span>
        </nav>

        <section
          className={`${styles.container} ${styles.productHero}`}
          aria-labelledby="product-title"
        >
          <div className={styles.gallery}>
            <div className={styles.mainImage}>
              {selectedImages?.[activeImage]?.imageUrl ? (
                <Image
                  src={selectedImages[activeImage].imageUrl}
                  alt={
                    selectedImages[activeImage].altText ||
                    `${product.brand} ${product.name}`
                  }
                  width={720}
                  height={720}
                  priority
                  unoptimized
                />
              ) : (
                <PhoneVisual
                  variant={visualNames[product.visual % visualNames.length]}
                />
              )}
            </div>
            <div className={styles.thumbnails} aria-label="Product images">
              {(selectedImages?.length ? selectedImages : gallery).map(
                (image, index) => (
                  <button
                    className={
                      activeImage === index ? styles.activeThumbnail : ""
                    }
                    type="button"
                    onClick={() => setActiveImage(index)}
                    aria-label={`Show ${image.altText || image.label || `image ${index + 1}`}`}
                    aria-pressed={activeImage === index}
                    key={image.id || image.label || index}
                  >
                    {image.imageUrl ? (
                      <Image
                        src={image.imageUrl}
                        alt=""
                        width={100}
                        height={100}
                        unoptimized
                      />
                    ) : (
                      <PhoneVisual
                        variant={
                          visualNames[
                            (product.visual + index) % visualNames.length
                          ]
                        }
                        compact
                      />
                    )}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className={styles.summary}>
            <p className={styles.brand}>{product.brand}</p>
            <h1 id="product-title">{product.name}</h1>
            <div className={styles.ratingRow}>
              <span aria-label={`${product.rating} out of 5 stars`}>
                {"★".repeat(roundedRating)}
                {"☆".repeat(5 - roundedRating)}
              </span>
              <strong>{product.rating}</strong>
              <a href="#reviews">({product.reviews} Reviews)</a>
            </div>
            <p className={styles.stock}>
              <span />{" "}
              {selected.inStock
                ? selected.stock <=
                  (selection.combination?.lowStockThreshold || 3)
                  ? `Only ${selected.stock} left`
                  : "In Stock"
                : "Out of Stock"}
            </p>
            {selection.combination?.sku && (
              <p>
                SKU: <strong>{selection.combination.sku}</strong>
              </p>
            )}
            <div className={styles.priceBlock}>
              <p>
                MRP{" "}
                {selected.oldPrice ? (
                  <del>{formatPrice(selected.oldPrice)}</del>
                ) : (
                  "—"
                )}
              </p>
              <div>
                <strong>{formatPrice(selected.price)}</strong>
                {selected.oldPrice > selected.price && (
                  <span>
                    {Math.round((1 - selected.price / selected.oldPrice) * 100)}
                    % OFF
                  </span>
                )}
              </div>
              <small>Inclusive of all taxes</small>
            </div>
            <p className={styles.emi}>
              <FiCreditCard /> EMI starts from{" "}
              <strong>
                {formatPrice(Math.ceil(selected.price / 12))}/month
              </strong>
            </p>

            <fieldset className={styles.options}>
              <legend>
                RAM: <strong>{selectedRam}</strong>
              </legend>
              <div>
                {ramChoices.map((item) => (
                  <button
                    className={selectedRam === item ? styles.selected : ""}
                    type="button"
                    onClick={() => {
                      const next = product.variants.find((v) => v.ram === item);
                      setSelectedVariantId(next.id);
                      setSelectedColourId(
                        next.combinations.find((c) => c.colour.isDefault)
                          ?.productColourId ||
                          next.combinations[0]?.productColourId,
                      );
                      setActiveImage(0);
                    }}
                    key={item}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className={styles.options}>
              <legend>
                Storage:{" "}
                <strong>{selection.variant?.storage || product.storage}</strong>
              </legend>
              <div>
                {storageChoices.map((item) => (
                  <button
                    className={
                      selection.variant?.id === item.id ? styles.selected : ""
                    }
                    type="button"
                    onClick={() => {
                      setSelectedVariantId(item.id);
                      setSelectedColourId(
                        item.combinations.find((c) => c.colour.isDefault)
                          ?.productColourId ||
                          item.combinations[0]?.productColourId,
                      );
                      setActiveImage(0);
                    }}
                    key={item.id}
                  >
                    {item.storage}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className={styles.options}>
              <legend>
                Colour: <strong>{selection.colour?.name || "Default"}</strong>
              </legend>
              <div className={styles.colors}>
                {colourChoices.map((item) => (
                  <button
                    className={
                      selection.combination?.id === item.id
                        ? styles.colorSelected
                        : ""
                    }
                    style={{ "--swatch": item.colour.hexCode || "#64748b" }}
                    type="button"
                    onClick={() => {
                      setSelectedColourId(item.productColourId);
                      setActiveImage(0);
                    }}
                    disabled={!item.inStock}
                    title={
                      item.inStock
                        ? item.colour.name
                        : `${item.colour.name} — Out of Stock`
                    }
                    aria-label={`${item.colour.name}${item.inStock ? "" : " — out of stock"}`}
                    aria-pressed={selection.combination?.id === item.id}
                    key={item.id}
                  />
                ))}
              </div>
            </fieldset>

            <div className={styles.purchaseRow}>
              <div className={styles.quantity} aria-label="Quantity selector">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  aria-label="Decrease quantity"
                >
                  <FiMinus />
                </button>
                <span aria-live="polite">{quantity}</span>
                <button
                  type="button"
                  onClick={() =>
                    setQuantity(
                      Math.min(Math.max(selected.stock, 1), 5, quantity + 1),
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
                disabled={!selected.inStock}
              >
                <FiShoppingCart />{" "}
                {selected.inStock ? cartLabel : "Out of Stock"}
              </button>
              <button
                className={styles.buyNow}
                type="button"
                disabled={!selected.inStock}
              >
                Buy Now
              </button>
            </div>
            <div className={styles.secondaryActions}>
              <button
                type="button"
                onClick={() => toggleWishlist(product, "smartphone")}
                aria-pressed={wished}
                aria-label={`${wished ? "Remove" : "Add"} ${product.name} ${wished ? "from" : "to"} wishlist`}
              >
                <FiHeart className={wished ? styles.filledHeart : ""} />{" "}
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
                <label className={styles.srOnly} htmlFor="pincode">
                  Enter pincode
                </label>
                <input
                  id="pincode"
                  inputMode="numeric"
                  maxLength="6"
                  value={pincode}
                  onChange={(event) =>
                    setPincode(event.target.value.replace(/\D/g, ""))
                  }
                  placeholder="Enter Pincode"
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
                  <strong>Official Warranty</strong>1 year coverage
                </span>
              </div>
              <div>
                <FiRefreshCw />
                <span>
                  <strong>7 Day Replacement</strong>Easy replacement
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
            </div>
          </div>
        </section>

        <section
          className={`${styles.container} ${styles.details}`}
          aria-labelledby="details-heading"
        >
          <h2 className={styles.srOnly} id="details-heading">
            Product information
          </h2>
          <div
            className={styles.tabs}
            role="tablist"
            aria-label="Product information tabs"
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
          <div className={styles.tabPanel} role="tabpanel">
            {activeTab === "Description" && (
              <div>
                <h2>Built for the extraordinary</h2>
                <p>
                  Meet a premium flagship designed around an immersive display,
                  professional-grade camera system and effortless performance.
                  Its refined titanium frame feels balanced in hand while
                  intelligent battery management keeps you productive throughout
                  the day.
                </p>
                <div className={styles.highlights}>
                  <span>6.9″ Dynamic AMOLED</span>
                  <span>200 MP Pro Camera</span>
                  <span>Galaxy AI</span>
                  <span>All-day Battery</span>
                </div>
              </div>
            )}
            {activeTab === "Specifications" && (
              <div>
                <h2>Technical Specifications</h2>
                <dl className={styles.specGrid}>
                  {productSpecs.map(([key, value]) => (
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
                <h2>Official Brand Warranty</h2>
                <p>
                  Includes a 1-year manufacturer warranty for the handset and 6
                  months for in-box accessories. Keep your original invoice for
                  warranty claims at authorized service centers.
                </p>
              </div>
            )}
            {activeTab === "Shipping" && (
              <div>
                <h2>Fast, careful delivery</h2>
                <p>
                  Same-day delivery is available in eligible Vapi locations.
                  Every order is securely packed, verified before dispatch and
                  handed over with a valid GST invoice.
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
          className={`${styles.container} ${styles.reviewsSection}`}
          id="reviews"
          aria-labelledby="reviews-title"
        >
          <ProductReviews productId={product.id} />
        </section>
        <section
          className={`${styles.container} ${styles.related}`}
          aria-labelledby="related-title"
        >
          <p className={styles.eyebrow}>You may also like</p>
          <h2 id="related-title">Related Products</h2>
          <div className={styles.relatedGrid}>
            {relatedProducts.map((item) => (
              <article className={styles.relatedCard} key={item.id}>
                <div className={styles.relatedTop}>
                  <span>
                    {item.inStock ? `${item.discount}% OFF` : "OUT OF STOCK"}
                  </span>
                  <button
                    type="button"
                    aria-label={`Add ${item.name} to wishlist`}
                  >
                    <FiHeart />
                  </button>
                  <Link
                    className={styles.relatedVisualLink}
                    href={item.route}
                    aria-label={`View ${item.name} details`}
                  >
                    <PhoneVisual variant={visualNames[item.visual]} compact />
                  </Link>
                </div>
                <div className={styles.relatedInfo}>
                  <p>{item.brand}</p>
                  <h3>
                    <Link href={item.route}>{item.name}</Link>
                  </h3>
                  <div className={styles.relatedRating}>
                    {"★".repeat(Math.round(item.rating || 0))}
                    {"☆".repeat(5 - Math.round(item.rating || 0))}
                  </div>
                  <div>
                    <strong>{formatPrice(item.price)}</strong>
                    {item.oldPrice && <del>{formatPrice(item.oldPrice)}</del>}
                  </div>
                  <small>EMI Available</small>
                  <button type="button" disabled={!item.inStock}>
                    Add to Cart
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <div
        className={`${styles.stickyBar} ${sticky ? styles.stickyVisible : ""}`}
        aria-hidden={!sticky}
      >
        <div className={styles.container}>
          <div>
            <strong>{product.name}</strong>
            <span>{formatPrice(selected.price)}</span>
          </div>
          <button
            type="button"
            onClick={addToCart}
            disabled={!selected.inStock}
          >
            <FiShoppingCart /> {selected.inStock ? cartLabel : "Out of Stock"}
          </button>
        </div>
      </div>
      <Footer />
    </>
  );
}

function LegacyReviews({ standalone = false, rating, reviewCount }) {
  return (
    <div className={standalone ? styles.reviewsLayout : ""}>
      {standalone && (
        <div className={styles.reviewSummary}>
          <p>Overall Rating</p>
          <strong>{rating}</strong>
          <span aria-label={`${rating} out of 5 stars`}>
            {"★".repeat(Math.round(rating))}
            {"☆".repeat(5 - Math.round(rating))}
          </span>
          <small>{reviewCount} Reviews</small>
        </div>
      )}
      <div className={styles.reviewContent}>
        <h2 id={standalone ? "reviews-title" : undefined}>Customer Reviews</h2>
        <div className={styles.reviewList}>
          {reviews.map(([initials, name, stars, review, date]) => (
            <article className={styles.reviewCard} key={name}>
              <div className={styles.avatar}>{initials}</div>
              <div>
                <div className={styles.reviewMeta}>
                  <strong>{name}</strong>
                  <time>{date}</time>
                </div>
                <span
                  className={styles.reviewStars}
                  aria-label={`${stars} out of 5 stars`}
                >
                  {"★".repeat(stars)}
                  {"☆".repeat(5 - stars)}
                </span>
                <p>{review}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
