// src/app/(auth)/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from '@clerk/nextjs';
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
              Join DealerAdmin
            </h1>
            <p className="text-xl text-white/80 mb-8">
              Get started with the most comprehensive dealership management platform
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

            {/* Testimonial or additional info */}
            <div className="mt-8 p-4 bg-white/10 backdrop-blur rounded-lg max-w-lg">
              <p className="text-white/90 text-sm italic">
                &apos;DealerAdmin has transformed how we manage our dealership. The efficiency gains have been incredible.&quot;
              </p>
              <p className="text-white/70 text-xs mt-2">
                - John Smith, ABC Motors
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Sign up form (1/3 of screen) */}
      <div className="w-full lg:w-1/3 flex flex-col bg-white dark:bg-zinc-900 justify-center items-center">
        {/* Top Bar */}
        <div className="p-6 flex justify-center items-center ">
          <div className="lg:hidden">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">UAB</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">DealerAdmin</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-8 overflow-y-auto w-full">
          <div className="w-full max-w-md flex flex-col items-center justify-center py-8">
            {/* Welcome Message */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Create Your Account
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Join thousands of dealerships using Dealer Admin
              </p>
            </div>

            {/* Benefits list */}
            {/* <div className="mb-6 w-full bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-400 mb-2">
                What you&apos;ll get:
              </p>
              <ul className="space-y-1">
                <li className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-300">
                  <CheckIcon className="w-4 h-4" />
                  <span>14-day free trial</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-300">
                  <CheckIcon className="w-4 h-4" />
                  <span>No credit card required</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-300">
                  <CheckIcon className="w-4 h-4" />
                  <span>Full access to all features</span>
                </li>
              </ul>
            </div> */}

            {/* Clerk SignUp Component */}
            <div className="w-full flex flex-col items-center justify-center">
              <SignUp 
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
                By creating an account, you agree to our{" "}
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
              <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                You also agree to receive product updates and marketing communications.
                You can unsubscribe at any time.
              </p>
            </div>

            {/* Footer Links */}
            <div className="mt-6 flex justify-center space-x-4 text-sm">
              <Link 
                href="/contact-sales" 
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              >
                Contact Sales
              </Link>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <Link 
                href="/demo" 
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              >
                Request Demo
              </Link>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <Link 
                href="/pricing" 
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              >
                Pricing
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