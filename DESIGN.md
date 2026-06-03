# Design

## Source of truth

- Status: Active
- Last refreshed: 2026-06-01
- Primary product surfaces: Home, Shop, Product Detail, Auth, Checkout, Account, Promoter, Admin, Brand Portal.
- Evidence reviewed:
  - `docs/03-ui-ux-spec.md`: customer IA, auth requirements, consent rules, mobile-first commerce principles.
  - `docs/04-design-guide.md`: Playful Discovery + Clean Commerce direction, form guidance, visual-effect guardrails.
  - `src/app/globals.css`: shipK tokens, brand fonts, dotted page texture, chip/button/surface helpers.
  - `src/app/auth/page.tsx`: current account-access route structure.
  - `src/components/auth-form.tsx`: auth mode state, email/password, Google ID token, consent, redirect, and status behavior.
  - `src/components/site-header.tsx` and `src/components/site-header-nav.tsx`: primary nav IA, account menu interaction, icon usage, menu surfaces.
  - `src/components/home-feature-banner.tsx`: current playful storefront rhythm, strong color accents, large readable headings.
  - `src/app/about/page.tsx`: public About page messaging, buyer-facing routine story, product imagery, and trust-link flow.
  - `src/components/floating-sticker-layer.tsx`: route-specific sticker assets, including auth route decoration.
  - `src/app/brand/layout.tsx`, `src/app/brand/products/page.tsx`, and `src/app/brand/products/[id]/page.tsx`: current brand portal IA for assigned-product editing.
  - `src/components/brand-product-detail-editor.tsx`: current field-heavy brand product detail editor with a narrow live preview.
  - `src/components/admin-product-form.tsx`: admin product creation/editing surface for catalog metadata, commerce settings, media, structured items, document sections, preview, draft save, publish, and archive.
  - `src/app/admin/products/page.tsx`: admin product list, search/filter toolbar, status/product cards, and edit/preview/public-page actions.
  - `src/components/admin-orders-client.tsx` and `src/components/admin-orders-client.test.tsx`: admin order search/filter surface, fulfillment modal editing, and keyboard/focus regression coverage.
  - `src/app/admin/brands/page.tsx` and `src/components/admin-brand-management-client.tsx`: brand partner lifecycle, member roles, assignment audit/transfer, and catalog-name mismatch checks.
  - `src/app/admin/commissions/page.tsx`, `src/components/admin-commissions-client.tsx`, `src/components/admin-affiliates-client.tsx`, and `src/lib/commerce-store.ts`: current referral commission ledger, admin promoter summaries, per-commission status updates, and promoter dashboard aggregation.
  - `src/app/promoter/page.tsx`, `src/components/promoter-portal-client.tsx`, and `docs/07-affiliate-marketing-spec.md`: current self-service promoter dashboard, product-link copying, attribution metrics, and manual commission status requirements.
  - `src/lib/brand-store.ts`: separate persistence boundary for brand partners, memberships, product assignments, and brand portal edit permissions.
  - `src/components/product-detail-view.tsx`: customer-facing rendering target for product detail content blocks.
  - `src/lib/brand-product-input.ts` and `src/lib/brand-store.ts`: current brand-editable content schema and persistence boundary.
  - `.omx/context/auth-form-redesign-20260524T134445Z.md` and `.omx/plans/auth-ui-redesign-ralplan.md`: prior auth redesign context; current user decision supersedes the prior two-choice selector plan.
  - `.omx/context/brand-detail-editor-20260528T131133Z.md` and `.omx/interviews/brand-detail-editor-20260528T131133Z.md`: brand detail editor discovery and deep-interview transcript.

## Brand

- Personality: Trend-aware, friendly, affordable, trustworthy, global, clean.
- Trust signals: Clear policy links, visible account/order value, PayPal/security language where relevant, restrained form surfaces, predictable commerce flows.
- Avoid: Luxury editorial styling, translated-marketplace clutter, hidden shipping/return obligations, influencer-only credibility, generic AI-looking gradient/card compositions, repeated right-bottom pop shadows on account/form surfaces.

## Product goals

