import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

const reviews = [
  {
    name: "Ananya Singh",
    time: "4 weeks ago",
    rating: 5,
    review:
      "I had a wonderful experience at The Cellphone Studio. The staff was polite, knowledgeable, and very supportive. They helped me choose the right product and provided excellent service. The shop has a good variety of phones and accessories. I am very satisfied and would definitely recommend this place to others.",
  },
  {
    name: "Jaldeep Patel",
    time: "3 weeks ago",
    rating: 5,
    review:
      "I have been a customer of The Cellphone Studio for a long time. The service experience has always been excellent. The staff is polite and knowledgeable, and they always provide the right advice and great service.",
  },
  {
    name: "Prakash Singh",
    time: "4 weeks ago",
    rating: 5,
    review:
      "The Cellphone Studio’s work is truly excellent. The quality and finishing are both 10 out of 10. The staff is very cooperative and makes sure everything is done perfectly. Highly recommended for the best service.",
  },
  {
    name: "Akash Patel",
    time: "4 weeks ago",
    rating: 5,
    review:
      "It is a very good store and the staff behavior is also very good here. The prices are also quite good.",
  },
  {
    name: "Shivam Jaiswal86",
    time: "4 weeks ago",
    rating: 5,
    review: "Excellent service and genuine products. Highly recommended!",
  },
  {
    name: "Riya Gala",
    time: "4 weeks ago",
    rating: 5,
    review:
      "A great location for new gadgets and smartphones. The staff is superb and the store feels like a family shop. The products are good quality and suitable for long-term use. Highly recommended.",
  },
  {
    name: "Khushi Bhure",
    time: "4 months ago",
    rating: 5,
    review:
      "I purchased an iPhone and honestly it was one of the best deals I have received. The team was professional, helpful, transferred all my data, and made sure the phone was ready to use before handover.",
  },
  {
    name: "Haresh Zinzala",
    time: "4 weeks ago",
    rating: 5,
    review:
      "Recently purchased an Oppo Reno phone and received a very good deal. It was a great experience, and Chirag Bhai and Raju Bhai were extremely helpful.",
  },
  {
    name: "Deepak Yadav",
    time: "3 months ago",
    rating: 5,
    review:
      "The store truly feels like home. The hospitality and service from the team are on another level. A very welcoming and enjoyable shopping experience.",
  },
  {
    name: "Pankaj Pilley",
    time: "8 months ago",
    rating: 5,
    review:
      "Recently purchased an iPhone and received a great deal. The products felt genuine, the service was reliable, and I would highly recommend this store.",
  },
];

// TODO: Replace with the official Google Business Profile reviews URL.
const googleReviewsUrl = "#";

