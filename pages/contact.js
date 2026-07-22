import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import {
  FiCheck,
  FiChevronDown,
  FiClock,
  FiHeadphones,
  FiMail,
  FiMapPin,
  FiMessageCircle,
  FiPhone,
  FiSend,
  FiShield,
  FiSmartphone,
  FiTruck,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/context/AuthContext";
import styles from "@/styles/contact.module.css";

const address =
  "Shop No. 38, The Cellphone Studio, Fortune Landmark, Near ATF Square, Gunjan Road, Vapi, Gujarat – 396195";
const whatsappUrl = `https://wa.me/919377998836?text=${encodeURIComponent("Hello The Cellphone Studio, I need help regarding a product or order.")}`;
const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
const initialForm = {
  name: "",
  phone: "",
  email: "",
  subject: "",
  message: "",
  orderNumber: "",
  website: "",
  consent: false,
};
const categoryFor = {
  "Product Enquiry": "PRODUCT_INFORMATION",
  "Smartphone Availability": "STOCK_AVAILABILITY",
  "Accessories Enquiry": "PRODUCT_INFORMATION",
  "Order Support": "ORDER_SUPPORT",
  "Same-Day Delivery": "DELIVERY_SUPPORT",
  "Store Visit": "GENERAL",
  Other: "OTHER",
};

const contactCards = [
  [
    FiPhone,
    "Call Us",
    "+91 93779 98836",
    "Speak directly with our team for product and order assistance.",
    "Call Now",
    "tel:+919377998836",
    false,
  ],
  [
    FaWhatsapp,
    "WhatsApp Us",
    "Quick Chat Support",
    "Ask about smartphones, accessories, availability, or delivery.",
    "Start Chat",
    whatsappUrl,
    true,
  ],
  [
    FiMapPin,
    "Visit Our Store",
    "Gunjan Road, Vapi",
    "Explore products in person and receive honest expert guidance.",
    "Get Directions",
    directionsUrl,
    true,
  ],
  [
    FiClock,
    "Store Hours",
    "10:00 AM – 10:00 PM",
    "Open every day from Monday to Sunday.",
    "Plan Your Visit",
    "#store-information",
    false,
  ],
];
const faqs = [
  [
    "What are your store timings?",
    "The Cellphone Studio is open Monday to Sunday from 10:00 AM to 10:00 PM.",
  ],
  [
    "Do you provide same-day delivery?",
    "Yes. Same-day delivery is available within Vapi, subject to product availability, delivery location, and order confirmation. Delivery charges are confirmed separately when applicable.",
  ],
  [
    "Can I check product availability before visiting?",
    "Yes. You can call or WhatsApp our team to confirm the availability of a smartphone or accessory before visiting the showroom.",
  ],
  [
    "Do you sell genuine smartphones and accessories?",
    "We focus on genuine products sourced through trusted and authorized channels. Warranty terms may vary by brand and product.",
  ],
  [
    "Can your team help me choose a smartphone?",
    "Yes. Our team can help you compare devices based on your budget, usage, preferred brand, camera needs, performance, battery, and other requirements.",
  ],
  [
    "How can I get directions to the showroom?",
    "Use the Get Directions button on this page to open the store location in Google Maps.",
  ],
];

function validate(values) {
  const errors = {};
  if (values.name.trim().length < 2)
    errors.name = "Please enter at least 2 characters.";
  const normalizedPhone = values.phone.replace(/^\+?91/, "").replace(/\D/g, "");
  if (normalizedPhone && !/^[6-9]\d{9}$/.test(normalizedPhone))
    errors.phone = "Enter a valid 10-digit Indian mobile number.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
    errors.email = "Enter a valid email address.";
  if (!values.subject) errors.subject = "Please select a subject.";
  if (values.message.trim().length < 10)
    errors.message = "Message must contain at least 10 characters.";
  if (!values.consent) errors.consent = "Please agree before submitting.";
  return errors;
}

export default function ContactPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [reference, setReference] = useState("");
  const [orders, setOrders] = useState([]);
  useEffect(() => {
    if (user)
      setForm((current) => ({
        ...current,
        name: current.name || user.name || "",
        email: current.email || user.email || "",
        phone: current.phone || user.phone || "",
        subject: router.query.order ? "Order Support" : current.subject,
        orderNumber: router.query.order ? String(router.query.order) : current.orderNumber,
      }));
  }, [user, router.query.order]);
  useEffect(() => {
    if (!user) return setOrders([]);
    fetch("/api/orders?pageSize=20")
      .then((response) => response.json())
      .then((payload) => setOrders(payload.data?.orders || []))
      .catch(() => setOrders([]));
  }, [user]);

  const updateField = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/contact/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          subject: form.subject,
          category: categoryFor[form.subject] || "GENERAL",
          message: form.message,
          orderNumber: user && form.orderNumber ? form.orderNumber : null,
          website: form.website,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setErrors(payload.error?.fields || {});
        throw new Error(payload.error?.message || "Unable to submit enquiry.");
      }
      setReference(payload.data.enquiryNumber);
      toast.success("Your enquiry has been submitted.");
      setForm({
        ...initialForm,
        name: user?.name || "",
        email: user?.email || "",
        phone: user?.phone || "",
      });
    } catch (error) {
      toast.error(
        error.message ||
          "Something went wrong. Please call or WhatsApp us directly.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Contact Us | The Cellphone Studio Vapi</title>
        <meta
          name="description"
          content="Contact The Cellphone Studio in Vapi for smartphones, accessories, product availability, store directions, order support, and same-day delivery enquiries."
        />
      </Head>
      <main className={styles.page}>
        <section className={styles.hero} aria-labelledby="contact-title">
          <div className={`${styles.container} ${styles.heroInner}`}>
            <div className={styles.heroCopy}>
              <p>Contact The Cellphone Studio</p>
              <h1 id="contact-title">
                Let&apos;s Help You Find the Right Device
              </h1>
              <span>
                Have a question about a smartphone, accessory, order, or
                same-day delivery in Vapi? Our team is ready to help with honest
                guidance and dependable local support.
              </span>
              <div>
                <a href="tel:+919377998836">
                  <FiPhone /> Call Store
                </a>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <FaWhatsapp /> WhatsApp Us
                </a>
              </div>
            </div>
            <div className={styles.heroVisual} aria-hidden="true">
              <span className={styles.visualPhone}>
                <FiPhone />
              </span>
              <span className={styles.visualPin}>
                <FiMapPin />
              </span>
              <span className={styles.visualChat}>
                <FiMessageCircle />
              </span>
            </div>
          </div>
        </section>

        <section
          className={`${styles.container} ${styles.quickCards}`}
          aria-label="Quick contact options"
        >
          {contactCards.map(
            ([Icon, title, value, text, action, href, external]) => (
              <article key={title}>
                <span>
                  <Icon />
                </span>
                <h2>{title}</h2>
                <strong>{value}</strong>
                <p>{text}</p>
                <a
                  href={href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                >
                  {action} <FiSend />
                </a>
              </article>
            ),
          )}
        </section>

        <section
          className={`${styles.container} ${styles.contactSection}`}
          id="store-information"
          aria-labelledby="form-title"
        >
          <div className={styles.formColumn}>
            <p className={styles.label}>Get in Touch</p>
            <h2 id="form-title">Send Us a Message</h2>
            <p>
              Tell us what you need help with and our team will get back to you
              as soon as possible.
            </p>
            {reference && (
              <div className={styles.enquirySuccess} role="status">
                <FiCheck />
                <div>
                  <strong>Enquiry submitted</strong>
                  <span>
                    Your reference is <b>{reference}</b>. Keep it for future
                    communication.
                  </span>
                  {user && (
                    <Link href={`/account/enquiries/${reference}`}>
                      View enquiry
                    </Link>
                  )}
                </div>
              </div>
            )}
            <form onSubmit={handleSubmit} noValidate>
              <input
                className={styles.honeypot}
                type="text"
                name="website"
                value={form.website}
                onChange={updateField}
                tabIndex="-1"
                autoComplete="off"
                aria-hidden="true"
              />
              <div className={styles.fieldRow}>
                <Field
                  label="Full Name"
                  name="name"
                  value={form.name}
                  onChange={updateField}
                  error={errors.name}
                  required
                />
                <Field
                  label="Phone Number"
                  name="phone"
                  value={form.phone}
                  onChange={updateField}
                  error={errors.phone}
                  inputMode="tel"
                />
              </div>
              <Field
                label="Email Address"
                name="email"
                value={form.email}
                onChange={updateField}
                error={errors.email}
                type="email"
              />
              <label className={styles.field}>
                Subject <span>*</span>
                <select
                  name="subject"
                  value={form.subject}
                  onChange={updateField}
                  aria-invalid={Boolean(errors.subject)}
                  aria-describedby={
                    errors.subject ? "subject-error" : undefined
                  }
                >
                  <option value="">Select a subject</option>
                  {[
                    "Product Enquiry",
                    "Smartphone Availability",
                    "Accessories Enquiry",
                    "Order Support",
                    "Same-Day Delivery",
                    "Store Visit",
                    "Other",
                  ].map((subject) => (
                    <option value={subject} key={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
                {errors.subject && (
                  <small id="subject-error" role="alert">
                    {errors.subject}
                  </small>
                )}
              </label>
              {user && orders.length > 0 && (
                <label className={styles.field}>
                  Related Order (optional)
                  <select name="orderNumber" value={form.orderNumber} onChange={updateField}>
                    <option value="">No linked order</option>
                    {orders.map((order) => <option value={order.orderNumber} key={order.orderNumber}>{order.orderNumber} — {order.status.replaceAll("_", " ")}</option>)}
                  </select>
                </label>
              )}
              <label className={styles.field}>
                Message <span>*</span>
                <textarea
                  name="message"
                  rows="5"
                  value={form.message}
                  onChange={updateField}
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby={
                    errors.message ? "message-error" : undefined
                  }
                />
                {errors.message && (
                  <small id="message-error" role="alert">
                    {errors.message}
                  </small>
                )}
              </label>
              <label className={styles.consent}>
                <input
                  type="checkbox"
                  name="consent"
                  checked={form.consent}
                  onChange={updateField}
                  aria-invalid={Boolean(errors.consent)}
                />
                <span>I agree to be contacted regarding my enquiry.</span>
              </label>
              {errors.consent && (
                <small className={styles.consentError} role="alert">
                  {errors.consent}
                </small>
              )}
              <button
                className={styles.submit}
                type="submit"
                disabled={submitting}
              >
                <FiSend /> {submitting ? "Sending..." : "Send Message"}
              </button>
              <span className={styles.srOnly} aria-live="polite">
                {submitting ? "Sending your message" : ""}
              </span>
            </form>
          </div>

          <aside className={styles.storeCard} aria-labelledby="store-title">
            <div className={styles.storeHeading}>
              <span>
                <FiMapPin />
              </span>
              <div>
                <p>Our Showroom</p>
                <h2 id="store-title">Visit The Cellphone Studio</h2>
              </div>
            </div>
            <address>
              <Info icon={FiSmartphone} title="Business Name">
                The Cellphone Studio
              </Info>
              <Info icon={FiMapPin} title="Address">
                Shop No. 38, The Cellphone Studio,
                <br />
                Fortune Landmark, Near ATF Square,
                <br />
                Gunjan Road, Vapi, Gujarat – 396195
              </Info>
              <Info icon={FiPhone} title="Phone">
                <a href="tel:+919377998836">+91 93779 98836</a>
              </Info>
              <Info icon={FiMail} title="Email">
                <a href="mailto:contact@thecellphonestudio.in">
                  contact@thecellphonestudio.in
                </a>
              </Info>
              <Info icon={FiClock} title="Hours">
                Monday – Sunday
                <br />
                10:00 AM – 10:00 PM
              </Info>
              <Info icon={FiTruck} title="Delivery">
                Same-day delivery available within Vapi
              </Info>
            </address>
            <div className={styles.storeActions}>
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                <FiMapPin /> Get Directions
              </a>
              <a href="tel:+919377998836">
                <FiPhone /> Call Store
              </a>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <FaWhatsapp /> WhatsApp Us
              </a>
            </div>
            <p className={styles.trustNote}>
              <FiShield /> Genuine products, honest guidance, and dependable
              local support.
            </p>
          </aside>
        </section>

        <section
          className={`${styles.container} ${styles.mapSection}`}
          aria-labelledby="map-title"
        >
          <div className={styles.sectionHeading}>
            <p className={styles.label}>Find Us</p>
            <h2 id="map-title">Visit Our Showroom in Vapi</h2>
            <span>
              We are located at Fortune Landmark near ATF Square on Gunjan Road,
              Vapi.
            </span>
          </div>
          <div className={styles.mapFrame}>
            <iframe
              src={mapUrl}
              title="Map showing The Cellphone Studio in Vapi"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <a
            className={styles.mapButton}
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FiMapPin /> Get Directions
          </a>
        </section>

        <section className={styles.visit}>
          <div className={`${styles.container} ${styles.visitInner}`}>
            <div className={styles.visitImage}>
              <Image
                src="/images/gallery/showroom-main.jpg"
                alt="The Cellphone Studio showroom interior in Vapi"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div>
              <p className={styles.label}>Visit the Store</p>
              <h2>See, Compare, and Choose With Confidence</h2>
              <p>
                Visit our showroom to explore the latest smartphones and premium
                accessories, compare devices in person, and receive
                recommendations based on your needs and budget.
              </p>
              <ul>
                <li>
                  <FiCheck /> Compare multiple brands in one place
                </li>
                <li>
                  <FiCheck /> Get honest product recommendations
                </li>
                <li>
                  <FiCheck /> Receive support before and after purchase
                </li>
              </ul>
              <Link href="/gallery">Explore Our Gallery</Link>
            </div>
          </div>
        </section>

        <section
          className={`${styles.container} ${styles.faq}`}
          aria-labelledby="faq-title"
        >
          <div className={styles.sectionHeading}>
            <p className={styles.label}>Common Questions</p>
            <h2 id="faq-title">Frequently Asked Questions</h2>
          </div>
          <div>
            {faqs.map(([question, answer], index) => {
              const open = openFaq === index;
              return (
                <article className={open ? styles.faqOpen : ""} key={question}>
                  <h3>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : index)}
                      aria-expanded={open}
                      aria-controls={`faq-panel-${index}`}
                    >
                      {question}
                      <FiChevronDown />
                    </button>
                  </h3>
                  <div
                    id={`faq-panel-${index}`}
                    className={styles.faqPanel}
                    aria-hidden={!open}
                  >
                    <p>{answer}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section
          className={`${styles.container} ${styles.cta}`}
          aria-labelledby="cta-title"
        >
          <div>
            <p>We Are Here to Help</p>
            <h2 id="cta-title">Need Help Before You Visit?</h2>
            <span>
              Call or WhatsApp us to check product availability, compare
              options, or ask about same-day delivery within Vapi.
            </span>
          </div>
          <div>
            <a href="tel:+919377998836">
              <FiPhone /> Call Store
            </a>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <FaWhatsapp /> WhatsApp Us
            </a>
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
              <FiMapPin /> Get Directions
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Field({ label, name, error, required, ...props }) {
  const errorId = `${name}-error`;
  return (
    <label className={styles.field}>
      {label} {required && <span>*</span>}
      <input
        name={name}
        {...props}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <small id={errorId} role="alert">
          {error}
        </small>
      )}
    </label>
  );
}

function Info({ icon: Icon, title, children }) {
  return (
    <div className={styles.info}>
      <Icon />
      <div>
        <strong>{title}</strong>
        <span>{children}</span>
      </div>
    </div>
  );
}
