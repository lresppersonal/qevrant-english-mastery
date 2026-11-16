import { useRoute, navigate } from "./router";
export class NotFoundError extends Error {}
export function notFound(): never { throw new NotFoundError("not found"); }
export function usePathname() { return useRoute(); }
export function useRouter() {
  return { push: (h: string) => navigate(h), replace: (h: string) => navigate(h, true), refresh: () => {}, back: () => history.back() };
}
export function useSearchParams() { useRoute(); const q = location.hash.split("#")[1]?.split("?")[1] ?? ""; return new URLSearchParams(q); }
