import Logo from "../ui/Logo";
import { footerLinks } from "../../data/content";

const socialLinks = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/injazee/",
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 114.127 0 2.063 2.063 0 01-2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/spire.hub/",
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@spire.hub",
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M16.6915026,4.4744748 L16.6915026,11.4744748 C16.6915026,13.762963 15.1272231,15.5744748 13.1272231,15.5744748 C11.1272231,15.5744748 9.5629436,13.762963 9.5629436,11.4744748 L9.5629436,4.4744748 L6.66338994,4.4744748 L6.66338994,11.4744748 C6.66338994,15.5744748 9.70784662,18.9744748 13.5915026,18.9744748 C17.4751586,18.9744748 20.5196152,15.5744748 20.5196152,11.4744748 L20.5196152,7.9744748 C21.6915026,8.8744748 23.1272231,9.4744748 24.6915026,9.4744748 L24.6915026,6.7244748 C23.4272231,6.4744748 22.3572357,5.7744748 21.6915026,4.8744748 C21.0257695,3.9744748 20.5196152,2.9744748 20.5196152,1.7244748 L20.5196152,0.649474762 L17.6215267,0.649474762 C17.6915026,1.68 17.6915026,3.31 16.6915026,4.4744748 Z" />
      </svg>
    ),
  },
];

export default function Footer() {
  return (
    <footer className="bg-spire-light">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-spire-gray">
              Incubate. Elevate. Lead. Bahrain&apos;s home for ambitious startups
              and visionary founders.
            </p>
            <div className="mt-6 flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-spire-gray shadow-sm transition-colors hover:bg-spire-navy hover:text-white"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-spire-navy">Explore</h4>
            <ul className="mt-4 space-y-3">
              {footerLinks.explore.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-spire-gray transition-colors hover:text-spire-navy"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-200 pt-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-spire-gray">
              &copy; {new Date().getFullYear()} Spire Hub. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="/privacy.html" className="text-sm text-spire-gray hover:text-spire-navy">
                Privacy Policy
              </a>
              <a href="/terms.html" className="text-sm text-spire-gray hover:text-spire-navy">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
