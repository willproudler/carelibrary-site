# CARE Library Beta

This release adds an approved-account beta to the current CARE Library at https://carelibrary.org. Discover is the public homepage. The library, native reader, reading files, and covers require a server session. Requests for access collect a name and email and notify **willproudler@gmail.com** and **ianwenzelgaray@gmail.com**; submitting a request does not create an account.

The current exported collection and reader are retained, including chunk loading, saved readings, translations, and the quick start guide. The request page uses the small “Join the beta” heading. Existing reading links keep their destination after login.

## Run and verify

Requires Python 3.12 and Node 24. Install `requirements-server.txt`, `requirements-build.txt`, and `httpx==0.28.1` for tests.

```sh
python tools/build-production-site.py
python -m unittest discover -s tests -p 'test_production*.py'
```

The build copies an explicit browser-file allowlist into `dist/`, verifies the repository's split collection, creates smaller covers and on-demand reading files, and updates browser cache versions. It does not read a private CARE workspace or copy server code, account databases, environment files, or local setup helpers. Only `dist/` is a valid production web root.

For the full reader regression suite, materialize the reviewed catalogue in a disposable checkout first:

```sh
node tools/materialize-public-library.mjs
node tools/build-public-assets.mjs
node --test tests/*.test.mjs
```

Materialization changes `data/library.json` from its committed split-file manifest to the exact verified export. Do not commit that generated file. The production build materializes its own copy inside ignored `dist/`.

## Production hosting

GitHub Pages cannot run the login server. `render.yaml` prepares a single Python web service in Frankfurt with a 1 GB persistent disk. Hosting creation requires the owner's cost and workspace approval. No account or email password is committed. The service is prepared with automatic deployment off until the cutover is verified.

Required settings:

| Setting | Value |
| --- | --- |
| `CARE_PUBLIC_ORIGIN` | `https://carelibrary.org` |
| `CARE_ADDITIONAL_ORIGINS` | Defaults at startup to Render's exact `RENDER_EXTERNAL_URL`; explicitly include it and `https://www.carelibrary.org` if attaching www |
| `CARE_WEB_ROOT` | Absolute path to the built `dist` directory; supplied by the start command |
| `CARE_DATABASE_PATH` | `/var/data/care/accounts.sqlite3` on the persistent disk |
| `CARE_TRUSTED_PROXY_CIDRS` | Verified Render reverse-proxy ranges; confirm the staging chain before cutover |

Start with the command in `render.yaml`: one Uvicorn worker, proxy parsing disabled in Uvicorn, and the application's explicit trusted-proxy handling enabled. Do not serve the repository with a static server or deploy it to Pages. `/healthz` is a process health check. `/readyz` also requires a configured mail sender and an enabled account; it is not an SMTP delivery test.

### Email and accounts

Set the Gmail app password privately in Render's environment settings as `CARE_BETA_SMTP_PASSWORD`. The blueprint supplies Gmail SSL on port 465, with `willproudler@gmail.com` as the sender and username. Google requires an eligible account with two-step verification. Never paste a password into chat, source code, or a shell command. Recipients are fixed in the server, not supplied by the applicant.

Create the first fresh production account from the service's private shell:

```sh
CARE_WEB_ROOT="$PWD/dist" python -m server.manage add-user --email willproudler@gmail.com --name "Will Proudler"
```

The command asks for the password privately. Use `reset-password` or `disable-user` for ongoing management. These actions invalidate existing sessions. Invite approved applicants manually; no automatic access is granted by the form. Do not copy local preview accounts into production.

The database contains account password hashes, hashed sessions, rate limits, and access requests. Keep it on the persistent disk, restrict administrative access, and back it up before changes. This SQLite configuration is for one instance; do not add replicas against separate copies. Browser bookmarks stay on the browser/device and are scoped to the signed-in account. Existing anonymous bookmarks are retained but not assigned to another person's account.

### Domain cutover

1. Create the reviewed Render service after approval, with its persistent disk and private email settings. The start command allows its actual Render HTTPS URL for staging and health checks.
2. Create an enabled account. Verify login/logout, rejected anonymous file requests, access-request delivery, and the proxy/IP handling at the Render URL. An unavailable mail service must never report that a message was sent.
3. Add `carelibrary.org` (and `www` if used) in Render. Change only the website records at Namecheap to the exact targets Render supplies; preserve mail and verification records. Wait for domain verification and TLS.
4. Verify the same behavior at the custom domain, then disable the former GitHub Pages site so its alternate URL cannot bypass login. Merge this release's workflow change before resuming normal publishing. The workflow now verifies the app and never uploads protected files to Pages.
5. Once the migration is verified, select the intended deployment branch and enable automatic deployments if desired. Keep the persistent database through future releases.

This protects the hosted beta going forward. Previously published readings remain in this repository's public history; login cannot retroactively make those copies confidential. Do not change repository visibility or remove publication history without a separate decision by the owner.

## Collection and reader updates

The source collection is already reviewed and versioned in this repository. `PUBLICATION_NOTES.md` and `data/export-audit.json` retain provenance. Original passages and saved AI-assisted interpretations remain distinct; a recorded reference is not proof of interpretive correctness.

Future exports must target this current repository and preserve `index.html` as Discover, `library.html` as the reader, and their session-aware boot modules. The production build updates cache references for both entry points, so no private workspace exporter is needed for this migration. Do not re-export stale local copies over the latest live catalogue.
