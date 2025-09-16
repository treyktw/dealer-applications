// hooks/useIPManagement.ts
import { useQuery, useMutation } from "convex/react";

import { useState, useEffect } from "react";
import { api } from "@/convex/_generated/api";

export interface AllowedIP {
  _id: string;
  ip: string;
  description: string;
  isActive: boolean;
  createdAt: number;
}

export function useIPManagement() {
  const [currentIP, setCurrentIP] = useState<string | null>(null);

  // Get all allowed IPs from Convex
  const allowedIPs = useQuery(api.allowList.getAllowedIPs);
  console.log(allowedIPs);
  // Get IP check status
  const ipCheckStatus = useQuery(api.allowList.getIPCheckStatus);
  
  // Mutations for IP management
  const addAllowedIP = useMutation(api.allowList.addAllowedIP);
  const removeAllowedIP = useMutation(api.allowList.removeAllowedIP);

  // Fetch the current user's IP address when the component mounts
  useEffect(() => {
    const fetchCurrentIP = async () => {
      try {
        const response = await fetch("https://api.ipify.org?format=json");
        if (!response.ok) {
          throw new Error("Failed to fetch IP");
        }
        const data = await response.json();
        setCurrentIP(data.ip);
      } catch (error) {
        console.error("Error fetching current IP:", error);
        setCurrentIP("Unable to detect");
      }
    };

    fetchCurrentIP();
  }, []);

  // Handler for adding a new IP
  const handleAddIP = async (ip: string, description?: string) => {
    try {
      const result = await addAllowedIP({ ip, description });
      return result;
    } catch (error: unknown) {
      console.error("Error adding IP:", error);
      if (error instanceof Error) {
        throw new Error(error.message || "Failed to add IP address");
      }
      throw new Error("Failed to add IP address");
    }
  };

  // Handler for removing an IP
  const handleRemoveIP = async (ip: string) => {
    try {
      const result = await removeAllowedIP({ ip });
      return result;
    } catch (error: unknown) {
      console.error("Error removing IP:", error);
      if (error instanceof Error) {
        throw new Error(error.message || "Failed to remove IP address");
      }
      throw new Error("Failed to remove IP address");
    }
  };

  return {
    allowedIPs,
    currentIP,
    ipCheckEnabled: ipCheckStatus?.enabled || false,
    addIP: handleAddIP,
    removeIP: handleRemoveIP,
  };
}