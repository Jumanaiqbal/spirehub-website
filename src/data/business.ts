/**
 * Canonical NAP (Name / Address / Phone) for Spire Hub.
 * Keep this in sync with the Google Business Profile, Letswork, Coworker,
 * and the JSON-LD in index.html.
 */
export const business = {
  name: "Spire Hub",
  legalName: "Spire Hub W.L.L.",
  phone: "+973 17780888",
  phoneHref: "tel:+97317780888",
  email: "hub@spire.bh",
  address: {
    line1: "Building 2740, Road 3649",
    locality: "Seef",
    region: "Capital Governorate",
    country: "Bahrain",
    countryCode: "BH",
    plusCode: "6GRJ+62 Seef",
  },
  /** Google Maps place link (plus code). */
  mapUrl: "https://www.google.com/maps/search/?api=1&query=6GRJ%2B62+Seef+Bahrain",
  // Approximate — derived from the plus code. Verify against the Google
  // Business Profile pin before relying on it for the map pack.
  geo: { latitude: 26.2372, longitude: 50.5407 },
  openingHours: "Sun-Thu 09:00-18:00",
} as const;

/** One-line address for display. */
export const addressLine = `${business.address.line1}, ${business.address.locality}, ${business.address.country}`;

const SITE_URL = "https://spire.bh";

/**
 * Shared LocalBusiness / CoworkingSpace JSON-LD. `extra` lets a page narrow
 * the type or add offerings (e.g. the meeting-rooms page).
 */
export function localBusinessJsonLd(
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "CoworkingSpace"],
    name: business.name,
    legalName: business.legalName,
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/logo.png`,
    image: `${SITE_URL}/og-image.jpg`,
    telephone: business.phone,
    email: business.email,
    priceRange: "BHD 35–250 / month",
    address: {
      "@type": "PostalAddress",
      streetAddress: business.address.line1,
      addressLocality: business.address.locality,
      addressRegion: business.address.region,
      addressCountry: business.address.countryCode,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: business.geo.latitude,
      longitude: business.geo.longitude,
    },
    hasMap: business.mapUrl,
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
      opens: "09:00",
      closes: "18:00",
    },
    sameAs: [
      "https://www.linkedin.com/company/injazee/",
      "https://www.instagram.com/spire.hub/",
      "https://www.tiktok.com/@spire.hub",
    ],
    ...extra,
  };
}