- Goals: Help US customers discover and buy curated Korean beauty routines, understand shipping/returns, and manage orders or creator/promoter activity. Keep the self-service promoter path visible because any signed-in customer can become an affiliate seller for shipK products. Help brand owners and staff create production-grade, customer-facing product detail stories without needing admin catalog access. Help admins create, preview, save, publish, archive, and connect complete products to existing brand partners from one production-oriented authoring flow. Help operators manage referral payouts by promoter, with the order-level commission ledger available as drill-down evidence rather than the default scanning surface.
- Non-goals: Full design-system rewrite, heavy marketplace filtering in Phase 1 launch scope, decorative effects that reduce form clarity, brand-side product creation, brand-side price/stock/sales-state control, automatic brand partner creation from typed product brand labels, checkout changes from brand-editor/admin-editor work.
- Success signals: Users can scan products quickly, complete auth/checkout without confusion, see trust information before purchase, navigate account/promoter flows confidently, and brand staff can assemble a polished detail page with text, images, routine sections, and long vertical assets without editing database-like fields.
- About-page success signals: The public About page should read as a shopper-facing trust and discovery page, not as a creator, seller, affiliate, or brand-owner pitch. It should make clear that shipK sells curated Korean beauty routines, explains how to use them, and keeps shipping, returns, payment, and order follow-up visible.

## Personas and jobs

- Primary personas: US K-beauty shoppers, first-time shipK customers, returning customers checking orders, creators/promoters sharing links, internal operators/admins, brand owners/staff assigned to products.
- User jobs: Find a routine kit, understand what ships from Korea, buy securely, create or access an account, track orders, manage promoter links, operate catalog/order workflows, author and review brand-owned product detail content.
- Key contexts of use: Mobile storefront browsing, checkout interruption, account/order review, creator referral traffic, admin back-office work, brand staff preparing product storytelling assets from copy, product photos, and external design tools such as Figma.

## Information architecture

- Primary navigation: Home, Make up, Skincare, For Sellers, About, account menu, search/shop entry. The seller/promoter entry is a concise global affiliate-marketing doorway for ordinary customers who want to promote products, while brand-owner routes remain role-based and should not compete with buyer discovery in the public primary nav.
- Core routes/screens: Home, Shop, Product Detail, Auth, Checkout, Checkout Success, Account, Orders, Promoter, Policies, Admin, Admin Product List, Admin Product Editor, Admin Orders, Admin Brand Partner Management, Brand Product List, Brand Product Detail Editor, Brand Reports.
- Content hierarchy: Storefront discovery uses expressive product imagery plus category/product-type visual cues; commerce/account/admin flows prioritize task headings, fields, status, policy links, and primary CTA. Account/My Page must read as a management hub first: order activity, default shipping readiness, profile identity, email updates, and help links are visible before any edit fields. The orders page is a customer order-management list with search, status filtering, sorting, and detail access. Order detail is an aftercare page, not a receipt dump: lead with `Order status`, status-specific copy, tracking availability, ordered date, and total, then show delivery progress, tracking details, items, payment, shipping address, and support. The About page is buyer-facing: lead with Korean beauty routine value, then curation, use guidance, purchase confidence, shipping/returns, and a shop CTA. Product detail pages must keep core commerce facts visible: hero/intro media, gallery, included items, routine steps, and legacy media/content blocks should not disappear just because a newer story document exists. Admin product editing must distinguish the customer-facing product brand label from the operational brand partner portal connection. Admin orders should keep search/filter/sort and order scanning as the primary surface; default order is newest-first, operators can switch sort modes, and fulfillment editing opens intentionally from an order card in a focused modal rather than occupying persistent page chrome. Brand partner management should prioritize lifecycle, members, health checks, assignment audit, and transfer/revocation. Brand detail editing should prioritize a document/story canvas over raw data fields; customer preview should be opened intentionally from the editor action area instead of occupying a persistent right pane.

## Design Principles

