import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { fileURLToPath } from "node:url";
const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/** Builds the whole app (Demo mode) into ONE html file, for previewing in a Claude artifact. */
export default defineConfig({
  root: r("."),
  plugins: [react(), viteSingleFile()],
  resolve: {
    alias: [
      { find: "next/link", replacement: r("./shims/link.tsx") },
      { find: "next/navigation", replacement: r("./shims/navigation.ts") },
      { find: "@content", replacement: r("../content") },
      { find: "@", replacement: r("../src") },
    ],
  },
  define: { "process.env": "{}" },
  build: { outDir: r("../dist-demo"), emptyOutDir: true, assetsInlineLimit: 100_000_000, chunkSizeWarningLimit: 10_000 },
});
