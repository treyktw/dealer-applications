# Dealer Apps – Production Hardening & Feature Roadmap (Solo‑Dev Plan)

> Tech stack: **Next.js 15 (App Router) + React + TanStack Query**, **Convex** (DB/functions/auth glue), **Tauri (Rust)** for desktop, **Stripe**, **S3-compatible storage**, **Resend**, **Clerk**.

---

## 0) Principles & Non‑Negotiables
- **Multi‑tenant from first principles**: every record tied to `orgId` (dealer) and enforced in Convex queries/mutations with server-side checks.
- **Least privilege**: scoped presigned S3 URLs, no public buckets; short TTLs.
- **Deterministic environments**: `.env` parity per `development`, `staging`, `production`.
- **Idempotent jobs & webhooks**: all external callbacks (Stripe, Clerk) idempotent with replay protection.
- **Observable by default**: logs + metrics around document uploads, inventory sync, payments, auth.

---

## 1) Tenancy, Teams & Roles (Org model)
### Data Model (Convex)
- `dealers` { _id, slug, name, status, stripeCustomerId, createdBy, createdAt, settings: { brand, s3Prefix, documentsEnabled, websiteDomains[] } }
- `orgMembers` { _id, orgId, userId, role, invitedBy, createdAt }
- `roles` enum: `OWNER`, `ADMIN`, `SALES`, `TITLE_CLERK`, `VIEWER`.
- `permissions` (computed in code):
  - OWNER: full
  - ADMIN: manage users, billing, docs, inventory
  - SALES: deals, clients, uploads in deals only
  - TITLE_CLERK: documents, DMV forms, sensitive exports
  - VIEWER: read-only

### Convex guards (server)
- `requireOrg(ctx)`, `assertRole(ctx, role)`, `canAccessResource(ctx, {orgId})`.
- All queries/mutations accept `{ orgId }` or infer from session; **never** trust client-provided orgId without membership check.

### Acceptance Criteria
- Inviting/removing users updates `orgMembers` and invalidates sessions.
- Role changes reflected in UI feature gates (`FeatureGate.tsx`) and Convex permission checks.

---

## 2) Dealer‑Specific Documents (Templates & Instances)
### Goals
- Each dealer manages **their own** doc templates (Buyer’s Guide, Bill of Sale, Trade‑In, Odometer, Power of Attorney, etc.).
- Versioned templates; per‑deal document instances bound to `dealId` and immutable once signed.

### Data Model
- `documentTemplates` { _id, orgId, name, category, version, fieldsSchema (zodish), pdfTemplateKey (S3 key), active: bool, createdAt }
- `documents` { _id, orgId, templateId, dealId, data, status: DRAFT|READY|SIGNED|VOID, pdfFilledKey, audit: { createdBy, createdAt, signedAt } }
- `documentPacks` { _id, orgId, name, templateIds[] }  // quick add multiple docs per deal

### Storage
- **S3 layout (single bucket per env)**
  - `s3://dealer-admin-prod/{orgId}/templates/{templateId}/template-v{n}.pdf`
  - `s3://dealer-admin-prod/{orgId}/documents/{dealId}/{documentId}.pdf`
- Presigned URLs from Convex; TTL 5–15 min; content-type restricted; max size enforced.

### UI Work (web + desktop)
- New **Documents** UI:
  - **Template Library** (per dealer) – upload/update, field mapping (map fields → PDF form fields), version toggle.
  - **Document Pack Wizard** – create pack, assign to deal.
  - **Deal Docs Tab** – instance list, status chips, fill form drawer, generate & preview PDF, sign/lock.
- Desktop parity: mirror Deal Docs Tab and add offline‑safe preview (read-only cached; writes require online).

### Acceptance Criteria
- Dealer cannot see another dealer’s templates or docs.
- Generated PDFs are immutable after `SIGNED`.
- Audit trail persists who/when filled and signed.

---

## 3) Inventory “Off‑Website API” + Domain Verification
### Use Case
Dealer’s marketing site embeds inventory pages fed from Admin backend with cache.

### Domain Verification (2 options)
1. **DNS TXT** (preferred):
   - Dealer adds `uab-verify=<randomToken>` to DNS.
   - Admin UI → Verify: server resolves TXT; on success, mark domain `verified=true`.
