// src/app/(dashboard)/inventory/_components/s3-image-upload.tsx

"use client";

import { useReducer, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Loader2, ImagePlus, X, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import SecureImage from "./inventory/SecureImage";

// Define the image structure to match your database schema
export interface VehicleImage {
  id?: string;
  url: string;
  isPrimary?: boolean;
  vehicleId?: string; // Make optional since it's not always present
}

interface S3ImageUploadProps {
  vehicleId: string;
  initialImages?: VehicleImage[];
  onImagesChange: (images: VehicleImage[]) => void;
}

// State interface
interface UploadState {
  images: VehicleImage[];
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
}

// Action types
type UploadAction =
  | { type: 'SET_IMAGES'; payload: VehicleImage[] }
  | { type: 'ADD_IMAGES'; payload: VehicleImage[] }
  | { type: 'REMOVE_IMAGE'; payload: number }
  | { type: 'SET_PRIMARY_IMAGE'; payload: number }
  | { type: 'SET_UPLOADING'; payload: boolean }
  | { type: 'SET_UPLOAD_PROGRESS'; payload: number }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_UPLOAD_STATE' };

// Reducer function
function uploadReducer(state: UploadState, action: UploadAction): UploadState {
  switch (action.type) {
    case 'SET_IMAGES':
      return { ...state, images: action.payload };
    
    case 'ADD_IMAGES':
      return { ...state, images: [...state.images, ...action.payload] };
    
    case 'REMOVE_IMAGE': {
      const updatedImages = state.images.filter((_, i) => i !== action.payload);
      // If removing primary image, set first remaining image as primary
      if (state.images[action.payload]?.isPrimary && updatedImages.length > 0) {
        updatedImages[0].isPrimary = true;
      }
      return { ...state, images: updatedImages };
    }
    
    case 'SET_PRIMARY_IMAGE':
      return {
        ...state,
        images: state.images.map((img, i) => ({
          ...img,
          isPrimary: i === action.payload,
        })),
      };
    
    case 'SET_UPLOADING':
      return { ...state, isUploading: action.payload };
    
    case 'SET_UPLOAD_PROGRESS':
      return { ...state, uploadProgress: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    case 'RESET_UPLOAD_STATE':
      return { ...state, isUploading: false, uploadProgress: 0, error: null };
    
    default:
      return state;
  }
}

export default function S3ImageUpload({
  vehicleId,
  initialImages = [],
  onImagesChange,
}: S3ImageUploadProps) {
  const [state, dispatch] = useReducer(uploadReducer, {
    images: initialImages,
    isUploading: false,
    uploadProgress: 0,
    error: null,
  });

  const { images, isUploading, uploadProgress } = state;

  const getPresignedUrl = useAction(api.s3.getVehicleImageUploadUrl);
  const vehicle = useQuery(api.inventory.getVehicle, 
    vehicleId && vehicleId.trim() !== "" && !vehicleId.startsWith("test-") ? { id: vehicleId as Id<"vehicles"> } : "skip"
  );
  const dealership = useQuery(api.dealerships.getCurrentDealership, {});

  // Handle file upload to S3
  const uploadToS3 = useCallback(
    async (file: File): Promise<VehicleImage | null> => {
      if (!vehicle?.dealershipId || !dealership) {
        dispatch({ type: 'SET_ERROR', payload: "Vehicle or dealership not found" });
        return null;
      }

      try {
        dispatch({ type: 'SET_UPLOADING', payload: true });
        dispatch({ type: 'CLEAR_ERROR' });

        // Client-side validation to prevent unsupported types before calling server
        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/jpg",
        ];
        if (!allowedTypes.includes(file.type)) {
          const msg = `Unsupported file type: ${file.type}. Allowed: JPG, PNG, WEBP.`;
          toast.error(msg);
          dispatch({ type: 'SET_ERROR', payload: msg });
          return null;
        }

        // Get presigned URL from Convex
        const { uploadUrl, s3Key } = await getPresignedUrl({
          vehicleId: vehicle._id as Id<"vehicles">,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        });

        // Use fetch instead of XMLHttpRequest to avoid header issues
        const response = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          // Don't set Content-Type header since it's not in the signed headers
          // The browser will handle this automatically
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Upload failed:", response.status, errorText);
          throw new Error(`Upload failed with status ${response.status}`);
        }

        return { url: s3Key, isPrimary: false };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // Surface server-side validation errors (e.g., invalid content type) as toast
        toast.error(message.includes('Invalid content type') ?
          'Unsupported file type. Please upload JPG, PNG, or WEBP.' : message);
        console.error("Error uploading to S3:", message);
        dispatch({ type: 'SET_ERROR', payload: message });
        return null;
      } finally {
        dispatch({ type: 'RESET_UPLOAD_STATE' });
      }
    },
    [vehicle?._id, vehicle?.dealershipId, dealership, getPresignedUrl]
  );



  // Handle file drop
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      dispatch({ type: 'SET_UPLOADING', payload: true });
      dispatch({ type: 'SET_UPLOAD_PROGRESS', payload: 0 });

      try {
        const newImages: VehicleImage[] = [];

        // Upload each file sequentially
        for (const file of acceptedFiles) {
          const result = await uploadToS3(file);
          if (result) newImages.push(result);
        }

        if (newImages.length === 0) {
          toast.error("No files were uploaded. Please check the file type and size.");
          dispatch({ type: 'SET_UPLOADING', payload: false });
          return;
        }

        // Set first image as primary if no images exist yet
        if (images.length === 0 && newImages.length > 0) {
          newImages[0].isPrimary = true;
        }

        // Update state
        const updatedImages = [...images, ...newImages];
        dispatch({ type: 'SET_IMAGES', payload: updatedImages });
        onImagesChange(updatedImages);
        toast.success(`${newImages.length} image(s) uploaded successfully`);
      } catch (error) {
        console.error("Error in upload process:", error);
        toast.error("Upload process failed");
      } finally {
        dispatch({ type: 'RESET_UPLOAD_STATE' });
      }
    },
    [images, onImagesChange, uploadToS3]
  );

  // Set an image as primary
  const setImageAsPrimary = (index: number) => {
    dispatch({ type: 'SET_PRIMARY_IMAGE', payload: index });
    const updatedImages = images.map((img, i) => ({
      ...img,
      isPrimary: i === index,
    }));
    onImagesChange(updatedImages);
  };

  // Remove an image
  const removeImage = (index: number) => {
    dispatch({ type: 'REMOVE_IMAGE', payload: index });
    const imageToRemove = images[index];
    const updatedImages = images.filter((_, i) => i !== index);

    // If removing primary image, set first remaining image as primary
    if (imageToRemove.isPrimary && updatedImages.length > 0) {
      updatedImages[0].isPrimary = true;
    }

    onImagesChange(updatedImages);
  };

  // Set up dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
    maxFiles: 10,
    maxSize: 5 * 1024 * 1024, // 5MB
    disabled: isUploading,
  });

  // Guard against invalid vehicleId
  if (!vehicleId || vehicleId.trim() === "" || vehicleId.startsWith("test-")) {
    return (
      <div className="space-y-6">
        <div className="border-2 border-dashed rounded-lg p-6 text-center">
          <p className="text-muted-foreground">
            {vehicleId.startsWith("test-") ? "Test mode - no vehicle selected" : "Invalid vehicle ID"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-muted"
        } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
            <p className="text-sm font-medium">
              Uploading... {uploadProgress}%
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2 max-w-md mx-auto">
              <div
                className="bg-primary h-2.5 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <>
            <ImagePlus className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">
              {isDragActive
                ? "Drop the files here"
                : "Drag and drop images here or click to upload"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Supported formats: JPG, PNG, WEBP. Max size: 5MB per image.
            </p>
          </>
        )}
      </div>

      {/* Image Grid */}
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-3">Vehicle Images</h3>

        {images.length === 0 ? (
          <div className="text-center py-10 border border-dashed rounded-lg">
            <p className="text-muted-foreground">No images uploaded yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((img, index) => (
              <div
                key={img.url || index}
                className="group relative rounded-lg overflow-hidden border"
              >
                <div
                  className={`aspect-video ${
                    img.isPrimary ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <SecureImage
                    filePath={img.url} // This should be the filePath, not full URL
                    dealershipId={vehicle?.dealershipId || ""}
                    alt={`Vehicle image ${index + 1}`}
                    className="w-full h-full object-cover"
                    fill
                  />
                </div>

                {/* Image overlay with controls */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="flex gap-2">
                    {!img.isPrimary && (
                      <Button
                        type="button"
                        size="icon"
                        variant="default"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageAsPrimary(index);
                        }}
                        className="h-8 w-8 rounded-full"
                        title="Set as primary image"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(index);
                      }}
                      className="h-8 w-8 rounded-full"
                      title="Remove image"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Primary badge */}
                {img.isPrimary && (
                  <div className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded-full">
                    Primary
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
