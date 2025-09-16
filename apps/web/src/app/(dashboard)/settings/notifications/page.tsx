"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Mail, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface NotificationSetting {
  _id: Id<"notificationSettings">;
  type: NotificationType;
  emailEnabled: boolean;
  inAppEnabled: boolean;
}

type NotificationType = 'new_lead' | 'lead_updates' | 'inventory' | 'task_reminders' | 'system_updates';

type NotificationLabels = {
  [K in NotificationType]: {
    title: string;
    description: string;
  };
};

const NOTIFICATION_LABELS: NotificationLabels = {
  new_lead: {
    title: "New Lead Notifications",
    description: "Get notified when a new lead is assigned to you",
  },
  lead_updates: {
    title: "Lead Updates",
    description: "Receive updates when lead status changes",
  },
  inventory: {
    title: "Inventory Alerts",
    description: "Get notified about low inventory or price changes",
  },
  task_reminders: {
    title: "Task Reminders",
    description: "Receive reminders for upcoming tasks and deadlines",
  },
  system_updates: {
    title: "System Updates",
    description: "Important updates about the dealership system",
  },
};

export default function NotificationsPage() {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [saving, setSaving] = useState(false);

  // Fetch settings using Convex
  const notificationSettings = useQuery(api.settings.getNotificationSettings, {});
  const createDefaultSettings = useMutation(api.settings.createDefaultNotificationSettings);
  const updateSettings = useMutation(api.settings.updateNotificationSettings);

  // Update local state when settings are loaded
  useEffect(() => {
    if (notificationSettings) {
      if (notificationSettings.length === 0) {
        createDefaultSettings().then((settings) => {
          setSettings(settings as NotificationSetting[]);
        });
      } else {
        setSettings(notificationSettings as NotificationSetting[]);
      }
    }
  }, [notificationSettings, createDefaultSettings]);

  const handleToggle = (type: NotificationType, field: "emailEnabled" | "inAppEnabled") => {
    setSettings(prev =>
      prev.map(setting =>
        setting.type === type
          ? { ...setting, [field]: !setting[field] }
          : setting
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        settings: settings.map(({ _id, type, emailEnabled, inAppEnabled }) => ({
          _id,
          type,
          emailEnabled,
          inAppEnabled,
        })),
      });

      toast("Success", {
        description: "Notification preferences updated successfully.",
      });
    } catch (error: unknown) {
      console.error('Failed to save settings:', error);
      toast("Error", {
        description: "Failed to update notification preferences.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!notificationSettings) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notification Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage how and when you receive notifications
        </p>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Notifications</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="in-app">In-App</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {settings.map(setting => (
            <Card key={setting._id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle>{NOTIFICATION_LABELS[setting.type]?.title || setting.type}</CardTitle>
                    <CardDescription>{NOTIFICATION_LABELS[setting.type]?.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center justify-between space-x-2">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-primary" />
                      <Label htmlFor={`${setting._id}-email`}>Email Notifications</Label>
                    </div>
                    <Switch
                      id={`${setting._id}-email`}
                      checked={setting.emailEnabled}
                      onCheckedChange={() => handleToggle(setting.type, "emailEnabled")}
                    />
                  </div>
                  <div className="flex items-center justify-between space-x-2">
                    <div className="flex items-center space-x-2">
                      <Bell className="h-4 w-4 text-primary" />
                      <Label htmlFor={`${setting._id}-inapp`}>In-App Notifications</Label>
                    </div>
                    <Switch
                      id={`${setting._id}-inapp`}
                      checked={setting.inAppEnabled}
                      onCheckedChange={() => handleToggle(setting.type, "inAppEnabled")}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Notification Settings</CardTitle>
              <CardDescription>Configure your email notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.map(setting => (
                <div key={setting._id} className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label htmlFor={`${setting._id}-email-only`}>
                      {NOTIFICATION_LABELS[setting.type]?.title || setting.type}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {NOTIFICATION_LABELS[setting.type]?.description}
                    </p>
                  </div>
                  <Switch
                    id={`${setting._id}-email-only`}
                    checked={setting.emailEnabled}
                    onCheckedChange={() => handleToggle(setting.type, "emailEnabled")}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="in-app" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>In-App Notification Settings</CardTitle>
              <CardDescription>Configure your in-app notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.map(setting => (
                <div key={setting._id} className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label htmlFor={`${setting._id}-inapp-only`}>
                      {NOTIFICATION_LABELS[setting.type]?.title || setting.type}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {NOTIFICATION_LABELS[setting.type]?.description}
                    </p>
                  </div>
                  <Switch
                    id={`${setting._id}-inapp-only`}
                    checked={setting.inAppEnabled}
                    onCheckedChange={() => handleToggle(setting.type, "inAppEnabled")}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
          <CardDescription>Configure additional notification channels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-primary/10 rounded-full">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">SMS Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via text message
                </p>
              </div>
            </div>
            <Button variant="outline">Configure</Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  );
} 