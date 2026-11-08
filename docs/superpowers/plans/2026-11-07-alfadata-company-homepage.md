# Alfadata Company Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved Alfadata homepage with ALFA CORE identity, real example, existing prices, signup links, company/support information and honest policy drafts.

**Architecture:** Build lightweight server-rendered marketing components inside the existing Next.js app; use a small client component only for mobile navigation. Reuse authoritative server pricing and purchase-policy text. Keep the authenticated engineering app, trial activation, and checkout unchanged.

**Tech Stack:** Existing Next.js/React/TypeScript, CSS, Vitest and Playwright; no new dependencies or tracking.

**Spec:** `docs/superpowers/specs/2026-11-07-alfadata-usability-and-homepage-design.md` (approved). Visual reference: `.superpowers/brainstorm/1062-1794042199/content/homepage-v1.html`.

## Global Constraints

- Execute in the existing dirty linked worktree `Q:/data alfa/centered-drawing-task4`; preserve preceding work and scope staging to owned changes. Read AGENTS.md and bundled Next.js docs for changed APIs before implementation. Node `>=24.15.0 <25`, npm `12.0.2`, `$env:LEGACY_CULTURE='en-US'`.
- English product name `Alfadata`; company attribution `Alfadata by ALFA CORE`; company URL `https://www.alfa-sa.net/`; support email `tech.supp@alfa-sa.net`.
- White/light layout with navy, teal and restrained green taken from supplied logos; preserve logo proportions. No invented testimonials, certifications, counts, formulas, physical scale, guarantees or lifetime promise.
- Prices: Egypt EGP 1,000; Saudi Arabia SAR 500; other regions USD 100. Cards are information, not user-selected billing regions.
- Trial CTA links to `/sign-up`; Sign in links to `/sign-in`; account confirmation and explicit trial activation stay unchanged. Do not ship prototype modals or placeholder buttons.
- Preserve ClosureNotice, access guards, checkout closure and configured policy requirements. No deployment, payment activation, external company edits or public policy approval.

## Review Focus

- Mobile visitors must retain access to Features, Example, Pricing and Sign in (Task 1).
- Missing company asset or future pricing change must not silently produce false/broken marketing content (Tasks 1–2).
- Opening the public homepage without configured database/mail/payment must work without exposing private assets (Task 2).
- An approved full policy being absent must leave checkout closed and drafts visibly marked (Task 3).
- A logged-out marketing CTA must not bypass confirmation/trial activation or redirect to a nonexistent route (Task 4).

## File map and execution order

Use the workspace-repairs plan first to obtain repaired, verified example artwork. Tasks 1 and 3 here can otherwise proceed independently. Create `src/app/marketing/` for focused presentation pieces rather than expanding `src/app/page.tsx` into a monolithic component. Keep marketing CSS scoped beneath `.marketing-site` and never import it into the canvas stylesheet.

## Task 1: Company assets, public shell and accessible mobile menu

**Files:** Create `public/brand/alfa-compact.png`, `public/brand/alfa-full.png`, `src/app/marketing/brand.ts`, `src/app/marketing/PublicHeader.tsx`, `src/app/marketing/PublicFooter.tsx`, `src/app/marketing/MobileNav.tsx`, `src/app/marketing/marketing.css`, `tests/marketing/brand.test.ts`. Create `tests/e2e/homepage.spec.ts` and include it in `playwright.auth.config.ts` (production-route tests require the real Next.js server, not checkpoint root).

**Interfaces:** `companyBrand = {productName:'Alfadata', companyName:'ALFA CORE', companyUrl:'https://www.alfa-sa.net/', supportEmail:'tech.supp@alfa-sa.net', compactLogo:'/brand/alfa-compact.png', fullLogo:'/brand/alfa-full.png'}`. Components `PublicHeader()` and `PublicFooter()` render shared home/pricing/policy navigation. `MobileNav()` owns only disclosure state and closes on selected destination or Escape with appropriate focus handling.

