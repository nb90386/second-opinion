import Link from "next/link";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="wrap">
        <div className="empty-state">
          <h1>This page isn&rsquo;t on the bill.</h1>
          <p>The address may be mistyped, or the page may have moved.</p>
          <Link className="button" href="/">Go to the start</Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
