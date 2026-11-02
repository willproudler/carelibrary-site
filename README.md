# CARE Library Beta

This release adds an approved-account beta to the current CARE Library at https://carelibrary.org. Beta mode starts on: Discover is the public homepage, and the library, native reader, reading files, and covers require a server session. The owner can switch between this beta setup and an open library using Website settings. Requests for access collect a name and email and notify **willproudler@gmail.com**; submitting a request does not create an account.

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

The beta runs on the existing Render service `carelibrary-beta` in Frankfurt with a 1 GB persistent disk. The approved base hosting cost is $7.25 per month. `render.yaml` targets `main`, with deployments triggered manually and automatic deployment disabled. Preserve this service and its disk through future releases. No account or email password is committed. GitHub Pages cannot run the login server.

Required settings:

| Setting | Value |
| --- | --- |
| `CARE_PUBLIC_ORIGIN` | `https://carelibrary.org` |
| `CARE_ADDITIONAL_ORIGINS` | `https://carelibrary-beta.onrender.com,https://www.carelibrary.org` |
| `CARE_WEB_ROOT` | Absolute path to the built `dist` directory; supplied by the start command |
| `CARE_DATABASE_PATH` | `/var/data/care/accounts.sqlite3` on the persistent disk |
| `CARE_SITE_ADMIN_EMAILS` | `willproudler@gmail.com`; only an enabled, signed-in account on this explicit list can change Website settings |
| `CARE_TRUSTED_PROXY_CIDRS` | Explicit Render reverse-proxy ranges in `render.yaml`; recheck the proxy chain if the hosting network changes |

Start with the command in `render.yaml`: one Uvicorn worker, proxy parsing disabled in Uvicorn, and the application's explicit trusted-proxy handling enabled. Do not serve the repository with a static server or deploy it to Pages. `/healthz` is a process health check. `/readyz` also requires a configured mail sender and an enabled account; it is not an SMTP delivery test.

### Email and accounts

The Gmail app password is configured privately in Render's environment settings as `CARE_BETA_SMTP_PASSWORD`. The blueprint supplies Gmail SSL on port 465, with `willproudler@gmail.com` as the sender and username. Login and a real access-request email to Will have been verified at the Render URL. Access requests go only to **willproudler@gmail.com**; adding another recipient requires an explicit decision. Google requires an eligible account with two-step verification. Never paste a password into chat, source code, or a shell command. Recipients are fixed in the server, not supplied by the applicant.

An enabled production account already exists. Manage accounts from the service's private shell. For a newly approved applicant, replace the example details below with their name and email:

```sh
CARE_WEB_ROOT="$PWD/dist" python -m server.manage add-user --email reader@example.com --name "Approved Reader"
```

The command asks for the password privately. Use `reset-password` or `disable-user` for ongoing management. These actions invalidate existing sessions. Invite approved applicants manually; no automatic access is granted by the form. Do not copy local preview accounts into production.

The database contains account password hashes, hashed sessions, rate limits, and access requests. Keep it on the persistent disk, restrict administrative access, and back it up before changes. This SQLite configuration is for one instance; do not add replicas against separate copies. Browser bookmarks stay on the browser/device and are scoped to the signed-in account. Existing anonymous bookmarks are retained but not assigned to another person's account.

### Switch beta mode on or off

Sign in with the owner account and open **Website settings**, or visit `https://carelibrary.org/site-settings.html`. Change **Beta mode** and save:

| Beta mode | Homepage | Library access |
| --- | --- | --- |
| On (initial setting) | Discover | Approved login required |
| Off | Library | Anyone can browse without login |

The setting is saved in the existing private database and takes effect without a deployment. It survives restarts and later releases. Switching modes never deletes or resets accounts, passwords, sessions, access requests, or saved collections. Signed-in readers retain their account's saves; guests in open mode use the browser's anonymous saves. Website settings always requires an owner login, including when beta mode is off. The login page remains available so the owner can sign in and restore beta mode.

`CARE_SITE_ADMIN_EMAILS` is a comma-separated allowlist of existing approved accounts, not a way to create accounts. An unset list grants nobody access to the switch. The deployed service's configuration and `render.yaml` should contain the same list; update the service with a merge of just this key, preserving its private email settings. The beta on/off value itself belongs to the persistent database, not an environment variable, so deployments do not reset the owner's choice.

Returning to beta mode blocks subsequent guest requests. It cannot recall readings already downloaded while the library was open. Open browser tabs recheck access on focus and periodically.

### Domain status and deployment

The migration completed on 2 November 2026. The Namecheap website records were verified publicly: the apex A record points to `216.24.57.1`, and `www` is a CNAME for `carelibrary-beta.onrender.com`. Both Render custom domains have working TLS, with `www` redirecting to `https://carelibrary.org`. The former GitHub Pages site is unpublished. The existing Render service now deploys `main` manually, with automatic deployment off and the same persistent disk.

At the custom domain, `/healthz`, `/readyz`, `/api/session`, and `/api/access-requests/config` returned 200; the anonymous session was unauthenticated and email configuration was ready. Anonymous requests to `/library.html` redirected to login, and catalogue and native-reader files returned 401. The `www` redirect passed normal TLS verification. The successful account login and real Will-only email test were performed at the Render URL.

For future releases:

1. Keep `.github/workflows/pages.yml` as a verification-only workflow. It verifies the app and never uploads protected files to Pages; keep GitHub Pages unpublished.
2. Review changes and let checks pass on `main`, then trigger deployment manually on the existing Render service. Preserve the persistent database and private email settings.
3. Recheck HTTPS, the `www` redirect, the homepage and anonymous access for the current beta setting, login/logout, owner-only settings, and the access-request form after deployment. Keep the saved mode unchanged during production checks. An unavailable mail service must never report that a message was sent.

This protects the hosted beta going forward. Previously published readings remain in this repository's public history; login cannot retroactively make those copies confidential. Do not change repository visibility or remove publication history without a separate decision by the owner.

## Collection and reader updates

The source collection is already reviewed and versioned in this repository. `PUBLICATION_NOTES.md` and `data/export-audit.json` retain provenance. Original passages and saved AI-assisted interpretations remain distinct; a recorded reference is not proof of interpretive correctness.

Future exports must target this current repository and preserve `index.html` as Discover, `library.html` as the reader, and their session-aware boot modules. The production build updates cache references for both entry points, so no private workspace exporter is needed for this migration. Do not re-export stale local copies over the latest live catalogue.
