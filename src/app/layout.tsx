import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/inter";
import "./globals.css";
import { BRAND } from "@/lib/brand";
import { StoreProvider } from "@/components/StoreProvider";
import { ServiceWorkerRegistration, ThemeColorSync } from "@/components/PwaSupport";
import { CookieBanner } from "@/components/CookieBanner";

export const metadata: Metadata = {
  title: { default: BRAND.full, template: `%s · ${BRAND.product}` },
  description: "A structured B2–C2 English learning system: grammar, vocabulary, reading, speaking and academic writing.",
  applicationName: BRAND.product,
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192" }], apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: BRAND.product, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#F5F7FB" }, { media: "(prefers-color-scheme: dark)", color: "#08101F" }],
};

/** Applies the saved or system theme before first paint, so there is no flash. */
const themeScript = `(function(){try{var t=localStorage.getItem('qevrant.theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh bg-bg text-ink">
        <StoreProvider>{children}</StoreProvider>
        <CookieBanner />
        <ServiceWorkerRegistration />
        <ThemeColorSync />
      </body>
    </html>
  );
}
