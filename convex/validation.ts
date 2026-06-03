// Shared, dependency-free validation helpers used across Convex handlers.
// Kept in its own leaf module so both users.ts and partners.ts can import it
// without creating a circular dependency between them.

// #202: only accept profile image URLs hosted on Clerk's CDN. Clerk normally
// re-hosts SSO/uploaded avatars on its own CDN, but a custom URL set via
// Clerk's update API could point anywhere — and the partner's app loads it in
// an <Image>, leaking their IP/UA/timing to whoever controls the URL. We drop
// (not reject) a non-matching URL: some SSO providers briefly return a
// Google/Apple URL before Clerk re-hosts, and we'd rather show no avatar than
// throw on a legitimate sign-in.
const CLERK_IMAGE_URL_REGEX = /^https:\/\/(img\.)?clerk\.(com|services|dev)\//;

export function sanitizeImageUrl(imageUrl: string | undefined): string | undefined {
  if (!imageUrl) return undefined;
  return CLERK_IMAGE_URL_REGEX.test(imageUrl) ? imageUrl : undefined;
}
