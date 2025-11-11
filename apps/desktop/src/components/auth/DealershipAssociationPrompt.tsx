/**
 * Dealership Association Prompt
 * Asks user on first startup if they have an associated dealership
 * In development mode, shows on every startup
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, User, CheckCircle2 } from "lucide-react";
import { setAppMode, type AppMode } from "@/lib/mode-detection";

interface DealershipAssociationPromptProps {
  onModeSelected: (mode: AppMode) => void;
  isDevelopment?: boolean;
}

export function DealershipAssociationPrompt({ 
  onModeSelected, 
  isDevelopment = false 
}: DealershipAssociationPromptProps) {
  const [selectedOption, setSelectedOption] = useState<"yes" | "no" | null>(null);

  async function handleSelect(hasDealership: boolean) {
    setSelectedOption(hasDealership ? "yes" : "no");
    
    const mode: AppMode = hasDealership ? "dealership" : "standalone";
    
    // Set the mode
    setAppMode(mode);
    
    // Save preference
    localStorage.setItem("has_dealership", hasDealership ? "true" : "false");
    localStorage.setItem("first_time_setup_complete", "true");
    
    // If standalone mode, route to standalone login
    // The login page will check for license and redirect to subscription if needed
    if (mode === "standalone") {
      // Reload app to switch to standalone mode, which will route to standalone-login
      setTimeout(() => {
        window.location.href = "/standalone-login";
      }, 300);
    } else {
      // Dealership mode - proceed directly
      setTimeout(() => {
        onModeSelected(mode);
      }, 300);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome to Dealer Software</CardTitle>
          <CardDescription className="text-base mt-2">
            {isDevelopment 
              ? "Development Mode: Please select your mode"
              : "Do you have an associated dealership account?"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {/* Yes - Has Dealership */}
            <Card
              className={`cursor-pointer transition-all border-2 ${
                selectedOption === "yes"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => handleSelect(true)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg mt-1">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Yes, I have a dealership account</h3>
                    <p className="text-sm text-muted-foreground">
                      Use dealership mode with team accounts, cloud storage, and inventory management
                    </p>
                  </div>
                  {selectedOption === "yes" && (
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* No - Standalone */}
            <Card
              className={`cursor-pointer transition-all border-2 ${
                selectedOption === "no"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => handleSelect(false)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg mt-1">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">No, I'm using this standalone</h3>
                    <p className="text-sm text-muted-foreground">
                      Use standalone mode with local storage and license-based authentication
                    </p>
                  </div>
                  {selectedOption === "no" && (
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {isDevelopment && (
            <p className="text-xs text-center text-muted-foreground pt-2 border-t">
              Development Mode: This prompt will appear on every startup
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

