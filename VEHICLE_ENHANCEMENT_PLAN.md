# Vehicle Schema Enhancement Plan

**Date:** 2025-11-05
**Branch:** `claude/codebase-analysis-improvements-011CUp8fA1VYjZDVhW5jSUJr`
**Status:** 📋 **PLANNING PHASE** (No code execution yet)

---

## 🎯 Objective

Enhance the vehicle schema to include comprehensive vehicle details matching the industry-standard format used by automotive marketplaces (Cars.com, AutoTrader, etc.) and ensure all vehicle data is properly exposed through the public API with images.

---

## 📊 Current Vehicle Schema Analysis

**Location:** `convex/schema.ts` lines 325-388

**Current Fields:**

**Overview:**
- ✅ make, model, year, trim
- ✅ bodyType
- ✅ exteriorColor, interiorColor
- ✅ mileage
- ✅ condition (new, used, certified_pre_owned)
- ✅ vin, stock
- ❌ Missing: horsepower display in overview

**Fuel Economy:**
- ✅ fuelType
- ❌ Missing: fuelTankSize

**Performance:**
- ✅ transmission, drivetrain, engine
- ❌ Missing: horsepower (separate field)
- ❌ Missing: engineDisplacement (structured, e.g., "2.5L I5")

**Safety Features:**
- ❌ Missing: All safety features (currently in generic "features" string)
  - absbrakes, backupCamera, blindSpotMonitoring
  - curtainAirbags, driverAirbag, frontSideAirbags
  - parkingSensors, passengerAirbag

**Measurements:**
- ❌ Missing: All measurement fields
  - doors
  - frontLegroom, backLegroom
  - cargoVolume

**Options/Features:**
- ⚠️ Exists as: `features: v.optional(v.string())` (comma-separated string)
- ❌ Missing: Structured features/options array
  - Packages (RS Package, Sport Package, Technology Package, etc.)
  - Individual options (heated seats, navigation, bluetooth, etc.)

**Images:**
- ✅ Schema exists: `images: v.optional(v.array(v.object({ url, isPrimary, fileId, vehicleId })))`
- ❌ **ISSUE:** API returns images but URLs may not be presigned S3 URLs
- ❌ **ISSUE:** No logic to generate presigned URLs for public API consumption

---

## 🎨 Proposed Enhanced Vehicle Schema

### Required New Fields

