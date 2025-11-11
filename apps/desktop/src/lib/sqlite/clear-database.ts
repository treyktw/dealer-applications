/**
 * Clear Database Utility
 * WARNING: This will delete ALL data from the database
 */

import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

/**
 * Clear all data from the SQLite database
 * WARNING: This is irreversible and will delete:
 * - All documents
 * - All deals
 * - All vehicles
 * - All clients
 */
export async function clearDatabase(): Promise<void> {
  try {
    const confirmed = confirm(
      "⚠️ WARNING: This will delete ALL data from the database!\n\n" +
        "This includes:\n" +
        "- All documents\n" +
        "- All deals\n" +
        "- All vehicles\n" +
        "- All clients\n\n" +
        "This action cannot be undone. Are you sure?"
    );

    if (!confirmed) {
      return;
    }

    console.log("🗑️ Clearing all database data...");
    await invoke("db_clear_all_data");
    console.log("✅ Database cleared successfully");
    
    toast.success("Database cleared successfully", {
      description: "All data has been removed from the database",
    });
  } catch (error) {
    console.error("❌ Error clearing database:", error);
    toast.error("Failed to clear database", {
      description: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

