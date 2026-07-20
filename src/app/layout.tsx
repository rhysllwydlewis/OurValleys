import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";
import "./design-system.css";
import "./home-compact.css";

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
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
