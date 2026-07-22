import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  FiHeart, FiPlus, FiShield, FiShoppingBag, FiShoppingCart,
  FiSmartphone, FiTrash2, FiUsers, FiX,
} from "react-icons/fi";
import Footer from "@/components/layout/Footer";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import styles from "@/styles/wishlist.module.css";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default function WishlistPage() {
  const { wishlistItems, wishlistCount, wishlistReady, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart } = useCart();
  const [sort, setSort] = useState("recent");
  const [type, setType] = useState("all");
  const [clearOpen, setClearOpen] = useState(false);

  const visibleItems = useMemo(() => {
    const filtered = type === "all" ? wishlistItems : wishlistItems.filter((item) => item.productType === type);
    if (sort === "low") return [...filtered].sort((a,b) => a.price-b.price);
    if (sort === "high") return [...filtered].sort((a,b) => b.price-a.price);
    if (sort === "name") return [...filtered].sort((a,b) => a.name.localeCompare(b.name));
    return [...filtered].sort((a,b) => Date.parse(b.addedAt)-Date.parse(a.addedAt));
  }, [sort,type,wishlistItems]);

  const addAll = () => {
    let added = 0;
    wishlistItems.forEach((item) => { if (addToCart(item,item.productType,1,{silent:true})) added += 1; });
    if (added === wishlistItems.length) toast.success("Wishlist items added to cart.");
    else if (added > 0) toast("Some wishlist items were added. A few could not be added.");
    else toast.error("These items could not be added to the cart.");
  };

  return <>
    <Head><title>Wishlist | The Cellphone Studio</title><meta name="description" content="View smartphones and accessories saved to your wishlist at The Cellphone Studio, Vapi."/><meta name="robots" content="noindex,follow"/></Head>
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="wishlist-title"><div className={`${styles.container} ${styles.heroInner}`}><div><p>Your Saved Products</p><h1 id="wishlist-title">Your Wishlist</h1><span>Keep your favourite smartphones and accessories in one place and return whenever you are ready.</span><strong aria-live="polite">{wishlistReady ? `${wishlistCount} saved ${wishlistCount === 1 ? "item" : "items"}` : "Loading saved items"}</strong></div><FiHeart aria-hidden="true" /></div></section>
      {!wishlistReady ? <section className={`${styles.container} ${styles.loading}`} aria-live="polite"><div/><h2>Loading your wishlist...</h2><span/><span/></section> : wishlistCount === 0 ? <><Empty/><Benefits/><ShoppingCta/></> : <>
        <section className={`${styles.container} ${styles.toolbar}`}><div><h2>Saved Items</h2><span>{wishlistCount} {wishlistCount===1?"Product":"Products"}</span></div><div className={styles.tabs} role="group" aria-label="Filter wishlist by product type">{[["all","All"],["smartphone","Smartphones"],["accessory","Accessories"]].map(([value,label])=><button className={type===value?styles.activeTab:""} type="button" onClick={()=>setType(value)} aria-pressed={type===value} key={value}>{label}</button>)}</div><label>Sort <select value={sort} onChange={(event)=>setSort(event.target.value)}><option value="recent">Recently Added</option><option value="low">Price: Low to High</option><option value="high">Price: High to Low</option><option value="name">Name: A to Z</option></select></label><div className={styles.toolbarActions}><button type="button" onClick={addAll}><FiPlus/> Add All to Cart</button><button type="button" onClick={()=>setClearOpen(true)}><FiTrash2/> Clear Wishlist</button></div></section>
        <section className={`${styles.container} ${styles.grid}`} aria-label="Saved products">{visibleItems.map((item)=><WishlistCard item={item} addToCart={addToCart} remove={removeFromWishlist} key={item.wishlistKey}/>)}</section>
        {visibleItems.length===0&&<div className={`${styles.container} ${styles.noMatches}`}>No saved products match this type.</div>}
        <Benefits/><ShoppingCta/>
      </>}
    </main>
    {clearOpen&&<ClearModal onCancel={()=>setClearOpen(false)} onConfirm={()=>{clearWishlist();setClearOpen(false)}}/>}
    <Footer/>
  </>;
}

