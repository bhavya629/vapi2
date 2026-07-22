import Link from "next/link";
import Footer from "@/components/layout/Footer";
import Categories from "@/components/home/Categories";
import FeaturedAccessories from "@/components/home/FeaturedAccessories";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import GoogleReviews from "@/components/home/GoogleReviews";
import TrustedBrands from "@/components/home/TrustedBrands";
import WhyChooseUs from "@/components/home/WhyChooseUs";

export default function Home() {
  return (
    <main>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-content">
          <p className="hero-eyebrow">Welcome to</p>
          <h1 id="hero-title">
            The
            <span>Cellphone</span>
            <span>Studio</span>
          </h1>

          <h2>Your Trusted Mobile Store in Vapi</h2>
          <p className="hero-description">
            Premium smartphones, original accessories and trusted service.
          </p>

          <div className="hero-actions">
            <Link className="hero-button hero-button-primary" href="/#smartphones">
              Shop Now
            </Link>
            <Link className="hero-button hero-button-secondary" href="/#smartphones">
              Explore Phones
            </Link>
          </div>

          <div className="hero-trust-badges" aria-label="Store benefits">
            <span>✔ 100% Original Products</span>
            <span>🏷 Best Price Guaranteed</span>
            <span>💳 EMI Available</span>
            <span>🚚 Same Day Delivery in Vapi</span>
          </div>
        </div>
      </section>
      <TrustedBrands />
      <Categories />
      <FeaturedProducts />
      <FeaturedAccessories />
      <WhyChooseUs />
      <GoogleReviews />
      <Footer />
    </main>
  );
}
