import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./design-system.css";

export const metadata: Metadata = {
  title: {
    default: "OurValleys",
    template: "%s | OurValleys",
  },
  description:
    "Discover local businesses, places and useful information across Rhondda Cynon Taf.",
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
