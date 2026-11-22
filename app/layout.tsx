import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { CaseProvider } from "../components/CaseProvider";
import "./globals.css";

// Fonts are vendored (OFL) so the app never contacts a font CDN.
const serif = localFont({
  src: [{ path: "./fonts/Newsreader.woff2", style: "normal" }, { path: "./fonts/Newsreader-Italic.woff2", style: "italic" }],
  weight: "200 800", variable: "--font-serif", display: "swap",
});
const sans = localFont({ src: "./fonts/IBMPlexSans.woff2", weight: "100 700", variable: "--font-sans", display: "swap" });
const mono = localFont({
  src: [{ path: "./fonts/IBMPlexMono-Regular.woff2", weight: "400" }, { path: "./fonts/IBMPlexMono-Medium.woff2", weight: "500" }],
  variable: "--font-mono", display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Second Opinion: read your hospital bill line by line", template: "%s · Second Opinion" },
  description: "Read an itemized hospital bill line by line, see which charges are worth questioning and why, and draft a letter to the billing office.",
};

export const viewport: Viewport = { themeColor: "#eceeec" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <CaseProvider>{children}</CaseProvider>
      </body>
    </html>
  );
}
