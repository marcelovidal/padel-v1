import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { GaPageViewTracker } from "@/components/analytics/GaPageViewTracker";
import { GA_MEASUREMENT_ID } from "@/lib/analytics/gtag";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="es">
      <body className={inter.className}>
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
      </body>
    </html>
  );
}


