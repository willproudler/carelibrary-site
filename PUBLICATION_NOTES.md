# Public Kant–Hume reading room — publication notes

Prepared 2 October 2026 at the user's explicit request to publish two public-domain readings with their saved lateral. The full private library is outside this release.

## Export boundary

The website is a static, anonymous reading room. Only two source works, their fixed saved CARE records and XR_KPR_THN R01 are included. No book uploads, generation, credentials, private API, account database, original EPUB containers or third-party cover art are shipped. A footer link leads to an inactive separate beta entrance.

Kant: 20 retained reading sections, 20 CH, 7 CL, 2 MC and 1 WB; 4,188 CARE items. Exact preserved seal: `SEAL_KPR_B9D86551EDC807AAA095`, whole book `WB_KPR@R001`.

Hume: 27 retained reading sections, 27 CH, 9 CL, 3 MC and 1 WB; 4,197 CARE items. Seal: `SEAL_THN_B3917927880001FF07EB`, whole book `WB_THN@R001`.

Lateral: `XR_KPR_THN`, diagnostic R01, 16 August 2026; 53 claims. Its recorded parent pins are those exact whole-book versions. All exported item references resolve within the scoped export. This verifies reference closure, not interpretive correctness or the quality of historical analysis.

The exporter reads only the specified project/seal pairs and checks each artifact's hash. It never resolves generic IDs against unrelated works. This is essential: the live legacy Kant registry has generic MC IDs that can collide with other books. The version preserved in the historical seal is correctly namespaced and is the one used by the lateral.

Hume includes stored passage alignments with their original review labels. Kant now includes supplemental R001 grounding for all 20 preserved chapters: 2,692 claims, 2,669 aligned, 23 unresolved, and 4,107 passage edges. All links remain unreviewed AI alignments. The exporter checks source, chapter JSON/Markdown, frozen item text, alignment and deterministic passage-set hashes/identity; no original prose is rewritten. CARE’s splitter can reflow whitespace and estimate character offsets, so the exporter verifies the full ordered wording after whitespace normalization and does not publish offsets as exact locators. No global database records are overwritten. Do not silently replace either source text or a lateral parent with a newer reading.

## Source rights register

| Asset | Source and edition | Publication basis | Included / excluded |
| --- | --- | --- | --- |
| Kant original text | Gutenberg eText #4280, J. M. D. Meiklejohn translation | Ordinary UK literary term expired: translator died 1902; Gutenberg identifies public domain in USA | Retained 20 reading sections; no claim to print-edition pagination |
| Hume original text | Gutenberg eText #4705; retained import header identifies 10 November 2012 revision | Hume died 1776; ordinary UK literary term expired; Gutenberg identifies public domain in USA | Retained 27 reading sections; original English; not the newer 2025 transcription |
| Book cover designs | Original HTML/CSS typographic designs | Created for this website | No commercial publisher artwork |
| Saved CARE interpretations | Version-pinned KPR and THN sheets plus diagnostic XR | Current user's explicit publication instruction; distinguish these outputs from public-domain source text | No blanket relicensing of the private library |
| Showcase examples | Exact extracts from included Hume and Kant records, with one recorded source-to-WB branch per book | Same restricted export | No fabricated example books or claims |

Rights sources checked on 2 October 2026:

- https://www.gutenberg.org/ebooks/4280
- https://www.gutenberg.org/ebooks/4705
- https://www.gov.uk/copyright/how-long-copyright-lasts
- https://www.gutenberg.org/policy/permission.html
- https://www.gutenberg.org/policy/license.html
- https://wellcomecollection.org/works/y8cabttv (Meiklejohn's 1855 translation publication)

Local provenance audit: 60/60 sampled Kant spans, spread across all 20 source sections, matched the official current eText after punctuation/Unicode normalization. Hume's retained source is an older transcription: 67/81 samples matched directly; remaining distinct samples had identifiable counterparts with transcription corrections, typographical errors or footnote-number changes. This was sampling, not a full textual collation. The public export preserves the source wording used by the saved analyses.

Do not claim worldwide clearance. Do not treat an old author as clearance for a modern translator, editor or cover. Gutenberg attribution is acknowledgement, not endorsement. Underlying public-domain status and rights in CARE analysis, software, website design, database arrangement and marks are distinct. The documentation repository currently licenses documentation only; its future AGPL/ODbL intent does not automatically grant a licence for this implementation or dataset. No new broad licence is asserted by this update.

