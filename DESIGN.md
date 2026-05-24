# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-05-24
- Primary product surfaces: Home, Shop, Product Detail, Auth, Checkout, Account, Promoter, Admin.
- Evidence reviewed:
  - `docs/03-ui-ux-spec.md`: customer IA, auth requirements, consent rules, mobile-first commerce principles.
  - `docs/04-design-guide.md`: Playful Discovery + Clean Commerce direction, form guidance, visual-effect guardrails.
  - `src/app/globals.css`: shipK tokens, brand fonts, dotted page texture, chip/button/surface helpers.
  - `src/app/auth/page.tsx`: current account-access route structure.
  - `src/components/auth-form.tsx`: auth mode state, email/password, Google ID token, consent, redirect, and status behavior.
  - `src/components/site-header-nav.tsx`: account menu interaction, icon usage, menu surfaces.
  - `src/components/home-feature-banner.tsx`: current playful storefront rhythm, strong color accents, large readable headings.
  - `src/components/floating-sticker-layer.tsx`: route-specific sticker assets, including auth route decoration.
  - `.omx/context/auth-form-redesign-20260524T134445Z.md` and `.omx/plans/auth-ui-redesign-ralplan.md`: prior auth redesign context; current user decision supersedes the prior two-choice selector plan.

## Brand
- Personality: Trend-aware, friendly, affordable, trustworthy, global, clean.
- Trust signals: Clear policy links, visible account/order value, PayPal/security language where relevant, restrained form surfaces, predictable commerce flows.
- Avoid: Luxury editorial styling, translated-marketplace clutter, hidden shipping/return obligations, influencer-only credibility, generic AI-looking gradient/card compositions, repeated right-bottom pop shadows on account/form surfaces.

## Product goals
- Goals: Help US customers discover and buy curated Korean beauty routines, understand shipping/returns, and manage orders or creator/promoter activity.
- Non-goals: Complex design-system rewrite, heavy marketplace filtering in MVP, decorative effects that reduce form clarity.
- Success signals: Users can scan products quickly, complete auth/checkout without confusion, see trust information before purchase, and navigate account/promoter flows confidently.

## Personas and jobs
- Primary personas: US K-beauty shoppers, first-time shipK customers, returning customers checking orders, creators/promoters sharing links, internal operators/admins.
- User jobs: Find a routine kit, understand what ships from Korea, buy securely, create or access an account, track orders, manage promoter links, operate catalog/order workflows.
- Key contexts of use: Mobile storefront browsing, checkout interruption, account/order review, creator referral traffic, admin back-office work.

## Information architecture
- Primary navigation: Make up, Skincare, For Sellers, About, account menu, search/shop entry.
- Core routes/screens: Home, Shop, Product Detail, Auth, Checkout, Checkout Success, Account, Orders, Promoter, Policies, Admin.
- Content hierarchy: Storefront discovery uses expressive product imagery and collection color; commerce/account flows prioritize task headings, fields, status, policy links, and primary CTA.

## Design Principles
- Commerce clarity first: Forms, checkout, policies, account, and admin screens must be calm, legible, and explicit before they are decorative.
- Playful where it helps discovery: Use shipK fonts, bright accents, stickers, badges, and collection color to create recognition, but avoid making task surfaces feel like ads.
- One obvious next action: Each flow should make the primary CTA and alternate path easy to find without tab-like controls competing for attention.
- Tradeoffs: Auth and checkout may carry small brand accents, but should not use storefront-level visual noise or pop shadows.

## Visual language
- Color: White and cream bases with black outlines; shipK pink as the main accent; lime, mint, yellow, blue, and coral as supporting accents. Avoid letting a whole surface become one hue family.
- Typography: Inter for readable commerce text; Archivo Black/brand-heavy for short headings and labels; brand-round/logo styling reserved for logo or playful moments.
- Spacing/layout rhythm: Mobile-first, generous field spacing, constrained form widths, full-width bands for page structure, compact task surfaces.
- Shape/radius/elevation: 8px or smaller radius by default; strong borders are preferred over shadows for account/form screens; right-bottom pop shadows are not used on auth, checkout, account, admin, menus, or form cards.
- Motion: Short hover/focus transitions that communicate affordance; no motion required to understand a task; respect reduced-motion expectations.
- Imagery/iconography: Use existing route stickers and product imagery. Use lucide icons for familiar UI actions, especially small control buttons.

## Components
- Existing components to reuse: `Button`, `Input`, `Label`, `Card`, `GoogleIdentityButton`, `SiteHeaderNav`, `FloatingStickerLayer`, shipK CSS helpers.
- New/changed components: Auth form presentation may use a calm bordered form card, password visibility control, consent panel, status panel, and sentence-style alternate action.
- Variants and states: Auth must show sign-up consent only in sign-up mode, block Google sign-up until required consent is accepted, expose status messages with accessible semantics, and keep focus/disabled states visible.
- Token/component ownership: Use existing CSS variables and Tailwind utilities; do not introduce a new dependency or parallel design-system layer for this auth refresh.

## Accessibility
- Target standard: WCAG 2.1 AA intent for customer-facing flows.
- Keyboard/focus behavior: All auth controls must be reachable by keyboard, have visible focus, and use real buttons/links where appropriate.
- Contrast/readability: Black text and borders on white/cream surfaces; colored text must remain readable at small sizes.
- Screen-reader semantics: Inputs need labels; status/error feedback uses `role="status"` or equivalent; password reveal uses an explicit accessible label.
- Reduced motion and sensory considerations: Hover/focus transitions should be subtle and nonessential.

## Responsive Behavior
- Supported breakpoints/devices: Mobile first around 390px, tablet, desktop up to the existing `2xl` container width.
- Layout adaptations: Auth remains a single constrained form column; page-level copy can center above the form; route stickers appear only where existing implementation supports them.
- Touch/hover differences: Tap targets should be at least 44px high; hover polish must not be the only signifier.

## Interaction states
- Loading: Disable submit/provider controls while submitting; keep labels stable.
- Empty: Empty forms should still communicate the current mode and primary action.
- Error: Show concise, bordered feedback near the relevant auth actions.
- Success: Redirect when session is available; otherwise show email-confirmation message.
- Disabled: Disabled controls use lower opacity and keep their purpose readable.
- Offline/slow network, if applicable: Surface auth provider errors as status text; do not silently fail.

## Content voice
- Tone: Clear, friendly, commerce-literate, lightly playful.
- Terminology: Prefer "Sign in", "Create account", "Terms", "Privacy Policy", "product drops", "order updates".
- Microcopy rules: Keep form copy short; do not over-explain features inside task surfaces; policy and consent copy must be direct.

## Implementation constraints
- Framework/styling system: Next.js App Router, React client components, Tailwind CSS, CSS variables in `src/app/globals.css`.
- Design-token constraints: Use existing shipK color variables or established hex accents; no new global token set for this task.
- Performance constraints: Keep auth UI lightweight; do not add client libraries for animation or form state.
- Compatibility constraints: Preserve Supabase email/password, Google ID token, consent cookie/profile update, and safe redirect behavior.
- Test/screenshot expectations: Auth changes require component tests plus desktop/mobile visual smoke checks for `/auth` and `/auth?mode=sign-up&next=%2Fcheckout`.

## Open questions
- [ ] Should referral or checkout traffic ever default to sign-up instead of sign-in? / Product owner / Affects auth landing defaults.
- [ ] Should account pages carry more playful storefront energy or remain maximally calm? / Product owner / Affects future account/profile redesigns.
