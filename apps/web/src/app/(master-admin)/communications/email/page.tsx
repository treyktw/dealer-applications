// apps/web/src/app/(master-admin)/communications/email/page.tsx
"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Mail, Send, Users, AlertCircle } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

export default function B2BEmailPage() {
  const [recipientType, setRecipientType] = useState<
    "all_dealers" | "specific_dealers"
  >("all_dealers");
  const [selectedDealerships, setSelectedDealerships] = useState<
    Id<"dealerships">[]
  >([]);
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Fetch all dealerships
  const dealerships = useQuery(api.emailService.getAllDealerships);

  const sendToAll = useAction(api.emailService.sendToAllDealerships);
  const sendToSpecific = useAction(api.emailService.sendToDealershipOwners);

  const handleSelectDealership = (dealershipId: Id<"dealerships">) => {
    if (selectedDealerships.includes(dealershipId)) {
      setSelectedDealerships(
        selectedDealerships.filter((id) => id !== dealershipId)
      );
    } else {
      setSelectedDealerships([...selectedDealerships, dealershipId]);
    }
  };

  const handleSelectAll = () => {
    if (!dealerships) return;
    if (selectedDealerships.length === dealerships.length) {
      setSelectedDealerships([]);
    } else {
      setSelectedDealerships(dealerships.map((d) => d._id));
    }
  };

  const handleSend = async () => {
    if (!subject || !htmlContent) {
      toast.error("Please fill in subject and message");
      return;
    }

    if (recipientType === "specific_dealers" && selectedDealerships.length === 0) {
      toast.error("Please select at least one dealership");
      return;
    }

    setIsSending(true);

    try {
      let result;

      if (recipientType === "all_dealers") {
        result = await sendToAll({
          subject,
          htmlContent,
        });
      } else {
        result = await sendToSpecific({
          dealershipIds: selectedDealerships,
          subject,
          htmlContent,
        });
      }

      toast.success(
        `Email sent to ${result.sent} dealership owner${
          result.sent !== 1 ? "s" : ""
        }`
      );

      // Reset form
      setSubject("");
      setHtmlContent("");
      setSelectedDealerships([]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send emails"
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Email Dealerships (B2B)
        </h1>
        <p className="text-gray-600 mt-1">
          Send announcements, updates, or notifications to dealership owners
        </p>
      </div>

      {/* Warning Banner */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="py-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-orange-900">
                Master Admin Feature
              </p>
              <p className="text-sm text-orange-700 mt-1">
                This email will be sent from the platform to dealership owners.
                Use responsibly and ensure content is professional.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recipients */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Select Recipients</CardTitle>
            <CardDescription>
              Choose who will receive this email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={recipientType}
              onValueChange={(value: any) => setRecipientType(value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all_dealers" id="all" />
                <Label htmlFor="all" className="font-normal cursor-pointer">
                  All Dealerships
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="specific_dealers" id="specific" />
                <Label
                  htmlFor="specific"
                  className="font-normal cursor-pointer"
                >
                  Specific Dealerships
                </Label>
              </div>
            </RadioGroup>

            {recipientType === "all_dealers" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  <Users className="w-4 h-4 inline mr-1" />
                  Email will be sent to all {dealerships?.length || 0}{" "}
                  dealership owners
                </p>
              </div>
            )}

            {recipientType === "specific_dealers" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {selectedDealerships.length} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                  >
                    {selectedDealerships.length === dealerships?.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-2">
                  {dealerships === undefined ? (
                    <p className="text-sm text-gray-600 text-center py-4">
                      Loading dealerships...
                    </p>
                  ) : dealerships.length === 0 ? (
                    <p className="text-sm text-gray-600 text-center py-4">
                      No dealerships found
                    </p>
                  ) : (
                    dealerships.map((dealership) => (
                      <div
                        key={dealership._id}
                        className={`flex items-center space-x-2 p-2 rounded cursor-pointer hover:bg-gray-100 ${
                          selectedDealerships.includes(dealership._id)
                            ? "bg-purple-50 border border-purple-300"
                            : "border border-transparent"
                        }`}
                        onClick={() => handleSelectDealership(dealership._id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedDealerships.includes(
                            dealership._id
                          )}
                          onChange={() => {}}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {dealership.name}
                          </p>
                          <p className="text-xs text-gray-600 truncate">
                            {dealership.contactEmail}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Composer */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Compose Email</CardTitle>
            <CardDescription>
              Write your message to dealership owners
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Important announcement from DealerApps"
                required
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder="Write your email message here..."
                rows={16}
                required
              />
              <p className="text-xs text-gray-600">
                You can use HTML for formatting. Available variables: {"{"}
                {"{"}dealershipName{"}"}{"}"}
                , {"{{"}ownerName{"}}"}, {"{{"}ownerEmail{"}}"}{" "}
              </p>
            </div>

            {/* Preview */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Preview
              </h4>
              <div className="bg-white border rounded p-4">
                <p className="text-sm font-semibold mb-2">{subject}</p>
                <div
                  className="text-sm text-gray-700"
                  dangerouslySetInnerHTML={{
                    __html: htmlContent.replace(
                      /\{\{dealershipName\}\}/g,
                      "Sample Dealership"
                    ),
                  }}
                />
              </div>
            </div>

            {/* Send Button */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-gray-600">
                <Users className="w-4 h-4 inline mr-1" />
                Sending to{" "}
                {recipientType === "all_dealers"
                  ? `all ${dealerships?.length || 0}`
                  : selectedDealerships.length}{" "}
                dealership
                {(recipientType === "all_dealers"
                  ? dealerships?.length || 0
                  : selectedDealerships.length) !== 1
                  ? "s"
                  : ""}
              </div>
              <Button
                onClick={handleSend}
                disabled={
                  isSending ||
                  (recipientType === "specific_dealers" &&
                    selectedDealerships.length === 0)
                }
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Send className="w-4 h-4 mr-2" />
                {isSending ? "Sending..." : "Send Email"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
