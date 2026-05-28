# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-05-28
- Primary product surfaces: Home, Shop, Product Detail, Auth, Checkout, Account, Promoter, Admin, Brand Portal.
- Evidence reviewed:
  - `docs/03-ui-ux-spec.md`: customer IA, auth requirements, consent rules, mobile-first commerce principles.
  - `docs/04-design-guide.md`: Playful Discovery + Clean Commerce direction, form guidance, visual-effect guardrails.
  - `src/app/globals.css`: shipK tokens, brand fonts, dotted page texture, chip/button/surface helpers.
  - `src/app/auth/page.tsx`: current account-access route structure.
  - `src/components/auth-form.tsx`: auth mode state, email/password, Google ID token, consent, redirect, and status behavior.
  - `src/components/site-header.tsx` and `src/components/site-header-nav.tsx`: primary nav IA, account menu interaction, icon usage, menu surfaces.
  - `src/components/home-feature-banner.tsx`: current playful storefront rhythm, strong color accents, large readable headings.
  - `src/components/floating-sticker-layer.tsx`: route-specific sticker assets, including auth route decoration.
  - `src/app/brand/layout.tsx`, `src/app/brand/products/page.tsx`, and `src/app/brand/products/[id]/page.tsx`: current brand portal IA for assigned-product editing.
  - `src/components/brand-product-detail-editor.tsx`: current field-heavy brand product detail editor with a narrow live preview.
  - `src/components/product-detail-view.tsx`: customer-facing rendering target for product detail content blocks.
  - `src/lib/brand-product-input.ts` and `src/lib/brand-store.ts`: current brand-editable content schema and persistence boundary.
  - `.omx/context/auth-form-redesign-20260524T134445Z.md` and `.omx/plans/auth-ui-redesign-ralplan.md`: prior auth redesign context; current user decision supersedes the prior two-choice selector plan.
  - `.omx/context/brand-detail-editor-20260528T131133Z.md` and `.omx/interviews/brand-detail-editor-20260528T131133Z.md`: brand detail editor discovery and deep-interview transcript.

## Brand
- Personality: Trend-aware, friendly, affordable, trustworthy, global, clean.
- Trust signals: Clear policy links, visible account/order value, PayPal/security language where relevant, restrained form surfaces, predictable commerce flows.
- Avoid: Luxury editorial styling, translated-marketplace clutter, hidden shipping/return obligations, influencer-only credibility, generic AI-looking gradient/card compositions, repeated right-bottom pop shadows on account/form surfaces.

## Product goals
- Goals: Help US customers discover and buy curated Korean beauty routines, understand shipping/returns, and manage orders or creator/promoter activity. Help brand owners and staff create production-grade, customer-facing product detail stories without needing admin catalog access.
- Non-goals: Full design-system rewrite, heavy marketplace filtering in Phase 1 launch scope, decorative effects that reduce form clarity, brand-side product creation, brand-side price/stock/sales-state control, checkout changes from brand-editor work.
- Success signals: Users can scan products quickly, complete auth/checkout without confusion, see trust information before purchase, navigate account/promoter flows confidently, and brand staff can assemble a polished detail page with text, images, routine sections, and long vertical assets without editing database-like fields.

## Personas and jobs
- Primary personas: US K-beauty shoppers, first-time shipK customers, returning customers checking orders, creators/promoters sharing links, internal operators/admins, brand owners/staff assigned to products.
- User jobs: Find a routine kit, understand what ships from Korea, buy securely, create or access an account, track orders, manage promoter links, operate catalog/order workflows, author and review brand-owned product detail content.
- Key contexts of use: Mobile storefront browsing, checkout interruption, account/order review, creator referral traffic, admin back-office work, brand staff preparing product storytelling assets from copy, product photos, and external design tools such as Figma.

## Information architecture
- Primary navigation: Home, Make up, Skincare, For Sellers, About, account menu, search/shop entry.
- Core routes/screens: Home, Shop, Product Detail, Auth, Checkout, Checkout Success, Account, Orders, Promoter, Policies, Admin, Brand Product List, Brand Product Detail Editor, Brand Reports.
- Content hierarchy: Storefront discovery uses expressive product imagery and collection color; commerce/account/admin flows prioritize task headings, fields, status, policy links, and primary CTA. Brand detail editing should prioritize a document/story canvas over raw data fields; customer preview should be opened intentionally from the editor action area instead of occupying a persistent right pane.

## Design Principles
- Commerce clarity first: Forms, checkout, policies, account, and admin screens must be calm, legible, and explicit before they are decorative.
- Playful where it helps discovery: Use shipK fonts, bright accents, stickers, badges, and collection color to create recognition, but avoid making task surfaces feel like ads.
- One obvious next action: Each flow should make the primary CTA and alternate path easy to find without tab-like controls competing for attention.
- Section-first authoring for brand content: Brand staff should build customer detail pages by arranging meaningful sections, not by filling scattered database fields.
- Hybrid editor model: Keep the page saved as structured sections for reliable rendering, but let individual text/media sections gain editor-like controls such as rich text marks, alignment, spacing, width, and media presentation options.
- Tradeoffs: Auth and checkout may carry small brand accents, but should not use storefront-level visual noise or pop shadows. Brand editing can use richer controls than customer forms, but must stay predictable and keyboard-recoverable.

