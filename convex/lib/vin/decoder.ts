/**
 * VIN Decoder Service
 * Integration with NHTSA vPIC API for VIN decoding
 *
 * API Documentation: https://vpic.nhtsa.dot.gov/api/
 */

/**
 * Decoded VIN data from NHTSA vPIC API
 */
export interface DecodedVIN {
  // Basic Vehicle Information
  vin: string;
  make: string | null;
  model: string | null;
  modelYear: number | null;
  vehicleType: string | null;

  // Detailed Information
  manufacturer: string | null;
  plantCountry: string | null;
  trim: string | null;
  engineModel: string | null;
  engineCylinders: number | null;
  engineDisplacement: string | null;
  fuelType: string | null;
  transmissionStyle: string | null;
  transmissionSpeeds: string | null;
  driveType: string | null;

  // Body Information
  bodyClass: string | null;
  doors: number | null;

  // Safety & Equipment
  abs: string | null;
  airBagLocations: string | null;

  // Weight & Capacity
  gvwr: string | null; // Gross Vehicle Weight Rating

  // Additional Info
  suggestedVIN: string | null;
  errorCode: string | null;
  errorText: string | null;
  possibleValues: string | null;

  // Raw response for debugging
  raw?: Record<string, string | null>;
}

/**
 * Decode a VIN using NHTSA vPIC API
 *
 * @param vin - 17-character VIN to decode
 * @returns Decoded VIN information
 * @throws Error if VIN is invalid or API fails
 */
export async function decodeVIN(vin: string): Promise<DecodedVIN> {
  // Validate VIN format (basic validation)
  if (!vin || vin.length !== 17) {
    throw new Error("VIN must be exactly 17 characters");
  }

  // Clean VIN (uppercase, remove spaces)
  const cleanVIN = vin.trim().toUpperCase();

  // NHTSA vPIC API endpoint
  const apiUrl = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${cleanVIN}?format=json`;

  try {
    // Fetch from NHTSA API
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`NHTSA API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      Results: Array<Record<string, string | null>>;
      Count: number;
      Message: string;
    };

    // NHTSA API always returns an array with 1 result
    if (!data.Results || data.Results.length === 0) {
      throw new Error("No results returned from NHTSA API");
    }

    const result = data.Results[0];

    // Helper function to parse integer values
    const parseIntOrNull = (value: string | null): number | null => {
      if (!value || value === "" || value === "Not Applicable") return null;
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? null : parsed;
    };

    // Helper function to get string value or null
    const getStringOrNull = (value: string | null): string | null => {
      if (!value || value === "" || value === "Not Applicable") return null;
      return value;
    };

    // Parse and structure the response
    const decodedVIN: DecodedVIN = {
      vin: cleanVIN,

      // Basic Vehicle Information
      make: getStringOrNull(result.Make),
      model: getStringOrNull(result.Model),
      modelYear: parseIntOrNull(result.ModelYear),
      vehicleType: getStringOrNull(result.VehicleType),

      // Detailed Information
      manufacturer: getStringOrNull(result.Manufacturer),
      plantCountry: getStringOrNull(result.PlantCountry),
      trim: getStringOrNull(result.Trim),
      engineModel: getStringOrNull(result.EngineModel),
      engineCylinders: parseIntOrNull(result.EngineCylinders),
      engineDisplacement: getStringOrNull(result.DisplacementL),
      fuelType: getStringOrNull(result.FuelTypePrimary),
      transmissionStyle: getStringOrNull(result.TransmissionStyle),
      transmissionSpeeds: getStringOrNull(result.TransmissionSpeeds),
      driveType: getStringOrNull(result.DriveType),

      // Body Information
      bodyClass: getStringOrNull(result.BodyClass),
      doors: parseIntOrNull(result.Doors),

      // Safety & Equipment
      abs: getStringOrNull(result.ABS),
      airBagLocations: getStringOrNull(result.AirBagLocCurtain),

      // Weight & Capacity
      gvwr: getStringOrNull(result.GVWR),

      // Additional Info
      suggestedVIN: getStringOrNull(result.SuggestedVIN),
      errorCode: getStringOrNull(result.ErrorCode),
      errorText: getStringOrNull(result.ErrorText),
      possibleValues: getStringOrNull(result.PossibleValues),

      // Store raw response for debugging
      raw: result,
    };

    // Check for errors from NHTSA
    if (decodedVIN.errorCode && decodedVIN.errorCode !== "0") {
      console.warn(`⚠️ NHTSA VIN decode warning: ${decodedVIN.errorText}`);
    }

    console.log(`✅ VIN decoded successfully: ${cleanVIN} - ${decodedVIN.make} ${decodedVIN.model} ${decodedVIN.modelYear}`);

    return decodedVIN;
  } catch (error) {
    console.error(`❌ Failed to decode VIN ${cleanVIN}:`, error);
    throw new Error(
      `Failed to decode VIN: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Batch decode multiple VINs
 *
 * @param vins - Array of VINs to decode
 * @returns Array of decoded VIN results
 */
export async function decodeVINBatch(vins: string[]): Promise<DecodedVIN[]> {
  // NHTSA API supports batch decoding with POST request
  // For simplicity, we'll decode one at a time with rate limiting
  const results: DecodedVIN[] = [];

  for (const vin of vins) {
    try {
      const decoded = await decodeVIN(vin);
      results.push(decoded);

      // Rate limiting: wait 100ms between requests to avoid overwhelming API
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to decode VIN ${vin}:`, error);
      // Continue with other VINs even if one fails
    }
  }

  return results;
}

/**
 * Get make/model suggestions for partial VIN or WMI (World Manufacturer Identifier)
 *
 * @param partialVIN - First 3-11 characters of VIN (WMI/VDS)
 * @returns Partial decode information
 */
export async function decodePartialVIN(partialVIN: string): Promise<Partial<DecodedVIN>> {
  if (!partialVIN || partialVIN.length < 3) {
    throw new Error("Partial VIN must be at least 3 characters");
  }

  const cleanPartial = partialVIN.trim().toUpperCase();
  const apiUrl = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${cleanPartial}?format=json`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`NHTSA API error: ${response.status}`);
    }

    const data = await response.json() as {
      Results: Array<Record<string, string | null>>;
    };

    if (!data.Results || data.Results.length === 0) {
      return {};
    }

    const result = data.Results[0];

    return {
      make: result.Make || null,
      manufacturer: result.Manufacturer || null,
      vehicleType: result.VehicleType || null,
      possibleValues: result.PossibleValues || null,
    };
  } catch (error) {
    console.error("Failed to decode partial VIN:", error);
    throw error;
  }
}

/**
 * Check if VIN has been recalled
 * Note: This is a placeholder - NHTSA has a separate API for recalls
 *
 * @param vin - VIN to check
 * @returns Recall information (placeholder)
 */
export async function checkRecalls(vin: string): Promise<{
  hasRecalls: boolean;
  recalls: Array<{
    component: string;
    summary: string;
    consequence: string;
    remedy: string;
    recallDate: string;
  }>;
}> {
  // TODO: Implement NHTSA Safety Recalls API integration
  // https://vpic.nhtsa.dot.gov/api/SafetyRatings/GetRecalls?vehicleId={VIN}
  console.warn("⚠️ Recall check not yet implemented");

  return {
    hasRecalls: false,
    recalls: [],
  };
}
