# CARE Library Public

The public edition of CARE Library at https://carelibrary.org. It uses the original app’s shelf and study-desk renderer against a fixed export of two books. GitHub Pages serves it without a private application server, API key, account, or build step.

- `index.html`: native library shelf and reading workspace. Kant, Hume, saved lateral, source/CH/CL/MC/WB panes, chapter rails, outline strips, routes, reading skins, local search and bookmarks.
- `welcome.html`: preserved designed two-book entrance.
- `about.html`: preserved literary showcase using actual saved CARE examples.
- `why-care.html`: philosophical statement.
- `rights.html`: source editions, grounding limitations and publication boundaries.
- `library.html`: compatibility redirect to the public library.
- `beta.html`: separate inactive beta entrance, linked quietly from the footer. No credentials can be submitted.

`native/study-desk.mjs` and its stylesheet are exact exports of the app’s `STUDY_DESK_JS` and `STUDY_DESK_CSS`. `native/reference-viewer.*` comes from the app’s reference viewer, with one compatibility fix for keyboard event targets across the standalone desk’s ShadowRoot. Version manifests record the asset hashes. `native/public-scope.css` hides controls that do not apply to this fixed collection. `public-app.mjs` supplies public navigation and browser-local preferences; `public-reader-adapter.mjs` projects the published JSON into the original reader’s payload contract. It never queries the private catalogue or starts an AI run.

The only public data are the sealed KPR and THN readings plus XR_KPR_THN R01. All 70 CARE sheets, 47 source sections and 53 saved lateral claims are retained. The exporter checks immutable artifact hashes, explicit fields and closed references. Kant’s supplemental grounding preserves the original wording and has 2,669 aligned claims and 23 unresolved claims. AI passage links remain unreviewed; a trace does not establish interpretive correctness.

To refresh from the private CARE workspace, run these with its Python environment:

```sh
python tools/export_public_library.py /path/to/care-workspace --require-kant-grounding
python tools/export_native_reader.py /path/to/care-workspace
node tools/export_showcase.mjs
node --test tests/public-library.test.mjs
```

The export tools are preparation utilities, never part of a visitor’s interaction. Do not publish the private workspace, credentials, source EPUB containers, unrelated works or commercial cover images. Future source editions need their own provenance and rights review. See `PUBLICATION_NOTES.md` and `data/export-audit.json`.

Preview with `python3 -m http.server 4173 --bind 127.0.0.1` in this website directory. Open http://127.0.0.1:4173. Serve this directory only. Before release, check native panes, source routes, outline expansion, saved lateral, reference viewer, bookmarks, search, keyboard controls and mobile layout. Preserve `CNAME` and existing Pages settings.
