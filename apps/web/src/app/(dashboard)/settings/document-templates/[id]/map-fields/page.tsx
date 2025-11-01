"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Save,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info,
  Search,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  autoMapAllFields,
  type FieldMapping,
  ENHANCED_DATA_SCHEMA,
} from "@/lib/field-auto-mapper";

const TRANSFORMS = [
  { value: "--", label: "None" },
  { value: "uppercase", label: "UPPERCASE" },
  { value: "lowercase", label: "lowercase" },
  { value: "titlecase", label: "Title Case" },
  { value: "currency", label: "Currency ($)" },
  { value: "date", label: "Date Format" },
] as const;


export default function MapFieldsPage() {
  const params = useParams();
  const templateId = params.id as Id<"documentTemplates">;

  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUnmappedOnly, setShowUnmappedOnly] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoMapping, setIsAutoMapping] = useState(false);

  // Queries
  const template = useQuery(api.documents.templates.getTemplateById, { templateId });

  // Mutations
  const updateMappings = useMutation(api.documents.templates.updateFieldMappings);

  // Initialize mappings from template
  useEffect(() => {
    if (template) {
      console.log("Template loaded:", template);
      console.log("PDF Fields:", template.pdfFields);
      console.log("Field Mappings:", template.fieldMappings);

      // If we have existing mappings, use them
      if (template.fieldMappings && template.fieldMappings.length > 0) {
        setMappings(template.fieldMappings as FieldMapping[]);
      } 
      // Otherwise, create blank mappings from PDF fields
      else if (template.pdfFields && template.pdfFields.length > 0) {
        const blankMappings: FieldMapping[] = template.pdfFields.map((field: { name: string; type: string }) => ({
          pdfFieldName: field.name,
          dataPath: "",
          transform: undefined,
          defaultValue: undefined,
          required: false,
          autoMapped: false,
        }));
        setMappings(blankMappings);
      }
    }
  }, [template]);

  /**
   * Auto-map fields using smart matching
   */
  const handleAutoMap = () => {
    if (!template?.pdfFields || template.pdfFields.length === 0) {
      toast.error("No PDF fields to map");
      return;
    }

    setIsAutoMapping(true);

    try {
      // Use the smart auto-mapper
      const autoMappedFields = autoMapAllFields(template.pdfFields, mappings);

      setMappings(autoMappedFields);
      setHasChanges(true);

      const mappedCount = autoMappedFields.filter(m => m.dataPath && m.dataPath !== "").length;
      const unmappedCount = autoMappedFields.length - mappedCount;
      
      toast.success(
        `Auto-mapped ${mappedCount} of ${autoMappedFields.length} fields!` +
        (unmappedCount > 0 ? ` (${unmappedCount} fields need manual mapping)` : ""),
        { duration: 5000 }
      );
    } catch (error) {
      console.error("Auto-mapping error:", error);
      toast.error("Failed to auto-map fields");
    } finally {
      setIsAutoMapping(false);
    }
  };
  
  const handleMappingChange = (
    index: number,
    field: keyof FieldMapping,
    value: string | boolean | undefined
  ) => {
    const newMappings = [...mappings];
    newMappings[index] = {
      ...newMappings[index],
      [field]: value,
      autoMapped: false, // Mark as manually edited
    };
    setMappings(newMappings);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateMappings({
        templateId,
        fieldMappings: mappings,
      });
      setHasChanges(false);
      toast.success("Field mappings saved successfully!");
    } catch (error: unknown) {
      console.error("Failed to save mappings:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save mappings";
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }; 

  const handleReset = () => {
    if (template?.fieldMappings && template.fieldMappings.length > 0) {
      setMappings(template.fieldMappings as FieldMapping[]);
    } else if (template?.pdfFields) {
      // Reset to blank mappings
      const blankMappings: FieldMapping[] = template.pdfFields.map((field: { name: string; type: string }) => ({
        pdfFieldName: field.name,
        dataPath: "",
        transform: undefined,
        defaultValue: undefined,
        required: false,
        autoMapped: false,
      }));
      setMappings(blankMappings);
    }
    setHasChanges(false);
    toast.info("Changes discarded");
  };

  if (!template) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show message if no PDF fields detected
  if (!template.pdfFields || template.pdfFields.length === 0) {
    return (
      <div className="mx-auto space-y-6 max-w-2xl">
        <div className="flex gap-4 items-center">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/settings/document-templates/${templateId}`}>
              <ArrowLeft className="mr-2 w-4 h-4" />
              Back to Template
            </Link>
          </Button>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>No PDF Fields Detected</AlertTitle>
          <AlertDescription>
            This PDF template doesn&apos;t contain any fillable form fields. Make sure your PDF
            has form fields before uploading, or the extraction process may still be running.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const filteredMappings = mappings.filter((mapping) => {
    const matchesSearch = mapping.pdfFieldName.toLowerCase().includes(searchQuery.toLowerCase());
    const isUnmapped = !mapping.dataPath || mapping.dataPath === "";
    
    if (showUnmappedOnly) {
      return matchesSearch && isUnmapped;
    }
    
    return matchesSearch;
  });

  const mappedCount = mappings.filter((m) => m.dataPath && m.dataPath !== "").length;
  const unmappedCount = mappings.length - mappedCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex gap-4 items-center">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/settings/document-templates/${templateId}`}>
                <ArrowLeft className="mr-2 w-4 h-4" />
                Back to Template
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Map PDF Fields</h1>
          <p className="text-muted-foreground">{template.name}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || isSaving}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Unsaved Changes Alert */}
      {hasChanges && (
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Unsaved Changes</AlertTitle>
          <AlertDescription>
            You have unsaved changes. Click &quot;Save Changes&quot; to apply them.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Fields</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{mappings.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF form fields detected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Mapped</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{mappedCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Fields with data mappings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Unmapped</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{unmappedCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Fields needing mappings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search PDF fields..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button 
            variant="default" 
            onClick={handleAutoMap} 
            disabled={isAutoMapping}
            className="gap-2"
          >
            {isAutoMapping ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Mapping...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Auto-Map All Fields
              </>
            )}
          </Button>
        </div>
        
        {/* Filter Controls */}
        <div className="flex gap-2 items-center">
          <Button
            variant={showUnmappedOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowUnmappedOnly(!showUnmappedOnly)}
            className="gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            Show Unmapped Only ({unmappedCount})
          </Button>
          {showUnmappedOnly && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUnmappedOnly(false)}
            >
              Show All
            </Button>
          )}
        </div>
      </div>

      {/* Mapping Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: PDF Fields List */}
        <Card>
          <CardHeader>
            <CardTitle>
              PDF Form Fields ({filteredMappings.length})
              {showUnmappedOnly && (
                <Badge variant="secondary" className="ml-2">
                  Unmapped Only
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {showUnmappedOnly 
                ? "Fields that still need to be mapped to data fields"
                : "Fields detected in your PDF template"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              {filteredMappings.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Search className="mx-auto mb-4 w-12 h-12 opacity-50" />
                  <p>
                    {showUnmappedOnly 
                      ? "All fields are mapped! 🎉" 
                      : searchQuery 
                        ? "No fields match your search" 
                        : "No fields found"
                    }
                  </p>
                  {showUnmappedOnly && (
                    <p className="mt-2 text-sm">
                      You can now proceed to save your mappings.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredMappings.map((mapping) => {
                    const actualIndex = mappings.findIndex(
                      (m) => m.pdfFieldName === mapping.pdfFieldName
                    );
                    const isMapped = mapping.dataPath && mapping.dataPath !== "";

                    return (
                      <div
                        key={mapping.pdfFieldName}
                        className="p-4 space-y-3 rounded-lg border bg-card"
                      >
                        {/* PDF Field Name */}
                        <div className="flex gap-2 items-center">
                          {isMapped ? (
                            <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-orange-600 shrink-0" />
                          )}
                          <code className="flex-1 font-mono text-sm font-medium truncate">
                            {mapping.pdfFieldName}
                          </code>
                          {mapping.autoMapped && (
                            <Badge variant="secondary" className="text-xs shrink-0">
                              Auto
                            </Badge>
                          )}
                        </div>

                        {/* Data Path Selector */}
                        <div className="space-y-2">
                          <Label className="text-xs">Map to Data Field</Label>
                          <Select
                            value={mapping.dataPath}
                            onValueChange={(value) =>
                              handleMappingChange(actualIndex, "dataPath", value)
                            }
                          >
                            <SelectTrigger className="text-xs">
                              <SelectValue placeholder="Select data field..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="--" className="text-xs italic">
                                -- No mapping --
                              </SelectItem>
                              {Object.entries(ENHANCED_DATA_SCHEMA).map(([category, fields]) => (
                                <div key={category}>
                                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                    {category.charAt(0).toUpperCase() + category.slice(1)}
                                  </div>
                                  {fields.map((field, index) => (
                                    <SelectItem
                                      key={`${field.value}-${index}`}
                                      value={field.value}
                                      className="text-xs"
                                    >
                                      {field.label}
                                    </SelectItem>
                                  ))}
                                </div>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Transform & Required */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <Label className="text-xs">Transform</Label>
                            <Select
                              value={mapping.transform || "--"}
                              onValueChange={(value) =>
                                handleMappingChange(actualIndex, "transform", value === "--" ? undefined : value as "uppercase" | "lowercase" | "titlecase" | "currency" | "date")
                              }
                            >
                              <SelectTrigger className="text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TRANSFORMS.map((t) => (
                                  <SelectItem key={t.value || "--"} value={t.value || "--"} className="text-xs">
                                    {t.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">Required</Label>
                            <div className="flex items-center px-3 h-10 rounded-md border">
                              <Checkbox
                                checked={mapping.required}
                                onCheckedChange={(checked) =>
                                  handleMappingChange(actualIndex, "required", checked === true)
                                }
                              />
                              <Label className="ml-2 text-xs cursor-pointer">
                                Required
                              </Label>
                            </div>
                          </div>
                        </div>

                        {/* Default Value */}
                        <div className="space-y-2">
                          <Label className="text-xs">Default Value (optional)</Label>
                          <Input
                            placeholder="e.g., N/A"
                            value={mapping.defaultValue || ""}
                            onChange={(e) =>
                              handleMappingChange(
                                actualIndex,
                                "defaultValue",
                                e.target.value || undefined
                              )
                            }
                            className="text-xs"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right: Data Schema Reference */}
        <Card>
          <CardHeader>
            <CardTitle>Available Data Fields</CardTitle>
            <CardDescription>
              Fields available from deal, client, vehicle, and dealership data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6">
                {Object.entries(ENHANCED_DATA_SCHEMA).map(([category, fields]) => (
                  <div key={category} className="space-y-3">
                    <h3 className="text-sm font-semibold">
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </h3>
                    <div className="space-y-2">
                      {fields.map((field, index) => (
                        <div
                          key={`${field.value}-${index}`}
                          className="flex gap-2 items-start p-2 text-xs rounded border"
                        >
                          <code className="flex-1 font-mono break-all">{field.value}</code>
                          <span className="text-muted-foreground shrink-0">{field.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Help Section */}
      <Alert>
        <Info className="w-4 h-4" />
        <AlertTitle>Mapping Tips</AlertTitle>
        <AlertDescription className="space-y-1 text-xs">
          <ul className="list-disc list-inside space-y-0.5">
            <li><strong>Auto-Map:</strong> Click &quot;Auto-Map All Fields&quot; to automatically map common fields</li>
            <li><strong>Manual Override:</strong> You can change any auto-mapped field by selecting a different data field</li>
            <li><strong>Transforms:</strong> Apply formatting like UPPERCASE for names or currency for prices</li>
            <li><strong>Required:</strong> Mark fields as required if they must have a value</li>
            <li><strong>Defaults:</strong> Use default values as fallbacks when data is missing</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}