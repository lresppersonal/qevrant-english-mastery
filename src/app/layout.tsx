import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/inter";
import "./globals.css";
import { BRAND } from "@/lib/brand";
import { StoreProvider } from "@/components/StoreProvider";

export const metadata: Metadata = {
  title: { default: BRAND.full, template: `%s · ${BRAND.product}` },
  description: "A structured B2–C2 English learning system: grammar, vocabulary, reading, speaking and academic writing.",
  icons: { icon: "/icon.svg" },
};
export const viewport: Viewport = {
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
      </body>
    </html>
  );
}
