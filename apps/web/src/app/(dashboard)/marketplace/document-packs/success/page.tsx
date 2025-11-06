// apps/web/src/app/(dashboard)/marketplace/document-packs/success/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ArrowRight,
  Package,
  FileText,
  Sparkles,
  Home,
  ShoppingBag,
  Shield,
  Clock,
  Zap,
} from "lucide-react";
import { useEffect } from "react";

export default function PurchaseSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Track successful purchase (you can add analytics here)
    console.log("Purchase successful");
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Purchase Successful! 🎉
          </h1>
          <p className="text-xl text-gray-600">
            Your document pack has been added to your account
          </p>
        </div>

        {/* Main Card */}
        <Card className="mb-6 shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-6 h-6 text-blue-600" />
              <CardTitle className="text-2xl">What Happens Next?</CardTitle>
            </div>
            <CardDescription className="text-base">
              Your document pack is ready to use right away
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col items-center text-center p-4 bg-blue-50 rounded-lg">
                <div className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg mb-3">
                  1
                </div>
                <Zap className="w-8 h-8 text-blue-600 mb-2" />
                <h3 className="font-semibold mb-1">Instant Access</h3>
                <p className="text-sm text-gray-600">
                  Your pack is available immediately in your account
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-4 bg-purple-50 rounded-lg">
                <div className="bg-purple-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg mb-3">
                  2
                </div>
                <FileText className="w-8 h-8 text-purple-600 mb-2" />
                <h3 className="font-semibold mb-1">Use in Deals</h3>
                <p className="text-sm text-gray-600">
                  All documents are ready to use in your deals
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-4 bg-green-50 rounded-lg">
                <div className="bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg mb-3">
                  3
                </div>
                <Shield className="w-8 h-8 text-green-600 mb-2" />
                <h3 className="font-semibold mb-1">Stay Compliant</h3>
                <p className="text-sm text-gray-600">
                  All documents meet regulatory requirements
                </p>
              </div>
            </div>

            {/* Benefits */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                What You Get
              </h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Lifetime Access:</strong> Use these documents in unlimited
                    deals
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Auto-Updates:</strong> Receive updates when regulations
                    change
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Support:</strong> Get help from our team whenever you need
                    it
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Receipt:</strong> You&apos;ll receive a confirmation email
                    shortly
                  </span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 h-12"
                onClick={() => router.push("/marketplace/document-packs")}
              >
                <Package className="w-5 h-5 mr-2" />
                View My Packs
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                className="w-full h-12"
                onClick={() => router.push("/marketplace/document-packs")}
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                Browse More Packs
              </Button>
            </div>

            {/* Additional Info */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span>Secure Payment</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-green-600" />
                  <span>30-Day Guarantee</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>Instant Access</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="flex justify-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
