# CARE Library Beta

CARE Library Beta at https://carelibrary.org. It uses the original app’s shelf and study-desk renderer against the published collection. GitHub Pages serves it without a private application server, API key or account. A Pages workflow prepares lightweight delivery files and verifies the release before publishing.

Chapter and sheet titles open searchable jump menus. Dragging a chapter rail previews its heading before loading the reading on release. The workspace keeps every visible reading in a closeable tab; comparison menus can close the lateral or choose which book to keep. The wordmark and joined-box logo match the Mac loading screen, and browser icons use the Mac app artwork.

- `index.html`: native library shelf and reading workspace. Kant, Hume, Bergson, saved Kant–Hume lateral, source/CH/CL/MC/WB panes, chapter rails, outline strips, routes, reading skins, local search and bookmarks.
- `welcome.html`: compatibility redirect to the same native library.
- `about.html`: minimal Discover CARE page with the working native reader, a stable Hume map, a searchable books-only reading chooser, and the featured published lateral in the “Compare two books” card, a compact “180+ languages” section with examples and translation context, and plain explanations of laterals and corpuses.
- `library.html`: compatibility redirect to the public library.

The Discover CARE hero opens the supplied quick start guide in a new tab using the browser's PDF viewer. Share **[CARE quick start guide](https://carelibrary.org/quick-start.pdf)** in emails. `quick-start.pdf` is the original supplied PDF, served directly with no download attribute or embedded viewer; keep this URL stable when replacing the guide.

The public site has two pages: the Library and Discover CARE. Both run without a bottom banner or footer navigation. Retired statement, rights and inactive beta pages are preserved in Git history and in a local archive outside this published directory; they are no longer served or included in the sitemap.

`native/study-desk.mjs` and its stylesheet are exact exports of the app’s `STUDY_DESK_JS` and `STUDY_DESK_CSS`. `native/reference-viewer.*` comes from the app’s reference viewer, with one compatibility fix for keyboard event targets across the standalone desk’s ShadowRoot. Version manifests record the asset hashes. `native/public-scope.css` hides controls that do not apply to this fixed collection. `public-app.mjs` supplies public navigation and browser-local preferences; `public-reader-adapter.mjs` projects the published JSON into the original reader’s payload contract. It never queries the private catalogue or starts an AI run.

`native/reading-views.mjs` is generated from this public collection through the app’s reading presentation code. It hides processing tags, separate relation/inheritance fields and inline trace wrappers, and uses known sheet titles in place of technical identifiers. Each view is matched to the exact item ID and original wording, including saved translations. Canonical text, generation inputs, reference IDs and Routes remain intact. Refresh the native export whenever the public collection or reading cleanup changes.

The only public data are the sealed KPR, THN and MEMA readings plus XR_KPR_THN R01. All 79 CARE sheets, 53 source sections and 53 saved lateral claims are retained. The exporter checks immutable artifact hashes, explicit fields and closed references. Kant’s supplemental grounding preserves the original wording and has 2,669 aligned claims and 23 unresolved claims. AI passage links remain unreviewed; a trace does not establish interpretive correctness.

To refresh from the private CARE workspace, run these with its Python environment:

```sh
python tools/export_public_library.py /path/to/care-workspace --require-kant-grounding
python tools/export_native_reader.py /path/to/care-workspace
node tools/export_showcase.mjs
node --test tests/*.test.mjs
```

The export tools are preparation utilities, never part of a visitor’s interaction. Do not publish the private workspace, credentials, source EPUB containers, unrelated works or commercial cover images. Future source editions need their own provenance and rights review. See `PUBLICATION_NOTES.md` and `data/export-audit.json`.

Prepare the local preview with `python3 tools/optimise-covers.py` (Pillow required) and `node tools/build-public-assets.mjs`, then run `python3 -m http.server 4173 --bind 127.0.0.1` in this website directory. Open http://127.0.0.1:4173. Serve this directory only. Before release, check native panes, source routes, outline expansion, saved lateral, reference viewer, bookmarks, search, keyboard controls and mobile layout. Preserve `CNAME` and existing Pages settings.

The October 5 release adds Bergson’s original French *Matière et mémoire* (six source sections and nine CARE sheets, sealed WB R002). Its absent MC level stays absent. The shelf derives each book’s language and layers from the export. Lateral membership comes only from its pinned parents, so adding Bergson does not change the Kant–Hume comparison. Reader assets are synced from `care-study-desk/1.73`.

The supplied Kant, Hume and Bergson PNG covers appear on the native shelf; the lateral combines its two parent covers. The same translation icon and FR/EN pane menus as the main app switch between the original reading and explicitly pinned saved translations. The toolbar follows the focused pane. Five Bergson CARE sheets have saved English machine translations (four chapters and the whole-book reading); its other four sheets and all source passages remain French. Changing language keeps canonical reference IDs and source routes. Visitors cannot create translations or other new readings.

## Beta loading and Saved library

The shelf reads `data/catalogue.json`; opening a book fetches only its immutable, content-addressed delivery file. Full-library search loads the collection on demand. Discover shares the same loader and initially loads Hume. The canonical `data/library.json` remains unchanged and is still the export input. The delivery files and compressed cover copies are generated at release time, so publishing a new book or translation automatically updates them.

Saved readings open as a closeable red **Saved library** workspace tab, alongside books and fields. Existing browser bookmarks and favourites are retained, including entries temporarily absent from the public collection. Saved panes and axioms reopen at their exact location. Bookmarks remain local to the browser and device; this does not add Mac/browser sync.

Requests have time limits and retry controls. A transient failure cannot erase saved readings or replace a good reading file. The reader prepares viewer references only for its current panes, instead of every item in the collection. A refresh control recovers sessions left open across a newer publication.

GitHub Pages must use **GitHub Actions** as its build source. `.github/workflows/pages.yml` prepares delivery files, runs `node --test tests/*.test.mjs`, uploads the site and deploys it with the existing CNAME. A failed build does not replace the previous live site.
