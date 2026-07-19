import type { Metadata } from "next";
import "./globals.css";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "OurValleys — Find what is local", template: "%s | OurValleys" },
  description: "Discover local businesses and useful information across Rhondda Cynon Taf.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB">
      <body className="flex min-h-screen flex-col bg-stone-50 text-slate-950">
        <a href="#main-content" className="sr-only z-50 bg-white p-3 focus:not-sr-only focus:fixed focus:top-3 focus:left-3">Skip to main content</a>
        <SiteHeader />
        <main id="main-content" className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
