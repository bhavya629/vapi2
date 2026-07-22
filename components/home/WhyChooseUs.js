import Link from "next/link";
import {
  FiCheckCircle,
  FiCreditCard,
  FiHeadphones,
  FiShield,
  FiTruck,
  FiUsers,
} from "react-icons/fi";

const features = [
  {
    title: "100% Genuine Products",
    description:
      "Every smartphone and accessory is sourced from trusted brands with official warranty support.",
    icon: FiShield,
  },
  {
    title: "Same Day Delivery",
    description:
      "Get your order delivered quickly across Vapi with convenient local delivery.",
    icon: FiTruck,
  },
  {
    title: "Official Brand Warranty",
    description: "Purchase with complete confidence backed by manufacturer warranty.",
    icon: FiCheckCircle,
  },
  {
    title: "Easy EMI Options",
    description: "Flexible EMI plans available on selected smartphones and premium devices.",
    icon: FiCreditCard,
  },
  {
    title: "Expert Guidance",
    description: "Our experienced team helps you choose the perfect device based on your needs.",
    icon: FiUsers,
  },
  {
    title: "After Sales Support",
    description:
      "We're here even after your purchase for assistance, accessories and support.",
    icon: FiHeadphones,
  },
];

export default function WhyChooseUs() {
  return (
    <section className="why-choose-us" aria-labelledby="why-choose-title">
      <div className="why-choose-container">
        <p className="section-label">Why Choose Us</p>
        <span className="section-accent" aria-hidden="true" />
        <h2 id="why-choose-title">Why Choose The Cellphone Studio?</h2>
        <p className="why-choose-description">
          We bring you genuine smartphones and accessories with expert guidance, trusted
          service, and quick local delivery across Vapi.
        </p>

        <div className="why-choose-grid">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article className="why-choose-card" key={feature.title}>
                <span className="why-choose-icon" aria-hidden="true">
                  <Icon />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            );
          })}
        </div>

        <Link className="why-choose-cta" href="/about" aria-label="Learn more about us">
          Learn More About Us →
        </Link>
      </div>
    </section>
  );
}
