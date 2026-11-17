/** @type {import("next").NextConfig} */
// NEXT_DIST_DIR lets a second build (e.g. connected to a local Supabase for account tests) sit beside the default one.
export default { reactStrictMode: true, poweredByHeader: false, distDir: process.env.NEXT_DIST_DIR || ".next" };
