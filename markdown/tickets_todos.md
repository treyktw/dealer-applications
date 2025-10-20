# Dealer Apps — Production Hardening & Feature Roadmap (Ticket-Based Plan)


## 🎯 Ticket-Based Task List (20 Tickets Total)

### 1. Convex Security & Environment Setup
1. **T1 — Implement Env Validator**: Add zod-based validator for `.env` vars, ensure CI fails if missing.
2. **T2 — Create Convex Guards**: Add `requireOrg(ctx)` and `assertPerm(ctx, perm)` for org scoping and permission enforcement.
3. **T3 — Implement RBAC Schema**: Add `roles` and `orgMembers` tables; seed OWNER, ADMIN, SALES with capability strings.
4. **T4 — Add Permission Middleware**: Enforce role-based access across Convex queries and mutations.

### 2. S3 Integration & Dealer-Specific Storage
5. **T5 — Build Presign Utils**: Create secure PUT/GET presign functions with TTL, strict content-type checks.
6. **T6 — Enforce S3 Prefix Structure**: Store documents under `org/{orgId}/docs/...` and vehicles under `org/{orgId}/vehicles/...`.
7. **T7 — Integrate Upload Flow**: Update frontends to request presigns and upload directly to S3; test upload limits.

### 3. Dealer Templates & Documents
8. **T8 — Create Template Library UI (Web)**: Add CRUD for templates (upload, activate/deactivate, preview, versioning).
9. **T9 — Add Field Mapper UI**: Map PDF form fields to schema; store JSON schema in Convex.
10. **T10 — Deal Document Pipeline**: Generate filled PDF from template; add DRAFT→READY→SIGNED transitions.
11. **T11 — Add Audit & Version Control**: Track createdBy, signedBy, timestamps; lock documents post-sign.
12. **T12 — Desktop Document Parity**: Mirror Template Library + Deal Docs UI; implement local PDF preview.

### 4. Inventory Public API & Domain Verification
13. **T13 — Public Inventory Endpoints**: Create `/api/public/v1/{dealerSlug}/inventory` and `/vehicles/{vin}`; limit by verified domains.
14. **T14 — Domain Verification System**: Build DNS TXT + HTTP challenge verifiers; Convex mutations for validation state.
15. **T15 — CORS & CDN Caching**: Add verified-domain CORS allowlist; apply caching headers (`stale-while-revalidate`).

### 5. Billing & Entitlements (Stripe)
16. **T16 — Stripe Seed Script**: Seed 3 plans (Starter, Growth, Pro) with IDs stored in env.
17. **T17 — Stripe Webhook Handlers**: Handle `checkout.session.completed`, `subscription.updated`, `deleted` with idempotency.
18. **T18 — Convex Entitlements Cache**: Store plan → feature matrix; update on webhook trigger.

### 6. Platform & Master Admin
19. **T19 — Site Master Page**: Build `/admin/master` for tenant overview (storage, plan, domain, user count, billing status).
20. **T20 — GH Actions Release Workflow**: Configure tagged builds → web deploy + desktop build/sign/notarize.

---

# 🚀 Execution Plan (Detailed Guide)

### **Phase 1: Security & Foundations (Day 1–2)**
- **Env Validator**: Add `env.ts` at project root with zod schema for all critical vars. Ensure Next.js & Convex read from it.
- **Guards & RBAC**: Create `convex/guards.ts`. Implement:
  ```ts
  export function requireOrg(ctx) { ... }
  export async function assertPerm(ctx, perm) { ... }
  ```
- Add default roles in `convex/roles.ts` and link users to org via `orgMembers` table.
- Build seed script to assign OWNER to all current dealers.

### **Phase 2: S3 Setup (Day 3)**
- Add `convex/lib/s3.ts` with `presignPut` and `presignGet` using AWS SDK v3.
- Create prefixes: `org/{orgId}/docs/templates`, `org/{orgId}/docs/instances`, `org/{orgId}/vehicles`.
- Add max upload size (10MB docs, 25MB images).
- Create test utility page for uploads to confirm CORS & permissions.

### **Phase 3: Documents System (Day 4–6)**
- **Templates**: Add `documentTemplates` table with name, category, version, schema.
- Add web UI at `/dashboard/documents/templates`: upload PDF → auto store in S3 → preview.
- **Mapper**: Build modal to map schema fields → PDF form fields; save JSON schema in Convex.
- **Deal Docs**: Add `documents` table linked to `dealId`; implement status machine (DRAFT, READY, SIGNED).
- Add sign/lock logic and audit fields.
- Update desktop app routes: `routes/deals/$dealsId/documents.tsx` to mirror web.

### **Phase 4: Inventory API (Day 7–8)**
- Create Next.js API route `/api/public/v1/[dealerSlug]/inventory` that fetches via Convex query.
- Enforce domain verification: only verified domains pass.
- **Verification**: Add Convex mutations for generating token → check DNS TXT or HTTP file.
- Add admin UI in settings → domain verification tab.
- Add cache headers and public GET endpoint for `vehicles/{vin}`.

### **Phase 5: Billing Integration (Day 9)**
- Add Stripe seed script under `scripts/stripe_seed.js` to create product/prices.
- Add webhook handler in Convex: `stripe_webhook.ts` (use idempotency key store).
- On webhook, update `subscriptions` table with new plan and entitlements.
- Create `getEntitlements(orgId)` query returning feature flags (docs, api, users, etc.).

### **Phase 6: Master Admin + Release (Day 10–11)**
- Add `/admin/master` route to web:
  - Query all dealers: name, plan, domains, docs count, users.
  - Add filters for active/inactive.
  - No destructive actions in v1.
- Setup GH Actions (`.github/workflows/release.yml`) for:
  - Web: deploy via Vercel or Docker.
  - Desktop: Tauri build, sign, notarize.
- Version bump on tag push (`v1.0.0-beta`, `v1.0.0`).

---

## ✅ Quality Gates Before Release
- All uploads route through presigned URLs.
- Convex enforces org scoping.
- Stripe webhooks idempotent.
- Verified domains only for inventory API.
- Signed PDFs immutable.
- Desktop token stored in keychain only.

---

## 📦 Deliverables by End of Cycle
1. Dealer-specific document system with versioned templates.
2. S3 per-org isolation with strict presign.
3. Public inventory API with verified domain access.
4. Stripe billing + entitlement sync.
5. Site master dashboard for tenant overview.
6. Stable web + desktop builds with CI automation.

---

## ⏰ Final Timeline (11-Day Aggressive)
| Phase | Focus | Days |
|--------|--------|------|
| 1 | Security + Env + RBAC | 1–2 |
| 2 | S3 Prefix & Upload Flow | 3 |
| 3 | Documents System | 4–6 |
| 4 | Inventory API + Domain Verify | 7–8 |
| 5 | Stripe + Entitlements | 9 |
| 6 | Admin Page + GH Release | 10–11 |

---

**Outcome:** Once these tickets are closed, the dealer app will be fully production-ready — secure, multi-tenant, with isolated document storage, verified domain APIs, stable desktop parity, and Stripe-integrated billing ready for scaling to 50+ dealerships.

