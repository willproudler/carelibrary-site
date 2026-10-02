# CARE Library website

The dependency-free public showcase at https://carelibrary.org, hosted through the existing GitHub Pages setup. The private CARE application and its database are not part of this repository.

## Pages

- `index.html`: reading-room introduction, interactive Source / CH / CL / MC / WB tour, library forms, source-to-reading journey and project resources.
- `library.html`: the planned public-domain library, explicitly open without an account. No collection is released here yet.
- `beta.html`: separate future beta entrance, discoverable through quiet footer links. All credential controls are disabled; there is no form, authentication, network request or storage.
- `why-care.html`: the project’s original philosophical statement, with updated navigation.
- `rights.html`: source and edition rights, publication boundaries and official guidance.
- `PUBLICATION_NOTES.md`: release and future-integration considerations.

`site.js` controls a small local demonstration only. Every route in its linear example retains intermediate layers; Read view scrolls across long routes, Outline shows all scales, and mobile stacks the panes. It does not call any API. Demo source text, interpretations and shelf titles were created for this tour, are labelled as illustrative, and are not a live public catalogue or a CARE analysis run. The cover designs are typographic elements, not third-party book artwork.

## Preview

Run `python3 -m http.server 4173 --bind 127.0.0.1` here, then visit http://127.0.0.1:4173. No install or build step is required. Keep the server restricted to this website directory.

Check the five reading scales, route open/close, Outline/reopen, four shelf modes, links, mobile layout and disabled beta controls before publishing. Preserve `CNAME` and the GitHub Pages configuration. No account service or private library should be connected as part of a presentation-site update.

Canonical domain: `carelibrary.org`; existing redirects and domain settings are preserved. `llms.txt` is an emerging convention, not a guarantee of indexing or citation.
