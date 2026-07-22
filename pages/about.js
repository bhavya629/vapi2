import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import {
  FiCheckCircle, FiEye, FiHeart, FiMapPin, FiPhone,
  FiShield, FiSmartphone, FiTarget, FiUsers,
} from "react-icons/fi";
import Footer from "@/components/layout/Footer";
import styles from "@/styles/about.module.css";

const reasons = [
  [FiShield, "100% Genuine Products", "Every smartphone and accessory comes from trusted brands and authorized channels."],
  [FiUsers, "Honest Expert Guidance", "Clear, practical advice helps every customer choose with confidence."],
  [FiHeart, "Customer-First Service", "We focus on lasting relationships, dependable support, and complete transparency."],
  [FiSmartphone, "Latest Technology", "Explore current devices, premium accessories, and solutions for every budget."],
];
const stats = [["5.0", "Google Rating"], ["670+", "Happy Reviews"], ["8+", "Leading Brands"], ["Since", "October 2023"]];
const timeline = [
  ["October 2023", "The Beginning", "The Cellphone Studio opens its doors in Vapi with a simple promise: honest advice and genuine mobile products."],
  ["Growing Trust", "Customers Became Our Community", "Through transparent service and genuine recommendations, we earned the trust of customers across Vapi."],
  ["Today", "Serving With Passion", "We continue helping customers choose the right smartphones and accessories while delivering a better shopping experience every day."],
];

export default function AboutPage() {
  return <>
    <Head><title>About Us | The Cellphone Studio</title><meta name="description" content="Discover the story, founders, values, and vision behind The Cellphone Studio in Vapi." /></Head>
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="about-title"><span className={styles.floatOne} aria-hidden="true" /><span className={styles.floatTwo} aria-hidden="true" /><div className={`${styles.container} ${styles.heroInner}`}><div><p>About The Cellphone Studio</p><h1 id="about-title">More Than a Mobile Store.<br />A Place Where Every Customer Matters.</h1><span>Since October 2023, The Cellphone Studio has been serving customers across Vapi with genuine smartphones, premium accessories, honest guidance, and a shopping experience built on trust.</span></div><div className={styles.heroCollage} aria-hidden="true"><div><Image src="/images/gallery/showroom-main.jpg" alt="" fill sizes="300px" /></div><div><Image src="/images/gallery/smartphone-display.jpg" alt="" fill sizes="220px" /></div></div></div></section>

      <section className={`${styles.container} ${styles.story}`} aria-labelledby="story-title"><div className={styles.storyImage}><Image src="/images/gallery/showroom-main.jpg" alt="The Cellphone Studio premium showroom in Vapi" fill sizes="(max-width: 768px) 100vw, 48vw" priority /><span>Serving Vapi Since October 2023</span></div><div className={styles.storyCopy}><p className={styles.label}>Our Story</p><h2 id="story-title">A Mobile Store Built Around People</h2><p>The Cellphone Studio began in October 2023 with a clear purpose: to make buying smartphones and accessories a more honest, comfortable, and reliable experience for customers across Vapi.</p><p>We created a showroom where people can explore the latest technology, compare products without pressure, and receive advice that genuinely fits their needs. Every recommendation is guided by transparency, product knowledge, and long-term trust.</p><div><FiCheckCircle /> Genuine products and clear guidance</div><div><FiCheckCircle /> Friendly local support before and after purchase</div></div></section>

      <section className={styles.founders} aria-labelledby="founders-title"><div className={styles.container}><div className={styles.heading}><p className={styles.label}>Meet the Founders</p><h2 id="founders-title">The People Behind The Cellphone Studio</h2></div><div className={styles.founderGrid}><article className={styles.founderCard}><div className={styles.founderImage}><Image src="/images/about/chirag.jpg" alt="Chirag Bhai, co-owner of The Cellphone Studio" fill sizes="(max-width: 700px) 100vw, 50vw" /></div><div className={styles.founderText}><h3>Chirag Bhai</h3><span>Co-Founder</span><strong>Customer First. Always.</strong><p>Chirag Bhai believes that every customer deserves honest advice, genuine products, and complete transparency. His focus has always been on building long-term trust rather than making quick sales.</p></div></article><article className={styles.founderCard}><div className={`${styles.founderImage} ${styles.rajuImage}`}><Image src="/images/about/raju.jpg" alt="Raju Bhai, co-owner of The Cellphone Studio" fill sizes="(max-width: 700px) 100vw, 50vw" /></div><div className={styles.founderText}><h3>Raju Bhai</h3><span>Co-Founder</span><strong>Passion for Technology &amp; Service</strong><p>Raju Bhai is passionate about smartphones, the latest technology, and delivering an exceptional shopping experience. His commitment to quality service ensures every customer leaves the store with confidence.</p></div></article></div><p className={styles.together}>Together, Chirag Bhai and Raju Bhai have built The Cellphone Studio into one of Vapi&apos;s trusted destinations for smartphones and mobile accessories.</p></div></section>

      <section className={`${styles.container} ${styles.why}`} aria-labelledby="why-title"><div className={styles.heading}><p className={styles.label}>Why Choose Us</p><h2 id="why-title">A Better Way to Shop for Mobile Technology</h2></div><div className={styles.reasonGrid}>{reasons.map(([Icon,title,text]) => <article key={title}><span><Icon /></span><h3>{title}</h3><p>{text}</p></article>)}</div></section>

      <section className={styles.purpose} aria-label="Our mission and vision"><div className={`${styles.container} ${styles.purposeGrid}`}><article><span><FiTarget /></span><p className={styles.label}>Our Mission</p><h2>Make Every Purchase Feel Right</h2><p>To offer genuine products, thoughtful recommendations, competitive value, and service that customers can depend on before and after every purchase.</p></article><article><span><FiEye /></span><p className={styles.label}>Our Vision</p><h2>Become Vapi’s Most Trusted Mobile Destination</h2><p>To set the local standard for transparent mobile retail by combining modern technology, expert guidance, and genuine human care.</p></article></div></section>

      <section className={styles.stats} aria-label="The Cellphone Studio trust statistics"><div className={styles.container}>{stats.map(([value,label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div></section>

      <section className={`${styles.container} ${styles.timeline}`} aria-labelledby="timeline-title"><div className={styles.heading}><p className={styles.label}>Our Journey</p><h2 id="timeline-title">Growing Through Trust</h2></div><div className={styles.timelineList}>{timeline.map(([year,title,text],index) => <article key={year}><div><span>{index + 1}</span></div><div><time>{year}</time><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>

      <section className={`${styles.container} ${styles.cta}`} aria-labelledby="about-cta-title"><div><p>Visit Us in Vapi</p><h2 id="about-cta-title">Visit The Cellphone Studio Today</h2><span>Experience genuine products, expert guidance, and a team that helps you choose the right smartphone—not just the expensive one.</span></div><div><Link href="/contact"><FiMapPin /> Get Directions</Link><a href="tel:+919377998836"><FiPhone /> Call Store</a></div></section>
    </main>
    <Footer />
  </>;
}
