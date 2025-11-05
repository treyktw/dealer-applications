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
import { CheckCircle2, ArrowRight, Package } from "lucide-react";

export default function PurchaseSuccessPage() {
  const router = useRouter();

  return (
    <div className="max-w-2xl mx-auto py-12">
      <Card>
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-green-100 rounded-full p-4">
              <CheckCircle2 className="w-16 h-16 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-3xl">Purchase Successful!</CardTitle>
          <CardDescription className="text-lg">
            Your document pack has been added to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-3">
            <h3 className="font-semibold text-blue-900">What happens next?</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start">
                <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>
                  Your document pack is now available for use in all deals
                </span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>
                  All documents are pre-filled with your dealership information
                </span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>
                  You'll receive a receipt via email shortly
                </span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col space-y-3">
            <Button
              className="w-full"
              onClick={() => router.push("/settings/my-document-packs")}
            >
              View My Document Packs
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/marketplace/document-packs")}
            >
              <Package className="w-4 h-4 mr-2" />
              Browse More Packs
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => router.push("/dashboard")}
            >
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
