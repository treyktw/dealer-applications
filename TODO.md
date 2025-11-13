# Dealer Applications - Comprehensive TODO List
**Last Updated:** November 12, 2025
**Scope:** Web app, Desktop app, Backend, Integrations (Excludes Mobile App)

---

## 🚨 CRITICAL - Fix Immediately

### Security Issues
- [ ] **Replace SHA-256 with bcrypt for password hashing** (`convex/standaloneAuth.ts:12-13`)
  - Current implementation is vulnerable to rainbow table attacks
  - Use `bcrypt.hash()` with minimum 12 rounds
  - Migrate existing passwords on next login

- [ ] **Implement email sending for auth flows** (`convex/standaloneAuth.ts:73, 262`)
  - Currently just logs to console
  - Integrate Resend API for:
    - Email verification codes
    - Password reset links
    - Welcome emails
  - Add email templates

- [ ] **Complete Stripe API integration** (`convex/standaloneSubscriptions.ts:224, 275`)
  - Subscription cancellation only updates local DB
  - Missing actual Stripe API calls for cancel/reactivate
  - Add Stripe webhook handlers

- [ ] **Input validation across all forms**
  - Missing validation for: emails, phone numbers, VINs, SSNs
  - Create validation library in `convex/lib/validation/`
  - Add Zod schemas for all user inputs

---

## 🔐 Security & Auth Enhancements

### Authentication Improvements
- [ ] **Rate limiting for auth endpoints**
  - Login attempts (5 per 15min per IP)
  - Password reset requests (3 per hour)
  - Registration (2 per day per IP)
  - Add IP-based blocking for suspicious activity

- [ ] **Two-factor authentication (2FA)**
  - TOTP support (Google Authenticator, Authy)
  - SMS backup codes
  - Recovery codes generation
  - Admin enforcement option

- [ ] **Session management improvements**
  - Add "Active Sessions" view in settings
  - Remote session termination
  - Device fingerprinting
  - Suspicious login alerts

### PII Vault Implementation
- [ ] **Create secure document vault for driver licenses**
  - Encrypted at rest (AES-256)
  - Separate S3 bucket with restricted access
  - Audit logging for all access
  - Automatic expiration reminders
  - Files: `convex/piiVault.ts`, `convex/lib/encryption.ts`

- [ ] **PII access controls**
  - Role-based viewing permissions
  - Temporary access grants (expire after X hours)
  - Watermarking on downloaded documents
  - GDPR compliance features (right to deletion)

---

## 🏗️ Backend Features

### Missing Integrations

- [ ] **VIN Decode Service** (High Priority)
  - Integrate NHTSA vPIC API (free) or commercial service
  - Create `convex/integrations/vinDecoder.ts`
  - Auto-populate: make, model, year, trim, engine, transmission
  - Add to `convex/inventory.ts` as action
  - Cache decoded data to reduce API calls

- [ ] **Google Maps Integration**
  - Dealership location autocomplete in onboarding
  - Proximity search for vehicles
  - Delivery radius calculator
  - Store lat/long in dealerships table
  - Files: `convex/integrations/googleMaps.ts`, `apps/web/src/lib/maps.ts`

- [ ] **E-Signature Integration** (Document signing workflow)
  - Options: DocuSign, HelloSign, PandaDoc
  - Document signing status tracking
  - Webhook handlers for signature events
  - Add `signatureRequestId` to documents table
  - Files: `convex/integrations/esignature.ts`

- [ ] **Credit Check Integration** (Future)
  - Experian, Equifax, or TransUnion API
  - Soft pull for pre-qualification
  - Store credit score securely (encrypted)
  - Compliance with FCRA regulations

### Document Management

- [ ] **Document Packs - Complete Implementation**
  - [ ] Document versioning system
  - [ ] Bulk document generation (multiple deals at once)
  - [ ] Document templates marketplace
  - [ ] Template preview before generation
  - [ ] Document expiration and archival
  - [ ] Advanced search and filtering

- [ ] **Digital signatures workflow**
  - E-signature provider integration (see above)
  - Signature reminder emails
  - Document completion tracking
  - Legal compliance logging

### Storage & Files

- [ ] **Calculate actual storage usage** (`convex/lib/subscription/limits.ts:96-99`)
  - Query S3 bucket sizes per dealership
  - Cache results (refresh daily)
  - Show breakdown by file type
  - Storage cleanup tools for admins

