/**
 * Default Vehicle Images Service
 * Provides placeholder images for vehicles without uploaded photos
 *
 * Uses Unsplash API for high-quality placeholder images
 * Falls back to generated placeholder images if Unsplash is unavailable
 */

/**
 * Vehicle body types for placeholder images
 */
export type VehicleBodyType =
  | "sedan"
  | "suv"
  | "truck"
  | "coupe"
  | "convertible"
  | "van"
  | "wagon"
  | "hatchback"
  | "crossover"
  | "sports_car"
  | "luxury"
  | "electric"
  | "default";

/**
 * Get default vehicle image URL based on vehicle characteristics
 *
 * @param options - Vehicle characteristics for image selection
 * @returns Image URL (Unsplash or placeholder)
 */
export function getDefaultVehicleImageUrl(options: {
  make?: string | null;
  model?: string | null;
  year?: number | null;
  bodyType?: string | null;
  color?: string | null;
  width?: number;
  height?: number;
}): string {
  const { make, model, year, bodyType, color, width = 800, height = 600 } = options;

  // Normalize body type
  const normalizedBodyType = normalizeBodyType(bodyType);

  // Option 1: Use Unsplash placeholder images (free, high-quality)
  // https://source.unsplash.com/{width}x{height}/?{query}
  const query = buildUnsplashQuery({ make, model, year, bodyType: normalizedBodyType, color });
  const unsplashUrl = `https://source.unsplash.com/${width}x${height}/?${query}`;

  return unsplashUrl;
}

/**
 * Get multiple default vehicle images (for gallery/carousel)
 *
 * @param count - Number of images to return
 * @param options - Vehicle characteristics
 * @returns Array of image URLs
 */
export function getDefaultVehicleImages(
  count: number,
  options: {
    make?: string | null;
    model?: string | null;
    year?: number | null;
    bodyType?: string | null;
    color?: string | null;
    width?: number;
    height?: number;
  }
): string[] {
  const images: string[] = [];

  for (let i = 0; i < count; i++) {
    // Add random seed to get different images
    const url = getDefaultVehicleImageUrl({
      ...options,
      width: options.width || 800,
      height: options.height || 600,
    });

    // Add sig parameter to get different images from Unsplash
    images.push(`${url}&sig=${i}`);
  }

  return images;
}

/**
 * Build Unsplash search query from vehicle characteristics
 */
function buildUnsplashQuery(params: {
  make?: string | null;
  model?: string | null;
  year?: number | null;
  bodyType?: VehicleBodyType;
  color?: string | null;
}): string {
  const { make, model, year, bodyType, color } = params;
  const terms: string[] = [];

  // Always include "car" as base term
  terms.push("car");

  // Add make and model if available
  if (make) {
    terms.push(make.toLowerCase());
  }
  if (model) {
    terms.push(model.toLowerCase());
  }

  // Add year if recent (helps with modern car images)
  if (year && year >= 2015) {
    terms.push(year.toString());
  }

  // Add body type
  if (bodyType && bodyType !== "default") {
    terms.push(bodyType.replace("_", " "));
  }

  // Add color if specified
  if (color) {
    terms.push(color.toLowerCase());
  }

  return terms.join(",");
}

/**
 * Normalize body type to standard types
 */
function normalizeBodyType(bodyType?: string | null): VehicleBodyType {
  if (!bodyType) return "default";

  const normalized = bodyType.toLowerCase().trim();

  // Map various body type names to standard types
  const bodyTypeMap: Record<string, VehicleBodyType> = {
    // Sedan variations
    sedan: "sedan",
    "4-door": "sedan",
    "4dr": "sedan",
    saloon: "sedan",

    // SUV variations
    suv: "suv",
    "sport utility": "suv",
    "4x4": "suv",

    // Truck variations
    truck: "truck",
    pickup: "truck",
    "pickup truck": "truck",

    // Coupe variations
    coupe: "coupe",
    "2-door": "coupe",
    "2dr": "coupe",

    // Convertible variations
    convertible: "convertible",
    cabriolet: "convertible",
    roadster: "convertible",

    // Van variations
    van: "van",
    minivan: "van",
    "cargo van": "van",

    // Wagon variations
    wagon: "wagon",
    "station wagon": "wagon",
    estate: "wagon",

    // Hatchback variations
    hatchback: "hatchback",
    "5-door": "hatchback",
    "5dr": "hatchback",

    // Crossover variations
    crossover: "crossover",
    cuv: "crossover",

    // Sports car variations
    "sports car": "sports_car",
    sports: "sports_car",
    supercar: "sports_car",

    // Luxury variations
    luxury: "luxury",
    "luxury sedan": "luxury",
    limousine: "luxury",

    // Electric variations
    electric: "electric",
    ev: "electric",
    "electric vehicle": "electric",
  };

  return bodyTypeMap[normalized] || "default";
}