```typescript
// convex/schema.ts - vehicles table

vehicles: defineTable({
  // ===== EXISTING FIELDS (keep as-is) =====
  id: v.string(),
  stock: v.string(),
  vin: v.string(),
  make: v.string(),
  model: v.string(),
  year: v.number(),
  trim: v.optional(v.string()),
  bodyType: v.optional(v.string()),
  mileage: v.number(),
  price: v.number(),
  exteriorColor: v.optional(v.string()),
  interiorColor: v.optional(v.string()),
  fuelType: v.optional(v.string()),
  transmission: v.optional(v.string()),
  drivetrain: v.optional(v.string()),
  engine: v.optional(v.string()),
  description: v.optional(v.string()),
  status: v.union(...), // Will be enhanced in status refactoring
  featured: v.boolean(),
  features: v.optional(v.string()), // DEPRECATE - migrate to structured fields
  dealershipId: v.string(),
  clientId: v.optional(v.string()),
  costPrice: v.optional(v.number()),
  profit: v.optional(v.number()),
  daysOnLot: v.optional(v.number()),
  seoTitle: v.optional(v.string()),
  seoDescription: v.optional(v.string()),
  condition: v.optional(v.union(...)),
  images: v.optional(v.array(v.object({...}))),
  createdAt: v.float64(),
  updatedAt: v.float64(),

  // ===== NEW FIELDS - FUEL ECONOMY =====
  fuelTankSize: v.optional(v.number()), // in gallons
  fuelEconomyCity: v.optional(v.number()), // MPG city
  fuelEconomyHighway: v.optional(v.number()), // MPG highway
  fuelEconomyCombined: v.optional(v.number()), // MPG combined

  // ===== NEW FIELDS - PERFORMANCE =====
  horsepower: v.optional(v.number()), // e.g., 394
  engineDisplacement: v.optional(v.string()), // e.g., "2.5L I5"
  engineCylinders: v.optional(v.number()), // e.g., 5
  torque: v.optional(v.number()), // e.g., 354 lb-ft

  // ===== NEW FIELDS - MEASUREMENTS =====
  doors: v.optional(v.number()), // e.g., 2 or 4
  seatingCapacity: v.optional(v.number()), // e.g., 4
  frontLegroom: v.optional(v.number()), // inches
  backLegroom: v.optional(v.number()), // inches
  frontHeadroom: v.optional(v.number()), // inches
  backHeadroom: v.optional(v.number()), // inches
  cargoVolume: v.optional(v.number()), // cubic feet
  curbWeight: v.optional(v.number()), // pounds

  // ===== NEW FIELDS - SAFETY FEATURES (Booleans) =====
  // Airbags
  driverAirbag: v.optional(v.boolean()),
  passengerAirbag: v.optional(v.boolean()),
  frontSideAirbags: v.optional(v.boolean()),
  curtainAirbags: v.optional(v.boolean()),
  kneeAirbags: v.optional(v.boolean()),

  // Safety Systems
  absbrakes: v.optional(v.boolean()),
  stabilityControl: v.optional(v.boolean()),
  tractionControl: v.optional(v.boolean()),

  // Driver Assistance
  backupCamera: v.optional(v.boolean()),
  blindSpotMonitoring: v.optional(v.boolean()),
  parkingSensors: v.optional(v.boolean()),
  laneDepartureWarning: v.optional(v.boolean()),
  forwardCollisionWarning: v.optional(v.boolean()),
  adaptiveCruiseControl: v.optional(v.boolean()),

  // ===== NEW FIELDS - COMFORT/CONVENIENCE OPTIONS (Booleans) =====
  // Climate
  airConditioning: v.optional(v.boolean()),
  climateControl: v.optional(v.boolean()),
  heatedSeats: v.optional(v.boolean()),
  cooledSeats: v.optional(v.boolean()),
  heatedSteeringWheel: v.optional(v.boolean()),

  // Interior Features
  leatherSeats: v.optional(v.boolean()),
  powerSeats: v.optional(v.boolean()),
  memorySeats: v.optional(v.boolean()),
  sunroof: v.optional(v.boolean()),
  panoramicSunroof: v.optional(v.boolean()),

  // Technology
  navigationSystem: v.optional(v.boolean()),
  bluetooth: v.optional(v.boolean()),
  carPlay: v.optional(v.boolean()),
  androidAuto: v.optional(v.boolean()),
  premiumSound: v.optional(v.boolean()),

  // Exterior
  alloyWheels: v.optional(v.boolean()),
  ledHeadlights: v.optional(v.boolean()),
  fogLights: v.optional(v.boolean()),
  roofRack: v.optional(v.boolean()),

  // Performance Options
  sportPackage: v.optional(v.boolean()),
  adaptiveSuspension: v.optional(v.boolean()),
  performanceExhaust: v.optional(v.boolean()),

  // ===== PACKAGES (Free-form for dealer flexibility) =====
  // Store as array of strings for custom packages
  packages: v.optional(v.array(v.string())),
  // Examples: ["RS Package", "Technology Package", "Heat Package", "LE Package"]

  // ===== ADDITIONAL OPTIONS (Free-form) =====
  // For any options not covered by boolean fields
  additionalOptions: v.optional(v.array(v.string())),
})
  .index("by_dealership", ["dealershipId"])
  .index("by_dealership_status", ["dealershipId", "status"])
  .index("by_vehicle_id", ["id"])
  .index("by_make_model", ["make", "model"])
  .index("by_price", ["price"])
  .index("by_status", ["status"]);
```

---

## 🔧 Field Migration Strategy

### Option 1: Parse Existing "features" String (Recommended)

Many vehicles may already have features in the `features` string field (comma-separated). We should:

1. Create a migration script to parse the existing `features` string
2. Map common feature names to boolean fields
3. Move unmapped features to `additionalOptions` array

**Example:**
```typescript
// Input: "Heated Seats, Navigation System, Bluetooth, RS Package"
// Output:
{
  heatedSeats: true,
  navigationSystem: true,
  bluetooth: true,
  packages: ["RS Package"],
  features: "Heated Seats, Navigation System, Bluetooth, RS Package" // Keep for backward compat
}
```

### Option 2: Manual Entry Going Forward