- [ ] **Default vehicle images for Public API**
  - Generate placeholder images with vehicle details overlay
  - Store in CDN for fast access
  - Return placeholder URL when `vehicle.images.length === 0`
  - Files: `convex/public_api.ts:130-176`, `apps/web/src/lib/placeholders.ts`

- [ ] **Bulk image upload for vehicles**
  - Drag-and-drop multiple files
  - Auto-associate with correct vehicle (filename matching)
  - Image optimization (resize, compress, WebP conversion)
  - Progress indicator for uploads

---

## 🖥️ Desktop App (Tauri)

### Auto-Updater
- [ ] **Fix Tauri updater configuration**
  - Set up update manifest hosting (S3 or GitHub Releases)
  - Configure `tauri.conf.json` updater settings
  - Generate and sign update bundles
  - Add update notification UI
  - Implement rollback mechanism on failed updates
  - Files: `apps/desktop/src-tauri/tauri.conf.json`, `apps/desktop/src/routes/settings/updates.tsx`

- [ ] **Release management workflow**
  - Automated build pipeline (GitHub Actions)
  - Version bump automation
  - Changelog generation
  - Beta/stable release channels

### Offline Mode
- [ ] **Improve conflict resolution** (`apps/desktop/src/lib/sync/`)
  - Last-write-wins strategy documentation
  - Manual conflict resolution UI for important records
  - Conflict log for debugging

- [ ] **Offline queue persistence**
  - Store pending operations in IndexedDB
  - Retry failed syncs exponentially
  - Show sync status in UI (online/offline/syncing)

---

## 🌐 Web App Features

### Master Admin Dashboard

- [ ] **System health monitoring**
  - Convex function execution stats
  - Database query performance
  - S3 bandwidth usage
  - Error rate tracking
  - Active user count (real-time)
  - Files: `apps/web/src/app/(master-admin)/admin/health/page.tsx`

- [ ] **Audit log viewer**
  - Filter by user, action, date range
  - Export to CSV
  - Security event highlighting
  - IP address tracking
  - Files: `apps/web/src/app/(master-admin)/admin/audit-logs/page.tsx`

- [ ] **Revenue analytics dashboard**
  - MRR (Monthly Recurring Revenue) chart
  - Churn rate calculation
  - LTV (Lifetime Value) per dealership
  - Subscription cohort analysis
  - Files: `apps/web/src/app/(master-admin)/admin/analytics/revenue/page.tsx`

- [ ] **Bulk user management**
  - Import users from CSV
  - Bulk role assignment
  - Bulk password reset
  - Bulk account suspension
  - Files: `apps/web/src/app/(master-admin)/admin/users/bulk/page.tsx`

- [ ] **Subscription override controls**
  - Manually adjust limits for specific dealerships
  - Grant trial extensions
  - Apply custom discounts
  - Refund management
  - Files: `apps/web/src/app/(master-admin)/admin/subscriptions/overrides/page.tsx`

### Public API Enhancements

- [ ] **Missing endpoints** (`convex/public_api.ts`, `apps/web/src/app/api/public/`)
  - POST `/api/leads` - Submit inquiry form
  - GET `/api/dealership/:id/hours` - Get business hours
  - GET `/api/dealership/:id/contact` - Get contact info
  - POST `/api/test-drive` - Schedule test drive
  - POST `/api/financing/calculate` - Loan calculator
  - POST `/api/trade-in/estimate` - Trade-in valuation

- [ ] **Webhook system for external integrations**
  - Notify external systems of vehicle status changes
  - Lead notifications
  - Deal completion notifications
  - Webhook signature verification
  - Retry mechanism for failed webhooks
  - Files: `convex/webhooks.ts`, `apps/web/src/app/api/webhooks/`

### Settings & Configuration

- [ ] **IP Management enforcement** (`apps/web/src/app/(dashboard)/settings/security/page.tsx`)
  - Actually block requests from non-whitelisted IPs
  - Middleware integration
  - Bypass for super admins
  - Files: `apps/web/src/middleware.ts`

- [ ] **Data export functionality**
  - Export all dealership data (vehicles, clients, deals)
  - Format options: CSV, JSON, Excel
  - Scheduled exports (weekly, monthly)
  - Email delivery of exports
  - Files: `convex/dataExport.ts`, `apps/web/src/app/(dashboard)/settings/data-export/page.tsx`

- [ ] **Cache management**
  - Purge specific cache entries
  - View cache hit rates
  - Configure cache TTLs
  - Files: `apps/web/src/app/(dashboard)/settings/advanced/cache/page.tsx`

### Onboarding Improvements

