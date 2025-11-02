/**
 * Format signature expiration time
 */
export function formatExpiryTime(expiresAt: number): string {
  const now = Date.now();
  const diff = expiresAt - now;

  if (diff <= 0) {
    return "Expired";
  }

  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

/**
 * Validate signature data URL
 */
export function isValidSignatureDataUrl(dataUrl: string): boolean {
  return dataUrl.startsWith("data:image/png;base64,");
}

/**
 * Get signature file size from data URL
 */
export function getSignatureSize(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1];
  if (!base64) return 0;

  // Calculate approximate size (base64 is ~33% larger than binary)
  return Math.ceil((base64.length * 3) / 4);
}

/**
 * Check if signature preview is still available
 */
export function isSignaturePreviewAvailable(
  createdAt: number,
  retentionHours: number = 24
): boolean {
  const now = Date.now();
  const ageMs = now - createdAt;
  const retentionMs = retentionHours * 60 * 60 * 1000;

  return ageMs < retentionMs;
}

/**
 * Format signer role for display
 */
export function formatSignerRole(role: string): string {
  const roleMap: Record<string, string> = {
    buyer: "Buyer",
    seller: "Seller / Dealer",
    notary: "Notary Public",
  };

  return roleMap[role] || role;
}

/**
 * Get signer role icon color
 */
export function getSignerRoleColor(role: string): string {
  const colorMap: Record<string, string> = {
    buyer: "text-blue-600 bg-blue-100",
    seller: "text-purple-600 bg-purple-100",
    notary: "text-green-600 bg-green-100",
  };

  return colorMap[role] || "text-gray-600 bg-gray-100";
}