- Commerce clarity first: Forms, checkout, policies, account, and admin screens must be calm, legible, and explicit before they are decorative.
- Playful where it helps discovery: Use shipK fonts, bright accents, stickers, badges, category accents, and product-type rhythm to create recognition, but avoid making task surfaces feel like ads.
- One obvious next action: Each flow should make the primary CTA and alternate path easy to find without tab-like controls competing for attention.
- Buyer-first public story: Public story pages such as About should speak first to general shoppers. The global header can include the concise For Sellers promoter entry because affiliate marketing is a core platform loop, but About-page body copy and footer content should not turn into seller onboarding.
- Section-first authoring for brand content: Brand staff should build customer detail pages by arranging meaningful sections, not by filling scattered database fields.
- Settlement-first operations: Commission administration should start from promoter-level payout summaries and reveal per-order ledger rows only when the operator needs audit detail.
- Separate catalog identity from access: Product `brandName` is customer-facing catalog copy; brand partner assignment is an admin-only access relationship that controls portal visibility and detail editing.
- Hybrid editor model: Keep the page saved as structured sections for reliable rendering, but let individual text/media sections gain editor-like controls such as rich text marks, alignment, spacing, width, and media presentation options.
- Admin publishing model: Admins need one integrated product workspace for catalog metadata, brand partner portal connection, commerce controls, media, structured routine data, customer detail sections, preview, draft save, publish, and archive. Preview should open intentionally from the fixed action area instead of occupying a persistent right pane.
- Admin list efficiency: Admin list filters should behave like a compact operations toolbar: one prominent search input, grouped secondary selectors, and an inline apply action. Avoid tall empty filter panels, broken Korean labels, persistent edit panels that crowd scanning, and horizontal overflow for common desktop widths.
- Promoter workspace clarity: The promoter portal should feel like a seller workbench, not a marketing landing page. Prioritize account status, copyable product links, search/sort controls, and commission readability; long referral URLs should be secondary to product names and actions.
- Promoter task split: Product-link copying and commission review are peer seller jobs. Do not stack unbounded product-link lists above the commission ledger. Use route-backed workspace tabs or similarly durable navigation, and page long link lists so sellers can reach commissions without scrolling through every product.
- Account progressive disclosure: My Page should show zero profile/default-shipping text inputs by default. `Edit profile` and `Edit shipping` open focused modal dialogs instead of expanding long forms in the page rail. A successful save closes the dialog; cancel, backdrop, or Escape close without posting; failed save keeps the relevant dialog open with an alert.
- Order aftercare language: Avoid history-dependent copy such as `Back to orders` on order detail. Use stable location labels (`My Page`, `Orders`, order number) and customer-facing section names: `Delivery progress`, `Tracking details`, `Items in this order`, `Payment summary`, `Shipping address`, and `Need help with this order?`.
- Tradeoffs: Auth and checkout may carry small brand accents, but should not use storefront-level visual noise or pop shadows. Brand editing can use richer controls than customer forms, but must stay predictable and keyboard-recoverable.

## Visual language

- Color: Storefront discovery can use white/cream bases with black outlines; account, order, checkout-adjacent, and admin task surfaces should prefer white with neutral gray borders and only restrained shipK pink accents for active navigation, primary actions, focus, or small labels. Lime, mint, yellow, blue, and coral remain supporting storefront accents. Avoid letting a whole surface become one hue family.
- Typography: Inter for readable commerce text; Archivo Black/brand-heavy for short headings and labels; brand-round/logo styling reserved for logo or playful moments.
- Spacing/layout rhythm: Mobile-first, generous field spacing, constrained form widths, full-width bands for page structure, compact task surfaces.
- Shape/radius/elevation: 8px or smaller radius by default. Use borders, background contrast, spacing, and focus rings for hierarchy. Do not use right-bottom offset shadows anywhere in active product UI, including playful discovery, cards, buttons, badges, menus, modals, checkout, account, admin, brand, and form surfaces. Avoid authored `box-shadow`, Tailwind `shadow-*`, and arbitrary `shadow-[...]` utilities in source unless a future design decision explicitly documents a narrow exception.
- Motion: Short hover/focus transitions that communicate affordance; no motion required to understand a task; respect reduced-motion expectations.
- Imagery/iconography: Use existing route stickers and product imagery for discovery pages. Keep account/order management routes free of floating sticker decoration so the task surface reads as a calm customer workspace. Use lucide icons for familiar UI actions, especially small control buttons.

## Components

