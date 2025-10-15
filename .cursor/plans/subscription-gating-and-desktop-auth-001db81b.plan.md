<!-- 001db81b-8134-4af7-b211-8c9b81c0a5ec d15c7015-a8a6-4b00-b321-0a87b2c0d07e -->
# Subscription Gating and Desktop Authentication Enhancement

## 1. Update Subscription Schema and Features

**Files:** `convex/schema.ts`, `convex/subscriptions.ts`

- Add `deals_management` and `desktop_app_access` features to Premium plan
- Add `custom_document_upload` feature to Premium plan
- Update `SubscriptionFeatures` constant to reflect new features
- Ensure existing Premium features include all deal-related functionality

## 2. Implement Deals Page Subscription Gating

### 2.1 Web Application

**Files:** `apps/web/src/app/(dashboard)/deals/page.tsx`, `apps/web/src/app/(dashboard)/deals/_components/DealsTable.tsx`

- Wrap deals page content with `FeatureGate` component requiring Premium plan
- Add subscription check before rendering deals table
- Display upgrade prompt for non-Premium users with clear CTA
- Show feature comparison highlighting Premium benefits

### 2.2 Desktop Application

**Files:** `apps/desktop/src/routes/deals/index.tsx`, `apps/desktop/src/routes/deals/new/index.tsx`

- Create desktop-specific subscription checking utility
- Add subscription status query to deals routes
- Implement Premium plan gate on deals pages
- Add fallback UI showing subscription requirements
- Gate deal creation and document signing flows

### 2.3 Deeplink Gating

**Files:** `convex/deeplink.ts`

- Add subscription check in `generateDeepLinkToken` action
- Verify Premium plan before generating deeplink
- Return error if subscription insufficient
- Add feature check for `desktop_app_access`

## 3. Custom Document Upload System

### 3.1 S3 Bucket Structure Enhancement

**Files:** `convex/secure_s3.ts`, `apps/web/src/lib/s3-bucket-manager.ts`

- Update `createDirectoryStructure` to include `/custom-documents/` folder
- Add subfolder structure: `/custom-documents/{dealId}/`
- Implement bucket path helper: `getCustomDocumentPath(dealershipId, dealId, fileName)`
- Ensure proper permissions for custom document folders

### 3.2 Schema Updates for Custom Documents

**Files:** `convex/schema.ts`

- Add `dealer_uploaded_documents` table with fields:
- `dealId: Id<"deals">`
- `dealershipId: Id<"dealerships">`
- `documentName: string`
- `documentType: string` (contract, agreement, form, etc.)
- `fileId: Id<"file_uploads">`
- `s3Key: string`
- `s3Bucket: string`
- `uploadedBy: string` (userId)
- `fileSize: number`
- `mimeType: string`
- `isActive: boolean`
- `createdAt: number`
- `updatedAt: number`
- Add index on `by_deal` and `by_dealership`
- Update `file_uploads` table to support custom document category

### 3.3 Upload and Management APIs

**Files:** `convex/documents.ts` (new), `convex/secure_s3.ts`

Create mutations and queries:

- `uploadCustomDocument` - mutation to upload dealer document
- `getCustomDocumentsForDeal` - query dealer documents for a deal
- `deleteCustomDocument` - mutation to remove custom document
- `generateCustomDocumentUploadUrl` - action for presigned upload URL
- `generateCustomDocumentDownloadUrl` - action for presigned download URL

### 3.4 UI for Custom Document Upload (Web)

**Files:** `apps/web/src/app/(dashboard)/deals/[dealId]/custom-documents/page.tsx` (new), `apps/web/src/components/documents/CustomDocumentUpload.tsx` (new)

- Create custom documents management page
- Implement file upload component with drag-and-drop
- Show list of uploaded custom documents
- Add delete/download actions
- Validate file types (PDF, DOCX, etc.)
- Show upload progress and success/error states

## 4. Desktop App Document Pack Enhancement

### 4.1 Update Deeplink Exchange Data

**Files:** `convex/deeplink.ts`

Enhance `exchangeDeepLinkToken` to return:

- Complete deal data (existing)
- Document pack with buyers array, dealership info, validation status
- Array of custom uploaded documents with download URLs
- Document generation templates

### 4.2 Desktop Document Display

**Files:** `apps/desktop/src/routes/deals/$dealsId/documents.tsx`, `apps/desktop/src/components/documents/DocumentPackViewer.tsx` (new)

- Display document pack information
- Show buyer details in organized sections
- List generated documents with status badges
- Display custom uploaded documents separately
- Add download/view buttons for each document
- Show document validation status

## 5. Desktop App Session Management and Auto-Logout

### 5.1 Enhanced Session Monitor

**Files:** `apps/desktop/src/lib/auth/session-monitor.ts`

Extend existing `SessionMonitor` class:

- Add `checkTokenExpiry()` method to verify Clerk token validity
- Add `scheduleTokenRefresh()` for proactive token renewal
- Implement `getSessionHealth()` returning session status
- Add events for session expiry, warning, and renewal

### 5.2 Session Provider

**Files:** `apps/desktop/src/lib/auth/SessionProvider.tsx` (new)

Create React context:

- Wrap app with `SessionProvider`
- Track session state (active, warning, expired)
- Monitor idle time using `SessionMonitor`
- Check token expiry every 5 minutes
- Trigger warnings at 2 minutes before timeout
- Auto-logout on session expiry
- Provide `refreshSession()` method

### 5.3 Session UI Components

**Files:** `apps/desktop/src/components/auth/SessionWarningDialog.tsx` (new), `apps/desktop/src/components/auth/SessionExpiredDialog.tsx` (new)

- Create warning dialog showing countdown
- Add "Stay Logged In" button to reset timer
- Create expired dialog with re-login CTA
- Show last activity timestamp

### 5.4 Integrate with Main App

**Files:** `apps/desktop/src/App.tsx`, `apps/desktop/src/routes/__root.tsx`

- Wrap app in `SessionProvider`
- Add session status indicator in header/footer
- Implement auto-logout flow
- Clear local state on logout
- Redirect to login page after logout

## 6. Subscription Provider for Desktop

### 6.1 Create Desktop Subscription Provider

**Files:** `apps/desktop/src/lib/subscription/SubscriptionProvider.tsx` (new)

- Port web's `SubscriptionProvider` to desktop
- Use `@tanstack/react-query` for subscription status
- Implement `useSubscription()` hook
- Auto-refresh subscription status
- Handle subscription state changes

### 6.2 Subscription-Aware Routing

**Files:** `apps/desktop/src/routes/__root.tsx`, `apps/desktop/src/routes/deals/index.tsx`

- Check subscription in route loaders
- Redirect to upgrade page if Premium required
- Show subscription status in UI
- Cache subscription checks

## 7. Convex API Enhancements

### 7.1 Feature Checking Helper

**Files:** `convex/subscriptions.ts`

Add new queries/mutations:

- `checkFeatureAccess` - query to check specific feature access
- `requireFeature` - helper that throws if feature not available
- `getAvailableFeatures` - query returning user's available features

### 7.2 Deal Access Control

**Files:** `convex/deals.ts`

Update existing mutations:

- Add subscription check to `createDeal`
- Add subscription check to `updateDealStatus`
- Add subscription check to `getDeals`
- Return appropriate error messages for insufficient subscription

## 8. Testing and Validation

### 8.1 Subscription Gating Tests

- Verify Basic plan users cannot access deals
- Verify Premium plan users can access deals
- Test deeplink generation with Premium subscription
- Test custom document upload with Premium subscription

### 8.2 Session Management Tests

- Verify auto-logout after idle timeout
- Test warning dialog appears before timeout
- Verify "Stay Logged In" extends session
- Test token refresh functionality

### 8.3 Document Exchange Tests

- Verify custom documents sync from web to desktop
- Test document download URLs work in desktop app
- Verify document pack data is complete
- Test buyer information display

## Implementation Priority

1. **High Priority (Core Functionality)**

- Subscription schema updates
- Deals page gating (web and desktop)
- Desktop session management and auto-logout
- Deeplink subscription checking

2. **Medium Priority (Enhanced Features)**

- Custom document S3 structure
- Custom document upload API
- Custom document UI (web)
- Enhanced deeplink data exchange

3. **Low Priority (Polish)**

- Custom document viewing in desktop
- Session UI improvements
- Subscription status displays
- Feature comparison pages

### To-dos

- [ ] Update SubscriptionFeatures in schema.ts to add deals_management, desktop_app_access, and custom_document_upload to Premium plan
- [ ] Add FeatureGate component to web deals page requiring Premium subscription
- [ ] Implement subscription checking and gating in desktop deals routes
- [ ] Add Premium subscription check to deeplink token generation
- [ ] Update S3 bucket creation to include /custom-documents/ folder structure
- [ ] Add dealer_uploaded_documents table to schema and update file_uploads
- [ ] Create Convex mutations/actions for custom document upload, download, and management
- [ ] Create custom document upload UI component and page in web app
- [ ] Update exchangeDeepLinkToken to return document pack data and custom documents
- [ ] Create document pack viewer component in desktop app to display all deal documents
- [ ] Extend SessionMonitor class with token expiry checking and refresh scheduling
- [ ] Build SessionProvider context for desktop app with auto-logout functionality
- [ ] Create session warning and expired dialogs for desktop app
- [ ] Wire up SessionProvider in desktop App.tsx and add session status indicators
- [ ] Port SubscriptionProvider to desktop app with react-query integration
- [ ] Add subscription checks to desktop route loaders and handle redirects
- [ ] Create checkFeatureAccess and requireFeature helpers in subscriptions.ts
- [ ] Add subscription checks to all deal mutations and queries in deals.ts