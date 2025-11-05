// components/SecureImage.tsx - Enhanced version with better loading states
import { useState, useEffect } from "react";
import Image from "next/image";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
 
import { Loader2, ImageIcon, AlertCircle } from "lucide-react";

interface SecureImageProps {
  filePath: string;
  dealershipId: string;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  loadingClassName?: string; // Custom loading container styling
  showLoadingText?: boolean; // Whether to show "Loading..." text
}

export default function SecureImage({
  filePath,
  dealershipId,
  alt,
  className,
  fill,
  width,
  height,
  loadingClassName,
  showLoadingText = false,
}: SecureImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false); // Track when actual image loads

  const getViewUrl = useAction(api.s3.getViewUrl);

  useEffect(() => {
    const fetchImageUrl = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setImageLoaded(false);
        
        const result = await getViewUrl({ s3Key: filePath });
        setImageUrl(result.url);
      } catch (err) {
        console.error("Failed to get image URL:", err);
        setError("Failed to load image");
      } finally {
        setIsLoading(false);
      }
    };

    if (filePath && dealershipId) {
      fetchImageUrl();
    }
  }, [filePath, dealershipId, getViewUrl]);

  // Loading state - while fetching signed URL
  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-50 ${loadingClassName || className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-gray-400 mb-2" />
        {showLoadingText && (
          <p className="text-xs text-gray-500">Loading image...</p>
        )}
      </div>
    );
  }

  // Error state
  if (error || !imageUrl) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-100 text-gray-400 ${loadingClassName || className}`}>
        <AlertCircle className="h-6 w-6 mb-2" />
        <p className="text-xs text-center px-2">Failed to load image</p>
      </div>
    );
  }

  // Image with loading overlay
  return (
    <div className={`relative ${className}`}>
      {/* Loading overlay while image loads */}
      {!imageLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400 mb-1" />
          {showLoadingText && (
            <p className="text-xs text-gray-500">Loading...</p>
          )}
        </div>
      )}
      
      {/* Actual image */}
      <Image
        src={imageUrl}
        alt={alt}
        className={`transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        fill={fill}
        width={width}
        height={height}
        onLoad={() => setImageLoaded(true)}
        onError={() => {
          setImageLoaded(true);
          setError("Image failed to load");
        }}
      />
    </div>
  );
}

// Alternative: Skeleton loader version
export function SecureImageWithSkeleton({
  filePath,
  dealershipId,
  alt,
  className,
  fill,
  width,
  height,
}: SecureImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const getViewUrl = useAction(api.s3.getViewUrl);

  useEffect(() => {
    const fetchImageUrl = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setImageLoaded(false);
        
        const result = await getViewUrl({ s3Key: filePath });
        setImageUrl(result.url);
      } catch (err) {
        console.error("Failed to get image URL:", err);
        setError("Failed to load image");
      } finally {
        setIsLoading(false);
      }
    };

    if (filePath && dealershipId) {
      fetchImageUrl();
    }
  }, [filePath, dealershipId, getViewUrl]);

  // Skeleton loading state
  if (isLoading) {
    return (
      <div className={`animate-pulse bg-gray-200 ${className}`}>
        <div className="flex items-center justify-center h-full">
          <ImageIcon className="h-8 w-8 text-gray-400" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !imageUrl) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-100 text-gray-400 ${className}`}>
        <AlertCircle className="h-6 w-6 mb-2" />
        <p className="text-xs text-center px-2">Failed to load</p>
      </div>
    );
  }

  // Image with skeleton overlay
  return (
    <div className={`relative ${className}`}>
      {/* Skeleton overlay while image loads */}
      {!imageLoaded && (
        <div className="absolute inset-0 animate-pulse bg-gray-200 z-10 flex items-center justify-center">
          <ImageIcon className="h-8 w-8 text-gray-400" />
        </div>
      )}
      
      {/* Actual image */}
      <Image
        src={imageUrl}
        alt={alt}
        className={`transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        fill={fill}
        width={width}
        height={height}
        onLoad={() => setImageLoaded(true)}
        onError={() => {
          setImageLoaded(true);
          setError("Image failed to load");
        }}
      />
    </div>
  );
}