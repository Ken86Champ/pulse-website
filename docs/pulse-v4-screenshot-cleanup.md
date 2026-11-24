# PULSE V4 screenshot cleanup — 24 November 2026

Base: approved deployment 9ef0ae4ld, commit 182f30f. The later font replacement/reference rebuild is excluded.

Removed only the user-marked hero price repetition, 10X/Ken origin strip, repeated privacy footnote, and two notes below the pricing CTA. The actual price remains visible in the offer; trial conditions remain in FAQ and the gated trial page. The single global preview notice remains.

Closing section now follows the supplied and visualized dark violet reference: subtle grid, original app screenshot in a proportioned phone frame, a compact floating card and one seven-day-test CTA. No Store buttons, download claims or extra conversion destinations were added. Existing font family and size rules are retained. The footer uses the existing heartbeat logo; the privacy heading inherits the same existing fallback font stack.

Validation: canonical DOM comparison confirms all main content and markup outside the requested deletions and closing section are unchanged. Source checks passed, 34 existing tests passed. Eight browser widths (320, 375, 390, 430, 768, 1024, 1280, 1440px) show no page-wide horizontal overflow. All requested removed DOM blocks are absent and four conversion CTAs still share the gated trial route. Desktop/mobile closing visuals and English labels reviewed.

Live index, onboarding, trial page and payment backend are unchanged. The seven-day trial remains disabled. The source change is preview-only.
