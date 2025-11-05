// src/lib/updates/UpdateManager.tsx
import { useCallback, useEffect, useState } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Shield, Sparkles, Download, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
  try {
    if (type === "success") toast.success(message);
    else if (type === "error") toast.error(message);
    else toast.info(message);
  } catch {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
};

interface UpdateInfo {
  version: string;
  currentVersion: string;
  body?: string;
  date?: string;
}

export function UpdateManager() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const checkForUpdates = useCallback(async (showErrors = false) => {
    try {
      const update = await check();

      if (update) {
        console.log("Update available:", update);
        setUpdateInfo({
          version: update.version,
          currentVersion: update.currentVersion,
          body: update.body,
          date: update.date,
        });
        setUpdateAvailable(true);
      } else {
        console.log("No updates available");
        if (showErrors) {
          showToast("You're using the latest version", "success");
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn("Update check failed:", errorMessage);
      
      if (showErrors) {
        if (errorMessage.includes("release JSON") || errorMessage.includes("404")) {
          showToast("Update server not configured yet. Updates will be available when releases are published.", "info");
        } else {
          showToast("Failed to check for updates", "error");
        }
        setError(errorMessage);
      }
    }
  }, []);

  useEffect(() => {
    checkForUpdates(false);
  }, [checkForUpdates]);

  async function installUpdate() {
    if (!updateInfo) return;

    try {
      setDownloading(true);
      setError(null);
      const update = await check();

      if (update) {
        await update.downloadAndInstall((event) => {
          switch (event.event) {
            case "Started":
              console.log("Download started");
              setDownloadProgress(0);
              break;
            case "Progress": {
              const progress = event.data.chunkLength;
              setDownloadProgress(Math.round(progress));
              break;
            }
            case "Finished":
              console.log("Download finished");
              setDownloadProgress(100);
              break;
          }
        });

        toast.success("Update installed! Restarting app...");

        setTimeout(async () => {
          await relaunch();
        }, 1500);
      }
    } catch (error) {
      console.error("Failed to install update:", error);
      setError("Failed to install update");
      toast.error("Failed to install update");
      setDownloading(false);
    }
  }

  function handleSkip() {
    setUpdateAvailable(false);
    toast.info("Update skipped. You can check for updates in Settings.");
  }

  if (!updateAvailable || !updateInfo) {
    return null;
  }

  const isSecurityUpdate = updateInfo.body?.toLowerCase().includes("security");

  return (
    <Dialog open={updateAvailable} onOpenChange={setUpdateAvailable}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSecurityUpdate ? (
              <>
                <Shield className="h-5 w-5 text-red-500" />
                Security Update Available
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 text-blue-500" />
                New Update Available
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            Version {updateInfo.version} is ready to install
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current version:</span>
            <span className="font-medium">{updateInfo.currentVersion}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">New version:</span>
            <span className="font-medium text-primary">
              {updateInfo.version}
            </span>
          </div>

          {updateInfo.body && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">What's new:</h4>
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg max-h-32 overflow-y-auto">
                {updateInfo.body.split("\n").map((line: string) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
          )}

          {downloading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Download className="h-4 w-4 animate-bounce" />
                  Downloading update...
                </span>
                <span className="font-medium">{downloadProgress}%</span>
              </div>
              <Progress value={downloadProgress} className="h-2" />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row gap-2">
          {!isSecurityUpdate && !downloading && (
            <Button variant="outline" onClick={handleSkip} className="flex-1">
              Later
            </Button>
          )}
          <Button
            onClick={installUpdate}
            disabled={downloading}
            className="flex-1"
          >
            {downloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Installing...
              </>
            ) : isSecurityUpdate ? (
              "Install Security Update"
            ) : (
              "Update Now"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ✅ Export for getting current version
export async function getCurrentVersion(): Promise<string> {
  try {
    const update = await check();
    return update?.currentVersion || "Unknown";
  } catch (error) {
    console.error("Failed to get version:", error);
    return "Unknown";
  }
}

// ✅ Export function for manual update checks with loading state
export async function checkForUpdatesManually(): Promise<{
  available: boolean;
  version?: string;
  currentVersion?: string;
}> {
  try {
    const update = await check();
    if (update) {
      return {
        available: true,
        version: update.version,
        currentVersion: update.currentVersion,
      };
    }
    return { 
      available: false
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn("Manual update check failed:", errorMessage);
    
    if (errorMessage.includes("release JSON") || errorMessage.includes("404")) {
      throw new Error("Update server not configured. Releases must be published with a latest.json file.");
    }
    throw new Error(`Failed to check for updates: ${errorMessage}`);
  }
}