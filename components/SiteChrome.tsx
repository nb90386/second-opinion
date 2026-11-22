import Link from "next/link";
import { Brand } from "./Brand";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="wrap">
        <Brand />
        <nav className="site-nav" aria-label="Main">
          <Link href="/method">How it checks</Link>
          <Link className="button small" href="/start"><span>Start<span className="hide-sm"> with a bill</span></span></Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <p>
          Second Opinion is a prototype. It helps you ask good questions; it isn&rsquo;t legal, medical or financial advice and can&rsquo;t tell you
          what you owe. Example bills use fictional hospitals, people and prices. Your bill is saved in this browser and checked by this app&rsquo;s server.
        </p>
        <Link href="/method#data">Where your data goes</Link>
      </div>
    </footer>
  );
}