For new vehicles:
- Use structured boolean fields
- Use `packages` array for named packages
- Use `additionalOptions` for anything else

### Backward Compatibility

- ✅ Keep `features` string field (mark as deprecated)
- ✅ Public API returns both structured fields AND legacy `features` string
- ✅ Migration script is optional (run if dealer wants to clean up data)

---

## 📋 Public API Changes

### Current Issue: Images Not Properly Returned

**Problem:** `convex/public_api.ts` returns `images: v.images || []` but:
1. Image URLs might be S3 keys, not presigned URLs
2. External dealer websites can't access S3 directly without presigned URLs
3. No expiration handling for presigned URLs

**Solution:** Generate presigned URLs for images in public API

```typescript
// convex/public_api.ts - Update all vehicle queries

import { generatePresignedUrl } from "./lib/s3/presign";

export const getVehiclesByDealership = query({
  handler: async (ctx, args) => {
    // ... existing logic ...

    // Transform to public schema with presigned image URLs
    const publicVehicles = await Promise.all(
      paginatedVehicles.map(async (v) => {
        // Generate presigned URLs for images
        const imagesWithPresignedUrls = await Promise.all(
          (v.images || []).map(async (img) => {
            // If URL is an S3 key, generate presigned URL
            const presignedUrl = img.url.startsWith('org/')
              ? await generatePresignedUrl({
                  s3Key: img.url,
                  expiresIn: 3600, // 1 hour
                })
              : img.url; // Already a full URL

            return {
              url: presignedUrl,
              isPrimary: img.isPrimary || false,
            };
          })
        );

        return {
          // ... existing fields ...
          images: imagesWithPresignedUrls,

          // NEW FIELDS
          fuelEconomy: {
            tankSize: v.fuelTankSize,
            city: v.fuelEconomyCity,
            highway: v.fuelEconomyHighway,
            combined: v.fuelEconomyCombined,
          },

          performance: {
            transmission: v.transmission,
            drivetrain: v.drivetrain,
            engine: v.engine,
            horsepower: v.horsepower,
            engineDisplacement: v.engineDisplacement,
            engineCylinders: v.engineCylinders,
            torque: v.torque,
          },

          measurements: {
            doors: v.doors,
            seatingCapacity: v.seatingCapacity,
            frontLegroom: v.frontLegroom,
            backLegroom: v.backLegroom,
            frontHeadroom: v.frontHeadroom,
            backHeadroom: v.backHeadroom,
            cargoVolume: v.cargoVolume,
            curbWeight: v.curbWeight,
          },

          safetyFeatures: {
            // Airbags
            driverAirbag: v.driverAirbag || false,
            passengerAirbag: v.passengerAirbag || false,
            frontSideAirbags: v.frontSideAirbags || false,
            curtainAirbags: v.curtainAirbags || false,
            kneeAirbags: v.kneeAirbags || false,

            // Safety Systems
            absbrakes: v.absbrakes || false,
            stabilityControl: v.stabilityControl || false,
            tractionControl: v.tractionControl || false,

            // Driver Assistance
            backupCamera: v.backupCamera || false,
            blindSpotMonitoring: v.blindSpotMonitoring || false,
            parkingSensors: v.parkingSensors || false,
            laneDepartureWarning: v.laneDepartureWarning || false,
            forwardCollisionWarning: v.forwardCollisionWarning || false,
            adaptiveCruiseControl: v.adaptiveCruiseControl || false,
          },

          options: {
            // Climate
            airConditioning: v.airConditioning || false,
            climateControl: v.climateControl || false,
            heatedSeats: v.heatedSeats || false,
            cooledSeats: v.cooledSeats || false,
            heatedSteeringWheel: v.heatedSteeringWheel || false,

            // Interior
            leatherSeats: v.leatherSeats || false,
            powerSeats: v.powerSeats || false,
            memorySeats: v.memorySeats || false,
            sunroof: v.sunroof || false,
            panoramicSunroof: v.panoramicSunroof || false,

            // Technology
            navigationSystem: v.navigationSystem || false,
            bluetooth: v.bluetooth || false,
            carPlay: v.carPlay || false,
            androidAuto: v.androidAuto || false,
            premiumSound: v.premiumSound || false,

            // Exterior
            alloyWheels: v.alloyWheels || false,
            ledHeadlights: v.ledHeadlights || false,
            fogLights: v.fogLights || false,
            roofRack: v.roofRack || false,

            // Performance
            sportPackage: v.sportPackage || false,
            adaptiveSuspension: v.adaptiveSuspension || false,
            performanceExhaust: v.performanceExhaust || false,

            // Packages & Additional
            packages: v.packages || [],
            additionalOptions: v.additionalOptions || [],
          },

          // Keep legacy fields for backward compatibility
          features: v.features,
        };
      })
    );

    return { vehicles: publicVehicles, pagination: {...} };
  },
});
```

