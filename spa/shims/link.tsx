import { forwardRef } from "react";
const Link = forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean; scroll?: boolean }>(
  function Link({ href, prefetch: _p, scroll: _s, ...rest }, ref) {
    const h = href.startsWith("/") ? `#${href}` : href;
    return <a ref={ref} href={h} {...rest} />;
  });
export default Link;