- Existing components to reuse: `Button`, `Input`, `Textarea`, `Label`, `Card`, `Badge`, `SiteHeaderNav`, `ProductDetailView`, shipK CSS helpers.
- New/changed components: Brand detail document editor shell, admin product workspace, admin fulfillment modal, admin promoter settlement accordion/table, promoter product-link workspace, brand partner selector and edit-permission control in the product editor, brand partner management audit/transfer copy, compact section composer, draggable/reorderable story canvas, section inspector, long-detail-image block, save-adjacent customer preview/review mode, fixed save/preview/publish/cancel/status actions.
- Variants and states: Auth must show sign-up consent only in sign-up mode, block Google sign-up until required consent is accepted, expose status messages with accessible semantics, and keep focus/disabled states visible. Admin orders need newest-first default sorting with explicit sort controls for operational priority, age, and order value. Admin fulfillment modals need closed-by-default state, top-level centered layering, labelled dialog semantics, focus containment, Escape/backdrop/close dismissal, success close, error-stays-open, and focus return or fallback to order search. Admin commission management needs promoter-level summary rows, status/search filters, single-promoter expansion, detail ledger rows, scoped updating states, and safe empty/search-empty/error messages. Promoter dashboards need active/paused/blocked account states, date-range controls, summary metrics, route-backed product-links/commissions views, searchable/sortable/paged product links, commission search/status filters, copy success/error feedback, no-results states, and seller-readable commission status labels. Brand editor sections need selected, collapsed, dragging, invalid, uploading, saving, saved, and error states.
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
- Terminology: Prefer "Sign in", "Create account", "Terms", "Privacy Policy", "product drops", "order updates", "Section", "Story", "Preview", "Publish view", "Long detail image". In Korean admin settlement surfaces, prefer `홍보자 정산`, `추천 코드`, `매출 기준액`, `미정산`, `지급 완료`, `제외됨`, and `정산 제외`.
- Microcopy rules: Keep form copy short; do not over-explain features inside task surfaces; policy and consent copy must be direct. About-page copy should use production-ready shopper language around Korean cosmetics, routine clarity, shipping, returns, and order confidence. Brand-editor labels should describe the content purpose a brand staff member recognizes, not table names.

## Implementation constraints

- Framework/styling system: Next.js App Router, React client components, Tailwind CSS, CSS variables in `src/app/globals.css`.
- Design-token constraints: Use existing shipK color variables or established hex accents; no new global token set for this task.
- Performance constraints: Keep auth UI lightweight; avoid unnecessary client libraries. Brand editor previews must remain responsive with long vertical images and many sections; large image blocks should avoid layout shift.
- Compatibility constraints: Preserve Supabase email/password, Google ID token, consent cookie/profile update, and safe redirect behavior.
- Test/screenshot expectations: Auth changes require component tests plus desktop/mobile visual smoke checks for `/auth` and `/auth?mode=sign-up&next=%2Fcheckout`. About-page changes require a source-level buyer-copy guard plus desktop/mobile browser screenshots scored for shopper narrative, overflow, CTA visibility, image rendering, trust-link visibility, and responsive polish. Brand editor changes require schema/store tests, component tests for section editing/reordering/save payloads, and browser smoke checks for `/brand/products/[id]` plus the public `/products/[slug]` page. Admin product editor changes require component tests for separate preview and save payloads, API/schema tests for detail section persistence, brand partner assignment preserve/link/unlink/transfer semantics, and browser smoke checks for `/admin/products/new`. Admin order changes require component tests for search/filter/sort persistence, newest-first default order, fulfillment modal open/close/save/error/focus/layering behavior, plus desktop/mobile smoke checks for `/admin/orders` when admin e2e credentials and order data are available. Admin commission settlement changes require store aggregation tests, component tests for promoter summaries/search/status filters/accordion/detail status mutation, and desktop/mobile smoke checks for `/admin/commissions` when admin e2e credentials and settlement data are available. Promoter portal changes require component tests for active/apply/setup states, URL-backed workspace tabs, high-cardinality product-link pagination, product-link search/sort/copy success/copy failure/no-results behavior, commission status/search filters, commission status labels, and browser smoke checks for `/promoter?view=links` plus `/promoter?view=commissions` with scoring against seller task clarity and visual clutter. Brand management changes require component checks that the page reads as brand partner lifecycle plus assignment audit/transfer rather than the only product setup path.

## Open questions

- [ ] Should referral or checkout traffic ever default to sign-up instead of sign-in? / Product owner / Affects auth landing defaults.
- [ ] Should account pages carry more playful storefront energy or remain maximally calm? / Product owner / Affects future account/profile redesigns.
- [ ] Which rich-text layer should power paragraph-level editing inside sections: lightweight markdown-like controls or a focused TipTap/ProseMirror integration? / Product owner / Affects dependency and persistence choices.
- [ ] Should brand detail edits go through draft/review approval before public update? / Product owner / Affects data model and workflow.
- [ ] Should product save and brand assignment sync move into a single database RPC transaction before launch? / Engineering owner / Affects failure recovery if product persistence succeeds but assignment sync fails.
- [ ] Should admin order fulfillment add batch entry or auto-advance after save once real order volume grows? / Operations owner / Affects whether modal remains sufficient or needs a dense table/drawer workflow.
