# CARE source editions

A public book or chapter address opens a standalone document. Library Home opens the workbench. The document contains the source as HTML, with working chapter and passage links before browser enhancements run.

## Reading

Each book opens with its title and author on the same A4 sheet used in CARE Studio Reader. The linked contents and chapter openings have a deeper top margin. The desktop opens at Reader’s 82% scale, with a sheet about 651 pixels wide. Small screens fit the sheet to the available width. The paper, grain, desk lighting, edge and shadow come from Studio’s manuscript styles. Book text uses Reader’s Iowan Old Style stack, with Palatino and Georgia fallbacks. Prose uses justified lines and first-line indents. Verse and deliberate line breaks keep their spacing. Changing text size measures new page breaks. Fit and zoom scale each sheet.

On desktop, the small book icon opens Contents, Pages or Tools over the reading view. Opening and closing the panel keeps the sheet and the current line in place. In long editions, finished pages become readable while later pages are measured. The Pages pane shows reduced copies of the actual sheets and loads them as they approach the visible pane. Tools holds downloads, zoom, language, paper, text size, passage marks, AQ, edition details and the return to the Library. On a phone, swipe inward from the left edge to open the book panel and pinch the page to zoom. The Contents heading on the sheet also opens the panel.

## Library panes

In a source pane, choose **Read clean text** in File or the source reference viewer. The deep-green book light opens Reader at the current passage. **Back to CARE** returns to the same passage in the source pane. The desktop app packages the standalone reader for local use. Public Beta can open the registered canonical edition for the current source. A locally mounted pane can render its authorized text even when a public edition is unavailable.

## Wording, languages and downloads

The public builder reads the attested catalogue through `book_seo.load_attested_library()`. Each offered translation has saved text in every section. Edition details identify recorded translation methods and review status. A real original passage link requires a matching original passage. Translated paragraphs use local reading marks.

AQ applies NFKD, then uppercase. ASCII digits score 0–9 and letters A–Z score 10–35. A dash marks a line with no supported symbols. Measurement uses the visible text and leaves selection intact.

Public PDF, EPUB, Word, Markdown and TXT downloads reproduce the complete selected edition with a title and byline followed by the source text. Recorded section headings keep their original language. Explicit source-navigation references are collected after the text. Supplied rights and attribution appear after the text in TXT and Markdown and in EPUB metadata. Saved translations offer those same five formats in their registered language. Readers can also request copies with saved CARE axioms. These files are generated reading copies. The download registry verifies paths, sizes and hashes against the attested export. Public source routes and downloads follow the Library's access settings.

## Local review

The review includes Hume and both the French and saved English editions of Bergson. The phone preview displays the same Hume reader at 390 pixels. Local Library links in this review open the Beta preview on this Mac.

Run `python tools/export_reader_material.py /path/to/care_machine` when Studio’s paper or shared book typography changes. Adding `--check` verifies that the standalone stylesheet contains the same rules.
