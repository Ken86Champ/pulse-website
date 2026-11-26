# Shared footer cleanup

All 21 standalone public HTML pages with a footer (plus the onboarding page's former loose contract-links row) now use the same static footer component, order, labels and CSS. Embedded product-tour/day components and archived legal versions remain unchanged.

- Duplicate contract-management rows and supplementary affiliate/legal link rows removed.
- Cancellation and withdrawal each have one explicit link in the shared navigation.
- One link labelled `AGBs`: affiliate pages link to `affiliate-agb.html`; all other pages link to `agb.html`.
- B2C, Business, Affiliate, app preview, contact, privacy and other legal destinations stay accessible.
- Page content, headers, scripts, forms, product mockups and existing section spacing are unchanged.
- `scripts/sync-footers.js` generates the static markup; the public build checks that all copies remain synchronized.

Validation: 21 page bodies compared against the previous commit after excluding only the old/new footer, the standalone duplicate row and the new stylesheet link. No other mutations. 231 navigation destinations checked, no repeated destination within a footer. Public build passes and all 34 existing automated tests pass after installing the lockfile dependencies.

Preview only; production is not promoted by this change.
