import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { preload } from "react-dom";
import { LocaleProvider } from "@/lib/i18n/client";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getChosenLocale, getTranslator } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/translate";
import { getSiteUrl } from "@/lib/site";
import "./fonts.css";
import "./globals.css";
import "./design-system.css";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getTranslator();
  const description = t("meta.description");

  return {
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
      locale: LOCALE_DETAILS[locale].openGraph,
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
}

export const viewport: Viewport = {
  themeColor: "#173f35",
};

export default async function RootLayout({
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

  const [{ locale }, chosen] = await Promise.all([
    getTranslator(),
    getChosenLocale(),
  ]);

  // The document language stays English: most routes are not translated yet.
  // Translated regions (header, footer, hero, directory) carry their own
  // lang attribute so assistive technology pronounces them correctly.
  return (
    <html lang={LOCALE_DETAILS.en.htmlLang}>
      <body>
        <LocaleProvider
          locale={locale}
          messages={getMessages(locale)}
          chosen={chosen}
        >
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
