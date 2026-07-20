import type { Metadata } from "next";
import type { ReactNode } from "react";
import { preload } from "react-dom";
import { getSiteUrl } from "@/lib/site";
import "./fonts.css";
import "./globals.css";
import "./design-system.css";

const description =
  "Discover local businesses, places and useful information across Rhondda Cynon Taf.";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: "OurValleys",
    template: "%s | OurValleys",
  },
  description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: "OurValleys",
    title: "OurValleys",
    description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "OurValleys",
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  preload("/fonts/instrument-sans-latin.woff2", {
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  });
  preload("/fonts/newsreader-latin.woff2", {
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  });

  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
