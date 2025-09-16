// src/app/(dashboard)/settings/page.tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Settings, Users, Shield, CreditCard, Bell, Code, Wrench } from "lucide-react";

export default function SettingsPage() {
  // Define all available settings sections
  const settingsSections = [
    {
      id: "general",
      title: "General Settings",
      description: "Configure basic dealership information",
      icon: <Settings className="h-5 w-5" />,
      href: "/settings/general",
    },
    {
      id: "users",
      title: "User Management",
      description: "Manage user accounts and permissions",
      icon: <Users className="h-5 w-5" />,
      href: "/settings/users",
    },
    {
      id: "ip-management",
      title: "IP Access Control",
      description: "Manage IP addresses that can access the admin area",
      icon: <Shield className="h-5 w-5" />,
      href: "/settings/ip-management",
    },
    {
      id: "billing",
      title: "Billing & Subscription",
      description: "Manage your subscription plan and payment methods",
      icon: <CreditCard className="h-5 w-5" />,
      href: "/settings/billing",
    },
    {
      id: "notifications",
      title: "Notifications",
      description: "Configure email and in-app notifications",
      icon: <Bell className="h-5 w-5" />,
      href: "/settings/notifications",
    },
  ];

  // Developer tools section (separate for emphasis)
  const developerSection = {
    id: "developer",
    title: "Developer Tools",
    description: "API endpoints, testing utilities, and data management",
    icon: <Code className="h-5 w-5" />,
    href: "/settings/developer",
    badge: "DEV"
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your dealership system and preferences
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsSections.map((section) => (
          <Card key={section.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-primary/10 p-1 text-primary">
                  {section.icon}
                </div>
                <CardTitle>{section.title}</CardTitle>
              </div>
              <CardDescription className="pt-1.5">
                {section.description}
              </CardDescription>
            </CardHeader>
            <CardFooter className="pt-0">
              <Button asChild variant="ghost" className="w-full justify-start">
                <Link href={section.href}>Configure</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Developer Tools - Separate section with emphasis */}
      <div className="space-y-4 ">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-orange-600" />
          <h2 className="text-xl font-semibold">Developer Tools</h2>
          <Badge variant="outline" className="text-orange-600 border-orange-200">
            Development & Testing
          </Badge>
        </div>
        
        <Card className="border-orange-200 bg-zinc-900">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-orange-100 p-1 text-orange-600">
                {developerSection.icon}
              </div>
              <CardTitle className="text-orange-900">{developerSection.title}</CardTitle>
              <Badge variant="secondary" className="ml-auto">
                {developerSection.badge}
              </Badge>
            </div>
            <CardDescription className="pt-1.5 text-orange-800">
              {developerSection.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-sm text-orange-700 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                REST API endpoints and documentation
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                Safe data deletion for testing
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                Development utilities and debugging
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <Button asChild variant="outline" className="w-full justify-start border-orange-200 text-orange-700 hover:bg-orange-100">
              <Link href={developerSection.href}>Open Developer Tools</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>
            Get assistance with setting up your dealership
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            If you need help configuring your dealership or have any questions,
            our support team is available to assist you.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button variant="outline">View Documentation</Button>
            <Button>Contact Support</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}