// apps/web/src/app/(admin)/document-packs/new/page.tsx
"use client";

import { useId, useState } from "react";
import { useMutation } from "convex/react";
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
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

interface Document {
  type: string;
  name: string;
  templateContent: string;
  fillableFields: string[];
  required: boolean;
  order: number;
}

export default function NewDocumentPackPage() {
  const router = useRouter();
  const createPack = useMutation(api.documentPackTemplates.create);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    jurisdiction: "federal",
    packType: "cash_sale",
    price: "",
    createStripeProduct: true,
  });

  const [documents, setDocuments] = useState<Document[]>([
    {
      type: "bill_of_sale",
      name: "",
      templateContent: "",
      fillableFields: [],
      required: true,
      order: 1,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddDocument = () => {
    setDocuments([
      ...documents,
      {
        type: "other",
        name: "",
        templateContent: "",
        fillableFields: [],
        required: false,
        order: documents.length + 1,
      },
    ]);
  };

  const handleRemoveDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const handleDocumentChange = (
    index: number,
    field: keyof Document,
    value: string | string[] | boolean
  ) => {
    const newDocuments = [...documents];
    newDocuments[index] = {
      ...newDocuments[index],
      [field]: value,
    };
    setDocuments(newDocuments);
  };

  const handleFieldsChange = (index: number, fieldsText: string) => {
    const fields = fieldsText
      .split(",")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);
    handleDocumentChange(index, "fillableFields", fields);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate
      if (!formData.name || !formData.description) {
        toast.error("Please fill in all required fields");
        setIsSubmitting(false);
        return;
      }

      if (documents.length === 0) {
        toast.error("Please add at least one document");
        setIsSubmitting(false);
        return;
      }

      // Check all documents have required fields
      for (const doc of documents) {
        if (!doc.name || !doc.type) {
          toast.error("All documents must have a name and type");
          setIsSubmitting(false);
          return;
        }
      }

      const priceInCents = Math.round(parseFloat(formData.price) * 100);

      const result = await createPack({
        name: formData.name,
        description: formData.description,
        jurisdiction: formData.jurisdiction,
        packType: formData.packType,
        price: priceInCents,
        documents: documents.map((doc, idx) => ({
          ...doc,
          order: idx + 1,
        })),
        createStripeProduct: formData.createStripeProduct,
      });

      if (result.success) {
        toast.success("Document pack created successfully!", {
          description: result.stripeProductId
            ? "Stripe product and price created."
            : undefined,
        });
        // Navigate to the document packs list
        router.push("/admin/document-packs");
      } else {
        throw new Error("Failed to create document pack");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create pack"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Create Document Pack
          </h1>
          <p className="text-gray-600 mt-1">
            Create a new document pack template for dealers to purchase
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Pack Information */}
        <Card>
          <CardHeader>
            <CardTitle>Pack Information</CardTitle>
            <CardDescription>
              Basic information about the document pack
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Pack Name *</Label>
              <Input
                id={useId()}
                name="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="California Cash Sale Pack"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id={useId()}
                name="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Complete set of documents for cash vehicle sales..."
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jurisdiction">Jurisdiction *</Label>
                <Select
                  value={formData.jurisdiction}
                  onValueChange={(value) =>
                    setFormData({ ...formData, jurisdiction: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="federal">Federal</SelectItem>
                    <SelectItem value="california">California</SelectItem>
                    <SelectItem value="texas">Texas</SelectItem>
                    <SelectItem value="florida">Florida</SelectItem>
                    <SelectItem value="new_york">New York</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="packType">Pack Type *</Label>
                <Select
                  value={formData.packType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, packType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash_sale">Cash Sale</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="lease">Lease</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price (USD) *</Label>
                <Input
                  id={useId()}
                  name="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  placeholder="99.00"
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={useId()}
                name="createStripeProduct"
                checked={formData.createStripeProduct}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    createStripeProduct: e.target.checked,
                  })
                }
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <Label htmlFor="createStripeProduct" className="font-normal">
                Create Stripe product automatically
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>
              Add documents that will be included in this pack
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {documents.map((doc, index) => (
              <div key={doc.type} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Document {index + 1}</h4>
                  {documents.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveDocument(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Document Type *</Label>
                    <Select
                      value={doc.type}
                      onValueChange={(value) =>
                        handleDocumentChange(index, "type", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bill_of_sale">
                          Bill of Sale
                        </SelectItem>
                        <SelectItem value="odometer_disclosure">
                          Odometer Disclosure
                        </SelectItem>
                        <SelectItem value="purchase_agreement">
                          Purchase Agreement
                        </SelectItem>
                        <SelectItem value="title_application">
                          Title Application
                        </SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Document Name *</Label>
                    <Input
                      value={doc.name}
                      onChange={(e) =>
                        handleDocumentChange(index, "name", e.target.value)
                      }
                      placeholder="Bill of Sale (REG 135)"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Template Content</Label>
                  <Textarea
                    value={doc.templateContent}
                    onChange={(e) =>
                      handleDocumentChange(
                        index,
                        "templateContent",
                        e.target.value
                      )
                    }
                    placeholder="HTML template content..."
                    rows={6}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-600">
                    Use template variables like: {"{{vin}}"}, {"{{buyerName}}"}, {"{{salePrice}}"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Fillable Fields</Label>
                  <Input
                    value={doc.fillableFields.join(", ")}
                    onChange={(e) => handleFieldsChange(index, e.target.value)}
                    placeholder="vin, buyerName, salePrice, saleDate"
                  />
                  <p className="text-xs text-gray-600">
                    Comma-separated list of field names
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`required-${index}`}
                    checked={doc.required}
                    onChange={(e) =>
                      handleDocumentChange(index, "required", e.target.checked)
                    }
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <Label htmlFor={`required-${index}`} className="font-normal">
                    Required document
                  </Label>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={handleAddDocument}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Document
            </Button>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isSubmitting ? "Creating..." : "Create Document Pack"}
          </Button>
        </div>
      </form>
    </div>
  );
}
