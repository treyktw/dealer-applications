// apps/web/src/app/(dashboard)/marketplace/page.tsx
"use client";

import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  FileText,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Shield,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { Id } from "@/convex/_generated/dataModel";

export default function MarketplacePage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const dealershipId = user?.dealershipId as Id<"dealerships"> | undefined;

  const marketplaceCategories = [
    {
      id: "document-packs",
      title: "Document Packs",
      description:
        "Professional document templates for vehicle sales, financing, and leases. Fully compliant with state and federal regulations.",
      icon: FileText,
      href: "/marketplace/document-packs",
      color: "blue",
      features: [
        "State & Federal Compliance",
        "Ready-to-Use Templates",
        "Lifetime Access",
        "Auto-Updates",
      ],
      badge: "Popular",
      badgeVariant: "default" as const,
    },
    // Future categories can be added here
    // {
    //   id: "reporting-tools",
    //   title: "Reporting Tools",
    //   description: "Advanced analytics and reporting solutions for your dealership.",
    //   icon: BarChart,
    //   href: "/marketplace/reporting-tools",
    //   color: "purple",
    //   features: ["Custom Reports", "Real-time Analytics", "Export Options"],
    //   comingSoon: true,
    // },
  ];

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg p-3">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-zinc-100">
              Marketplace
            </h1>
            <p className="text-zinc-600 mt-1 text-lg">
              Discover tools and solutions to grow your dealership
            </p>
          </div>
        </div>

        {/* Stats or Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600">Available Products</p>
                  <p className="text-2xl font-bold">
                    {marketplaceCategories.length}
                  </p>
                </div>
                <Package className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600">Trusted by Dealers</p>
                  <p className="text-2xl font-bold">1000+</p>
                </div>
                <Shield className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600">Satisfaction Rate</p>
                  <p className="text-2xl font-bold">98%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Marketplace Categories */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-100 mb-2">
            Browse Categories
          </h2>
          <p className="text-zinc-400">
            Explore our collection of professional tools and solutions
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {marketplaceCategories.map((category) => {
            const Icon = category.icon;
            const colorClasses = {
              blue: "bg-blue-100 text-blue-600",
              purple: "bg-purple-100 text-purple-600",
              green: "bg-green-100 text-green-600",
              orange: "bg-orange-100 text-orange-600",
            };

            return (
              <Card
                key={category.id}
                className="hover:shadow-lg transition-all group cursor-pointer"
                onClick={() => router.push(category.href)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div
                      className={`p-3 rounded-lg ${colorClasses[category.color as keyof typeof colorClasses]}`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    {category.badge && (
                      <Badge
                        variant={category.badgeVariant}
                        className="ml-auto"
                      >
                        {category.badge}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl">{category.title}</CardTitle>
                  <CardDescription className="mt-2">
                    {category.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-zinc-700 mb-2">
                      Features:
                    </p>
                    <ul className="space-y-1.5">
                      {category.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-center gap-2 text-sm text-zinc-600"
                        >
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full group-hover:bg-blue-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(category.href);
                    }}
                  >
                    Explore {category.title}
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Why Choose Our Marketplace */}
      <Card className=" border-blue-200 text-zinc-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            Why Choose Our Marketplace?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 rounded-lg p-2">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Instant Access</h4>
                <p className="text-sm text-zinc-600">
                  Get immediate access to all purchased products
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-green-100 rounded-lg p-2">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Secure & Trusted</h4>
                <p className="text-sm text-zinc-600">
                  All payments processed securely through Stripe
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-purple-100 rounded-lg p-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Regular Updates</h4>
                <p className="text-sm text-zinc-600">
                  Products are updated regularly to stay current
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      {!dealershipId && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-zinc-900 mb-1">
                  Need Help Getting Started?
                </h3>
                <p className="text-sm text-zinc-600">
                  Contact support to associate your account with a dealership
                </p>
              </div>
              <Button variant="outline">Contact Support</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

