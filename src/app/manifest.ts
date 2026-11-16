import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

/** Web app manifest: makes the platform installable on Android (Chrome, Samsung Internet) and desktop. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: BRAND.full,
    short_name: BRAND.product,
    description: "Structured B2–C2 English: vocabulary by theme, grammar, reading, speaking and academic writing.",
    start_url: "/dashboard?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#08101F",
    theme_color: "#0E1A33",
    lang: "en",
    categories: ["education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Review", short_name: "Review", url: "/review", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Vocabulary", short_name: "Vocabulary", url: "/vocabulary", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Academic Writing", short_name: "Writing", url: "/writing", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
