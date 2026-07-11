# CARE Library website v0.1

A deliberately small, dependency-free static landing page for `carelibrary.org`.

## Included files

- `index.html` — semantic one-page website with metadata and JSON-LD
- `styles.css` — responsive design without external libraries
- `robots.txt` — permits crawling and identifies the sitemap
- `sitemap.xml` — canonical public URLs
- `llms.txt` — concise machine-readable project guide
- `site.webmanifest` — basic site metadata
- `favicon.svg` — lightweight icon
- `CNAME` — GitHub Pages custom-domain file

## Recommended domain arrangement

Use `carelibrary.org` as the canonical domain.

Redirect:
- `www.carelibrary.org` → `https://carelibrary.org/`
- `carelibrary.co.uk` → `https://carelibrary.org/`
- `www.carelibrary.co.uk` → `https://carelibrary.org/`

Do not serve separately indexable copies on both domains.

## After the site is live

1. Verify `/robots.txt`, `/sitemap.xml` and `/llms.txt`.
2. Add the domain to Google Search Console.
3. Submit `https://carelibrary.org/sitemap.xml`.
4. Optionally add the site to Bing Webmaster Tools.
5. Keep homepage facts aligned with the GitHub repository.

`llms.txt` is an emerging convention, not a guarantee of AI indexing or citation.
