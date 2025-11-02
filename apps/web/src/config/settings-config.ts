import {
  Settings,
  Users,
  Shield,
  CreditCard,
  Bell,
  Code,
  Key,
  Database,
  Globe,
  Trash2,
  FileText,
  BarChart3,
  Zap,
  Lock,
  Palette,
  Building,
  UserCog,
  Activity,
  type LucideIcon,
} from "lucide-react";

export interface SettingsItem {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  category: "general" | "security" | "api" | "billing" | "developer";
  keywords: string[]; // For search
  badge?: {
    text: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  };
  isPremium?: boolean;
}

export interface SettingsCategory {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export const settingsCategories: SettingsCategory[] = [
  {
    id: "general",
    title: "General",
    description: "Basic dealership configuration and preferences",
    icon: Settings,
  },
  {
    id: "security",
    title: "Security & Access",
    description: "User management, permissions, and access control",
    icon: Shield,
  },
  {
    id: "api",
    title: "API & Integrations",
    description: "Public API, webhooks, and third-party integrations",
    icon: Code,
  },
  {
    id: "billing",
    title: "Billing & Plans",
    description: "Subscription management and payment settings",
    icon: CreditCard,
  },
  {
    id: "developer",
    title: "Developer Tools",
    description: "Testing, debugging, and advanced utilities",
    icon: Zap,
  },
];

export const settingsItems: SettingsItem[] = [
  // GENERAL CATEGORY
  {
    id: "general",
    title: "General Settings",
    description: "Configure basic dealership information, branding, and preferences",
    icon: Settings,
    href: "/settings/general",
    category: "general",
    keywords: ["general", "dealership", "info", "name", "address", "contact", "branding"],
  },
  {
    id: "appearance",
    title: "Appearance",
    description: "Customize colors, logos, and visual identity",
    icon: Palette,
    href: "/settings/appearance",
    category: "general",
    keywords: ["appearance", "theme", "colors", "logo", "branding", "design"],
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Configure email and in-app notification preferences",
    icon: Bell,
    href: "/settings/notifications",
    category: "general",
    keywords: ["notifications", "email", "alerts", "preferences", "inbox"],
  },
  {
    id: "business-info",
    title: "Business Information",
    description: "Manage business hours, locations, and contact details",
    icon: Building,
    href: "/settings/business-info",
    category: "general",
    keywords: ["business", "hours", "location", "address", "contact", "phone"],
  },

  // SECURITY CATEGORY
  {
    id: "users",
    title: "User Management",
    description: "Manage team members, roles, and permissions",
    icon: Users,
    href: "/settings/users",
    category: "security",
    keywords: ["users", "team", "members", "employees", "staff", "roles", "permissions"],
  },
  {
    id: "roles-permissions",
    title: "Roles & Permissions",
    description: "Configure custom roles and granular access control",
    icon: UserCog,
    href: "/settings/roles",
    category: "security",
    keywords: ["roles", "permissions", "access", "control", "admin", "manager"],
    isPremium: true,
  },
  {
    id: "ip-management",
    title: "IP Access Control",
    description: "Restrict admin access to specific IP addresses",
    icon: Lock,
    href: "/settings/ip-management",
    category: "security",
    keywords: ["ip", "whitelist", "security", "access", "firewall", "restriction"],
  },
  {
    id: "security-logs",
    title: "Security Logs",
    description: "View audit logs and security events",
    icon: Activity,
    href: "/settings/security-logs",
    category: "security",
    keywords: ["logs", "audit", "security", "events", "history", "activity"],
  },

  // API CATEGORY
  {
    id: "api-keys",
    title: "API Keys",
    description: "Generate and manage API keys for inventory access",
    icon: Key,
    href: "/settings/api-keys",
    category: "api",
    keywords: ["api", "keys", "authentication", "access", "tokens", "credentials"],
  },
  {
    id: "domain-verification",
    title: "Domain Verification",
    description: "Verify domains authorized to access your API",
    icon: Globe,
    href: "/settings/domains",
    category: "api",
    keywords: ["domain", "verification", "cors", "website", "url", "access"],
  },
  {
    id: "api-usage",
    title: "API Usage & Analytics",
    description: "Monitor API requests, performance, and rate limits",
    icon: BarChart3,
    href: "/settings/api-usage",
    category: "api",
    keywords: ["api", "usage", "analytics", "stats", "requests", "performance", "rate limit"],
  },
  {
    id: "cache",
    title: "Cache Management",
    description: "Control CDN cache and data refresh settings",
    icon: Database,
    href: "/settings/cache",
    category: "api",
    keywords: ["cache", "cdn", "performance", "refresh", "purge", "invalidation"],
  },
  {
    id: "webhooks",
    title: "Webhooks",
    description: "Configure webhook endpoints for real-time updates",
    icon: Zap,
    href: "/settings/webhooks",
    category: "api",
    keywords: ["webhooks", "endpoints", "events", "notifications", "integrations"],
    badge: {
      text: "Coming Soon",
      variant: "secondary",
    },
  },
  {
    id: "document-templates",
    title: "Document Templates",
    description: "Upload and manage PDF templates for deal documents",
    icon: FileText,
    href: "/settings/document-templates",
    category: "api",
    keywords: ["templates", "documents", "pdf", "forms", "upload", "bill of sale"],
  },

  // BILLING CATEGORY
  {
    id: "billing",
    title: "Billing & Subscription",
    description: "Manage your plan, payment methods, and invoices",
    icon: CreditCard,
    href: "/settings/billing",
    category: "billing",
    keywords: ["billing", "subscription", "plan", "payment", "invoice", "upgrade"],
  },
  {
    id: "usage-limits",
    title: "Usage & Limits",
    description: "View current usage and subscription limits",
    icon: Activity,
    href: "/settings/usage",
    category: "billing",
    keywords: ["usage", "limits", "quota", "storage", "api calls", "seats"],
  },

  // DEVELOPER CATEGORY
  {
    id: "developer-tools",
    title: "Developer Console",
    description: "API documentation, testing tools, and utilities",
    icon: Code,
    href: "/settings/developer",
    category: "developer",
    keywords: ["developer", "api", "console", "testing", "debug", "tools"],
    badge: {
      text: "DEV",
      variant: "outline",
    },
  },
  {
    id: "api-docs",
    title: "API Documentation",
    description: "Interactive API reference and code examples",
    icon: FileText,
    href: "/settings/api-docs",
    category: "developer",
    keywords: ["api", "docs", "documentation", "reference", "endpoints", "swagger"],
  },
  {
    id: "data-management",
    title: "Data Management",
    description: "Import, export, and manage your data safely",
    icon: Database,
    href: "/settings/data",
    category: "developer",
    keywords: ["data", "import", "export", "backup", "restore", "migration"],
  },
  {
    id: "test-data",
    title: "Test Data",
    description: "Generate sample data for development and testing",
    icon: Trash2,
    href: "/settings/test-data",
    category: "developer",
    keywords: ["test", "sample", "data", "mock", "seed", "development"],
    badge: {
      text: "Dangerous",
      variant: "destructive",
    },
  },
];

// Helper function to search settings
export function searchSettings(query: string): SettingsItem[] {
  if (!query || query.trim() === "") {
    return settingsItems;
  }

  const searchTerm = query.toLowerCase().trim();

  return settingsItems.filter((item) => {
    const titleMatch = item.title.toLowerCase().includes(searchTerm);
    const descriptionMatch = item.description.toLowerCase().includes(searchTerm);
    const keywordMatch = item.keywords.some((keyword) =>
      keyword.toLowerCase().includes(searchTerm)
    );

    return titleMatch || descriptionMatch || keywordMatch;
  });
}

// Helper to get items by category
export function getSettingsByCategory(categoryId: string): SettingsItem[] {
  return settingsItems.filter((item) => item.category === categoryId);
}