/**
 * Get fallback placeholder image (generated)
 * Used when external services are unavailable
 *
 * @param options - Placeholder options
 * @returns Generated placeholder URL
 */
export function getFallbackPlaceholderImage(options: {
  width?: number;
  height?: number;
  text?: string;
  bgColor?: string;
  textColor?: string;
}): string {
  const {
    width = 800,
    height = 600,
    text = "No Image Available",
    bgColor = "e5e7eb", // gray-200
    textColor = "374151", // gray-700
  } = options;

  // Use placeholder.com as fallback
  const encodedText = encodeURIComponent(text);
  return `https://via.placeholder.com/${width}x${height}/${bgColor}/${textColor}?text=${encodedText}`;
}

/**
 * Get vehicle image with fallback chain
 * Primary: Uploaded images
 * Secondary: Unsplash placeholder
 * Tertiary: Generated placeholder
 *
 * @param uploadedImages - Array of uploaded image URLs (if any)
 * @param vehicleInfo - Vehicle information for placeholder generation
 * @returns Image URL
 */
export function getVehicleImageWithFallback(
  uploadedImages: string[] | null | undefined,
  vehicleInfo: {
    make?: string | null;
    model?: string | null;
    year?: number | null;
    bodyType?: string | null;
    color?: string | null;
  }
): string {
  // If uploaded images exist, use the first one
  if (uploadedImages && uploadedImages.length > 0) {
    return uploadedImages[0];
  }

  // Otherwise, use default Unsplash image
  try {
    return getDefaultVehicleImageUrl({
      make: vehicleInfo.make,
      model: vehicleInfo.model,
      year: vehicleInfo.year,
      bodyType: vehicleInfo.bodyType,
      color: vehicleInfo.color,
    });
  } catch (error) {
    console.error("Failed to get Unsplash image, using fallback:", error);

    // If Unsplash fails, use generated placeholder
    const vehicleName = [vehicleInfo.year, vehicleInfo.make, vehicleInfo.model]
      .filter(Boolean)
      .join(" ");

    return getFallbackPlaceholderImage({
      text: vehicleName || "Vehicle Image",
    });
  }
}

/**
 * Get thumbnail URL (optimized for listings)
 *
 * @param imageUrl - Original image URL
 * @param size - Thumbnail size (small, medium, large)
 * @returns Optimized thumbnail URL
 */
export function getThumbnailUrl(
  imageUrl: string,
  size: "small" | "medium" | "large" = "medium"
): string {
  // Define thumbnail sizes
  const sizes = {
    small: { width: 200, height: 150 },
    medium: { width: 400, height: 300 },
    large: { width: 800, height: 600 },
  };

  const { width, height } = sizes[size];

  // If it's an Unsplash URL, we can request specific sizes
  if (imageUrl.includes("unsplash.com")) {
    // Replace dimensions in URL
    return imageUrl.replace(/\/(\d+)x(\d+)\//, `/${width}x${height}/`);
  }

  // If it's a placeholder URL
  if (imageUrl.includes("placeholder.com")) {
    return imageUrl.replace(/\/(\d+)x(\d+)\//, `/${width}x${height}/`);
  }

  // For uploaded images, return original (could add CDN resizing here)
  return imageUrl;
}

/**
 * Check if image URL is a placeholder (not uploaded)
 *
 * @param imageUrl - Image URL to check
 * @returns true if placeholder, false if uploaded
 */
export function isPlaceholderImage(imageUrl: string): boolean {
  return (
    imageUrl.includes("unsplash.com") ||
    imageUrl.includes("placeholder.com") ||
    imageUrl.includes("placehold.co") ||
    imageUrl.includes("via.placeholder.com")
  );
}
