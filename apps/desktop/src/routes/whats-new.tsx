// src/routes/whats-new/index.tsx
import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/layout/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Sparkles,
  Calendar,
  Zap,
  CheckCircle2,
  Bug,
  AlertCircle,
  TrendingUp,
  Shield,
  FileText,
} from "lucide-react";

export const Route = createFileRoute("/whats-new")({
  component: WhatsNewPage,
});

// 🎯 UPDATE THIS SECTION WITH NEW RELEASES
const releases = [
  {
    version: "2.0.0",
    date: "2025-10-15",
    title: "Complete UI/UX Redesign",
    featured: true,
    categories: [
      {
        type: "new",
        title: "New Features",
        icon: Sparkles,
        color: "text-purple-600",
        items: [
          {
            title: "Modern Dashboard Redesign",
            description: "Completely redesigned dashboard with improved navigation, collapsible sidebar, and better information hierarchy.",
          },
          {
            title: "Team Management",
            description: "Full team management system with user invitations, role-based access control, and team member management.",
          },
          {
            title: "Subscription Dashboard",
            description: "Comprehensive subscription management with real-time usage tracking for storage, team members, and API calls.",
          },
          {
            title: "Notifications Center",
            description: "Centralized notification system with customizable preferences for email and in-app notifications.",
          },
          {
            title: "Settings Hub",
            description: "Complete settings management for dealership information, appearance, security, and integrations.",
          },
          {
            title: "Analytics Dashboard",
            description: "New analytics page with key metrics, trends, and performance insights (chart integration ready).",
          },
          {
            title: "Help & Support",
            description: "Comprehensive help center with FAQ, video tutorials, and direct support contact options.",
          },
        ],
      },
      {
        type: "improved",
        title: "Improvements",
        icon: TrendingUp,
        color: "text-blue-600",
        items: [
          {
            title: "Collapsible Sidebar",
            description: "New sidebar design that collapses from 280px to 64px for better screen real estate management.",
          },
          {
            title: "Better Header",
            description: "Redesigned header with prominent search bar, theme toggle, and improved user menu.",
          },
          {
            title: "Enhanced Subscription Checks",
            description: "Improved subscription verification to prevent Convex errors and show clear feature availability.",
          },
          {
            title: "Mobile Responsiveness",
            description: "All pages now fully responsive with mobile-first design approach.",
          },
          {
            title: "Loading States",
            description: "Better loading indicators and skeleton screens for improved perceived performance.",
          },
          {
            title: "Error Handling",
            description: "More helpful error messages with clear next steps and upgrade prompts where applicable.",
          },
        ],
      },
      {
        type: "fixed",
        title: "Bug Fixes",
        icon: Bug,
        color: "text-green-600",
        items: [
          {
            title: "Subscription Access Issues",
            description: "Fixed issue where Premium users couldn't access deals due to subscription check timing.",
          },
          {
            title: "Dark Mode Styling",
            description: "Fixed various dark mode styling inconsistencies across pages.",
          },
          {
            title: "Navigation State",
            description: "Fixed active state highlighting in sidebar navigation.",
          },
        ],
      },
    ],
  },
  {
    version: "1.5.2",
    date: "2025-10-01",
    title: "Performance & Security Updates",
    featured: false,
    categories: [
      {
        type: "improved",
        title: "Improvements",
        icon: Zap,
        color: "text-blue-600",
        items: [
          {
            title: "Faster Deal Loading",
            description: "Optimized deal queries to reduce load times by 40%.",
          },
          {
            title: "Image Optimization",
            description: "Automatic image compression and WebP format support for faster page loads.",
          },
        ],
      },
      {
        type: "security",
        title: "Security",
        icon: Shield,
        color: "text-red-600",
        items: [
          {
            title: "Enhanced Authentication",
            description: "Upgraded to latest Clerk authentication with improved security headers.",
          },
          {
            title: "Data Encryption",
            description: "All sensitive data now encrypted at rest with AES-256.",
          },
        ],
      },
    ],
  },
  {
    version: "1.5.0",
    date: "2025-09-15",
    title: "Document Generation Improvements",
    featured: false,
    categories: [
      {
        type: "new",
        title: "New Features",
        icon: FileText,
        color: "text-purple-600",
        items: [
          {
            title: "Custom Document Upload",
            description: "Upload and use your own custom document templates for deals.",
          },
          {
            title: "Bulk Document Generation",
            description: "Generate documents for multiple deals at once.",
          },
        ],
      },
      {
        type: "improved",
        title: "Improvements",
        icon: TrendingUp,
        color: "text-blue-600",
        items: [
          {
            title: "PDF Quality",
            description: "Improved PDF generation with better formatting and faster processing.",
          },
        ],
      },
    ],
  },
];

// 🎯 END OF UPDATE SECTION

function WhatsNewPage() {
  const getTypeConfig = (type: string) => {
    switch (type) {
      case "new":
        return {
          label: "New",
          color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
        };
      case "improved":
        return {
          label: "Improved",
          color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        };
      case "fixed":
        return {
          label: "Fixed",
          color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        };
      case "security":
        return {
          label: "Security",
          color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        };
      default:
        return {
          label: "Update",
          color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
        };
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-4">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold">What's New</h1>
          <p className="text-muted-foreground text-lg">
            Stay up to date with the latest features, improvements, and fixes
          </p>
        </div>

        {/* Releases */}
        <div className="space-y-8">
          {releases.map((release) => (
            <Card 
              key={release.version}
              className={release.featured ? "border-primary shadow-lg" : ""}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline" className="font-mono">
                        v{release.version}
                      </Badge>
                      {release.featured && (
                        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Latest
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-2xl">{release.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(release.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {release.categories.map((category) => {
                  const Icon = category.icon;
                  const typeConfig = getTypeConfig(category.type);
                  
                  return (
                    <div key={category.title}>
                      {releases.indexOf(release) > 0 && <Separator className="my-6" />}
                      
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-muted ${category.color}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <h3 className="text-lg font-semibold">{category.title}</h3>
                          <Badge className={typeConfig.color}>
                            {typeConfig.label}
                          </Badge>
                        </div>
                        
                        <div className="space-y-3 ml-14">
                          {category.items.map((item) => (
                            <div key={item.title} className="flex gap-3">
                              <CheckCircle2 className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                              <div>
                                <p className="font-medium">{item.title}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {item.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <Card className="bg-muted/50">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Have Feedback?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              We'd love to hear your thoughts on these updates or suggestions for future improvements.
            </p>
            <div className="flex gap-3 justify-center">
              <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                Send Feedback
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                Request Feature
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                Report Bug
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

// 📝 HOW TO ADD NEW RELEASES:
// 1. Copy the template below
// 2. Add it to the top of the 'releases' array
// 3. Update version, date, title, and featured flag
// 4. Add your categories and items
// 5. Save and deploy!

/*
RELEASE TEMPLATE:

{
  version: "X.X.X",
  date: "YYYY-MM-DD",
  title: "Release Title",
  featured: true,  // Set to true for latest release, false for others
  categories: [
    {
      type: "new",  // Options: "new", "improved", "fixed", "security"
      title: "New Features",
      icon: Sparkles,  // Icons: Sparkles, TrendingUp, Bug, Shield, FileText, Users, Settings
      color: "text-purple-600",  // Colors based on type
      items: [
        {
          title: "Feature Name",
          description: "Feature description here.",
        },
        // Add more items...
      ],
    },
    // Add more categories...
  ],
},
*/  