function getInitials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function GoogleReviews() {
  const [visibleCount, setVisibleCount] = useState(3);
  const [trackIndex, setTrackIndex] = useState(3);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const touchStartX = useRef(null);

  const slides = useMemo(
    () => [
      ...reviews.slice(-visibleCount),
      ...reviews,
      ...reviews.slice(0, visibleCount),
    ],
    [visibleCount]
  );

  const activeIndex =
    ((trackIndex - visibleCount) % reviews.length + reviews.length) % reviews.length;

  const move = useCallback((direction, announce = false) => {
    setTransitionEnabled(true);
    setTrackIndex((current) => current + direction);

    if (announce) {
      setAnnouncement(direction > 0 ? "Showing next reviews" : "Showing previous reviews");
    }
  }, []);

  useEffect(() => {
    const tabletQuery = window.matchMedia("(max-width: 1024px)");
    const mobileQuery = window.matchMedia("(max-width: 600px)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updatePreferences = () => {
      const nextVisibleCount = mobileQuery.matches ? 1 : tabletQuery.matches ? 2 : 3;
      setVisibleCount(nextVisibleCount);
      setTrackIndex(nextVisibleCount);
      setTransitionEnabled(false);
      setReducedMotion(motionQuery.matches);
    };

    updatePreferences();
    tabletQuery.addEventListener("change", updatePreferences);
    mobileQuery.addEventListener("change", updatePreferences);
    motionQuery.addEventListener("change", updatePreferences);

    return () => {
      tabletQuery.removeEventListener("change", updatePreferences);
      mobileQuery.removeEventListener("change", updatePreferences);
      motionQuery.removeEventListener("change", updatePreferences);
    };
  }, []);

  useEffect(() => {
    if (hovered || focusWithin || reducedMotion) {
      return undefined;
    }

    const interval = window.setInterval(() => move(1), 5000);
    return () => window.clearInterval(interval);
  }, [focusWithin, hovered, move, reducedMotion]);

  const handleTransitionEnd = () => {
    let resetIndex = null;

    if (trackIndex >= reviews.length + visibleCount) {
      resetIndex = visibleCount;
    } else if (trackIndex < visibleCount) {
      resetIndex = reviews.length + visibleCount - 1;
    }

    if (resetIndex !== null) {
      setTransitionEnabled(false);
      setTrackIndex(resetIndex);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setTransitionEnabled(true));
      });
    }
  };

  const goToReview = (index) => {
    setTransitionEnabled(true);
    setTrackIndex(visibleCount + index);
    setAnnouncement(`Showing reviews starting with ${reviews[index].name}`);
  };

  const handleTouchStart = (event) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const handleTouchEnd = (event) => {
    if (touchStartX.current === null) return;

    const distance = event.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(distance) > 40) move(distance < 0 ? 1 : -1, true);
    touchStartX.current = null;
  };

  return (
    <section className="google-reviews" aria-labelledby="google-reviews-title">
      <div className="google-reviews-container">
        <p className="section-label">Google Reviews</p>
        <span className="section-accent" aria-hidden="true" />
        <h2 id="google-reviews-title">Loved by Customers Across Vapi</h2>
        <p className="google-reviews-description">
          Real experiences from customers who trust The Cellphone Studio for genuine
          products, expert guidance, great service, and reliable mobile shopping.
        </p>

        <div className="reviews-summary">
          <div className="reviews-summary-primary">
            <span className="reviews-summary-stars" aria-label="5 out of 5 stars">
              <span aria-hidden="true">★★★★★</span>
            </span>
            <strong>5.0 Google Rating</strong>
          </div>
          <span className="reviews-summary-customers">Trusted by 670+ Happy Customers</span>
        </div>

        <div
          className="reviews-carousel"
          aria-label="Customer reviews carousel"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocusCapture={() => setFocusWithin(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setFocusWithin(false);
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="reviews-viewport">
            <div
              className={`reviews-track${transitionEnabled ? " transitioning" : ""}`}
              style={{ transform: `translateX(-${trackIndex * (100 / visibleCount)}%)` }}
              onTransitionEnd={handleTransitionEnd}
            >
              {slides.map((review, index) => (
                <div
                  className="review-slide"
                  style={{ flexBasis: `${100 / visibleCount}%` }}
                  key={`${review.name}-${index}`}
                  aria-hidden={index < trackIndex || index >= trackIndex + visibleCount}
                >
                  <article className="review-card">
                    <span className="review-quote" aria-hidden="true">“</span>
                    <div className="review-card-header">
                      <span className="review-avatar" aria-hidden="true">
                        {getInitials(review.name)}
                      </span>
                      <span className="review-person">
                        <strong>{review.name}</strong>
                        <span>{review.time}</span>
                      </span>
                      <span className="google-mark" aria-label="Google">G</span>
                    </div>
                    <div className="review-stars" aria-label={`${review.rating} out of 5 stars`}>
                      <span aria-hidden="true">{"★".repeat(review.rating)}</span>
                    </div>
                    <p>{review.review}</p>
                  </article>
                </div>
              ))}
            </div>
          </div>

          <button
            className="review-arrow review-arrow-previous"
            type="button"
            onClick={() => move(-1, true)}
            aria-label="Show previous reviews"
          >
            <FiChevronLeft aria-hidden="true" />
          </button>
          <button
            className="review-arrow review-arrow-next"
            type="button"
            onClick={() => move(1, true)}
            aria-label="Show next reviews"
          >
            <FiChevronRight aria-hidden="true" />
          </button>

          <div className="review-dots" aria-label="Choose a review slide">
            {reviews.map((review, index) => (
              <button
                className={activeIndex === index ? "active" : ""}
                type="button"
                onClick={() => goToReview(index)}
                aria-label={`Show review ${index + 1} by ${review.name}`}
                aria-current={activeIndex === index ? "true" : undefined}
                key={review.name}
              />
            ))}
          </div>
          <span className="sr-only" aria-live="polite">{announcement}</span>
        </div>

        <Link
          className="google-reviews-cta"
          href={googleReviewsUrl}
          onClick={(event) => event.preventDefault()}
        >
          View All Google Reviews <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
