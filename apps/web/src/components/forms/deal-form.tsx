"use client";

import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DocumentType } from "@/types/documents";
import { Id } from "@/convex/_generated/dataModel";

// Define the form schema
export const dealFormSchema = z.object({
  saleDate: z.string().min(1, "Sale date is required"),
  saleAmount: z.coerce.number().min(0, "Sale amount is required"),
  salesTax: z.coerce.number().min(0, "Sales tax is required"),
  docFee: z.coerce.number().min(0, "Document fee is required"),
  tradeInValue: z.coerce.number().min(0),
  downPayment: z.coerce.number().min(0),
  documents: z.array(z.nativeEnum(DocumentType)).min(1, "At least one document is required"),
  status: z.enum(['DRAFT', 'PENDING', 'COMPLETED', 'CANCELLED']),
});

export type DealFormValues = z.infer<typeof dealFormSchema>;

interface DealFormProps {
  client: {
    _id: Id<"clients">;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  vehicle: {
    _id: Id<"vehicles">;
    year: number;
    make: string;
    model: string;
    trim?: string;
    vin?: string;
    stockNumber?: string;
    price: number;
    mileage?: number;
    exteriorColor?: string;
  };
  onSubmit: (data: DealFormValues & { totalAmount: number; financedAmount: number }) => void;
  isLoading: boolean;
}

export function DealForm({
  client,
  vehicle,
  onSubmit,
  isLoading = false,
}: DealFormProps) {
  const [calculatedTotals, setCalculatedTotals] = useState({
    totalAmount: vehicle.price,
    financedAmount: vehicle.price,
  });

  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      saleDate: new Date().toISOString().substring(0, 10),
      saleAmount: vehicle.price,
      salesTax: Math.round(vehicle.price * 0.07 * 100) / 100,
      docFee: 699,
      tradeInValue: 0,
      downPayment: 0,
      documents: [
        DocumentType.BILL_OF_SALE,
        // DocumentType.ODOMETER_DISCLOSURE,
      ],
      status: 'DRAFT',
    } satisfies DealFormValues,
  });

  // Watch values to calculate totals
  const watchSaleAmount = form.watch("saleAmount");
  const watchSalesTax = form.watch("salesTax");
  const watchDocFee = form.watch("docFee");
  const watchTradeInValue = form.watch("tradeInValue");
  const watchDownPayment = form.watch("downPayment");

  // Calculate totals whenever watched values change
  const calculateTotals = () => {
    const totalAmount = 
      watchSaleAmount + 
      watchSalesTax + 
      watchDocFee - 
      watchTradeInValue - 
      watchDownPayment;
    
    const financedAmount = totalAmount;
    
    setCalculatedTotals({
      totalAmount,
      financedAmount,
    });
  };

  // Update totals when form values change
  const onFormChange = () => {
    calculateTotals();
  };

  // Handle form submission
  const handleSubmit: SubmitHandler<DealFormValues> = (data) => {
    try {
      // Add calculated totals to form data
      const fullData = {
        ...data,
        ...calculatedTotals,
      };
      
      onSubmit(fullData);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("There was an error processing your request. Please try again.");
    }
  };

  // Available documents with their labels
  const documentOptions = [
    { id: DocumentType.TITLE_REASSIGNMENT, label: "Title Reassignment" },
    { id: DocumentType.TRADE_IN_REDUCTION, label: "Reduction for Trade In" },
    { id: DocumentType.TAX_AD_VALOREM, label: "Title Ad Valorem Tax" },
    { id: DocumentType.BAILMENT_AGREEMENT, label: "Bailment Agreement" },
    { id: DocumentType.OFAC_COMPLIANCE, label: "OFAC Compliance" },
    { id: DocumentType.FACTS_DOC, label: "Facts (What We Do With Your Information)" },
    { id: DocumentType.POWER_OF_ATTORNEY, label: "Limited Power of Attorney" },
    { id: DocumentType.BUYERS_GUIDE_P1, label: "Buyers Guide (Part 1)" },
    { id: DocumentType.BUYERS_GUIDE_P2, label: "Buyers Guide (Part 2)" },
    { id: DocumentType.ODOMETER_DISCLOSURE, label: "Odometer Disclosure" },
    { id: DocumentType.ARBITRATION_AGREEMENT, label: "Arbitration Agreement" },
    { id: DocumentType.WE_OWE_DOC, label: "We Owe Document" },
    { id: DocumentType.BILL_OF_SALE, label: "Bill of Sale" },
    { id: DocumentType.MV1_APPLICATION, label: "MV-1 Title Application" },
    { id: DocumentType.AS_IS_SOLD, label: "As-Is Sold Without Warranty" },
    { id: DocumentType.BILL_OF_SALE_TERMS, label: "Bill of Sale Terms & Conditions" },
  ];

  return (
    <Form {...form}>
      <form onChange={onFormChange} onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Client Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
              <CardDescription>Details of the client</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="font-semibold">Name:</span>
                <span className="ml-2">{client.firstName} {client.lastName}</span>
              </div>
              {client.email && (
                <div>
                  <span className="font-semibold">Email:</span>
                  <span className="ml-2">{client.email}</span>
                </div>
              )}
              {client.phone && (
                <div>
                  <span className="font-semibold">Phone:</span>
                  <span className="ml-2">{client.phone}</span>
                </div>
              )}
              {client.address && (
                <div>
                  <span className="font-semibold">Address:</span>
                  <span className="ml-2">
                    {client.address}
                    {client.city && client.state && (
                      <>
                        <br />
                        {client.city}, {client.state} {client.zipCode}
                      </>
                    )}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vehicle Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Information</CardTitle>
              <CardDescription>Details of the vehicle</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="font-semibold">Vehicle:</span>
                <span className="ml-2">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                  {vehicle.trim && ` ${vehicle.trim}`}
                </span>
              </div>
              <div>
                <span className="font-semibold">VIN:</span>
                <span className="ml-2">{vehicle.vin}</span>
              </div>
              <div>
                <span className="font-semibold">Stock:</span>
                <span className="ml-2">{vehicle.stockNumber}</span>
              </div>
              <div>
                <span className="font-semibold">Mileage:</span>
                <span className="ml-2">{vehicle.mileage?.toLocaleString()} miles</span>
              </div>
              <div>
                <span className="font-semibold">Color:</span>
                <span className="ml-2">{vehicle.exteriorColor || "Not specified"}</span>
              </div>
              <div>
                <span className="font-semibold">Price:</span>
                <span className="ml-2 font-bold">{formatCurrency(vehicle.price)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Deal Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Deal Summary</CardTitle>
              <CardDescription>Financial summary</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="font-semibold">Sale Price:</span>
                <span className="ml-2">{formatCurrency(watchSaleAmount)}</span>
              </div>
              <div>
                <span className="font-semibold">Sales Tax:</span>
                <span className="ml-2">{formatCurrency(watchSalesTax)}</span>
              </div>
              <div>
                <span className="font-semibold">Doc Fee:</span>
                <span className="ml-2">{formatCurrency(watchDocFee)}</span>
              </div>
              {watchTradeInValue > 0 && (
                <div>
                  <span className="font-semibold">Trade-In:</span>
                  <span className="ml-2">-{formatCurrency(watchTradeInValue)}</span>
                </div>
              )}
              {watchDownPayment > 0 && (
                <div>
                  <span className="font-semibold">Down Payment:</span>
                  <span className="ml-2">-{formatCurrency(watchDownPayment)}</span>
                </div>
              )}
              <Separator />
              <div>
                <span className="font-semibold">Total Amount:</span>
                <span className="ml-2 font-bold">{formatCurrency(calculatedTotals.totalAmount)}</span>
              </div>
              <div>
                <span className="font-semibold">Financed Amount:</span>
                <span className="ml-2">{formatCurrency(calculatedTotals.financedAmount)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Sale Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Sale Details</CardTitle>
              <CardDescription>Enter sale information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="saleDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sale Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="saleAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sale Amount ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="salesTax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sales Tax ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormDescription>
                      Calculated at 7% of sale amount by default
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="docFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Documentation Fee ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Trade-In & Payment Card */}
          <Card>
            <CardHeader>
              <CardTitle>Trade-In & Payments</CardTitle>
              <CardDescription>Enter trade-in and payment details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="tradeInValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trade-In Value ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter 0 if no trade-in
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="downPayment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Down Payment ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter 0 if no down payment
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4">
                <span className="font-semibold">Total Amount:</span>
                <span className="ml-2 font-bold">
                  {formatCurrency(calculatedTotals.totalAmount)}
                </span>
              </div>
              <div>
                <span className="font-semibold">Amount to Finance:</span>
                <span className="ml-2">
                  {formatCurrency(calculatedTotals.financedAmount)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Documents Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Required Documents</CardTitle>
            <CardDescription>
              Select the documents to generate for this deal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="documents"
              render={() => (
                <FormItem>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documentOptions.map((document) => (
                      <FormField
                        key={document.id}
                        control={form.control}
                        name="documents"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={document.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(document.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, document.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== document.id
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                {document.label}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Documents...
                </>
              ) : (
                <>Generate Documents</>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}