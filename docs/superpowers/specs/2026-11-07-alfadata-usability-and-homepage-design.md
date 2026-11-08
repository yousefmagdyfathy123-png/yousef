# Alfadata usability repairs and ALFA CORE homepage

Status: full written design approved in chat on November 7, 2026. Homepage visual direction and implementation approach were also accepted in chat.

## Intent and decisions

Repair the seven problems observed during hands-on use and provide an English product homepage that explains Alfadata, shows a real example, displays prices, and leads into the existing trial journey. Alfadata is the product; ALFA CORE is the company. The user approved the supplied ALFA logos, company attribution, company link, official support email, policy links, and keeping the existing application stack. The user wants this built now, not merely tracked. No intent issue has been supplied or inferred; no tracker is configured here.

The working directory is `Q:/data alfa/centered-drawing-task4`, an existing linked worktree with substantial uncommitted drawing/usability changes. Preserve them. This design extends the November 4 drawing and November 6 usability designs; where screen fitting behavior differs, this design governs the new behavior. Their engineering fidelity, full overview, print isolation, and accessible scrolling requirements still apply.

## Approaches considered and selected

1. **Continue the existing Next.js/React/TypeScript application. Selected by the user.** Repair drawing presentation, enrich existing search/results contracts, and build the homepage in the same app. Reuses identity, trial, engineering engine, and pricing. Deployment remains conditional on hosting capabilities.
2. **Separate a static marketing page from the application.** Easier independent static hosting, but requires two deployment surfaces and coordinated links. Presented and not selected.

No new platform or dependency is necessary for this work. This is a coordinated product improvement project, not a replacement engineering engine.

## Goals and acceptance

### 1. Drawing overview and readable details

The current whole-drawing fit includes distant views and annotations, leaving the main view small. The current Read dimensions target is the first numeric text command; this can place most of the main view outside the visible area.

Preserve a whole-drawing overview in which every supplied view, dimension, symbol, and annotation is reachable. Fit / reset always returns to that complete overview with zero pan. Make the main dimensioned view the default screen focus, with a clear overview control if that focus cannot include the entire drawing. The builder must establish explicit, verified presentation metadata for the primary view using existing drawing/template semantics and representative route evidence; do not guess the primary view from the first number or remove commands. If a route lacks reliable grouping metadata, use complete-bounds fit as the fallback and offer user-controlled detail zoom. Never present omitted overview content as the full drawing.

Read dimensions uses the verified primary-view/dimension group bounds, not a single arbitrary label. Center its geometry and associated dimensions together. Target numeric labels of at least 12 CSS pixels within the existing 1600% zoom ceiling; explain when the full group cannot fit at readable size. Panning remains available for larger detail views. Wide, tall, and multi-view routes must retain all content. Default focus and detail focus should show useful geometry rather than an almost empty viewport. Resize/orientation changes preserve a useful view; reset remains predictable.

Keep native page scrolling, keyboard navigation, mouse pan, touch scrolling and pinch, browser accessibility zoom, viewport-only rendering, and the existing print snapshot isolation. Do not alter geometry, units, values, source commands, or printed composition as a side effect of screen focus.

### 2. Complete the observed calculator results

For Distance to First Guide (`Fxly1`), expose the required guide distance currently shown only on the drawing in the textual results and clipboard output. Reuse the exact existing computed quantity, its engine formatting, and correct displayed engineering unit for the same result revision. Do not read pixels, scrape numeric annotation strings, or introduce another formula. Keep ambient/design temperature entries, identify inputs versus calculated output visibly, and ensure Copy all results contains the guide distance. Changes to selected parameters and units update drawing, table, and copy consistently; unavailable calculations must not leave stale distance rows. Other calculators/formulas are not being rewritten or claimed exhaustively audited.

### 3. Disambiguate search results

