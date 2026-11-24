# PULSE V4 final consistency review — 24 November 2026

Scope: personal-v4.html, personal-v4-restoration.css, personal-trial-preview.html. The live index, onboarding and payment backend remain untouched.

## Corrections
- Narrative paragraphs now share 18px/1.65 on desktop and tablet, 16px/1.65 on mobile, including FAQ answers, hero promise and origin strip. Fine print and product UI retain their distinct roles.
- Section H2s use 44px desktop, 38px tablet and 32px mobile, weight 800. H1 remains the primary hero heading.
- Unified both row and column gaps, removed the app grid's excessive minimum height and duplicate stylesheet import.
- Replaced nonfunctional Store placeholders with an accented app-preview panel and an explicit unavailable-download statement; footer now says App-Vorschau.
- Preserved the restored original phone frames, violet graphics and visible 10X Personaltraining attribution and 10X Group operator.
- Aligned preview trial typography and attribution; clarified cancellation FAQ consistently with the planned trial.

## Verification
Browser computed-style comparison at 320, 375, 390, 430, 768, 1024, 1280 and 1440 CSS pixels: visible section H2 sizes/weights match their shared tokens; sampled narrative text sizes match; no page-wide horizontal overflow.
Desktop section screenshots and mobile hero, app, offer and section transitions reviewed. Mobile menu and FAQ expand/collapse, app nutrition tab selected state, and English translation of the new app panel verified in the browser. Browser console observations contained extension metadata errors, not page-script errors.
Independent read-only source reviewers checked copy/trust and CSS role conflicts; their findings were addressed.
Source validation passed. All 34 existing tests passed. Production asset build passed.

## Release boundary
This is a preview, not a launch clearance. The seven-day trial remains unavailable and cannot submit data or trigger payment. Public App Store / Google Play downloads do not exist. No live paid checkout or real coaching session was exercised. Do not publish this preview as the homepage until the trial fulfillment and billing path are enabled and tested, and the owner approves the homepage change.

## Reference correction — same-size hero and screenshot details
The previous review allowed a larger H1; the owner's follow-up explicitly rejected that distinction. H1 and every visible section H2 now share 48px desktop / 38px tablet / 32px mobile and weight 800. Main narrative paragraphs share 16px and 1.65 line height, including restored cards. Smaller labels, legal notes and device UI remain separate roles.

The original named Inter face previously depended on local font availability. A genuine variable Inter font (weights 100–900) is now served locally as a 107KB WOFF2 Latin subset, with its SIL Open Font License. Main and gated trial pages use this same face.

Restored from the owner's original screenshot/source: hero eyebrow, demo nudge, proof line and three chips; video section eyebrow and three accompanying points; complete Coach/Chat/App connecting graphic at #warum-pulse; app eyebrow and three compact benefit rows; section labels; and the original light closing composition with a coaching summary card. The approved trial offer and honest unavailable-download notice remain intact.

Browser measurements at 320, 375, 390, 430, 768, 1024, 1280 and 1440px confirmed equal H1/H2 sizes and bold weights, equal sampled body sizes and no page-wide horizontal overflow. Original phone geometry was not changed. Independent source review found one conflicting grid template, corrected before publishing.
