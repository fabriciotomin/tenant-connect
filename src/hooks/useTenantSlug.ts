import { useParams } from "react-router-dom";

/**
 * Returns the current tenant slug from the URL.
 * Use this to build tenant-scoped links.
 */
export function useTenantSlug() {
  const { slug } = useParams<{ slug: string }>();
  return slug || "";
}

/**
 * Returns a function that prepends /t/:slug to paths.
 */
export function useTenantPath() {
  const slug = useTenantSlug();
  return (path: string) => `/t/${slug}${path.startsWith("/") ? path : `/${path}`}`;
}