- [x] Confirm supplied image paths still exist: `C:/Users/CM/AppData/Local/Temp/codex-clipboard-95cc80ba-61d2-4b51-8084-8b1a0b4c2a40.png` (compact) and `.../codex-clipboard-74462cac-d7dd-47f1-a1ac-50637f0e2bac.png` (full). Copy original files into named public assets without redesign/removal of logo pixels; if temporary originals are gone, request them again rather than substituting the prototype's invented mark.
- [x] Write brand assertions for exact company link/email/product name and browser tests for rendered image loads/aspect ratios and no unintended cropping. At 390×844, open mobile navigation, navigate to pricing/example and sign-in, dismiss with Escape, and check keyboard focus and no horizontal overflow. These tests verify real user navigation, not static class names.
- [x] Run `npm test -- tests/marketing/brand.test.ts` and the new protected homepage browser spec; verify expected missing-feature failures. Implement brand constants, header/footer/menu and shared CSS using the approved direction. Ensure the word Alfadata remains visible alongside the ALFA logo.
- [x] Re-run tests; inspect compact/full logos at native and mobile sizes. Include these components in a temporary test route only if needed, removing it before delivery; prefer testing through Task 2's actual homepage. Commit assets/new owned files only.

Task 1 verification: `../verification/2026-11-07-homepage-task1.md`. Implemented inline without subagents. Shell acceptance uses `node --import tsx tools/marketing/test-shell.ts`, which temporarily composes the real components and restores the original homepage exactly. Actual homepage integration remains Task 2. Source PNG hashes match; SSR, production browser navigation and TypeScript passed. See the report for final build evidence and the interrupted unrelated full-suite attempt.

## Task 2: Homepage content, real example and authoritative pricing

**Files:** Modify `src/app/page.tsx`, `src/app/pricing/page.tsx`, `src/server/commerce/pricing.ts` only if extracting pure price definitions; create `src/shared/product-prices.ts`, `src/app/marketing/ProductHome.tsx`, `src/app/marketing/ExampleSection.tsx`, `src/app/marketing/FeatureSection.tsx`, `src/app/marketing/PricingSection.tsx`, `src/app/marketing/FaqSection.tsx`, `public/examples/weldneck-flange.png`, `tests/marketing/homepage.test.ts`; extend `tests/e2e/homepage.spec.ts`.

**Interfaces:** `priceForRegion(code:string|null): {currency:'EGP'|'SAR'|'USD'; minorUnits:number}` is the pure source of truth in `src/shared/product-prices.ts`; existing server `priceForCountry(code)` delegates without changing its public signature, amounts or quote behavior. `ProductHome({example}: {example:{src:string;alt:string}})` composes content inside `.marketing-site`; `PricingSection()` consumes shared public price definitions and existing `purchaseScope`, `purchaseSupport`, `finalSale` from server-only render context. No secrets enter client components.

- [ ] Generate `public/examples/weldneck-flange.png` from the repaired real engine UI (6-inch, Class 300, RF, STD, ASME B16.5-2020), checking shown weight values against the same result revision. It is an intentional static public example, not the private catalog/template. Store no account data or workspace ID in the screenshot. Give meaningful alt text and image dimensions. Avoid the prototype's clipped screenshot crop; verify every displayed dimension is legible. Record generation/verification notes in `docs/superpowers/verification/2026-11-07-homepage.md`.
- [ ] Write SSR tests for exact approved hero/CTA/company copy, all required sections, region amounts matching `priceForCountry`, three trial links leading to `/sign-up`, and no fake certification/lifetime claims. Keep actual primary CTA count flexible; every trial CTA must resolve correctly. Test that homepage renders without DATABASE_URL/SMTP/payment configuration and neither imports nor embeds the private catalog. Retain ClosureNotice behavior when configured.
- [ ] Run `npm test -- tests/marketing`; verify missing homepage assertions fail. Implement hero, example workflow, four benefit cards, company attribution, pricing, FAQ, closing CTA, and footer using the spec's exact copy. Copy prices from the shared pure helper, not duplicate literals in JSX. All three pricing cards lead to signup; do not add a region-selection mutation.
- [ ] Give public pages clear home navigation. Update `/pricing` to use the public shell while preserving its principal/quote/closure/provider logic, existing purchase acknowledgement and currency restrictions; do not make an unavailable payment provider appear active. Show policy/support links and the email contact. Keep the legacy configurable WhatsApp route intact; new homepage uses email until number selection.
- [ ] Run SSR/unit tests and add browser checks for anchor destinations, FAQ disclosure, desktop/mobile layout, footer company/email links and image loads. Capture desktop/mobile screenshots and inspect content at 200% browser zoom. Exercise `/pricing` logged out and logged in with checkout unavailable. Run existing `account-commerce.spec.ts` and `payment-recovery.spec.ts` after changes affecting pricing boundaries. Commit owned changes.

## Task 3: Factual policy drafts and visible release status