function WishlistCard({item,addToCart,remove}){const savings=item.originalPrice?item.originalPrice-item.price:0,available=item.isActive!==false&&item.inStock&&item.stock>0;return <article className={styles.card}><Link href={item.detailRoute} className={styles.image} aria-label={`View ${item.name} details`}>{item.productType==="smartphone"?<FiSmartphone/>:<FiShoppingBag/>}</Link><button className={styles.heart} type="button" onClick={()=>remove(item.wishlistKey)} aria-pressed="true" aria-label={`Remove ${item.name} from wishlist`}><FiHeart/></button><div className={styles.cardBody}><p>{item.brand}</p><h2><Link href={item.detailRoute}>{item.name}</Link></h2><span className={styles.badge}>{item.isActive===false?"Currently Unavailable":available?item.productType==="smartphone"?"Smartphone":"Accessory":"Out of Stock"}</span>{item.rating!==null&&<div className={styles.rating}>★ <strong>{item.rating}</strong></div>}<div className={styles.prices}><strong>{money.format(item.price)}</strong>{item.originalPrice&&<del>{money.format(item.originalPrice)}</del>}</div>{savings>0&&<small className={styles.saving}>Save {money.format(savings)}</small>}<div className={styles.actions}><button type="button" disabled={!available} onClick={()=>available&&addToCart(item,item.productType)}><FiShoppingCart/> {available?"Add to Cart":"Unavailable"}</button><Link href={item.detailRoute}>View Product</Link></div></div></article>}
function Benefits(){return <section className={`${styles.container} ${styles.benefits}`} aria-label="Wishlist benefits">{[[FiHeart,"Save for Later","Keep products you are considering without adding them to your cart immediately."],[FiUsers,"Compare Easily","Return to your saved smartphones and accessories whenever you want to compare options."],[FiShoppingCart,"Add to Cart Anytime","Move a saved product into your cart when you are ready to continue shopping."]].map(([Icon,title,text])=><article key={title}><span><Icon/></span><div><h2>{title}</h2><p>{text}</p></div></article>)}</section>}
function ShoppingCta(){return <section className={`${styles.container} ${styles.cta}`}><div><h2>Still Exploring?</h2><p>Discover more smartphones, accessories, and premium technology available at The Cellphone Studio.</p></div><div><Link href="/smartphones">Browse Smartphones</Link><Link href="/accessories">Shop Accessories</Link><Link href="/cart">View Cart</Link></div></section>}
function Empty(){return <section className={`${styles.container} ${styles.empty}`}><span><FiHeart/></span><h2>Your Wishlist Is Empty</h2><p>Save smartphones and accessories you like, and they will appear here for quick access later.</p><div><Link href="/smartphones">Browse Smartphones</Link><Link href="/accessories">Explore Accessories</Link></div><Link href="/">Return Home</Link></section>}
function ClearModal({onCancel,onConfirm}){const cancelRef=useRef(null);useEffect(()=>{const old=document.body.style.overflow;document.body.style.overflow="hidden";cancelRef.current?.focus();const key=(event)=>{if(event.key==="Escape")onCancel()};window.addEventListener("keydown",key);return()=>{document.body.style.overflow=old;window.removeEventListener("keydown",key)}},[onCancel]);return <div className={styles.backdrop} onMouseDown={(event)=>{if(event.target===event.currentTarget)onCancel()}}><div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="clear-wishlist-title"><button className={styles.close} onClick={onCancel} type="button" aria-label="Close confirmation"><FiX/></button><span><FiTrash2/></span><h2 id="clear-wishlist-title">Clear Your Wishlist?</h2><p>This will remove all saved smartphones and accessories from your wishlist.</p><div><button type="button" onClick={onCancel} ref={cancelRef}>Cancel</button><button type="button" onClick={onConfirm}>Clear Wishlist</button></div></div></div>}
