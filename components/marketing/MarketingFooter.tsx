import Link from "next/link";
import {
  OPERATOR_LOCATION,
  OPERATOR_TRADING_AS,
  PUBLIC_CONTACT_EMAIL,
} from "@/lib/config";
import { GUIDES } from "@/lib/guides";
import "./marketing-footer.css";

/**
 * The public site's footer. ONE definition, on every public page: home,
 * pricing, contact and the legal pages.
 *
 * ── WHO, WHERE, AND HOW TO REACH THEM ──
 * Until 21 Nov 2026 no page said who runs Postbox or gave an email address,
 * and the privacy policy told people to "contact your account provider". A
 * small business deciding whether to hand over its customer email reasonably
 * wants to know there is a person behind it, and UK GDPR asks a privacy
 * notice for the controller's identity and contact details. Jordan's call:
 * "Jordan Grieve, trading as Postbox", and hello@postbox.help.
 *
 * The town, not a street address: a sole trader's address is their home, and
 * nothing requires it to be published.
 */
export default function MarketingFooter() {
  return (
    <footer className="mkt-footer">
      <div className="mkt-footer-inner">
        <div className="mkt-footer-who">
          <p className="mkt-footer-line">
            Postbox is run by {OPERATOR_TRADING_AS}, in {OPERATOR_LOCATION}.
            The app and its database are hosted in London.
          </p>
          <p className="mkt-footer-line">
            <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`}>{PUBLIC_CONTACT_EMAIL}</a>
          </p>
        </div>
        <nav className="mkt-footer-links" aria-label="Footer">
          <Link prefetch={false} href="/">Home</Link>
          <Link prefetch={false} href="/pricing">Pricing</Link>
          <Link prefetch={false} href="/contact">Contact</Link>
          <Link prefetch={false} href="/terms">Terms</Link>
          <Link prefetch={false} href="/privacy">Privacy</Link>
        </nav>
      </div>
      {/* Every guide, from every public page: how search engines find them,
          and how a reader on the homepage finds the comparison they wanted. */}
      <nav className="mkt-footer-links mkt-footer-guides" aria-label="Guides">
        {GUIDES.map((g) => (
          <Link prefetch={false} key={g.path} href={g.path}>
            {g.title}
          </Link>
        ))}
      </nav>
      <p className="mkt-footer-copy">© 2026 Postbox</p>
    </footer>
  );
}
