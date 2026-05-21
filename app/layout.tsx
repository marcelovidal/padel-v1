import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Barlow_Condensed, Instrument_Serif } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { GaPageViewTracker } from "@/components/analytics/GaPageViewTracker";
import { GA_MEASUREMENT_ID } from "@/lib/analytics/gtag";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-display",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PASALA",
  description: "Sistema de gestión de pádel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* No-flash theme script — runs before React hydration */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('pasala-theme')||'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();` }} />
      </head>
      <body className={`${plusJakarta.variable} ${barlowCondensed.variable} ${instrumentSerif.variable} antialiased`}>
      <ThemeProvider>
        {GA_MEASUREMENT_ID ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
              `}
            </Script>
            <Suspense fallback={null}>
              <GaPageViewTracker />
            </Suspense>
          </>
        ) : null}
        {children}
        <Toaster />
      </ThemeProvider>
      </body>
    </html>
  );
}


