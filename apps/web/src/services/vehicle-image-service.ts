// src/services/vehicle-image-service.ts

import { db } from "@/db";
import { vehicles, vehicleImages, vehicleFeatures } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export interface VehicleImage {
  id?: string;
  url: string;
  isPrimary?: boolean | null;
  vehicleId: string;
}

interface VehicleData {
  id?: string;
  status?: "AVAILABLE" | "SOLD" | "PENDING" | "RESERVED" | null;
  trim?: string | null;
  description?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  features?: VehicleFeature[];
  images?: VehicleImage[];
  [key: string]: unknown;
}

interface VehicleFeature {
  id: string;
  name: string;
  category: string;
  vehicleId: string;
}

/**
 * Save vehicle images to the database
 */
export async function saveVehicleImages(
  vehicleId: string,
  images: VehicleImage[]
): Promise<VehicleImage[]> {
  try {
    // Delete existing images
    await db
      .delete(vehicleImages)
      .where(eq(vehicleImages.vehicleId, vehicleId));

    // If no new images, return empty array
    if (!images || images.length === 0) {
      return [];
    }

    // Format images for insertion
    const imagesToInsert = images.map((img) => ({
      id: img.id || uuidv4(),
      url: img.url,
      isPrimary: !!img.isPrimary,
      vehicleId: vehicleId,
    }));

    // Insert images
    const insertedImages = await db
      .insert(vehicleImages)
      .values(imagesToInsert)
      .returning();

    return insertedImages;
  } catch (error) {
    console.error(`Error saving vehicle images for ${vehicleId}:`, error);
    throw new Error(
      `Failed to save vehicle images: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Get all images for a vehicle
 */
export async function getVehicleImages(
  vehicleId: string
): Promise<VehicleImage[]> {
  try {
    const images = await db
      .select()
      .from(vehicleImages)
      .where(eq(vehicleImages.vehicleId, vehicleId));

    return images;
  } catch (error) {
    console.error(`Error fetching images for vehicle ${vehicleId}:`, error);
    return [];
  }
}

/**
 * Update vehicle with images
 */
export async function updateVehicleWithImages(
  vehicleId: string,
  vehicleData: Omit<VehicleData, "images" | "features"> & { features?: string },
  images: VehicleImage[]
): Promise<VehicleData> {
  try {
    // 1. Extract features and images from vehicleData
    const { features: featuresText, ...vehicleDataWithoutImagesAndFeatures } =
      vehicleData;

    // Convert status to uppercase if it exists
    const vehicleDataToUpdate = {
      ...vehicleDataWithoutImagesAndFeatures,
      status:
        typeof vehicleDataWithoutImagesAndFeatures.status === "string"
          ? (vehicleDataWithoutImagesAndFeatures.status.toUpperCase() as
              | "AVAILABLE"
              | "SOLD"
              | "PENDING"
              | "RESERVED")
          : undefined,
      updatedAt: new Date(),
    };

    // 2. Update vehicle basic data
    await db
      .update(vehicles)
      .set(vehicleDataToUpdate)
      .where(eq(vehicles.id, vehicleId));

    // 3. Delete existing images
    await db
      .delete(vehicleImages)
      .where(eq(vehicleImages.vehicleId, vehicleId));

    // 4. Insert new images if any
    if (images && images.length > 0) {
      const imagesToInsert = images.map((img) => ({
        id: img.id || uuidv4(),
        url: img.url,
        isPrimary: img.isPrimary === true ? true : false,
        vehicleId: vehicleId, // Explicitly use the parameter
      }));

      await db.insert(vehicleImages).values(imagesToInsert);
      console.log(
        `Inserted ${imagesToInsert.length} images for vehicle ${vehicleId}`
      );
    }

    // 5. Handle features
    if (featuresText) {
      // Delete existing features
      await db
        .delete(vehicleFeatures)
        .where(eq(vehicleFeatures.vehicleId, vehicleId));

      // Process and insert new features
      const featuresToInsert = processFeatures(featuresText, vehicleId);
      if (featuresToInsert.length > 0) {
        await db.insert(vehicleFeatures).values(featuresToInsert);
        console.log(
          `Inserted ${featuresToInsert.length} features for vehicle ${vehicleId}`
        );
      }
    }

    // 6. Get updated vehicle with images and features
    const updatedVehicleWithDetails = await db.query.vehicles.findFirst({
      where: eq(vehicles.id, vehicleId),
      with: {
        images: true,
        features: true,
      },
    });

    if (!updatedVehicleWithDetails) {
      throw new Error(`Vehicle ${vehicleId} not found after update`);
    }

    return updatedVehicleWithDetails as VehicleData;
  } catch (error) {
    console.error(`Error updating vehicle ${vehicleId}:`, error);
    throw new Error(
      `Failed to update vehicle: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Set primary image for a vehicle
 */
export async function setPrimaryImage(
  imageId: string,
  vehicleId: string
): Promise<boolean> {
  try {
    // Reset all images to non-primary
    await db
      .update(vehicleImages)
      .set({ isPrimary: false })
      .where(eq(vehicleImages.vehicleId, vehicleId));

    // Set the selected image as primary
    await db
      .update(vehicleImages)
      .set({ isPrimary: true })
      .where(
        and(
          eq(vehicleImages.id, imageId),
          eq(vehicleImages.vehicleId, vehicleId)
        )
      );

    return true;
  } catch (error) {
    console.error(
      `Error setting primary image for vehicle ${vehicleId}:`,
      error
    );
    return false;
  }
}

function processFeatures(
  featuresText: string | undefined,
  vehicleId: string
): VehicleFeature[] {
  if (!featuresText) return [];

  // Split the text by newlines and filter out empty lines
  const featureLines = featuresText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // Convert each line to a feature object
  return featureLines.map((name) => ({
    id: uuidv4(),
    name,
    category: "general", // You can implement category logic if needed
    vehicleId,
  }));
}