---

## 🎨 Example API Response (After Enhancement)

```json
{
  "id": "v_12345",
  "stock": "901513M",
  "vin": "WUAASAFV8K1901513",
  "make": "Audi",
  "model": "TT RS",
  "year": 2019,
  "trim": "2.5T quattro AWD",
  "bodyType": "Coupe",
  "condition": "used",
  "exteriorColor": "Glacier White Metallic",
  "interiorColor": "Black",
  "mileage": 27442,
  "price": 54995,
  "featured": true,

  "images": [
    {
      "url": "https://s3.amazonaws.com/bucket/presigned-url-1?signature=...",
      "isPrimary": true
    },
    {
      "url": "https://s3.amazonaws.com/bucket/presigned-url-2?signature=...",
      "isPrimary": false
    }
  ],

  "fuelEconomy": {
    "tankSize": 14,
    "fuelType": "Gasoline",
    "city": 19,
    "highway": 28,
    "combined": 23
  },

  "performance": {
    "transmission": "7-Speed Automatic",
    "drivetrain": "All-Wheel Drive",
    "engine": "394 hp 2.5L I5",
    "horsepower": 394,
    "engineDisplacement": "2.5L I5",
    "engineCylinders": 5,
    "torque": 354
  },

  "measurements": {
    "doors": 2,
    "seatingCapacity": 4,
    "frontLegroom": 41,
    "backLegroom": 28,
    "cargoVolume": 12,
    "curbWeight": 3494
  },

  "safetyFeatures": {
    "driverAirbag": true,
    "passengerAirbag": true,
    "frontSideAirbags": true,
    "curtainAirbags": true,
    "absbrakes": true,
    "backupCamera": true,
    "blindSpotMonitoring": true,
    "parkingSensors": true
  },

  "options": {
    "heatedSeats": true,
    "leatherSeats": true,
    "navigationSystem": true,
    "bluetooth": true,
    "carPlay": true,
    "alloyWheels": true,
    "adaptiveSuspension": true,
    "packages": ["RS Package", "Sport Package", "Technology Package", "Heat Package", "LE Package"],
    "additionalOptions": []
  },

  "description": "Stunning Glacier White Metallic 2019 Audi TT RS...",
  "createdAt": 1699564800000,
  "updatedAt": 1699564800000
}
```

---

## 🔧 Implementation Plan

### Phase 1: Schema Update (2-3 days)

**Files to Modify:**
1. `convex/schema.ts`
   - Add all new vehicle fields
   - Keep backward compatibility with `features` string
   - Add indexes if needed

**Tasks:**
- [ ] Add fuel economy fields
- [ ] Add performance fields (horsepower, displacement, cylinders, torque)
- [ ] Add measurement fields (doors, legroom, cargo, etc.)
- [ ] Add safety feature boolean fields (20+ fields)
- [ ] Add comfort/convenience option boolean fields (20+ fields)
- [ ] Add `packages` array field
- [ ] Add `additionalOptions` array field
- [ ] Deploy schema changes

---

### Phase 2: API Enhancements (1-2 days)

**Files to Modify:**
1. `convex/public_api.ts`
   - Update `getVehiclesByDealership` to return structured data
   - Update `getVehicleById` to return structured data
   - Update `searchVehicles` to return structured data
   - Update `getFeaturedVehicles` to return structured data
   - Generate presigned URLs for images

2. `convex/lib/s3/presign.ts`
   - Ensure `generatePresignedUrl` function exists and works
   - Add error handling for invalid S3 keys

**Tasks:**
- [ ] Create helper function to transform vehicle to public format
- [ ] Add presigned URL generation for all images
- [ ] Add structured `fuelEconomy` object to API response
- [ ] Add structured `performance` object to API response
- [ ] Add structured `measurements` object to API response
- [ ] Add structured `safetyFeatures` object to API response
- [ ] Add structured `options` object to API response
- [ ] Test with real vehicle data