Keep existing query matching, route identity, ordering, and authorization. Add human-readable category/path and standard or series where reliable, from public-safe verified metadata. Two distinct Blind Flange entries must be distinguishable without navigating into them. Do not expose raw private catalog rows, filesystem paths, or template contents. Route IDs may be a secondary fallback only when a reliable readable distinction does not exist; never invent a standard. Update both the authenticated async search UI and the local checkpoint search variant.

### 4. Explain search state

Distinguish initial prompt, searching, successful results, zero matches, and request failure. After a completed zero-match search, show `No results found. Try a component name or standard.` Do not show that message before a search or during loading. Search announcements are available to assistive technology. Preserve cancellation, stale-request rejection, Escape, focus restoration, and result selection. Keep dialog actions reachable on narrow screens and long result lists.

### 5. Full product homepage

Implement the approved visual direction from `.superpowers/brainstorm/1062-1794042199/content/homepage-v1.html` as production components, adapting logo and colors. The prototype is a visual reference, not production code or a completed signup implementation. Use white/light backgrounds, dark navy typography, teal and restrained green accents drawn from the supplied logos. Preserve logo aspect ratios and avoid enlargement beyond acceptable source quality. Use the compact supplied logo in the header/mobile header and the full logo/tagline in the footer; retain the visible product name Alfadata and the relationship `Alfadata by ALFA CORE`. Do not redraw the mark. Prefer supplied SVG/transparent artwork if later available; current PNGs are sufficient initially.

Sections and approved copy:

- Header: Alfadata/company branding; Features, Example, Pricing, Sign in; Start free trial. On mobile retain access to these links through an accessible menu rather than hiding navigation permanently.
- Hero: `Piping dimensions and calculations, clearly presented.` Supporting copy: `Find component dimensions, inspect engineering drawings, and run piping calculations in one workspace.` Primary CTA: `Start your 120-hour free trial`; secondary: `Explore an example`. Explain account creation and email confirmation before trial activation.
- Real example: verified 6-inch Class 300 RF STD weldneck flange, ASME B16.5-2020, with the engine's real drawing and values. Use a properly framed screenshot generated after repairs, or a public-safe verified static drawing asset. Avoid invented engineering values and avoid an interactive calculator outside the existing access boundary. The example CTA scrolls to this section.
- Workflow: Choose your component; Inspect the drawing; Use the results. Copy says available results can be copied and drawings printed for reference.
- Four benefits: Component dimensions; Piping calculations; Units that suit your work; Clear drawings and results. Copy matches existing supported functionality.
- Company: `Alfadata by ALFA CORE`, brief attribution, and a link to `https://www.alfa-sa.net/`. A proposed short description is: `Alfadata is a piping engineering workspace from ALFA CORE, an engineering and business solutions company.` No company certifications are presented as software certification; no invented testimonials, customer counts, guarantees, or certification badges.
- Pricing: Egypt EGP 1,000; Saudi Arabia SAR 500; other regions USD 100. Heading: `One payment. No recurring renewal.` Reuse the authoritative pricing/purchase-policy definitions to avoid divergent promises. Region cards are informational; final eligibility, regional quotation, and checkout remain governed by existing server logic. Do not offer a way to choose a cheaper region. Access/updates remain within product scope while the service operates. Show support limits and existing final-sale wording with the full purchase-policy link. Avoid lifetime-access claims.
- FAQ: trial activation, supported units, copying/printing, support scope, and purchase/refund terms. Short answers reflect actual existing behavior.
- Closing CTA: `Try Alfadata with your next piping task.` / `Explore the workspace with a 120-hour trial.`
- Footer: full company logo; company, pricing, support, privacy, terms, and purchase-policy links; existing engineering reference notice. Support email is `tech.supp@alfa-sa.net` as published on the company site. Make pricing and other public informational pages share a clear route back home.

