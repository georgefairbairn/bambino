// Validate at module load so deploys fail loudly when CLERK_JWT_ISSUER_DOMAIN
// is missing, instead of silently producing a backend where every authenticated
// query returns null. Set with:
//   npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-clerk-frontend-api>
const domain = process.env.CLERK_JWT_ISSUER_DOMAIN;
if (!domain) {
  throw new Error(
    'Missing CLERK_JWT_ISSUER_DOMAIN env var. Set it via `npx convex env set CLERK_JWT_ISSUER_DOMAIN <https://...>`',
  );
}

export default {
  providers: [
    {
      domain,
      applicationID: 'convex',
    },
  ],
};
