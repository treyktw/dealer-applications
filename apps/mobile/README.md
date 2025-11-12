# Dealer Applications Mobile App

React Native mobile application for Dealer Applications, built with Expo and NativeWind.

## Features

- **Authentication** - Clerk-powered auth with email/password and social login
- **Real-time Data** - Convex integration for instant updates
- **Customer CRM** - Manage leads and customers
- **Vehicle Inventory** - Track and manage vehicle inventory
- **VIN Scanning** - Camera-based VIN scanning (coming soon)
- **Image Upload** - Vehicle photo management (coming soon)
- **Settings** - Dealership management and user settings

## Tech Stack

- **Expo 52** - React Native framework with SDK
- **React Native 0.76** - Latest stable React Native
- **TypeScript** - Fully typed, no `any` types
- **NativeWind** - Tailwind CSS for React Native
- **Expo Router** - File-based routing
- **Convex** - Real-time backend
- **Clerk** - Authentication
- **Zustand** - State management

## Centralized Theme System

All colors are defined in **one place only**: `constants/theme.ts`

```typescript
import { theme } from '@/constants/theme';

// Use theme colors throughout the app
<View style={{ backgroundColor: theme.colors.primary.DEFAULT }} />

// Or with NativeWind
<View className="bg-primary" />
```

**Never define color values directly in components!**

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- iOS Simulator (Mac only) or Android Emulator
- Expo CLI

### Installation

```bash
# From the monorepo root
cd apps/mobile
pnpm install
```

### Environment Setup

Create `.env` file:

```bash
EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_DEALERSHIP_ID=dealership123
```

### Running the App

```bash
# Start Expo dev server
pnpm start

# Run on iOS Simulator
pnpm ios

# Run on Android Emulator
pnpm android

# Run on web (for testing)
pnpm web
```

## Project Structure

```
apps/mobile/
├── app/                      # Expo Router app directory
│   ├── (auth)/              # Authentication screens
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx
│   ├── (tabs)/              # Main app tabs
│   │   ├── index.tsx        # Dashboard
│   │   ├── customers/       # Customer CRM
│   │   ├── vehicles/        # Vehicle inventory
│   │   └── settings.tsx     # Settings
│   └── _layout.tsx          # Root layout with providers
├── components/              # Reusable UI components
├── constants/
│   └── theme.ts            # Centralized theme (SINGLE SOURCE OF TRUTH)
├── lib/                     # Utilities and configurations
│   ├── convex.ts           # Convex client
│   └── clerk.ts            # Clerk token cache
├── assets/                  # Images, fonts, etc.
└── convex/                  # Symlinked to ../../convex
```

## Navigation Structure

```
app/
├── (auth)/                  # Unauthenticated routes
│   ├── sign-in
│   └── sign-up
└── (tabs)/                  # Authenticated routes
    ├── index (Dashboard)
    ├── customers
    │   ├── index (List)
    │   ├── [id] (Detail)
    │   └── add (Modal)
    ├── vehicles
    │   ├── index (List)
    │   ├── [id] (Detail)
    │   └── add (Modal)
    └── settings
```

## Styling

Uses **NativeWind 4** (Tailwind CSS for React Native):

```tsx
// Component example
<View className="flex-1 bg-background p-4">
  <Text className="text-2xl font-bold text-foreground">
    Hello World
  </Text>
  <TouchableOpacity className="bg-primary rounded-lg p-4">
    <Text className="text-primary-foreground font-semibold">
      Click Me
    </Text>
  </TouchableOpacity>
</View>
```

All colors match the web app for consistency!

## Type Safety

```typescript
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

// Fully typed Convex queries
const vehicles = useQuery(api.inventory.getVehicles, {
  dealershipId: "dealership123",
  page: 1,
  limit: 25,
});

// Type-safe IDs
const vehicleId: Id<"vehicles"> = "...";
```

## Coming Soon

- Customer detail screens
- Vehicle detail screens
- Add/edit customer forms
- Add vehicle with VIN scanning
- Image upload for vehicles
- Push notifications
- Offline support
- Dark/light mode toggle

## Scripts

- `pnpm start` - Start Expo dev server
- `pnpm ios` - Run on iOS
- `pnpm android` - Run on Android
- `pnpm web` - Run on web
- `pnpm lint` - Lint code
- `pnpm check-types` - Type check

## Contributing

See the main monorepo README for contribution guidelines.

## License

Proprietary - All rights reserved