2. **HTTP 200 file check** (your previous idea):
   - Admin UI gives token & filename `uab-verify.txt` with token content.
   - Web server fetches `https://dealer-domain.com/uab-verify.txt` and validates body.

### Public Read API (read-only)
- `GET /api/public/v1/{dealerSlug}/inventory?filters…&page…`
- `GET /api/public/v1/{dealerSlug}/vehicles/{vin}`
- `GET /api/public/v1/{dealerSlug}/images/{imageId}` (302 to signed CDN URL)
- CORS allow list = verified domains only.
- Aggressive CDN cache (60–300s), `stale-while-revalidate`.

### Admin → Site Sync
- Inventory changes emit `inventory.updated` event → edge cache purge for that dealer endpoints.

### Acceptance Criteria
- Unverified domains get 403.
- Verified domain sees inventory embed functioning with pagination and filters in under 200ms P95 (after warmup).

---

## 4) S3/IAM Strategy (Per‑Tenant Isolation)
- **One bucket per environment**: `dealer-admin-dev|staging|prod`.
- Tenant isolation via **key prefixes** and presigned URLs strictly under `{orgId}/…`.
- Server‑side encryption `AES256` + object lock optional for signed docs.
- Metadata tags: `orgId`, `docType`, `dealId` for lifecycle policies.
- Lifecycle rules: temp uploads expire in 7 days; signed docs retained 7+ years.

---

## 5) Billing (Stripe) – Desktop Entitlements + Web Plans
### Product Model
- Products: `Starter`, `Growth`, `Pro` (+ add‑ons: extra users, storage, e‑sign bundle)
- Price model: tiered `per seat`, base includes N docs/month, overage is metered usage (optional, can defer).

### Mapping to System
- `subscriptions` (Convex) holds `stripeSubscriptionId`, `plan`, `seats`, `status`, `currentPeriodEnd`.
- **Entitlements** computed server-side and cached per org: `{ maxUsers, docsPerMonth, features: { customDocs, api, desktop } }`.
- Desktop app checks entitlement via short‑lived JWT fetched after login.

### Webhooks (idempotent)
- Handle: `checkout.session.completed`, `customer.subscription.updated|deleted`, `invoice.paid`, `invoice.payment_failed`.
- Use `eventId` store to prevent reprocessing.

### Acceptance Criteria
- Downgrade & upgrade paths update entitlements within 60s.
- Customer portal link available to OWNER/ADMIN; cancel → grace until period end.

---

## 6) Desktop (Tauri) – UI Polish & Security
### UI Polish Targets
- **Deals**: unify table density, add quick filters, inline edit for status, skeleton states.
- **Documents**: new tab with template library + per‑deal instances; PDF previewer; progress & error handling.
- **Updates**: ensure silent auto‑update channel separation (stable vs beta).

### Security
- Store tokens in **OS keychain** (Tauri plugin); never in plain files.
- Validate org entitlement at startup; periodic refresh.
- Deep‑link handler: whitelisted schema `dealer-sign://` with CSRF `state` and short-lived token.

### Release
- GH Actions matrix build (macOS notarized dmg, Windows msi/exe). Version from tags.

---

## 7) Environment Variables – Production Matrix
Create an **Env Contract** doc and enforce with a runtime validator.

### Shared (all apps)
- `NODE_ENV` = production
- `NEXT_PUBLIC_APP_ENV` = prod|staging|dev
- `S3_ENDPOINT` (if not AWS), `S3_REGION`, `S3_BUCKET`
- `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_JWT_TEMPLATE=desktop-app`
- `CONVEX_DEPLOYMENT`, `CONVEX_SITE_URL`
- `RESEND_API_KEY`
- `APP_BASE_URL` (web), `DESKTOP_UPDATE_FEED_URL` (desktop)
- `CDN_BASE_URL` (public inventory endpoints)