- [ ] **Multi-step wizard with progress indicator**
  - Step 1: Company info
  - Step 2: User setup
  - Step 3: Plan selection
  - Step 4: Sample data option
  - Step 5: Tutorial tour
  - Files: `apps/web/src/app/(onboarding)/`

- [ ] **Sample data seeding**
  - Generate realistic test vehicles
  - Create sample customers and deals
  - "Delete sample data" option
  - Files: `convex/sampleData.ts`

- [ ] **Interactive tutorial**
  - Tooltips for first-time users
  - Feature discovery prompts
  - Completion checklist
  - Skip option
  - Files: `apps/web/src/components/tutorial/`

---

## 📊 Analytics & Reporting

- [ ] **Sales conversion funnel**
  - Lead → Test Drive → Offer → Deal stages
  - Conversion rates at each stage
  - Average time per stage
  - Bottleneck identification
  - Files: `convex/analytics/funnel.ts`, `apps/web/src/app/(dashboard)/analytics/funnel/page.tsx`

- [ ] **Inventory aging report**
  - Days on lot per vehicle
  - Slow-moving inventory alerts
  - Price reduction suggestions
  - Aging categories (30/60/90/120+ days)
  - Files: `convex/analytics/inventory.ts`

- [ ] **Salesperson performance metrics**
  - Revenue per salesperson
  - Units sold
  - Average deal size
  - Customer satisfaction ratings
  - Commission calculations
  - Files: `apps/web/src/app/(dashboard)/analytics/sales-team/page.tsx`

- [ ] **Customer acquisition metrics**
  - Cost per lead by source
  - Lead-to-customer conversion rate
  - Customer lifetime value
  - ROI by marketing channel
  - Files: `convex/analytics/marketing.ts`

- [ ] **Document completion rates**
  - Average time to complete document packs
  - Incomplete document tracking
  - Document type completion rates
  - Files: `convex/analytics/documents.ts`

- [ ] **API usage analytics visualization**
  - Currently tracked in `convex/security.ts` but not visualized
  - API calls per endpoint chart
  - Response time distribution
  - Error rate by endpoint
  - Files: `apps/web/src/app/(dashboard)/developers/analytics/page.tsx`

---

## 🔧 Infrastructure & DevOps

### Monitoring & Observability

- [ ] **Application Performance Monitoring (APM)**
  - Integrate: Datadog, New Relic, or Vercel Analytics
  - Track API response times
  - Database query performance
  - Frontend render times
  - Alert on degraded performance

- [ ] **Error tracking**
  - Integrate: Sentry, Rollbar, or Bugsnag
  - Capture frontend errors
  - Capture backend errors
  - Group similar errors
  - Alert on critical errors
  - Files: `apps/web/src/lib/sentry.ts`, `convex/lib/error-tracking.ts`

- [ ] **Uptime monitoring**
  - External ping service (UptimeRobot, Pingdom)
  - Health check endpoints
  - Alert on downtime >5min
  - Status page for customers

### Backup & Recovery

- [ ] **Automated database backups**
  - Daily Convex snapshots
  - Weekly full backups
  - 30-day retention
  - Backup verification tests
  - Files: `scripts/backup-database.ts`

- [ ] **S3 versioning and lifecycle**
  - Enable S3 versioning on all buckets
  - Lifecycle rule: Delete old versions after 90 days
  - Cross-region replication for critical documents
  - Files: Infrastructure as Code (Terraform/CDK)

- [ ] **Disaster recovery plan documentation**
  - RTO (Recovery Time Objective): 4 hours
  - RPO (Recovery Point Objective): 24 hours
  - Runbook for common failures
  - Contact list for emergencies
  - Files: `docs/DISASTER_RECOVERY.md`

---

## 📚 Documentation

- [ ] **API documentation improvements** (`apps/docs/content/docs/api/`)
  - Rate limit headers explained
  - Complete error response schemas
  - Webhook payload examples
  - Pagination details
  - Authentication flow diagrams

- [ ] **SDK code samples**
  - Python SDK examples
  - PHP SDK examples
  - Ruby SDK examples
  - cURL examples for all endpoints
  - Files: `apps/docs/content/docs/api/sdks/`

- [ ] **Postman/Insomnia collection**
  - Exportable API collection
  - Environment variables setup
  - Pre-request scripts
  - Example requests for all endpoints
  - Files: `apps/docs/public/postman/`

- [ ] **Admin user guide**
  - How to manage team members
  - How to configure permissions
  - How to generate reports
  - Troubleshooting common issues
  - Files: `apps/docs/content/docs/guides/admin/`

