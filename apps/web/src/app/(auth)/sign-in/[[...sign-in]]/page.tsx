// src/app/(auth)/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs';
import { CheckIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function Page() {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Image (2/3 of screen) */}
      <div className="hidden lg:flex lg:w-2/3 relative">
        <Image
          src="/ds-hero.jpg"
          alt="Luxury car dealership"
          className="absolute inset-0 w-full h-full object-cover"
          fill
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/50" />

        {/* Branding on the image */}
        <div className="relative z-10 flex flex-col justify-between p-12 h-full">
          <div>
            {/* Logo at top left */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">UAB</span>
              </div>
              <div className="text-white">
                <h3 className="font-semibold">UniversalAutoBrokers</h3>
                <p className="text-xs text-white/80">DealerAdmin Platform</p>
              </div>
            </div>
          </div>
          
          <div>
            <h1 className="text-5xl font-bold text-white mb-4">
              Welcome to DealerAdmin
            </h1>
            <p className="text-xl text-white/80 mb-8">
              Streamline your dealership operations with our comprehensive management platform
            </p>
            
            {/* Feature highlights */}
            <div className="grid grid-cols-2 gap-4 max-w-lg">
              <div className="flex items-center gap-2 text-white/90">
                <CheckIcon className="w-5 h-5" />
                <span className="text-sm">Document Management</span>
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <CheckIcon className="w-5 h-5" />
                <span className="text-sm">Deal Tracking</span>
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <CheckIcon className="w-5 h-5" />
                <span className="text-sm">E-Signatures</span>
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <CheckIcon className="w-5 h-5" />
                <span className="text-sm">Secure Storage</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form (1/3 of screen) */}
      <div className="w-full lg:w-1/3 flex flex-col bg-white dark:bg-zinc-900">
        {/* Top Bar */}
        <div className="p-6 flex justify-between items-center">
          <div className="lg:hidden">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">UAB</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">DealerAdmin</span>
            </div>
          </div>
          
          {/* Help Link */}
          <div className="ml-auto">
            <Link 
              href="/support" 
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              Need help?
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="w-full max-w-md flex flex-col items-center justify-center">
            {/* Welcome Message */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome Back
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Sign in to access your dealership dashboard
              </p>
            </div>

            {/* Clerk SignIn Component */}
            <div className="space-y-8">
              <SignIn 
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "shadow-none p-0 w-full",
                    socialButtonsBlockButton: "border border-gray-300 hover:bg-gray-50 transition-colors",
                    formButtonPrimary: "bg-blue-600 hover:bg-blue-700 transition-colors",
                    footerActionLink: "text-blue-600 hover:text-blue-700 transition-colors",
                    formFieldInput: "border-gray-300 focus:border-blue-500 focus:ring-blue-500",
                    dividerLine: "bg-gray-200",
                    dividerText: "text-gray-500 text-sm",
                  },
                  layout: {
                    socialButtonsPlacement: "bottom",
                  }
                }}
              />
            </div>

            {/* Terms and Privacy */}
            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                By signing in, you agree to our{" "}
                <Link 
                  href="/terms" 
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link 
                  href="/privacy" 
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Privacy Policy
                </Link>
              </p>
            </div>

            {/* Footer Links */}
            <div className="mt-6 flex justify-center space-x-4 text-sm">
              <Link 
                href="/contact-admin" 
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              >
                Contact Admin
              </Link>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <Link 
                href="/demo" 
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              >
                Request Demo
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="p-6 text-center border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            © 2024 UniversalAutoBrokers. All rights reserved.
          </p>
          <div className="mt-2 flex justify-center space-x-4">
            <Link 
              href="/security" 
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Security
            </Link>
            <Link 
              href="/compliance" 
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Compliance
            </Link>
            <Link 
              href="/status" 
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              System Status
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile view - Show image as background */}
      <div className="lg:hidden fixed inset-0 -z-10">
        <Image
          src="/ds-hero.jpg"
          alt="Luxury car dealership"
          className="w-full h-full object-cover"
          fill
        />
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      </div>
    </div>
  );
}