### Web only
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_CDN_BASE_URL`
- `NEXT_PRIVATE_DOMAIN_VERIFY_SECRET` (sign tokens for domain checks)

### Convex functions
- `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_PRO`
- `DOCS_LIFECYCLE_YEARS=7`

### Desktop (build‑time)
- `VITE_API_BASE_URL`
- `TAURI_SIGNING_IDENTITY` (macOS), `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`
- `WINDOWS_CERT_PATH`, `WINDOWS_CERT_PASSWORD`

**Action**: Add `zod` validators both in web and Convex to fail fast on missing vars.

---

## 8) Site Master (Super‑Admin) Page
- Path: `/admin/master` (behind `OWNER` of platform or a special `superAdmin` role table).
- Views:
  - Tenants table: usage, plan, seats, lastActivity, domainVerify status, storage used.
  - Billing health: failed payments, trials ending.
  - Support tools: impersonate (with audit), resend invites, reset domain verification.
- Audit log for actions.

---

## 9) Security & Compliance Hardening
- **PII boundaries**: separate `clients.ssnLast4`, `dob` with dedicated encryption helper; restrict queries by role.
- **Export controls**: CSV exports gated, with watermarking and audit entries.
- **Rate limiting** on public API + auth flows.
- **S3 presign**: content‑type allowlist (pdf, png, jpg), size limits.
- **Inventory API**: read-only keys + CORS verified domain list.

---

## 10) Testing & Observability
- E2E critical flows (Playwright):
  1) Invite → accept → role permissions
  2) Create template → map fields → generate document → sign → immutable
  3) Upload vehicle → appears on public API → purge on update
  4) Stripe checkout → entitlement live in app/desktop
  5) Domain verification (DNS & HTTP)
- Telemetry (Axiom/Sentry/PostHog):
  - Traces around upload/fill/sign, inventory read API P95, webhook latencies.

---

## 11) Phased Work Plan (6 Weeks, Solo‑Dev)
**Week 1 – Org/Permissions & Env Parity**
- Finalize `orgMembers`, guards; migrate any orphan data → add `orgId`.
- Write env validator; split env files (dev/staging/prod); add CI check.

**Week 2 – Documents v1 (Dealer Templates)**
- S3 prefixing + presign utils; `documentTemplates` & UI (upload, versions).
- Field mapping MVP and save schema.

**Week 3 – Deal Documents & PDF Pipeline**
- `documents` CRUD; fill → generate PDF; lock on sign; audit trail.
- Desktop: Deal Docs Tab parity + preview.

**Week 4 – Inventory Public API + Domain Verify**
- Build DNS + HTTP verification flows; verified domains table.
- Public endpoints + CDN headers; CORS allowlist.

**Week 5 – Billing/Entitlements & Site Master**
- Stripe products + webhooks + entitlements cache.
- `/admin/master` with tenant metrics.

**Week 6 – Polish, Security, Releases**
- Desktop auto‑update channels; token keychain; UX polish Deals/Docs.
- Playwright + load tests; incident playbook; GA release.

---

## 12) Concrete Task Backlog (Actionable Tickets)
1. Convex: add `orgMembers` + guards; migrate existing users to role `OWNER`.
2. S3 utils: `putTemplate`, `getTemplate`, `putDocInstance`, `getDocInstance` with prefixing.
3. Web UI: Template Library page (list/upload/version toggle).
4. PDF field mapper UI (map schema→PDF fields) + save to template.
5. Deal Docs Tab (list/status/actions/generate/sign/preview).
6. Desktop: Documents parity + PDF preview component (read-only cache).
7. Domain verification service (DNS+HTTP) + admin UI.
8. Public inventory endpoints + CORS by verified domain.
9. Stripe: products/prices seeding script + webhook handlers (idempotent store).
10. Entitlements cache + `FeatureGate` integration.
11. Site Master page (tenants table + impersonate with audit).
12. Env validator with zod + CI fail-fast.
13. E2E tests for the 5 critical flows.
14. GH Actions: build/sign/notarize; tag-based release promotion (beta→stable).

---

## 13) Risks & Countermeasures
- **PDF mapping complexity** → Start with limited set (Buyer’s Guide, Bill of Sale) and iterate.
- **Domain verification support load** → Prefer DNS TXT; provide copy‑paste instructions + auto checks.
- **Stripe plan churn** → Keep 3 plans only; overages can wait.
- **Desktop updates on Windows** → Provide MSI with auto‑update and a fallback manual download path.

---

## 14) “Done” Definition (for this phase)
- Dealer can onboard team, set templates, generate/sign documents inside deals.
- Verified website can render live inventory via your API, cached and fast.
- Billing upgrades/downgrades reflect within a minute across web/desktop.
- Super‑admin can see health across tenants.
- CI builds signed installers; envs validated; logs/metrics in place.