---

### Phase 3: Web UI Updates (2-3 days)

**Files to Modify:**
1. `apps/web/src/app/(dashboard)/inventory/` - Add/edit forms
   - Update vehicle add/edit forms with new fields
   - Create multi-step form (Overview, Performance, Safety, Options)
   - Add checkboxes for safety features
   - Add checkboxes for options
   - Add multi-input for packages

2. `apps/web/src/components/vehicle/VehicleDetails.tsx` (or create)
   - Display structured vehicle data
   - Show safety features with icons
   - Show options/packages with badges

**Tasks:**
- [ ] Create vehicle form sections (Overview, Fuel, Performance, Safety, Measurements, Options)
- [ ] Add checkbox groups for safety features
- [ ] Add checkbox groups for comfort/convenience options
- [ ] Add package input (multi-select or tag input)
- [ ] Update vehicle detail view to show all new data
- [ ] Test form validation

---

### Phase 4: Desktop App Updates (1-2 days)

**Files to Modify:**
1. `apps/desktop/src/routes/inventory/` - Vehicle forms
   - Match web UI updates
   - Ensure offline capability for new fields

**Tasks:**
- [ ] Update desktop vehicle forms
- [ ] Test offline data entry
- [ ] Test sync with web app

---

### Phase 5: Data Migration (Optional, 1-2 days)

**Files to Create:**
1. `scripts/migrate-vehicle-features.ts`
   - Parse existing `features` string
   - Map to boolean fields
   - Populate `packages` array

**Tasks:**
- [ ] Write feature parsing logic
- [ ] Create mapping dictionary (e.g., "heated seats" → `heatedSeats: true`)
- [ ] Test with sample data
- [ ] Run migration on production (if desired)

---

## 📊 Estimated Effort

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| **Phase 1: Schema** | Add 60+ new fields to vehicle schema | 2-3 days |
| **Phase 2: API** | Update public API, add presigned URLs | 1-2 days |
| **Phase 3: Web UI** | Update forms and detail views | 2-3 days |
| **Phase 4: Desktop** | Update desktop app forms | 1-2 days |
| **Phase 5: Migration** | Optional feature string parsing | 1-2 days |

**Total Estimated Time:** 7-12 days for complete implementation

---

## 🎯 Priority Recommendations

### Must-Have (Immediate)
1. ✅ Fix API image presigned URLs (prevents external websites from loading images)
2. ✅ Add horsepower, doors, transmission, drivetrain (common filter fields)
3. ✅ Add packages array (dealers already mention these)

### Should-Have (Soon)
4. ✅ Add safety features (buyers care about this)
5. ✅ Add fuel economy (buyers care about this)
6. ✅ Add measurements (legroom, cargo volume)

### Nice-to-Have (Future)
7. ✅ Add all comfort/convenience options
8. ✅ Feature string migration script

---

## ⚠️ Breaking Changes & Risks

### Breaking Changes

1. **API Response Structure Change**
   - ⚠️ Public API response will have new nested objects (`fuelEconomy`, `performance`, etc.)
   - **Mitigation:** Keep flat fields as well for backward compatibility

2. **New Required Fields**
   - ⚠️ Existing vehicles won't have new fields populated
   - **Mitigation:** All new fields are optional, return `null` or `false` defaults

### Risks

1. **API Response Size**
   - Adding 60+ fields increases response size
   - **Mitigation:** Public API already excludes sensitive fields, structured data compresses well

2. **Form Complexity**
   - Adding many fields makes forms overwhelming
   - **Mitigation:** Use multi-step forms, collapse sections, smart defaults

---

## 🚀 Next Steps

Once approved:
1. ✅ Update vehicle schema with all new fields
2. ✅ Update public API to generate presigned URLs for images
3. ✅ Update public API to return structured data
4. ✅ Update web UI forms (multi-step)
5. ✅ Update desktop UI forms
6. ✅ Test with real vehicle data
7. ✅ Optional: Run migration script on existing vehicles

**Ready to proceed when you approve!** 🚀

---

**Plan Version:** 1.0
**Last Updated:** 2025-11-05
**Status:** Awaiting approval
