import Image from "next/image";
import Link from "next/link";
import {
  FiCheckCircle,
  FiClock,
  FiMail,
  FiMapPin,
  FiPhone,
} from "react-icons/fi";
import {
  FaCcMastercard,
  FaCcVisa,
  FaFacebookF,
  FaGoogle,
  FaInstagram,
  FaMoneyBillWave,
  FaWhatsapp,
} from "react-icons/fa";

const exploreLinks = [
  { label: "Home", href: "/" },
  { label: "Smartphones", href: "/smartphones" },
  { label: "Accessories", href: "/accessories" },
  { label: "Gallery", href: "/#gallery" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Wishlist", href: "/#wishlist" },
  { label: "Cart", href: "/#cart" },
  { label: "My Account", href: "/account" },
  { label: "Track Order", href: "/orders" },
];

const socialLinks = [
  { label: "Instagram", href: "#", icon: FaInstagram, placeholder: true },
  { label: "Facebook", href: "#", icon: FaFacebookF, placeholder: true },
  { label: "WhatsApp", href: "https://wa.me/919377998836", icon: FaWhatsapp },
  { label: "Google", href: "#", icon: FaGoogle, placeholder: true },
];

const policies = ["Privacy Policy", "Terms & Conditions", "Return Policy"];

const preventPlaceholderNavigation = (event) => event.preventDefault();

export default function Footer() {
  return (
    <footer className="premium-footer">
      <section className="footer-assistance" aria-labelledby="footer-assistance-title">
        <div className="footer-assistance-inner">
          <div>
            <p>Need Help?</p>
            <h2 id="footer-assistance-title">Find the Right Device with Expert Guidance</h2>
          </div>
          <div className="footer-assistance-actions">
            <a href="tel:+919377998836">
              <FiPhone aria-hidden="true" /> Call Store
            </a>
            <a href="https://wa.me/919377998836" target="_blank" rel="noopener noreferrer">
              <FaWhatsapp aria-hidden="true" /> WhatsApp Us
            </a>
            <Link href="/contact">
              <FiMapPin aria-hidden="true" /> Visit Store
            </Link>
          </div>
        </div>
      </section>

      <div className="footer-main">
        <div className="footer-v2-container">
          <div className="footer-v2-grid">
            <div className="footer-v2-brand">
              <Link className="footer-v2-logo-link" href="/" aria-label="The Cellphone Studio home">
                <Image
                  className="footer-v2-logo"
                  src="/images/logo.png"
                  alt="The Cellphone Studio"
                  width={190}
                  height={95}
                  unoptimized
                />
              </Link>
              <span className="footer-serving-badge">Serving Vapi Since October 2023</span>
              <p>
                The Cellphone Studio is Vapi&apos;s trusted destination for genuine
                smartphones, premium accessories, expert guidance, and dependable local
                service.
              </p>
              <div className="footer-v2-socials" aria-label="Social media links">
                {socialLinks.map((social) => {
                  const Icon = social.icon;

                  return (
                    <a
                      href={social.href}
                      aria-label={social.label}
                      key={social.label}
                      onClick={social.placeholder ? preventPlaceholderNavigation : undefined}
                      target={!social.placeholder ? "_blank" : undefined}
                      rel={!social.placeholder ? "noopener noreferrer" : undefined}
                    >
                      <Icon aria-hidden="true" />
                    </a>
                  );
                })}
              </div>
            </div>

            <nav className="footer-v2-explore" aria-label="Explore The Cellphone Studio">
              <h2>Explore</h2>
              <ul>
                {exploreLinks.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="footer-v2-visit">
              <h2>Visit Our Store</h2>
              <address>
                <FiMapPin aria-hidden="true" />
                <span>
                  Shop No. 38, The Cellphone Studio,<br />
                  Fortune Landmark, Near ATF Square,<br />
                  Gunjan Road, Vapi, Gujarat – 396195
                </span>
              </address>
              <a href="tel:+919377998836">
                <FiPhone aria-hidden="true" />
                <span>+91 93779 98836</span>
              </a>
              <a href="mailto:contact@thecellphonestudio.in">
                <FiMail aria-hidden="true" />
                <span>contact@thecellphonestudio.in</span>
              </a>
              <div className="footer-v2-hours">
                <FiClock aria-hidden="true" />
                <span>Monday – Sunday<br />10:00 AM – 10:00 PM</span>
              </div>
              <Link className="footer-directions" href="/contact">
                Get Directions <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          <div className="footer-trust-row">
            <div className="footer-v2-payments" aria-label="Secure payment methods">
              <strong>Secure Payments</strong>
              <div>
                <span aria-label="Visa"><FaCcVisa aria-hidden="true" /></span>
                <span aria-label="Mastercard"><FaCcMastercard aria-hidden="true" /></span>
                <span className="footer-payment-text" aria-label="UPI">UPI</span>
                <span className="footer-payment-text" aria-label="RuPay">RuPay</span>
                <span aria-label="Cash on Delivery"><FaMoneyBillWave aria-hidden="true" /></span>
              </div>
            </div>
            <div className="footer-trust-points">
              <span><FiCheckCircle aria-hidden="true" /> 100% Genuine Products</span>
              <span><FiCheckCircle aria-hidden="true" /> Easy EMI Options</span>
              <span><FiCheckCircle aria-hidden="true" /> Local Delivery Across Vapi</span>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-v2-bottom">
        <div className="footer-v2-bottom-inner">
          <p>© 2026 The Cellphone Studio. All Rights Reserved.</p>
          <div className="footer-v2-developer">
            <p>Website Designed &amp; Developed by <strong>Bhavya Desai</strong></p>
            <div>
              <a href="tel:+919558689964">+91 95586 89964</a>
              <a href="mailto:bhavyadesai97@gmail.com">bhavyadesai97@gmail.com</a>
            </div>
          </div>
          <nav className="footer-v2-policies" aria-label="Policy links">
            {policies.map((policy) => (
              <a href="#" onClick={preventPlaceholderNavigation} key={policy}>{policy}</a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
