import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  FiChevronLeft, FiChevronRight, FiHeadphones, FiMapPin, FiPhone,
  FiShield, FiSmartphone, FiUsers, FiX,
} from "react-icons/fi";
import Footer from "@/components/layout/Footer";
import styles from "@/styles/gallery.module.css";

const galleryItems = [
  { src: "/images/gallery/showroom-main.jpg", title: "Premium Showroom", caption: "A modern and welcoming space created for a better mobile shopping experience.", alt: "Premium interior of The Cellphone Studio showroom", layout: "featured", position: "center" },
  { src: "/images/gallery/smartphone-display.jpg", title: "Latest Smartphones", caption: "Explore genuine smartphones from the world’s leading brands.", alt: "Latest smartphones displayed inside The Cellphone Studio", layout: "phone", position: "center" },
  { src: "/images/gallery/accessories-wall.jpg", title: "Premium Accessories", caption: "Discover covers, audio products, chargers, smart wearables, and more.", alt: "Premium mobile accessories arranged on the showroom wall", layout: "accessories", position: "center" },
  { src: "/images/gallery/vintage-wall.jpg", title: "Our Store Story", caption: "A distinctive showroom identity built with care since October 2023.", alt: "Vintage feature wall telling The Cellphone Studio story", layout: "story", position: "center" },
];

const experience = [
  [FiSmartphone, "Genuine Smartphones", "Original devices from trusted brands"],
  [FiHeadphones, "Premium Accessories", "Carefully selected mobile essentials"],
  [FiUsers, "Expert Guidance", "Friendly help choosing the right product"],
  [FiShield, "Comfortable Store Experience", "A welcoming space built around you"],
];

export default function GalleryPage() {
  const [activeIndex, setActiveIndex] = useState(null);
  const touchStart = useRef(null);
  const isOpen = activeIndex !== null;
  const close = () => setActiveIndex(null);
  const previous = () => setActiveIndex((current) => (current - 1 + galleryItems.length) % galleryItems.length);
  const next = () => setActiveIndex((current) => (current + 1) % galleryItems.length);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") previous();
      if (event.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); };
  }, [isOpen]);

  const handleTouchEnd = (event) => {
    if (touchStart.current === null) return;
    const distance = event.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(distance) > 45) distance > 0 ? previous() : next();
    touchStart.current = null;
  };

  return <>
    <Head><title>Gallery | The Cellphone Studio</title><meta name="description" content="Explore The Cellphone Studio showroom, smartphone displays, accessories, and store experience in Vapi." /></Head>
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="gallery-title"><div className={`${styles.container} ${styles.heroInner}`}><div className={styles.heroCopy}><p>Our Gallery</p><h1 id="gallery-title">Step Inside The Cellphone Studio</h1><span>Explore our premium showroom, smartphone displays, exclusive accessories, and the welcoming shopping experience we have created for customers across Vapi.</span></div><div className={styles.heroStack} aria-hidden="true"><div><Image src={galleryItems[2].src} alt="" fill sizes="220px" /></div><div><Image src={galleryItems[0].src} alt="" fill sizes="240px" /></div></div></div></section>

      <section className={`${styles.container} ${styles.intro}`} aria-labelledby="intro-title"><span>Serving Vapi Since October 2023</span><h2 id="intro-title">Experience Our Store</h2><p>From the latest smartphones to premium accessories, every corner of our showroom is designed to provide a comfortable, trustworthy, and memorable shopping experience.</p></section>

      <section className={`${styles.container} ${styles.gallery}`} aria-label="The Cellphone Studio photo gallery">{galleryItems.map((item, index) => <button className={`${styles.galleryCard} ${styles[item.layout]}`} type="button" onClick={() => setActiveIndex(index)} aria-label={`Open ${item.title} in gallery`} key={item.src}><Image src={item.src} alt={item.alt} fill sizes={item.layout === "featured" ? "(max-width: 768px) 100vw, 60vw" : "(max-width: 768px) 100vw, 40vw"} style={{ objectPosition: item.position }} priority={index === 0} /><span className={styles.overlay}><strong>{item.title}</strong><small>{item.caption}</small></span></button>)}</section>

      <section className={styles.experience} aria-labelledby="experience-title"><div className={styles.container}><p>Why visit us</p><h2 id="experience-title">A Better Store Experience</h2><div>{experience.map(([Icon,title,text]) => <article key={title}><span><Icon /></span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></div></section>

      <section className={`${styles.container} ${styles.cta}`} aria-labelledby="cta-title"><div><p>Visit us in Vapi</p><h2 id="cta-title">Experience The Cellphone Studio in Person</h2><span>Visit our showroom to explore the latest devices, compare products, and receive expert guidance from our team.</span></div><div className={styles.ctaActions}><Link href="/contact"><FiMapPin /> Get Directions</Link><a href="tel:+919377998836"><FiPhone /> Call Store</a></div></section>
    </main>

    {isOpen && <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label={`${galleryItems[activeIndex].title} image viewer`} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }} onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }} onTouchEnd={handleTouchEnd}><button className={styles.close} type="button" onClick={close} aria-label="Close gallery"><FiX /></button><button className={`${styles.arrow} ${styles.previous}`} type="button" onClick={previous} aria-label="Previous image"><FiChevronLeft /></button><figure><div><Image src={galleryItems[activeIndex].src} alt={galleryItems[activeIndex].alt} fill sizes="95vw" priority /></div><figcaption><span>{activeIndex + 1} / {galleryItems.length}</span><strong>{galleryItems[activeIndex].title}</strong><p>{galleryItems[activeIndex].caption}</p></figcaption></figure><button className={`${styles.arrow} ${styles.next}`} type="button" onClick={next} aria-label="Next image"><FiChevronRight /></button></div>}
    <Footer />
  </>;
}
