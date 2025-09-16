// src/app/layout.tsx
import "./globals.css";
import { Inter as FontSans } from "next/font/google";
import { JetBrains_Mono as FontMono } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";
import { ClerkProvider } from "@clerk/nextjs";
import ConvexClientProvider from "@/providers/convex-provider";
// import { QueryProvider } from "@/providers/query-provider";
import { SubscriptionProvider } from "@/providers/SubscriptionProvider";
import { dark } from "@clerk/themes";

// Setup fonts
const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = FontMono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata = {
  title: "Dealership Admin CMS",
  description: "Modern platform for managing car dealership operations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head />
      <body
        className={cn(
          "min-h-screen font-sans antialiased",
          fontSans.variable,
          fontMono.variable
        )}
      >
         <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#404040", // neutral-600
          colorBackground: "#171717", // neutral-900
          colorInputBackground: "#404040", // neutral-600
          colorInputText: "#f5f5f5", // neutral-100
        },
        elements: {
          formButtonPrimary: "bg-neutral-600 hover:bg-neutral-500 text-neutral-100",
          card: "bg-neutral-800 border-neutral-700",
          headerTitle: "text-neutral-100",
          headerSubtitle: "text-neutral-400",
          socialButtonsBlockButton: "bg-neutral-700 border-neutral-600 text-neutral-200 hover:bg-neutral-600",
          formFieldLabel: "text-neutral-200",
          formFieldInput: "bg-neutral-700 border-neutral-600 text-neutral-100",
          footerActionLink: "text-neutral-400 hover:text-neutral-200",
        },
      }}
    >
          <ConvexClientProvider>
            {/* <QueryProvider> */}
              <SubscriptionProvider>
                {children}
                <Toaster />
              </SubscriptionProvider>
            {/* </QueryProvider> */}
            <div id="clerk-captcha" className="hidden"></div>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}