## Visual language
- Color: White and cream bases with black outlines; shipK pink as the main accent; lime, mint, yellow, blue, and coral as supporting accents. Avoid letting a whole surface become one hue family.
- Typography: Inter for readable commerce text; Archivo Black/brand-heavy for short headings and labels; brand-round/logo styling reserved for logo or playful moments.
- Spacing/layout rhythm: Mobile-first, generous field spacing, constrained form widths, full-width bands for page structure, compact task surfaces.
- Shape/radius/elevation: 8px or smaller radius by default; strong borders are preferred over shadows for account/form screens; right-bottom pop shadows are not used on auth, checkout, account, admin, menus, or form cards.
- Motion: Short hover/focus transitions that communicate affordance; no motion required to understand a task; respect reduced-motion expectations.
- Imagery/iconography: Use existing route stickers and product imagery. Use lucide icons for familiar UI actions, especially small control buttons.

## Components
- Existing components to reuse: `Button`, `Input`, `Textarea`, `Label`, `Card`, `Badge`, `SiteHeaderNav`, `ProductDetailView`, shipK CSS helpers.
- New/changed components: Brand detail document editor shell, compact section composer, draggable/reorderable story canvas, section inspector, long-detail-image block, save-adjacent customer preview/review mode, save/status actions.
- Variants and states: Auth must show sign-up consent only in sign-up mode, block Google sign-up until required consent is accepted, expose status messages with accessible semantics, and keep focus/disabled states visible. Brand editor sections need selected, collapsed, dragging, invalid, uploading, saving, saved, and error states.
- Token/component ownership: Use existing CSS variables and Tailwind utilities. Prefer repo-native controls for the first production editor; add an editor or drag dependency only with a clear architectural decision and tests.

## Accessibility
- Target standard: WCAG 2.1 AA intent for customer-facing flows.
- Keyboard/focus behavior: All controls must be reachable by keyboard, have visible focus, and use real buttons/links where appropriate. Brand editor section reordering must have a keyboard-accessible path even if pointer dragging is supported.
- Contrast/readability: Black text and borders on white/cream surfaces; colored text must remain readable at small sizes.
- Screen-reader semantics: Inputs need labels; status/error feedback uses `role="status"` or equivalent; password reveal uses an explicit accessible label. Brand editor sections should expose their type, position, validation status, and move/delete actions.
- Reduced motion and sensory considerations: Hover/focus transitions should be subtle and nonessential.

## Responsive Behavior
- Supported breakpoints/devices: Mobile first around 390px, tablet, desktop up to the existing `2xl` container width.
- Layout adaptations: Auth remains a single constrained form column; page-level copy can center above the form; route stickers appear only where existing implementation supports them. Brand editor should use a single-column canvas on mobile/tablet and a multi-pane editor on desktop with outline/canvas/preview or inspector regions.
- Touch/hover differences: Tap targets should be at least 44px high; hover polish must not be the only signifier.

## Interaction states
- Loading: Disable submit/provider/save controls while submitting; keep labels stable. Image uploads show progress or an explicit uploading state.
- Empty: Empty forms should still communicate the current mode and primary action. Brand editor empty sections should suggest adding a story section, image, long detail image, routine, or FAQ instead of showing a blank database form.
- Error: Show concise, bordered feedback near the relevant auth or editor action. Section validation errors should identify the section and field.
- Success: Redirect when session is available; otherwise show email-confirmation message. Brand editor saves should confirm the page is updated and keep the editor in place.
- Disabled: Disabled controls use lower opacity and keep their purpose readable.
- Offline/slow network, if applicable: Surface auth/provider/editor upload/save errors as status text; do not silently fail.

## Content voice
- Tone: Clear, friendly, commerce-literate, lightly playful.
- Terminology: Prefer "Sign in", "Create account", "Terms", "Privacy Policy", "product drops", "order updates", "Section", "Story", "Preview", "Publish view", "Long detail image".
- Microcopy rules: Keep form copy short; do not over-explain features inside task surfaces; policy and consent copy must be direct. Brand-editor labels should describe the content purpose a brand staff member recognizes, not table names.

## Implementation constraints
- Framework/styling system: Next.js App Router, React client components, Tailwind CSS, CSS variables in `src/app/globals.css`.
- Design-token constraints: Use existing shipK color variables or established hex accents; no new global token set for this task.
- Performance constraints: Keep auth UI lightweight; avoid unnecessary client libraries. Brand editor previews must remain responsive with long vertical images and many sections; large image blocks should avoid layout shift.
- Compatibility constraints: Preserve Supabase email/password, Google ID token, consent cookie/profile update, and safe redirect behavior.
- Test/screenshot expectations: Auth changes require component tests plus desktop/mobile visual smoke checks for `/auth` and `/auth?mode=sign-up&next=%2Fcheckout`. Brand editor changes require schema/store tests, component tests for section editing/reordering/save payloads, and browser smoke checks for `/brand/products/[id]` plus the public `/products/[slug]` page.

## Open questions
- [ ] Should referral or checkout traffic ever default to sign-up instead of sign-in? / Product owner / Affects auth landing defaults.
- [ ] Should account pages carry more playful storefront energy or remain maximally calm? / Product owner / Affects future account/profile redesigns.
- [ ] Which rich-text layer should power paragraph-level editing inside sections: lightweight markdown-like controls or a focused TipTap/ProseMirror integration? / Product owner / Affects dependency and persistence choices.
- [ ] Should brand detail edits go through draft/review approval before public update? / Product owner / Affects data model and workflow.