## Public behaviour

- Home opens on the two-book shelf. Both books open into source/CH/CL/MC/WB panes.
- The actual native study-desk component renders the shelf, normal panes, outline strips, source routes and connected Kant–lateral–Hume track. The native reference viewer supplies exact wording and citations. Public-only navigation supplies a limited shell; unavailable authoring controls are omitted.
- The lateral is a saved diagnostic reading, clearly labelled; clicking it does not start a model run.
- Routes show actual incoming references, AI passage alignments and later uses. All immediate contributors are available, including branching paths. No connection is inferred from similarity or co-membership.
- Search is browser-local over this fixed export. No queries leave the website.
- Source and generated interpretation are independently labelled.
- `welcome.html` preserves the designed two-book entrance, and `about.html` retains the original showcase. `library.html` redirects to the native reading-room homepage.
- Beta is quiet and unconnected; no credentials can be submitted.

## Publication and remaining checks

Preserve the existing `CNAME` and Pages deployment. The release should go to `willproudler/carelibrary-site`, not the separate `care-library` documentation repository.

Eight automated checks pass for the allowlist, all exported references, all 47 source sections and 70 CARE units, immutable reading text, grounding completeness, real showcase chains, native projections, route closure and inert authoring events. Browser review covered the native shelf and panes, outline expansion, source routes, the two-book saved lateral, reference citations and review status, search, saved-reading persistence, and both real showcase examples. The outer page fits a 390px mobile viewport; the native reading track scrolls horizontally within it.

GitHub connector read access worked, but repository writes returned `Resource not accessible by integration`. GitHub Desktop is installed and its Settings → Accounts screen confirmed `willproudler` is signed in. The correct local checkout is now added in GitHub Desktop on branch `website/reading-journey`; publishing and deployment are the remaining release steps. Do not create a new repository or change the domain.


## 5 October 2026 addition

The user explicitly requested publication of the redesigned Discover page, addition of Bergson and synchronisation with the actual shelf and reader. The release allowlist is now KPR, THN and MEMA; the sole saved lateral remains XR_KPR_THN.

Bergson: *Matière et mémoire*, original French, first published 1896; retained transcription identifies the 1939 text described by Les Classiques des sciences sociales. Source: https://classiques.uqam.ca/classiques/bergson_henri/matiere_et_memoire/matiere_et_memoire.html . Bergson died 4 January 1941 (https://www.nobelprize.org/prizes/literature/1927/bergson/biographical/); the UK ordinary literary term is 70 years after death (https://www.gov.uk/copyright/how-long-copyright-lasts). The public export contains the six reviewed main-text sections, not the modern introductory material, EPUB container or its cover. Existing transcription artefacts are preserved as part of the saved reading, rather than silently rewriting its evidence.

Pinned seal: SEAL_MEMA_71BE568F831CC37C00A0. Six RAW, six CH, two CL, no MC, WB_MEMA@R002; 897 CARE items. The exporter verifies the seal’s artifact hashes, reproduces the frozen CH from sealed Markdown, checks the saved source checksum and passage wording, and validates saved alignment identities. No model call or new grounding is run. All references resolve within the three-work export.

The Discover language display comes from the application’s 189-language catalogue. It describes requestable machine translation languages, not equal translation quality, installed prompt localisations, or translation service availability on the static website. The multilingual source collection is English and French. History illustrations were removed at the user’s request. The corpus panel is explicitly a bibliographic selection sketch; it contains no private CARE readings.

## 5 October covers and saved translations

The user supplied three finished PNG covers and explicitly requested their use for the public books and lateral. The PNGs in `assets/covers/` are exact copies; the native lateral tile composes its two member covers. This replaces the original typographic cover treatment documented above.

Five explicitly pinned saved English machine translations of Bergson CARE sheets are included: CH_MEMA_CIDL, CH_MEMA_CID2, CH_MEMA_CID3, CH_MEMA_CI_2 and WB_MEMA. These are translations of CARE analysis, not of the original source text. The exporter verifies canonical source and translation hashes and rejects changed identities, section structure or references. No source translations, other private translations or generation service are exported. Toolbar and pane controls select existing records only; original French remains visible where no translation exists.


## Publication retry

On 5 October 2026, the completed covers and saved-language release was resubmitted after GitHub’s Actions outage left its deployment retry stuck in the queue. This documentation update requests a fresh Pages build of the existing release.