**Files:** Create `src/app/policies/privacy/page.tsx`, `src/app/policies/terms/page.tsx`, `src/app/policies/policy-drafts.ts`, `docs/TERMS-DRAFT.md`, `tests/marketing/policy-drafts.test.ts`. Modify `docs/PRIVACY-DRAFT.md` only to align with verified behavior, `src/app/policies/purchase/page.tsx` for shared navigation, and `src/app/marketing/PublicFooter.tsx` for links.

**Interfaces:** Export `policyDrafts: {privacy:{title:string; paragraphs:string[]}; terms:{title:string; paragraphs:string[]}}` containing factual product behavior and explicit draft notice. Public pages display `Draft — not approved for publication` above the text; they never claim a configured binding policy. Existing `configuredPurchasePolicy()` remains the sole checkout-approved policy source and unchanged in semantics.

- [ ] Read existing privacy draft, account/deletion/cleanup behavior, mail flows, workspace retention configuration, trial registry, configured policy and purchase support wording. Record unknown seller/legal identity, jurisdiction, retention exceptions, backup expiry and processors as owner decisions; do not fill them with guesses. For legal policy guidance use current authoritative sources if interpretation beyond factual product behavior is necessary.
- [ ] Write tests that draft status is prominent, company support is correct, unknown fields are explicitly pending, footer destinations resolve, and `configuredPurchasePolicy()` still returns null with missing version/text. Checkout remains unavailable when policy/provider configuration is missing. Do not introduce a dummy policy that opens payments.
- [ ] Run failing policy tests, then implement factual privacy/terms drafts and policy pages with shared public navigation. Link the existing full purchase policy route; if unconfigured, preserve its unavailability message and closed checkout. Do not replace its content with a marketing summary presented as approved policy.
- [ ] Run `npm test -- tests/marketing` and authenticated `homepage.spec.ts account-commerce.spec.ts`. Confirm public draft routes are reviewable locally and explicitly listed as a blocker in the release document. Commit owned changes.

## Task 4: Real-route acceptance and deployment prerequisites

**Files:** Create `docs/DEPLOYMENT-PREREQUISITES.md`; complete `docs/superpowers/verification/2026-11-07-homepage.md`; modify `tests/e2e/homepage.spec.ts`, `playwright.auth.config.ts`, `tools/auth/test-browser.ts` if needed so default relevant coverage selects public route tests. Preserve existing configs and unrelated changes.

**Interfaces:** Existing signup, verification, account, workspace and checkout interfaces remain unchanged. Deployment deliverable is a capability checklist, not an assertion of a runnable cPanel package.

- [ ] Test public CTA → signup → captured verification email → sign-in → explicit Start 120-hour trial → Open new workspace using existing isolated auth/mail/database fixtures. Assert simply visiting the homepage and clicking the signup link do not create or start a trial. Exercise existing unavailable-checkout behavior from pricing and navigate home again.
- [ ] Run `npm test`, `npm run typecheck`, `npm run build`, then `npm run test:e2e:auth -- homepage.spec.ts search.spec.ts results-accessibility.spec.ts drawing-layout.spec.ts workspace-layout.spec.ts workspace-usability.spec.ts desktop.spec.ts mobile.spec.ts print.spec.ts account-commerce.spec.ts payment-recovery.spec.ts`. Expect exit 0 with tests actually collected; inspect counts so omitted specs do not masquerade as coverage. Record pre-existing vs introduced failures, exact environment, tested browser/sizes, and screenshots.
- [ ] Review actual homepage/workspace on desktop/mobile via CUA and inspect A4 print output following existing print verification. Check logos, all anchors, policy draft notices, actual support links, price consistency and no private asset leakage. Save screenshots as local deliverables; no external company-site actions.
- [ ] Write deployment checklist: product URL/subdomain and HTTPS; Node 24.15+ below 25; Application Manager/Passenger startup compatibility and supported process model; build/npm/SSH capability or verified build artifact method; production PostgreSQL connection; environment settings and trial identity/registry; SMTP sender; selected real payment adapter/webhook provider; official WhatsApp number; approved operator/policy details; backup/restore and cleanup jobs. Mark unknown capabilities pending. Embedded local PostgreSQL and test payment/mail/registry infrastructure must not be sold as the production setup. Do not invent cPanel startup commands without capability evidence.
- [ ] Self-review final scoped diff and report completed fixes, command evidence and actual remaining launch decisions. Commit owned changes where safe; do not deploy, push or publish. If execution used a single implementer, obtain an independent whole-change review under the execution workflow before declaring completion.
