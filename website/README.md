# bambinobaby.xyz

Static marketing site for Bambino: App Store download link, privacy policy, terms of service, and contact email.

```bash
node website/build.mjs   # writes website/public
```

- `src/home.html` is the landing page body; `build.mjs` wraps it (and every page) in the shared header/footer.
- `/privacy/` and `/terms/` are rendered from `docs/privacy-policy.md` and `docs/terms-of-service.md`. Edit the markdown, then rebuild.
- `src/` assets (CSS, icons) are copied to `public/` as-is.

`website/public` is committed so any static host can serve it with no build step. If the host runs a build instead, use `node website/build.mjs` as the build command and `website/public` as the output directory.
