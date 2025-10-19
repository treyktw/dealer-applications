convex/
├─ _generated/
│  ├─ api.d.ts
│  ├─ api.js
│  ├─ dataModel.d.ts
│  ├─ server.d.ts
│  └─ server.js
├─ convex/
├─ queries/
│  └─ templates.ts
├─ .env.local
├─ adminIpManagement.ts
├─ allowList.ts
├─ auth.config.ts
├─ auth.ts
├─ clerk.ts
├─ clients.ts
├─ dealerships.ts
├─ deals.ts
├─ debug.ts
├─ deeplink.ts
├─ desktopAuth.ts
├─ developer.ts
├─ documentPacks.ts
├─ documents.ts
├─ emailAuth.ts
├─ employees.ts
├─ external_api.ts
├─ http.ts
├─ index.ts
├─ inventory.ts
├─ package.json
├─ pdfFieldInspector.ts
├─ pdfFieldMapper.ts
├─ pdfProcessor.ts
├─ pdfTemplates.ts
├─ public_api.ts
├─ README.md
├─ schema.ts
├─ secure_s3.ts
├─ security.ts
├─ settings.ts
├─ stripe_webhook.ts
├─ subscriptions.ts
├─ tsconfig.json
└─ users.ts


desktop/
├─ .tanstack/
├─ dist/
│  ├─ assets/
│  │  ├─ AuthContext-ChlYIV2N.js
│  │  ├─ index-DCa2CGoi.css
│  │  └─ index-DqJ8zHyj.js
│  ├─ icon/
│  │  ├─ 128x128.png
│  │  ├─ 32x32.png
│  │  ├─ icon.icns
│  │  ├─ icon.ico
│  │  └─ icon.png
│  ├─ ds-hero.jpg
│  ├─ index.html
│  └─ logo.png
├─ public/
│  ├─ icon/
│  │  ├─ 128x128.png
│  │  ├─ 32x32.png
│  │  ├─ icon.icns
│  │  ├─ icon.ico
│  │  └─ icon.png
│  ├─ ds-hero.jpg
│  └─ logo.png
├─ src/
│  ├─ assets/
│  │  └─ react.svg
│  ├─ components/
│  │  ├─ auth/
│  │  │  ├─ AuthContext.tsx
│  │  │  ├─ AuthGuard.tsx
│  │  │  └─ DevModelogin.tsx
│  │  ├─ documents/
│  │  │  ├─ BuyerDataForm.tsx
│  │  │  ├─ DealershipInfoForm.tsx
│  │  │  ├─ DocumentList.tsx
│  │  │  └─ ValidationPanel.tsx
│  │  ├─ layout/
│  │  │  ├─ Header.tsx
│  │  │  ├─ layout.tsx
│  │  │  └─ sidebar.tsx
│  │  ├─ subscription/
│  │  │  └─ SubscriptionRequiredScreen.tsx
│  │  ├─ theme/
│  │  │  └─ theme-toggle.tsx
│  │  ├─ ui/
│  │  │  ├─ accordion.tsx
│  │  │  ├─ avatar.tsx
│  │  │  ├─ badge.tsx
│  │  │  ├─ button.tsx
│  │  │  ├─ card.tsx
│  │  │  ├─ checkbox.tsx
│  │  │  ├─ dialog.tsx
│  │  │  ├─ dropdown-menu.tsx
│  │  │  ├─ ErrorBoundary.tsx
│  │  │  ├─ input.tsx
│  │  │  ├─ label.tsx
│  │  │  ├─ loading-screen.tsx
│  │  │  ├─ progress.tsx
│  │  │  ├─ scroll-area.tsx
│  │  │  ├─ select.tsx
│  │  │  ├─ separator.tsx
│  │  │  ├─ switch.tsx
│  │  │  ├─ tabs.tsx
│  │  │  ├─ textarea.tsx
│  │  │  └─ tooltip.tsx
│  │  └─ link-handler.tsx
│  ├─ hooks/
│  ├─ lib/
│  │  ├─ subscription/
│  │  │  ├─ SubscriptionProvider.tsx
│  │  │  └─ subscriptionUtils.ts
│  │  ├─ convex.ts
│  │  ├─ deeplink-listener.ts
│  │  ├─ storage.ts
│  │  └─ utils.ts
│  ├─ routes/
│  │  ├─ deals/
│  │  │  ├─ $dealsId/
│  │  │  │  ├─ documents.tsx
│  │  │  │  └─ index.tsx
│  │  │  ├─ new/
│  │  │  │  └─ index.tsx
│  │  │  └─ index.tsx
│  │  ├─ __root.tsx
│  │  ├─ analytics.tsx
│  │  ├─ dealership.tsx
│  │  ├─ help.tsx
│  │  ├─ index.tsx
│  │  ├─ login.tsx
│  │  ├─ oauth-callback.tsx
│  │  ├─ profile.tsx
│  │  ├─ search.tsx
│  │  ├─ settings.tsx
│  │  ├─ subscription.tsx
│  │  ├─ teams.tsx
│  │  └─ whats-new.tsx
│  ├─ styles/
│  │  ├─ theme.ts
│  │  └─ variables.css
│  ├─ theme/
│  │  ├─ theme.types.ts
│  │  └─ ThemeProvider.tsx
│  ├─ App.css
│  ├─ App.tsx
│  ├─ main.tsx
│  ├─ routeTree.gen.ts
│  └─ vite-env.d.ts
├─ src-tauri/
│  ├─ capabilities/
│  │  └─ default.json
│  ├─ gen/
│  │  ├─ apple/
│  │  │  ├─ assets/
│  │  │  ├─ Assets.xcassets/
│  │  │  │  ├─ AppIcon.appiconset/
│  │  │  │  │  ├─ AppIcon-20x20@1x.png
│  │  │  │  │  ├─ AppIcon-20x20@2x-1.png
│  │  │  │  │  ├─ AppIcon-20x20@2x.png
│  │  │  │  │  ├─ AppIcon-20x20@3x.png
│  │  │  │  │  ├─ AppIcon-29x29@1x.png
│  │  │  │  │  ├─ AppIcon-29x29@2x-1.png
│  │  │  │  │  ├─ AppIcon-29x29@2x.png
│  │  │  │  │  ├─ AppIcon-29x29@3x.png
│  │  │  │  │  ├─ AppIcon-40x40@1x.png
│  │  │  │  │  ├─ AppIcon-40x40@2x-1.png
│  │  │  │  │  ├─ AppIcon-40x40@2x.png
│  │  │  │  │  ├─ AppIcon-40x40@3x.png
│  │  │  │  │  ├─ AppIcon-512@2x.png
│  │  │  │  │  ├─ AppIcon-60x60@2x.png
│  │  │  │  │  ├─ AppIcon-60x60@3x.png
│  │  │  │  │  ├─ AppIcon-76x76@1x.png
│  │  │  │  │  ├─ AppIcon-76x76@2x.png
│  │  │  │  │  ├─ AppIcon-83.5x83.5@2x.png
│  │  │  │  │  └─ Contents.json
│  │  │  │  └─ Contents.json
│  │  │  ├─ dealer-software_iOS/
│  │  │  │  ├─ dealer-software_iOS.entitlements
│  │  │  │  └─ Info.plist
│  │  │  ├─ dealer-software.xcodeproj/
│  │  │  │  ├─ project.xcworkspace/
│  │  │  │  │  ├─ xcshareddata/
│  │  │  │  │  │  └─ WorkspaceSettings.xcsettings
│  │  │  │  │  └─ contents.xcworkspacedata
│  │  │  │  ├─ xcshareddata/
│  │  │  │  │  └─ xcschemes/
│  │  │  │  │     └─ dealer-software_iOS.xcscheme
│  │  │  │  └─ project.pbxproj
│  │  │  ├─ Externals/
│  │  │  ├─ Sources/
│  │  │  │  └─ dealer-software/
│  │  │  │     ├─ bindings/
│  │  │  │     │  └─ bindings.h
│  │  │  │     └─ main.mm
│  │  │  ├─ .gitignore
│  │  │  ├─ ExportOptions.plist
│  │  │  ├─ LaunchScreen.storyboard
│  │  │  ├─ Podfile
│  │  │  └─ project.yml
│  │  └─ schemas/
│  │     ├─ acl-manifests.json
│  │     ├─ capabilities.json
│  │     ├─ desktop-schema.json
│  │     └─ macOS-schema.json
│  ├─ icons/
│  │  ├─ 128x128.png
│  │  ├─ 32x32.png
│  │  ├─ icon.icns
│  │  ├─ icon.ico
│  │  └─ icon.png
│  ├─ src/
│  │  ├─ encryption.rs
│  │  ├─ file_permissions.rs
│  │  ├─ lib.rs
│  │  ├─ main.rs
│  │  └─ security.rs
│  │  ├─ .rustc_info.json
│  │  └─ CACHEDIR.TAG
│  ├─ .gitignore
│  ├─ build.rs
│  ├─ Cargo.lock
│  ├─ Cargo.toml
│  ├─ entitlements.plist
│  ├─ info.plist
│  └─ tauri.conf.json
├─ .env
├─ .env.local
├─ .gitignore
├─ build-signed.sh
├─ components.json
├─ index.html
├─ package.json
├─ README.md
├─ tsconfig.json
├─ tsconfig.node.json
├─ tsr.config.json
└─ vite.config.ts

