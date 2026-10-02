# CARE Library website publication notes

Prepared 2 October 2026. These notes support the website’s public showcase and a later selected public-domain reader, open to everyone without a login. Beta sign-in belongs to a separate version and remains disconnected. These notes are a release checklist, not a legal clearance of the development catalogue.

## Material used in this redesign

The website’s interactive examples use newly written illustrative source text and readings, with original typographic cover designs. Preserve their visible demo labels. The demonstration should explain CARE’s reading experience without suggesting that the sample is a quotation from a named author or an analysis produced by the live service.

The supplied screenshots are references for the interface, palette, panes and routes. They show a private development collection, including commercial covers, modern translations and substantial source text. Do not publish the screenshots or copy their book content into website assets unless that specific use has been reviewed and cleared.

Before release, verify the final asset inventory against these statements. Check HTML, JavaScript fixtures, image files, metadata, social previews and downloadable files. This note does not certify assets added after the redesign.

## Rights review for public material

Maintain one entry per exact edition and distinct asset. Use the project’s existing [CARE public rights manifest schema](https://github.com/willproudler/care-library/blob/main/CARE_PUBLIC_RIGHTS_MANIFEST_SCHEMA_v0.1.md) as the canonical format; map the review information below to that schema rather than creating a competing manifest.

Record:

- Work and asset identifiers; title; author; translator; editor; publisher; publication date; exact edition; source URL or file and retrieval date.
- Separate status for underlying text, translation, editorial additions, cover, illustrations, page layout and any recording or transcript.
- Basis for use: public domain in specified territories, identified open licence, written permission, or a documented exception assessment.
- Evidence: licence version and URL, retained permission, relevant dates and supporting records. “Found online” or “owned ebook” is not a rights basis.
- Allowed uses: public display, quotation, analysis, screenshots, redistribution and downloads, as applicable. Record restrictions, attribution wording, licence conditions, territory and expiry.
- The accompanying CARE reading and the source passages it exposes. Review quoted or closely reproduced expression; an AI-generated analysis is not automatically cleared for publication.
- Decision, reviewer, review date and next review trigger. Keep unresolved items out of the approved public collection.

The planned public collection specifically consists of public-domain editions, checked for the relevant territories. Open-licensed or permission-cleared material, if introduced later, must be identified separately and must not be labelled public domain. Age of the underlying work alone is insufficient: a modern translation or cover may carry separate rights. Copyright status can differ between countries. A free public service is not automatically exempt from copyright rules.

For any quotation exception, assess purpose, necessity, amount, acknowledgement and possible substitution for the original. There is no universal safe word count. Seek qualified advice for uncertain uses before releasing them.

## Activating the public library

`/library.html` is the destination for the primary “Public library” navigation action. It must explain that the public-domain collection is being prepared until the reader is actually available. Public reading must not require an account or beta sign-in. Do not imply that the collection has launched, that the whole development catalogue will be public, or that a launch date has been agreed.

Before connecting that page to a live public reader:

- Confirm the approved public reader URL with the project owner and verify that reading works without an account.
- Create a separate approved public-domain dataset and asset set from the reviewed manifest, with exact editions and territories recorded. Do not connect the website to the private catalogue by default.
- Check that source panes, routes, search results, citations, covers, previews, exports and downloads only expose material allowed for that use. Hidden interface elements are not access controls.
- Verify server-side access and data boundaries for any private material, plus the availability of every public route from a fresh visitor session.
- Confirm actual upload, storage and data-processing behaviour before writing visitor promises about them. Add any necessary privacy information for the service that will actually run. Keep optional features separate from the account-free public reading promise.
- Update availability text and the reader destination together; keep the local demonstration usable. Check desktop and mobile navigation, keyboard access and error states.
- Retain an approved content inventory and a way to withdraw a disputed asset without breaking the rest of the reader.

## Connecting the separate beta

`/beta.html` is discoverable through a quiet “Beta sign in” footer link. Keep it out of the main navigation, hero and primary calls to action. It describes a separate version of CARE. Sign-in is currently disconnected; do not collect credentials, show a working-looking authentication form or route visitors through it to reach the public library.

Before enabling beta sign-in:

- Confirm the separate beta service, sign-in URL and intended access model with the project owner.
- Verify authentication, session handling and account recovery on that service before enabling the link.
- Check that beta content and private user material remain separate from the public-domain collection.
- Ensure the beta page accurately describes availability and actual account and data handling; test sign-in and sign-out in a fresh browser session.
- Retest the public library anonymously to confirm that beta integration has not added an account requirement.

Publishing the showcase, launching the public library and enabling beta sign-in are separate release decisions. These files do not activate either service or publish the site.

## CARE’s own material

Keep records of authorship and ownership for code, website copy, illustrations and commissioned contributions. UK copyright can arise automatically in qualifying original works. The CARE Library name and logo require a separate trade mark assessment if brand registration is pursued; this redesign does not establish availability or registration of the name. Do not label third-party material as CARE-owned, or apply a blanket public-domain statement to the whole site.

## Primary guidance

- [IPO: using another person’s copyright material, licensing and permissions](https://www.gov.uk/using-somebody-elses-intellectual-property/copyright)
- [IPO: copyright duration, translations and new editions](https://www.gov.uk/government/publications/copyright-notice-duration-of-copyright-term/copyright-notice-duration-of-copyright-term)
- [IPO: copyright exceptions, quotation and fair dealing](https://www.gov.uk/guidance/exceptions-to-copyright)
- [IPO: copyright protection in the UK and EU](https://www.gov.uk/guidance/protecting-copyright-in-the-uk-and-eu)
- [UK government: March 2026 report on copyright and artificial intelligence](https://www.gov.uk/government/publications/report-and-impact-assessment-on-copyright-and-artificial-intelligence/report-on-copyright-and-artificial-intelligence)
- [IPO: automatic copyright protection](https://www.gov.uk/copyright/overview)
- [IPO: trade mark eligibility](https://www.gov.uk/how-to-register-a-trade-mark/what-you-can-register)

Recheck current guidance when making release decisions. This is general UK-oriented planning; no individual book, translation or commercial cover has been legally cleared by these notes.
