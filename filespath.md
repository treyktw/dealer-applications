dealer-applications/
├─ .turbo/
│  ├─ cache/
│  ├─ cookies/
│  │  └─ 1.cookie
│  ├─ daemon/
│  │  ├─ 9e9f6c34e3e4de8e-turbo.log.2025-09-02
│  │  ├─ 9e9f6c34e3e4de8e-turbo.log.2025-09-27
│  │  └─ 9e9f6c34e3e4de8e-turbo.log.2025-10-10
│  └─ preferences/
│     └─ tui.json
├─ .vscode/
│  └─ settings.json
├─ apps/
│  ├─ desktop/
│  │  ├─ .tanstack/
│  │  ├─ public/
│  │  │  ├─ ds-hero.jpg
│  │  │  ├─ logo.png
│  │  │  ├─ tauri.svg
│  │  │  └─ vite.svg
│  │  ├─ src/
│  │  │  ├─ assets/
│  │  │  │  └─ react.svg
│  │  │  ├─ components/
│  │  │  │  ├─ admin/
│  │  │  │  │  └─ TemplateSetup.tsx
│  │  │  │  ├─ auth/
│  │  │  │  │  ├─ login-form.tsx
│  │  │  │  │  ├─ session-status.tsx
│  │  │  │  │  └─ step-up-modal.tsx
│  │  │  │  ├─ documents/
│  │  │  │  │  ├─ BuyerDataForm.tsx
│  │  │  │  │  ├─ DealershipInfoForm.tsx
│  │  │  │  │  ├─ DocumentList.tsx
│  │  │  │  │  └─ ValidationPanel.tsx
│  │  │  │  ├─ layout/
│  │  │  │  │  ├─ Header.tsx
│  │  │  │  │  ├─ layout.tsx
│  │  │  │  │  └─ sidebar.tsx
│  │  │  │  ├─ magicui/
│  │  │  │  │  └─ flickering-grid.tsx
│  │  │  │  ├─ theme/
│  │  │  │  │  └─ theme-toggle.tsx
│  │  │  │  ├─ ui/
│  │  │  │  │  ├─ badge.tsx
│  │  │  │  │  ├─ button.tsx
│  │  │  │  │  ├─ card.tsx
│  │  │  │  │  ├─ checkbox.tsx
│  │  │  │  │  ├─ dialog.tsx
│  │  │  │  │  ├─ dropdown-menu.tsx
│  │  │  │  │  ├─ input.tsx
│  │  │  │  │  ├─ label.tsx
│  │  │  │  │  ├─ select.tsx
│  │  │  │  │  ├─ sonner.tsx
│  │  │  │  │  └─ tabs.tsx
│  │  │  │  └─ deeplink-handler.tsx
│  │  │  ├─ deeplink/
│  │  │  │  ├─ exchange.ts
│  │  │  │  └─ listener.ts
│  │  │  ├─ effect/
│  │  │  │  ├─ domain/
│  │  │  │  │  ├─ Auth.ts
│  │  │  │  │  └─ DeepLink.ts
│  │  │  │  └─ layers/
│  │  │  │     ├─ ClerkLayer.ts
│  │  │  │     └─ SecureSession.ts
│  │  │  ├─ lib/
│  │  │  │  ├─ auth/
│  │  │  │  │  ├─ auth-context.ts
│  │  │  │  │  ├─ rate-limiter.ts
│  │  │  │  │  ├─ README.md
│  │  │  │  │  └─ session-monitor.ts
│  │  │  │  ├─ convex.ts
│  │  │  │  └─ utils.ts
│  │  │  ├─ routes/
│  │  │  │  ├─ deals/
│  │  │  │  │  ├─ $dealsId/
│  │  │  │  │  │  ├─ documents.tsx
│  │  │  │  │  │  └─ index.tsx
│  │  │  │  │  ├─ new/
│  │  │  │  │  │  └─ index.tsx
│  │  │  │  │  └─ index.tsx
│  │  │  │  ├─ __root.tsx
│  │  │  │  ├─ index.tsx
│  │  │  │  ├─ login.tsx
│  │  │  │  └─ settings.tsx
│  │  │  ├─ state/
│  │  │  │  ├─ deeplink.slice.ts
│  │  │  │  └─ exchange.ts
│  │  │  ├─ styles/
│  │  │  │  ├─ theme.ts
│  │  │  │  └─ variables.css
│  │  │  ├─ theme/
│  │  │  │  ├─ theme.types.ts
│  │  │  │  └─ ThemeProvider.tsx
│  │  │  ├─ App.css
│  │  │  ├─ App.tsx
│  │  │  ├─ main.tsx
│  │  │  ├─ routeTree.gen.ts
│  │  │  └─ vite-env.d.ts
│  │  ├─ src-tauri/
│  │  │  ├─ capabilities/
│  │  │  │  └─ default.json
│  │  │  ├─ gen/
│  │  │  │  ├─ apple/
│  │  │  │  │  ├─ assets/
│  │  │  │  │  ├─ Assets.xcassets/
│  │  │  │  │  │  ├─ AppIcon.appiconset/
│  │  │  │  │  │  │  ├─ AppIcon-20x20@1x.png
│  │  │  │  │  │  │  ├─ AppIcon-20x20@2x-1.png
│  │  │  │  │  │  │  ├─ AppIcon-20x20@2x.png
│  │  │  │  │  │  │  ├─ AppIcon-20x20@3x.png
│  │  │  │  │  │  │  ├─ AppIcon-29x29@1x.png
│  │  │  │  │  │  │  ├─ AppIcon-29x29@2x-1.png
│  │  │  │  │  │  │  ├─ AppIcon-29x29@2x.png
│  │  │  │  │  │  │  ├─ AppIcon-29x29@3x.png
│  │  │  │  │  │  │  ├─ AppIcon-40x40@1x.png
│  │  │  │  │  │  │  ├─ AppIcon-40x40@2x-1.png
│  │  │  │  │  │  │  ├─ AppIcon-40x40@2x.png
│  │  │  │  │  │  │  ├─ AppIcon-40x40@3x.png
│  │  │  │  │  │  │  ├─ AppIcon-512@2x.png
│  │  │  │  │  │  │  ├─ AppIcon-60x60@2x.png
│  │  │  │  │  │  │  ├─ AppIcon-60x60@3x.png
│  │  │  │  │  │  │  ├─ AppIcon-76x76@1x.png
│  │  │  │  │  │  │  ├─ AppIcon-76x76@2x.png
│  │  │  │  │  │  │  ├─ AppIcon-83.5x83.5@2x.png
│  │  │  │  │  │  │  └─ Contents.json
│  │  │  │  │  │  └─ Contents.json
│  │  │  │  │  ├─ dealer-software_iOS/
│  │  │  │  │  │  ├─ dealer-software_iOS.entitlements
│  │  │  │  │  │  └─ Info.plist
│  │  │  │  │  ├─ dealer-software.xcodeproj/
│  │  │  │  │  │  ├─ project.xcworkspace/
│  │  │  │  │  │  │  ├─ xcshareddata/
│  │  │  │  │  │  │  │  └─ WorkspaceSettings.xcsettings
│  │  │  │  │  │  │  └─ contents.xcworkspacedata
│  │  │  │  │  │  ├─ xcshareddata/
│  │  │  │  │  │  │  └─ xcschemes/
│  │  │  │  │  │  │     └─ dealer-software_iOS.xcscheme
│  │  │  │  │  │  └─ project.pbxproj
│  │  │  │  │  ├─ Externals/
│  │  │  │  │  ├─ Sources/
│  │  │  │  │  │  └─ dealer-software/
│  │  │  │  │  │     ├─ bindings/
│  │  │  │  │  │     │  └─ bindings.h
│  │  │  │  │  │     └─ main.mm
│  │  │  │  │  ├─ .gitignore
│  │  │  │  │  ├─ ExportOptions.plist
│  │  │  │  │  ├─ LaunchScreen.storyboard
│  │  │  │  │  ├─ Podfile
│  │  │  │  │  └─ project.yml
│  │  │  │  └─ schemas/
│  │  │  │     ├─ acl-manifests.json
│  │  │  │     ├─ capabilities.json
│  │  │  │     ├─ desktop-schema.json
│  │  │  │     └─ macOS-schema.json
│  │  │  ├─ icons/
│  │  │  │  ├─ 128x128.png
│  │  │  │  ├─ 128x128@2x.png
│  │  │  │  ├─ 32x32.png
│  │  │  │  ├─ icon.icns
│  │  │  │  ├─ icon.ico
│  │  │  │  ├─ icon.png
│  │  │  │  ├─ Square107x107Logo.png
│  │  │  │  ├─ Square142x142Logo.png
│  │  │  │  ├─ Square150x150Logo.png
│  │  │  │  ├─ Square284x284Logo.png
│  │  │  │  ├─ Square30x30Logo.png
│  │  │  │  ├─ Square310x310Logo.png
│  │  │  │  ├─ Square44x44Logo.png
│  │  │  │  ├─ Square71x71Logo.png
│  │  │  │  ├─ Square89x89Logo.png
│  │  │  │  └─ StoreLogo.png
│  │  │  ├─ src/
│  │  │  │  ├─ lib.rs
│  │  │  │  ├─ main.rs
│  │  │  │  └─ security.rs
│  │  │  │  ├─ .rustc_info.json
│  │  │  │  └─ CACHEDIR.TAG
│  │  │  ├─ .gitignore
│  │  │  ├─ build.rs
│  │  │  ├─ Cargo.lock
│  │  │  ├─ Cargo.toml
│  │  │  ├─ info.plist
│  │  │  └─ tauri.conf.json
│  │  ├─ .env
│  │  ├─ .env.local
│  │  ├─ .gitignore
│  │  ├─ components.json
│  │  ├─ index.html
│  │  ├─ package.json
│  │  ├─ README.md
│  │  ├─ tsconfig.json
│  │  ├─ tsconfig.node.json
│  │  ├─ tsr.config.json
│  │  └─ vite.config.ts
│  ├─ docs/
│  │  ├─ .next/
│  │  │  ├─ cache/
│  │  │  │  └─ .rscinfo
│  │  │  ├─ server/
│  │  │  │  ├─ app-paths-manifest.json
│  │  │  │  ├─ interception-route-rewrite-manifest.js
│  │  │  │  ├─ middleware-build-manifest.js
│  │  │  │  ├─ middleware-manifest.json
│  │  │  │  ├─ next-font-manifest.js
│  │  │  │  ├─ next-font-manifest.json
│  │  │  │  ├─ pages-manifest.json
│  │  │  │  ├─ server-reference-manifest.js
│  │  │  │  └─ server-reference-manifest.json
│  │  │  ├─ static/
│  │  │  │  └─ development/
│  │  │  │     ├─ _buildManifest.js
│  │  │  │     ├─ _clientMiddlewareManifest.json
│  │  │  │     └─ _ssgManifest.js
│  │  │  ├─ types/
│  │  │  │  ├─ routes.d.ts
│  │  │  │  └─ validator.ts
│  │  │  ├─ app-build-manifest.json
│  │  │  ├─ build-manifest.json
│  │  │  ├─ fallback-build-manifest.json
│  │  │  ├─ package.json
│  │  │  ├─ prerender-manifest.json
│  │  │  ├─ routes-manifest.json
│  │  │  └─ trace
│  │  ├─ app/
│  │  │  ├─ fonts/
│  │  │  │  ├─ GeistMonoVF.woff
│  │  │  │  └─ GeistVF.woff
│  │  │  ├─ favicon.ico
│  │  │  ├─ globals.css
│  │  │  ├─ layout.tsx
│  │  │  ├─ page.module.css
│  │  │  └─ page.tsx
│  │  ├─ public/
│  │  │  ├─ file-text.svg
│  │  │  ├─ globe.svg
│  │  │  ├─ next.svg
│  │  │  ├─ turborepo-dark.svg
│  │  │  ├─ turborepo-light.svg
│  │  │  ├─ vercel.svg
│  │  │  └─ window.svg
│  │  ├─ .gitignore
│  │  ├─ eslint.config.js
│  │  ├─ next-env.d.ts
│  │  ├─ next.config.js
│  │  ├─ package.json
│  │  ├─ README.md
│  │  └─ tsconfig.json
│  ├─ mobile/
│  └─ web/
│     ├─ react-email/
│     │  └─ react-email-starter/
│     │     ├─ emails/
│     │     │  ├─ static/
│     │     │  │  ├─ notion-logo.png
│     │     │  │  ├─ plaid-logo.png
│     │     │  │  ├─ plaid.png
│     │     │  │  ├─ stripe-logo.png
│     │     │  │  ├─ vercel-arrow.png
│     │     │  │  ├─ vercel-logo.png
│     │     │  │  ├─ vercel-team.png
│     │     │  │  └─ vercel-user.png
│     │     │  ├─ NotificationEmail.tsx
│     │     │  ├─ notion-magic-link.tsx
│     │     │  └─ PasswordEmail.tsx
│     │     ├─ package.json
│     │     ├─ pnpm-lock.yaml
│     │     ├─ readme.md
│     │     └─ tsconfig.json
│     ├─ scripts/
│     │  ├─ __pycache__/
│     │  │  └─ generate_dealer_data.cpython-312.pyc
│     │  ├─ clients_import.csv
│     │  ├─ clients_test.csv
│     │  ├─ clients.csv
│     │  ├─ dealerships.csv
│     │  ├─ generate_car_data.py
│     │  ├─ generate_client_data.py
│     │  ├─ generate_dealer_data.py
│     │  ├─ generate_venote_data.py
│     │  ├─ generate-api-secret.js
│     │  ├─ german_cars.csv
│     │  ├─ vehicles_import.csv
│     │  └─ vehicles_test.csv
│     ├─ src/
│     │  ├─ app/
│     │  │  ├─ (auth)/
│     │  │  │  ├─ employee-signup/
│     │  │  │  │  └─ [[...employee-signup]]/
│     │  │  │  │     └─ page.tsx
│     │  │  │  ├─ sign-in/
│     │  │  │  │  └─ [[...sign-in]]/
│     │  │  │  │     └─ page.tsx
│     │  │  │  ├─ sign-up/
│     │  │  │  │  └─ [[...sign-up]]/
│     │  │  │  │     └─ page.tsx
│     │  │  │  └─ verify-email/
│     │  │  │     └─ page.tsx
│     │  │  ├─ (dashboard)/
│     │  │  │  ├─ clients/
│     │  │  │  │  ├─ _components/
│     │  │  │  │  │  ├─ activity-tab.tsx
│     │  │  │  │  │  ├─ add-note-dialog.tsx
│     │  │  │  │  │  ├─ card-component.tsx
│     │  │  │  │  │  ├─ client-vehicles-tab.tsx
│     │  │  │  │  │  ├─ export-dialog.tsx
│     │  │  │  │  │  ├─ import-dialog.tsx
│     │  │  │  │  │  ├─ notes-card.tsx
│     │  │  │  │  │  └─ vehicle-assignment.tsx
│     │  │  │  │  ├─ [id]/
│     │  │  │  │  │  ├─ edit/
│     │  │  │  │  │  │  └─ page.tsx
│     │  │  │  │  │  └─ page.tsx
│     │  │  │  │  ├─ add/
│     │  │  │  │  │  └─ page.tsx
│     │  │  │  │  └─ page.tsx
│     │  │  │  ├─ dashboard/
│     │  │  │  │  ├─ page.tsx
│     │  │  │  │  └─ QuickStatsWidget.tsx
│     │  │  │  ├─ deals/
│     │  │  │  │  ├─ _components/
│     │  │  │  │  │  ├─ DealDetailsSkeleton.tsx
│     │  │  │  │  │  ├─ DealsSkeleton.tsx
│     │  │  │  │  │  └─ DealsTable.tsx
│     │  │  │  │  ├─ [id]/
│     │  │  │  │  │  └─ page.tsx
│     │  │  │  │  └─ page.tsx
│     │  │  │  ├─ inventory/
│     │  │  │  │  ├─ _components/
│     │  │  │  │  │  ├─ inventory-edit-page.tsx
│     │  │  │  │  │  ├─ inventory-filters.tsx
│     │  │  │  │  │  ├─ inventory-header.tsx
│     │  │  │  │  │  ├─ inventory-progress.tsx
│     │  │  │  │  │  ├─ inventory-stats-widget.tsx
│     │  │  │  │  │  ├─ inventory-table.tsx
│     │  │  │  │  │  ├─ pagination-control.tsx
│     │  │  │  │  │  ├─ vehicle-details-page.tsx
│     │  │  │  │  │  ├─ vehicle-details.tsx
│     │  │  │  │  │  ├─ vehicle-features.tsx
│     │  │  │  │  │  ├─ vehicle-form-add-page.tsx
│     │  │  │  │  │  ├─ vehicle-image-tab.tsx
│     │  │  │  │  │  ├─ vehicle-import-dialog.tsx
│     │  │  │  │  │  └─ vehicle-specs.tsx
│     │  │  │  │  ├─ [id]/
│     │  │  │  │  │  ├─ edit/
│     │  │  │  │  │  │  └─ page.tsx
│     │  │  │  │  │  └─ page.tsx
│     │  │  │  │  ├─ add/
│     │  │  │  │  │  └─ page.tsx
│     │  │  │  │  └─ page.tsx
│     │  │  │  ├─ settings/
│     │  │  │  │  ├─ billing/
│     │  │  │  │  │  └─ page.tsx
│     │  │  │  │  ├─ developer/
│     │  │  │  │  │  └─ page.tsx
│     │  │  │  │  ├─ general/
│     │  │  │  │  │  └─ page.tsx
│     │  │  │  │  ├─ ip-management/
│     │  │  │  │  │  └─ page.tsx
│     │  │  │  │  ├─ notifications/
│     │  │  │  │  │  └─ page.tsx
│     │  │  │  │  ├─ users/
│     │  │  │  │  │  └─ page.tsx
│     │  │  │  │  └─ page.tsx
│     │  │  │  └─ layout.tsx
│     │  │  ├─ (onboarding)/
│     │  │  │  ├─ onboarding/
│     │  │  │  │  └─ page.tsx
│     │  │  │  └─ subscription/
│     │  │  │     └─ page.tsx
│     │  │  ├─ access-denied/
│     │  │  │  └─ page.tsx
│     │  │  ├─ api/
│     │  │  │  ├─ render-invitation-email/
│     │  │  │  │  └─ route.ts
│     │  │  │  ├─ send-invitation-email/
│     │  │  │  │  └─ route.ts
│     │  │  │  └─ webhooks/
│     │  │  │     └─ clerk/
│     │  │  │        └─ route.ts
│     │  │  ├─ invitation/
│     │  │  │  └─ [token]/
│     │  │  │     └─ page.tsx
│     │  │  ├─ testing/
│     │  │  │  └─ page.tsx
│     │  │  ├─ globals.css
│     │  │  ├─ icon.png
│     │  │  ├─ layout.tsx
│     │  │  ├─ loading.tsx
│     │  │  └─ page.tsx
│     │  ├─ components/
│     │  │  ├─ dashboard/
│     │  │  │  ├─ client/
│     │  │  │  │  ├─ ClientDealActionButton.tsx
│     │  │  │  │  ├─ ClientDetailPage.tsx
│     │  │  │  │  ├─ ClientEditPage.tsx
│     │  │  │  │  ├─ DealDetailPageComponent.tsx
│     │  │  │  │  └─ DocumentGenerator.tsx
│     │  │  │  ├─ inventory/
│     │  │  │  │  └─ SecureImage.tsx
│     │  │  │  ├─ pdf-view.tsx
│     │  │  │  └─ s3-image-uploader.tsx
│     │  │  ├─ errors/
│     │  │  │  └─ InvitationErrorBound.tsx
│     │  │  ├─ forms/
│     │  │  │  ├─ client/
│     │  │  │  │  └─ client-form.tsx
│     │  │  │  ├─ checkbox-form-field.tsx
│     │  │  │  ├─ custom-form-field.tsx
│     │  │  │  ├─ datapicker-form-field.tsx
│     │  │  │  ├─ deal-form.tsx
│     │  │  │  ├─ form-wrapper.tsx
│     │  │  │  ├─ input-form-field.tsx
│     │  │  │  ├─ radiogroup-form-field.tsx
│     │  │  │  ├─ select-form-field.tsx
│     │  │  │  └─ textarea-form-field.tsx
│     │  │  ├─ shared/
│     │  │  │  ├─ BulkActionBar.tsx
│     │  │  │  ├─ FilterChips.tsx
│     │  │  │  ├─ FilterDropdown.tsx
│     │  │  │  ├─ ItemsPerPageSelector.tsx
│     │  │  │  ├─ PaginationControls.tsx
│     │  │  │  └─ SearchInput.tsx
│     │  │  ├─ subscription/
│     │  │  │  └─ FeatureGate.tsx
│     │  │  ├─ ui/
│     │  │  │  ├─ accordion.tsx
│     │  │  │  ├─ alert-dialog.tsx
│     │  │  │  ├─ alert.tsx
│     │  │  │  ├─ aspect-ratio.tsx
│     │  │  │  ├─ avatar.tsx
│     │  │  │  ├─ badge.tsx
│     │  │  │  ├─ breadcrumb.tsx
│     │  │  │  ├─ button.tsx
│     │  │  │  ├─ calendar.tsx
│     │  │  │  ├─ card.tsx
│     │  │  │  ├─ carousel.tsx
│     │  │  │  ├─ chart.tsx
│     │  │  │  ├─ checkbox.tsx
│     │  │  │  ├─ collapsible.tsx
│     │  │  │  ├─ command.tsx
│     │  │  │  ├─ context-menu.tsx
│     │  │  │  ├─ dialog.tsx
│     │  │  │  ├─ drawer.tsx
│     │  │  │  ├─ dropdown-menu.tsx
│     │  │  │  ├─ form.tsx
│     │  │  │  ├─ hover-card.tsx
│     │  │  │  ├─ input-otp.tsx
│     │  │  │  ├─ input.tsx
│     │  │  │  ├─ label.tsx
│     │  │  │  ├─ menubar.tsx
│     │  │  │  ├─ multi-step-loader.tsx
│     │  │  │  ├─ navigation-menu.tsx
│     │  │  │  ├─ pagination.tsx
│     │  │  │  ├─ popover.tsx
│     │  │  │  ├─ progress.tsx
│     │  │  │  ├─ radio-group.tsx
│     │  │  │  ├─ resizable.tsx
│     │  │  │  ├─ scroll-area.tsx
│     │  │  │  ├─ select.tsx
│     │  │  │  ├─ separator.tsx
│     │  │  │  ├─ sheet.tsx
│     │  │  │  ├─ sidebar.tsx
│     │  │  │  ├─ skeleton.tsx
│     │  │  │  ├─ slider.tsx
│     │  │  │  ├─ sonner.tsx
│     │  │  │  ├─ switch.tsx
│     │  │  │  ├─ table.tsx
│     │  │  │  ├─ tabs.tsx
│     │  │  │  ├─ textarea.tsx
│     │  │  │  ├─ toggle-group.tsx
│     │  │  │  ├─ toggle.tsx
│     │  │  │  └─ tooltip.tsx
│     │  │  └─ user-sync.tsx
│     │  ├─ constants/
│     │  │  └─ inventory.ts
│     │  ├─ convex/
│     │  │  └─ client.ts
│     │  ├─ db/
│     │  │  ├─ index.ts
│     │  │  └─ schema.ts
│     │  ├─ emails/
│     │  │  └─ InvitationEmail.tsx
│     │  ├─ hooks/
│     │  │  ├─ use-mobile.ts
│     │  │  ├─ useCurrentUser.ts
│     │  │  ├─ useDebounce.ts
│     │  │  ├─ useIPManagement.ts
│     │  │  ├─ usePaginationSearch.ts
│     │  │  ├─ useUrlState.ts
│     │  │  └─ useUserManagement.ts
│     │  ├─ lib/
│     │  │  ├─ schemas/
│     │  │  │  └─ index.ts
│     │  │  ├─ auth.ts
│     │  │  ├─ email-service.ts
│     │  │  ├─ migrateToConvex.ts
│     │  │  ├─ notifications.ts
│     │  │  ├─ resend.ts
│     │  │  ├─ s3-bucket-manager.ts
│     │  │  ├─ s3.ts
│     │  │  └─ utils.ts
│     │  ├─ middleware/
│     │  │  └─ ip-check.ts
│     │  ├─ providers/
│     │  │  ├─ convex-provider.tsx
│     │  │  ├─ dealership-provider.tsx
│     │  │  ├─ query-provider.tsx
│     │  │  └─ SubscriptionProvider.tsx
│     │  ├─ services/
│     │  │  ├─ document-service.ts
│     │  │  ├─ pdf-template-service.ts
│     │  │  └─ vehicle-image-service.ts
│     │  ├─ types/
│     │  │  ├─ client.ts
│     │  │  ├─ documents.ts
│     │  │  ├─ index.ts
│     │  │  └─ vehicle.ts
│     │  └─ middleware.ts
│     ├─ .env
│     ├─ .env.local
│     ├─ .gitignore
│     ├─ components.json
│     ├─ convex.json
│     ├─ drizzle.config.ts
│     ├─ eslint.config.mjs
│     ├─ next-env.d.ts
│     ├─ next.config.ts
│     ├─ package.json
│     ├─ pnpm-lock.yaml
│     ├─ postcss.config.mjs
│     ├─ README.md
│     ├─ tsconfig.json
│     └─ tsconfig.tsbuildinfo
├─ convex/
│  ├─ _generated/
│  │  ├─ api.d.ts
│  │  ├─ api.js
│  │  ├─ dataModel.d.ts
│  │  ├─ server.d.ts
│  │  └─ server.js
│  ├─ convex/
│  ├─ queries/
│  │  └─ templates.ts
│  ├─ .env.local
│  ├─ adminIpManagement.ts
│  ├─ allowList.ts
│  ├─ auth.config.ts
│  ├─ auth.ts
│  ├─ clerk.ts
│  ├─ clients.ts
│  ├─ dealerships.ts
│  ├─ deals.ts
│  ├─ debug.ts
│  ├─ deeplink.ts
│  ├─ developer.ts
│  ├─ documentPacks.ts
│  ├─ documents.ts
│  ├─ employees.ts
│  ├─ external_api.ts
│  ├─ http.ts
│  ├─ index.ts
│  ├─ inventory.ts
│  ├─ package.json
│  ├─ pdfFieldInspector.ts
│  ├─ pdfFieldMapper.ts
│  ├─ pdfProcessor.ts
│  ├─ pdfTemplates.ts
│  ├─ public_api.ts
│  ├─ README.md
│  ├─ schema.ts
│  ├─ secure_s3.ts
│  ├─ security.ts
│  ├─ settings.ts
│  ├─ stripe_webhook.ts
│  ├─ subscriptions.ts
│  ├─ tsconfig.json
│  └─ users.ts
├─ packages/
│  ├─ eslint-config/
│  │  ├─ base.js
│  │  ├─ next.js
│  │  ├─ package.json
│  │  ├─ react-internal.js
│  │  └─ README.md
│  ├─ typescript-config/
│  │  ├─ base.json
│  │  ├─ nextjs.json
│  │  ├─ package.json
│  │  └─ react-library.json
│  └─ ui/
│     ├─ src/
│     │  ├─ button.tsx
│     │  ├─ card.tsx
│     │  └─ code.tsx
│     ├─ eslint.config.mjs
│     ├─ package.json
│     └─ tsconfig.json
├─ .env.local
├─ .gitignore
├─ .npmrc
├─ biome.json
├─ filespath.md
├─ google_auth.json
├─ package.json
├─ pnpm-lock.yaml
├─ pnpm-workspace.yaml
├─ README.md
├─ tsconfig.base.json
└─ turbo.json