Trial CTAs use the existing `/sign-up` journey; Sign in uses `/sign-in`. Do not start a trial merely on visiting the homepage or clicking a marketing CTA. Existing email-verification and trial-start gates remain in force. Production links must not show the prototype's explanatory modal or dead placeholders.

### 6. Visible control labels

Provide visible labels for component, size, ASME Class, face type, schedule and other active engineering inputs, using verified control semantics across routes. Preserve accessible names and selected values; do not rename options or change their engineering meaning. Narrow-screen wrapping must keep each label paired with its control. Inputs whose meaning is already clear still need an accessible name; avoid duplicating long captions unnecessarily.

## Policies, company data, and launch boundary

Company site reviewed on November 7, 2026: `https://www.alfa-sa.net/`. It publishes ALFA CORE branding and `tech.supp@alfa-sa.net`. Its telephone numbers differ from the existing application's WhatsApp default. Do not silently select one as the product's official number. Use email for the new homepage support contact until the owner chooses the WhatsApp number; leave existing configuration support intact.

Reuse the existing purchase policy. Inspect the existing privacy draft and account/data behavior; write a factual privacy notice and terms draft with uncertain operator/legal fields explicitly recorded for owner review. Never invent the seller's legal registration, data retention promises, tax status, governing jurisdiction, or processor. Do not publish drafts as approved binding policy. During development, policy pages may clearly state their draft status; final public release waits for owner approval of those texts. Public release and policy approval are separate from approval of this implementation design.

The user plans cPanel hosting and remembers Application Manager, but currently cannot inspect it. Continue the existing stack; no migration to PHP or static-only deployment. Current project engines require Node 24.15+ below 25, a production PostgreSQL connection, HTTPS, mail configuration, and the existing trial registry/identity settings. Verify application-manager runtime/startup compatibility, filesystem/SSH/build capability, database connectivity, DNS/origin, environment variables, and backup approach before preparing final deployment instructions. Embedded local/test PostgreSQL is not the production database plan. Existing payment provider is unconfigured; real payment integration requires a separately confirmed provider and credentials. No checkout-ready or deployment-ready claim is part of this project.

Not required from the user now: cPanel password, hosting company name, production credentials, or replacement logo files. Launch decisions still needed later: product URL/subdomain, compatible hosting details, email sender setup, actual payment provider, official product WhatsApp number if used, and final policy/operator details. Store any credentials only through the deployment environment, not source or design documents.

## Verification and delivery

- Reproduce reported problems against the current baseline and add focused regression tests for new behavior; preserve the existing dirty worktree, unrelated tests, and source data.
- Run relevant unit/contract checks, TypeScript checks, build, and browser tests for search, control labels, calculator results, drawing layouts, and existing printing behavior. Do not claim full-suite success unless actually executed.
- Inspect real desktop and mobile renders, including wide/tall/multi-view drawings, detail zoom, reset, orientation, all search states, duplicate names, keyboard use and focus, and the public homepage links/signup journey.
- Verify engine result consistency across metric/imperial and supported temperature/list settings. Any numerical discrepancy uncovered is reported explicitly rather than silently changing engineering formulas.
- Ensure no private catalogs/source assets are bundled for the marketing example. Review logo quality and public screenshot data. Use authenticated application scenarios for final behavior checks, not only the managed checkpoint harness.
- Preserve A4 landscape print behavior, immutable revision capture, cancellation/recovery, and drawing command fidelity through regressions. No redesign of print output is approved here.
- Deliver implemented changes, verification evidence/screenshots, limitations, and a deployment prerequisites checklist. No live deployment, production payment activation, company-site edits, or public publishing is authorized by this design.

## Builder discretion

Choose component organization, CSS dimensions, breakpoint details, verified view grouping metadata shape, and focused test placement using the existing stack. Choose exact short company copy within the factual constraints above. Add no analytics or external tracking. Prefer lightweight existing primitives and shared authoritative metadata over new libraries. This design intentionally does not require the owner to settle implementation mechanics.
