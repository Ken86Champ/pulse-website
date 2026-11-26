# Final spacing polish — 26 November 2026

Scope: small visual refinements on the B2C, Business and Affiliate landing pages. Existing text, Inter font, headline weights, colours, images, mockups, scripts, links, forms and page order remain byte-for-byte intact. The older index entry receives spacing rules only; its content is not replaced.

Changes:
- B2C customer gallery capped at 1200px instead of 1440px: 16.7% narrower at large desktop widths. Original 14 image sources, crop coordinates, aspect ratios and enlarged-image dialogs retained. Smaller display reduces source-image enlargement; it does not add missing image detail.
- Common outer section padding: 72px desktop, 64px tablet, 48px mobile. Existing page gutters and device interiors preserved.
- Affiliate heading-to-content and process gaps: 32px desktop/tablet, 24px mobile.
- Business section tokens use the same responsive rhythm.

Verification:
- Four HTML files: adding one stylesheet link is the only HTML mutation.
- All original scripts, footer links, CTAs, image URLs and text preserved.
- 132 local page/anchor links checked against repository contents; all targets found.
- All 14 B2C customer cards retained.
- Existing inline JavaScript and customer-carousel JavaScript parse successfully.
- Carousel geometry calculated at 320, 375, 390, 640, 768, 1024, 1440 and 1920px; all 14 cards remain reachable.
- These are source/geometry checks, not browser-rendered tests. Browser execution and screenshot capture were unavailable in this session. Full interactive/visual launch verification remains outstanding.

Deployment: preview branch only. Production is not promoted.

Existing launch dependencies outside this cosmetic change:
- Trial checkout and affiliate portal availability were previously false; their backends are unchanged.
- Calendar booking/notifications require an actual booking/account check; no booking is created by this polish.
