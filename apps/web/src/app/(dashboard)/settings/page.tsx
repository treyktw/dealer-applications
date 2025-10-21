"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import {
  Search,
  ArrowRight,
  Crown,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  settingsCategories,
  settingsItems,
  searchSettings,
  getSettingsByCategory,
  type SettingsItem,
} from "@/config/settings-config";

export default function SettingsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Filter settings based on search and category
  const filteredSettings = useMemo(() => {
    const searched = searchSettings(searchQuery);

    if (selectedCategory === "all") {
      return searched;
    }

    return searched.filter((item) => item.category === selectedCategory);
  }, [searchQuery, selectedCategory]);

  // Group settings by category for display
  const groupedSettings = useMemo(() => {
    const groups: Record<string, SettingsItem[]> = {};

    filteredSettings.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });

    return groups;
  }, [filteredSettings]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setSelectedCategory("all");
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure your dealership system, manage integrations, and customize your
          experience
        </p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search settings... (e.g., 'API keys', 'users', 'billing')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-4 pl-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 h-7 -translate-y-1/2"
              >
                Clear
              </Button>
            )}
          </div>

          {/* Search Results Summary */}
          {searchQuery && (
            <div className="flex gap-2 items-center mt-4 text-sm text-muted-foreground">
              <AlertCircle className="w-4 h-4" />
              <span>
                Found {filteredSettings.length}{" "}
                {filteredSettings.length === 1 ? "result" : "results"} for &quot;{searchQuery}&quot;
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="overflow-x-auto justify-start w-full">
          <TabsTrigger value="all" className="gap-2">
            All Settings
            <Badge variant="secondary" className="ml-1">
              {settingsItems.length}
            </Badge>
          </TabsTrigger>
          {settingsCategories.map((category) => {
            const count = getSettingsByCategory(category.id).length;
            const Icon = category.icon;
            return (
              <TabsTrigger key={category.id} value={category.id} className="gap-2">
                <Icon className="w-4 h-4" />
                {category.title}
                <Badge variant="secondary" className="ml-1">
                  {count}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* All Settings Tab */}
        <TabsContent value="all" className="mt-6 space-y-8">
          {settingsCategories.map((category) => {
            const categoryItems = groupedSettings[category.id] || [];
            if (categoryItems.length === 0) return null;

            const Icon = category.icon;

            return (
              <div key={category.id} className="space-y-4">
                <div className="flex gap-3 items-center">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{category.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {category.description}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categoryItems.map((item) => (
                    <SettingsCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            );
          })}

          {/* No results */}
          {filteredSettings.length === 0 && (
            <div className="py-12 text-center">
              <AlertCircle className="mx-auto mb-4 w-12 h-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-medium">No settings found</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Try a different search term or browse by category
              </p>
              <Button onClick={handleClearSearch} variant="outline">
                Clear Search
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Individual Category Tabs */}
        {settingsCategories.map((category) => {
          const categoryItems = getSettingsByCategory(category.id).filter((item) =>
            searchQuery ? searchSettings(searchQuery).includes(item) : true
          );

          return (
            <TabsContent key={category.id} value={category.id} className="mt-6">
              <div className="space-y-6">
                {/* Category Header Card */}
                <Card>
                  <CardHeader>
                    <div className="flex gap-4 items-start">
                      <div className="p-3 rounded-lg bg-primary/10 text-primary">
                        {<category.icon className="w-6 h-6" />}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-2xl">{category.title}</CardTitle>
                        <CardDescription className="mt-2">
                          {category.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Settings Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categoryItems.map((item) => (
                    <SettingsCard key={item.id} item={item} />
                  ))}
                </div>

                {categoryItems.length === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground">
                        No settings match your search in this category
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>
            Get assistance with configuring your dealership
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            If you need help with any settings or have questions about features,
            our support team and documentation are here to help.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" asChild>
              <Link href="/docs" className="gap-2">
                <ExternalLink className="w-4 h-4" />
                View Documentation
              </Link>
            </Button>
            <Button asChild>
              <Link href="/support">Contact Support</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Settings Card Component
function SettingsCard({ item }: { item: SettingsItem }) {
  const Icon = item.icon;

  return (
    <Card className="transition-shadow group hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex gap-2 justify-between items-start">
          <div className="flex flex-1 gap-3 items-start">
            <div className="p-2 rounded-lg transition-colors bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-2 items-center">
                <CardTitle className="text-base">{item.title}</CardTitle>
                {item.isPremium && (
                  <Badge
                    variant="secondary"
                    className="text-xs text-amber-900 bg-amber-100 border-amber-200"
                  >
                    <Crown className="mr-1 w-3 h-3" />
                    Premium
                  </Badge>
                )}
                {item.badge && (
                  <Badge variant={item.badge.variant} className="text-xs">
                    {item.badge.text}
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-1.5 text-xs line-clamp-2">
                {item.description}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardFooter className="pt-0">
        <Button
          asChild
          variant="ghost"
          className="justify-between w-full group-hover:bg-primary/5"
        >
          <Link href={item.href}>
            Configure
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}