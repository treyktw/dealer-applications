// src/routes/standalone/settings.tsx
import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/layout/layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings as SettingsIcon,
  Bell,
  Moon,
  Globe,
  Save,
  X,
} from "lucide-react";
import { useId, useState, useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/standalone/settings")({
  component: StandaloneSettingsPage,
});

function StandaloneSettingsPage() {
  const [isEditing, setIsEditing] = useState(false);

  const emailNotificationsId = useId();
  const pushNotificationsId = useId();
  const dealUpdatesId = useId();
  const themeId = useId();
  const languageId = useId();

  // Settings state (stored locally for standalone users)
  const [settings, setSettings] = useState({
    // Notifications
    emailNotifications: true,
    pushNotifications: true,
    dealUpdates: true,

    // Appearance
    theme: "system",
    language: "en",
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("standalone_settings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings((prev) => ({ ...prev, ...parsed }));
      } catch {
        // Invalid JSON, use defaults
      }
    }
  }, []);

    const handleSave = () => {
      // Save settings to localStorage for standalone users
      localStorage.setItem("standalone_settings", JSON.stringify(settings));
      toast.success("Settings saved successfully!");
      setIsEditing(false);
    };

  const handleCancel = () => {
    // Reset to saved values
    const savedSettings = localStorage.getItem("standalone_settings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...settings, ...parsed });
      } catch {
        // Invalid JSON, keep current
      }
    }
    setIsEditing(false);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Manage your application preferences and settings
            </p>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <SettingsIcon className="mr-2 h-4 w-4" />
                Edit Settings
              </Button>
            )}
          </div>
        </div>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Bell className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription className="mt-1">
                  Configure how you receive notifications
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                id={emailNotificationsId}
                checked={settings.emailNotifications}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, emailNotifications: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-notifications">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications on desktop
                </p>
              </div>
              <Switch
                id={pushNotificationsId}
                checked={settings.pushNotifications}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, pushNotifications: checked })
                }
                disabled={!isEditing}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="deal-updates">Deal Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when deals change status
                </p>
              </div>
              <Switch
                id={dealUpdatesId}
                checked={settings.dealUpdates}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, dealUpdates: checked })
                }
                disabled={!isEditing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <Moon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle>Appearance</CardTitle>
                <CardDescription className="mt-1">
                  Customize how the application looks
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select
                value={settings.theme}
                onValueChange={(value) =>
                  setSettings({ ...settings, theme: value })
                }
                disabled={!isEditing}
              >
                <SelectTrigger id={themeId}>
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Choose your preferred color theme
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={settings.language}
                onValueChange={(value) =>
                  setSettings({ ...settings, language: value })
                }
                disabled={!isEditing}
              >
                <SelectTrigger id={languageId}>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Select your preferred language
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Regional Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <Globe className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle>Regional Settings</CardTitle>
                <CardDescription className="mt-1">
                  Configure timezone and regional preferences
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">Timezone</p>
                <p className="text-sm text-muted-foreground">
                  {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => toast.info("Timezone settings coming soon!")}
              >
                Change
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">Date Format</p>
                <p className="text-sm text-muted-foreground">MM/DD/YYYY</p>
              </div>
              <Button
                variant="outline"
                onClick={() => toast.info("Date format settings coming soon!")}
              >
                Change
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