web/
├─ public/
│  ├─ documents/
│  │  ├─ 1446484_1.pdf
│  │  ├─ 872-IMP-We-Owe-You-Owe-Form.pdf
│  │  ├─ As-Is-Bill-of-Sale-Template.pdf
│  │  ├─ Attachment_0019_-_Bailment_Agreement.pdf
│  │  ├─ cfr_buyers_guides_english.pdf
│  │  ├─ Form MV-7D - State and Local Title Ad Valorem Tax (TAVT) Fees - effective January 1, 2022.pdf
│  │  ├─ framework_ofac_cc.pdf
│  │  ├─ MV_Bill_of_Sale_Form_Form_T7_0 (092022).pdf
│  │  ├─ mv-1_tag_and_title_application_final_6-2020.pdf
│  │  ├─ odometer_disclosure_statement.pdf
│  │  └─ T-8_Limited_Power_of_Attorney.pdf
│  ├─ ds-hero.jpg
│  ├─ file.svg
│  ├─ globe.svg
│  ├─ icon-16x16.png
│  ├─ next.svg
│  ├─ vercel.svg
│  └─ window.svg
├─ react-email/
│  └─ react-email-starter/
│     ├─ emails/
│     │  ├─ static/
│     │  │  ├─ notion-logo.png
│     │  │  ├─ plaid-logo.png
│     │  │  ├─ plaid.png
│     │  │  ├─ stripe-logo.png
│     │  │  ├─ vercel-arrow.png
│     │  │  ├─ vercel-logo.png
│     │  │  ├─ vercel-team.png
│     │  │  └─ vercel-user.png
│     │  ├─ NotificationEmail.tsx
│     │  ├─ notion-magic-link.tsx
│     │  └─ PasswordEmail.tsx
│     ├─ package.json
│     ├─ pnpm-lock.yaml
│     ├─ readme.md
│     └─ tsconfig.json
├─ scripts/
│  ├─ __pycache__/
│  │  └─ generate_dealer_data.cpython-312.pyc
│  ├─ clients_import.csv
│  ├─ clients_test.csv
│  ├─ clients.csv
│  ├─ dealerships.csv
│  ├─ generate_car_data.py
│  ├─ generate_client_data.py
│  ├─ generate_dealer_data.py
│  ├─ generate_venote_data.py
│  ├─ generate-api-secret.js
│  ├─ german_cars.csv
│  ├─ vehicles_import.csv
│  └─ vehicles_test.csv
├─ src/
│  ├─ app/
│  │  ├─ (auth)/
│  │  │  ├─ desktop-callback/
│  │  │  │  └─ page.tsx
│  │  │  ├─ desktop-sso/
│  │  │  │  └─ page.tsx
│  │  │  ├─ employee-signup/
│  │  │  │  └─ [[...employee-signup]]/
│  │  │  │     └─ page.tsx
│  │  │  ├─ sign-in/
│  │  │  │  └─ [[...sign-in]]/
│  │  │  │     └─ page.tsx
│  │  │  ├─ sign-up/
│  │  │  │  └─ [[...sign-up]]/
│  │  │  │     └─ page.tsx
│  │  │  └─ verify-email/
│  │  │     └─ page.tsx
│  │  ├─ (dashboard)/
│  │  │  ├─ clients/
│  │  │  │  ├─ _components/
│  │  │  │  │  ├─ activity-tab.tsx
│  │  │  │  │  ├─ add-note-dialog.tsx
│  │  │  │  │  ├─ card-component.tsx
│  │  │  │  │  ├─ client-vehicles-tab.tsx
│  │  │  │  │  ├─ export-dialog.tsx
│  │  │  │  │  ├─ import-dialog.tsx
│  │  │  │  │  ├─ notes-card.tsx
│  │  │  │  │  └─ vehicle-assignment.tsx
│  │  │  │  ├─ [id]/
│  │  │  │  │  ├─ edit/
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ add/
│  │  │  │  │  └─ page.tsx
│  │  │  │  └─ page.tsx
│  │  │  ├─ dashboard/
│  │  │  │  ├─ page.tsx
│  │  │  │  └─ QuickStatsWidget.tsx
│  │  │  ├─ deals/
│  │  │  │  ├─ _components/
│  │  │  │  │  ├─ DealDetailsSkeleton.tsx
│  │  │  │  │  ├─ DealsSkeleton.tsx
│  │  │  │  │  └─ DealsTable.tsx
│  │  │  │  ├─ [id]/
│  │  │  │  │  └─ page.tsx
│  │  │  │  └─ page.tsx
│  │  │  ├─ inventory/
│  │  │  │  ├─ _components/
│  │  │  │  │  ├─ inventory-edit-page.tsx
│  │  │  │  │  ├─ inventory-filters.tsx
│  │  │  │  │  ├─ inventory-header.tsx
│  │  │  │  │  ├─ inventory-progress.tsx
│  │  │  │  │  ├─ inventory-stats-widget.tsx
│  │  │  │  │  ├─ inventory-table.tsx
│  │  │  │  │  ├─ pagination-control.tsx
│  │  │  │  │  ├─ vehicle-details-page.tsx
│  │  │  │  │  ├─ vehicle-details.tsx
│  │  │  │  │  ├─ vehicle-features.tsx
│  │  │  │  │  ├─ vehicle-form-add-page.tsx
│  │  │  │  │  ├─ vehicle-image-tab.tsx
│  │  │  │  │  ├─ vehicle-import-dialog.tsx
│  │  │  │  │  └─ vehicle-specs.tsx
│  │  │  │  ├─ [id]/
│  │  │  │  │  ├─ edit/
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ add/
│  │  │  │  │  └─ page.tsx
│  │  │  │  └─ page.tsx
│  │  │  ├─ settings/
│  │  │  │  ├─ billing/
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ developer/
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ general/
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ ip-management/
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ notifications/
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ users/
│  │  │  │  │  └─ page.tsx
│  │  │  │  └─ page.tsx
│  │  │  └─ layout.tsx
│  │  ├─ (onboarding)/
│  │  │  ├─ onboarding/
│  │  │  │  └─ page.tsx
│  │  │  └─ subscription/
│  │  │     └─ page.tsx
│  │  ├─ access-denied/
│  │  │  └─ page.tsx
│  │  ├─ api/
│  │  │  ├─ render-invitation-email/
│  │  │  │  └─ route.ts
│  │  │  ├─ send-invitation-email/
│  │  │  │  └─ route.ts
│  │  │  └─ webhooks/
│  │  │     └─ clerk/
│  │  │        └─ route.ts
│  │  ├─ invitation/
│  │  │  └─ [token]/
│  │  │     └─ page.tsx
│  │  ├─ testing/
│  │  │  └─ page.tsx
│  │  ├─ globals.css
│  │  ├─ icon.png
│  │  ├─ layout.tsx
│  │  ├─ loading.tsx
│  │  └─ page.tsx
│  ├─ components/
│  │  ├─ dashboard/
│  │  │  ├─ client/
│  │  │  │  ├─ ClientDealActionButton.tsx
│  │  │  │  ├─ ClientDetailPage.tsx
│  │  │  │  ├─ ClientEditPage.tsx
│  │  │  │  ├─ DealDetailPageComponent.tsx
│  │  │  │  └─ DocumentGenerator.tsx
│  │  │  ├─ inventory/
│  │  │  │  └─ SecureImage.tsx
│  │  │  ├─ pdf-view.tsx
│  │  │  └─ s3-image-uploader.tsx
│  │  ├─ documents/
│  │  │  └─ CustomDocumentUpload.tsx
│  │  ├─ errors/
│  │  │  └─ InvitationErrorBound.tsx
│  │  ├─ forms/
│  │  │  ├─ client/
│  │  │  │  └─ client-form.tsx
│  │  │  ├─ checkbox-form-field.tsx
│  │  │  ├─ custom-form-field.tsx
│  │  │  ├─ datapicker-form-field.tsx
│  │  │  ├─ deal-form.tsx
│  │  │  ├─ form-wrapper.tsx
│  │  │  ├─ input-form-field.tsx
│  │  │  ├─ radiogroup-form-field.tsx
│  │  │  ├─ select-form-field.tsx
│  │  │  └─ textarea-form-field.tsx
│  │  ├─ shared/
│  │  │  ├─ BulkActionBar.tsx
│  │  │  ├─ FilterChips.tsx
│  │  │  ├─ FilterDropdown.tsx
│  │  │  ├─ ItemsPerPageSelector.tsx
│  │  │  ├─ PaginationControls.tsx
│  │  │  └─ SearchInput.tsx
│  │  ├─ subscription/
│  │  │  └─ FeatureGate.tsx
│  │  ├─ ui/
│  │  │  ├─ accordion.tsx
│  │  │  ├─ alert-dialog.tsx
│  │  │  ├─ alert.tsx
│  │  │  ├─ aspect-ratio.tsx
│  │  │  ├─ avatar.tsx
│  │  │  ├─ badge.tsx
│  │  │  ├─ breadcrumb.tsx
│  │  │  ├─ button.tsx
│  │  │  ├─ calendar.tsx
│  │  │  ├─ card.tsx
│  │  │  ├─ carousel.tsx
│  │  │  ├─ chart.tsx
│  │  │  ├─ checkbox.tsx
│  │  │  ├─ collapsible.tsx
│  │  │  ├─ command.tsx
│  │  │  ├─ context-menu.tsx
│  │  │  ├─ dialog.tsx
│  │  │  ├─ drawer.tsx
│  │  │  ├─ dropdown-menu.tsx
│  │  │  ├─ form.tsx
│  │  │  ├─ hover-card.tsx
│  │  │  ├─ input-otp.tsx
│  │  │  ├─ input.tsx
│  │  │  ├─ label.tsx
│  │  │  ├─ menubar.tsx
│  │  │  ├─ multi-step-loader.tsx
│  │  │  ├─ navigation-menu.tsx
│  │  │  ├─ pagination.tsx
│  │  │  ├─ popover.tsx
│  │  │  ├─ progress.tsx
│  │  │  ├─ radio-group.tsx
│  │  │  ├─ resizable.tsx
│  │  │  ├─ scroll-area.tsx
│  │  │  ├─ select.tsx
│  │  │  ├─ separator.tsx
│  │  │  ├─ sheet.tsx
│  │  │  ├─ sidebar.tsx
│  │  │  ├─ skeleton.tsx
│  │  │  ├─ slider.tsx
│  │  │  ├─ sonner.tsx
│  │  │  ├─ switch.tsx
│  │  │  ├─ table.tsx
│  │  │  ├─ tabs.tsx
│  │  │  ├─ textarea.tsx
│  │  │  ├─ toggle-group.tsx
│  │  │  ├─ toggle.tsx
│  │  │  └─ tooltip.tsx
│  │  └─ user-sync.tsx
│  ├─ constants/
│  │  └─ inventory.ts
│  ├─ convex/
│  │  └─ client.ts
│  ├─ db/
│  │  ├─ index.ts
│  │  └─ schema.ts
│  ├─ emails/
│  │  └─ InvitationEmail.tsx
│  ├─ hooks/
│  │  ├─ use-mobile.ts
│  │  ├─ useCurrentUser.ts
│  │  ├─ useDebounce.ts
│  │  ├─ useIPManagement.ts
│  │  ├─ usePaginationSearch.ts
│  │  ├─ useUrlState.ts
│  │  └─ useUserManagement.ts
│  ├─ lib/
│  │  ├─ schemas/
│  │  │  └─ index.ts
│  │  ├─ auth.ts
│  │  ├─ email-service.ts
│  │  ├─ migrateToConvex.ts
│  │  ├─ notifications.ts
│  │  ├─ resend.ts
│  │  ├─ s3-bucket-manager.ts
│  │  ├─ s3.ts
│  │  └─ utils.ts
│  ├─ middleware/
│  │  └─ ip-check.ts
│  ├─ providers/
│  │  ├─ convex-provider.tsx
│  │  ├─ dealership-provider.tsx
│  │  ├─ query-provider.tsx
│  │  └─ SubscriptionProvider.tsx
│  ├─ services/
│  │  ├─ document-service.ts
│  │  ├─ pdf-template-service.ts
│  │  └─ vehicle-image-service.ts
│  ├─ types/
│  │  ├─ client.ts
│  │  ├─ documents.ts
│  │  ├─ index.ts
│  │  └─ vehicle.ts
│  └─ middleware.ts
├─ .env
├─ .env.local
├─ .gitignore
├─ components.json
├─ convex.json
├─ drizzle.config.ts
├─ eslint.config.mjs
├─ next-env.d.ts
├─ next.config.ts
├─ package.json
├─ pnpm-lock.yaml
├─ postcss.config.mjs
├─ README.md
├─ tsconfig.json
└─ tsconfig.tsbuildinfo