---

## 🎨 UI/UX Polish

- [ ] **Loading states everywhere**
  - Skeleton loaders for tables
  - Spinners for buttons
  - Progressive loading for images
  - Shimmer effects

- [ ] **Error boundaries**
  - Catch React errors gracefully
  - Show user-friendly error messages
  - Offer "Try Again" action
  - Log errors to Sentry
  - Files: `apps/web/src/components/error-boundary.tsx`

- [ ] **Toast notifications consistency**
  - Success, error, info, warning styles
  - Action buttons in toasts
  - Auto-dismiss timers
  - Undo actions where applicable

- [ ] **Empty states**
  - Helpful illustrations
  - Clear call-to-action
  - Quick start guides
  - Sample data option
  - Files: `apps/web/src/components/empty-states/`

- [ ] **Dark mode refinement**
  - Test all components in dark mode
  - Fix contrast issues
  - Adjust opacity values
  - Theme toggle in settings

---

## 🧪 Testing & Quality

- [ ] **Unit tests**
  - Convex function tests
  - React component tests (Jest + Testing Library)
  - Target: 80% code coverage
  - Files: `__tests__/` directories

- [ ] **Integration tests**
  - API endpoint tests
  - Authentication flow tests
  - Payment flow tests
  - File upload tests
  - Files: `tests/integration/`

- [ ] **E2E tests**
  - Playwright or Cypress
  - Critical user journeys:
    - Sign up → Onboarding → Add vehicle
    - Create deal → Generate documents → Sign
    - Admin: Create user → Assign role
  - Files: `tests/e2e/`

- [ ] **Performance testing**
  - Load testing (K6, Artillery)
  - Stress testing
  - Spike testing
  - Identify bottlenecks

---

## 🚀 Performance Optimizations

- [ ] **Image optimization**
  - Lazy loading
  - WebP format with fallbacks
  - Responsive images (srcset)
  - CDN for static assets

- [ ] **Database query optimization**
  - Add indexes for common queries
  - Analyze slow query log
  - Implement query result caching
  - Pagination everywhere

- [ ] **Code splitting**
  - Route-based splitting
  - Dynamic imports for heavy components
  - Vendor bundle optimization
  - Tree shaking unused code

- [ ] **API response caching**
  - Cache public API responses (1-5 min)
  - Cache vehicle listings
  - Cache dealership info
  - ETags for conditional requests

---

## 🔮 Future Enhancements (Lower Priority)

- [ ] **AI-powered features**
  - Vehicle description generator (GPT-4)
  - Price recommendation engine
  - Lead scoring and prioritization
  - Chatbot for customer inquiries

- [ ] **Advanced search**
  - Elasticsearch integration
  - Fuzzy matching
  - Search suggestions
  - Saved search filters

- [ ] **Multi-language support**
  - i18n infrastructure
  - Translated UI strings
  - Locale-specific formatting (dates, currency)
  - RTL layout support

- [ ] **Mobile app feature parity**
  - (Excluded from this TODO per your request, but noted for future)

---

## 📊 Progress Tracking

**Total Items:** 150+
**Critical:** 4
**High Priority:** 28
**Medium Priority:** 45
**Low Priority:** 73+

**Estimated Effort:**
- Critical fixes: 2-3 weeks
- High priority: 2-3 months
- Medium priority: 3-6 months
- Low priority: 6-12 months

---

## 🎯 Recommended Implementation Order

### Sprint 1 (Week 1-2): Critical Security
1. bcrypt password hashing
2. Email sending implementation
3. Stripe API completion
4. Input validation library

### Sprint 2 (Week 3-4): Essential Integrations
5. VIN decode service
6. Default vehicle images
7. Rate limiting for auth
8. Error tracking (Sentry)

### Sprint 3 (Week 5-6): PII & Security
9. PII vault implementation
10. 2FA setup
11. Session management
12. Audit logging

### Sprint 4 (Week 7-8): Core Features
13. Document packs completion
14. Storage usage calculation
15. Bulk operations
16. E-signature integration

### Sprint 5 (Week 9-10): Admin & Analytics
17. Master admin enhancements
18. Analytics dashboards
19. Reporting tools
20. API documentation

---

**Notes:**
- This TODO list is comprehensive and prioritized
- Each item includes file paths for easy navigation
- Estimated effort is based on 1-2 full-time developers
- Critical items should be addressed before production launch
- Regular progress updates recommended

Would you like me to create detailed implementation plans for any specific items?
