// app/(dashboard)/deals/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Search,
  User,
  Car,
  DollarSign,
  CheckCircle2,
  ChevronRight,
  Info,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

type Step = "client" | "vehicle" | "details" | "review";

export default function NewDealPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("client");
  const [selectedClientId, setSelectedClientId] = useState<Id<"clients"> | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<Id<"vehicles"> | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [vehicleSearch, setVehicleSearch] = useState("");

  // Deal details
  const [dealType, setDealType] = useState<"cash" | "finance" | "lease">("finance");
  const [saleAmount, setSaleAmount] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [salesTax, setSalesTax] = useState("");
  const [docFee, setDocFee] = useState("299");
  const [tradeInValue, setTradeInValue] = useState("");

  // Get current user
  const currentUser = useQuery(api.users.getCurrentUser);
  const dealershipId = currentUser?.dealershipId;

  // Fetch clients
  const clients = useQuery(
    api.clients.listClients,
    dealershipId ? { dealershipId } : "skip"
  );

  // Fetch vehicles
  const vehicles = useQuery(
    api.inventory.getVehicles,
    dealershipId ? { dealershipId, status: "AVAILABLE" } : "skip"
  );

  // Create deal mutation
  const createDeal = useMutation(api.deals.createDeal);

  // Get selected client/vehicle details
  const selectedClient = clients?.data?.find((c: Doc<"clients">) => c._id === selectedClientId);
  const selectedVehicle = vehicles?.vehicles?.find((v: Doc<"vehicles">) => v._id === selectedVehicleId);

  // Filter clients by search
  const filteredClients = clients?.data?.filter((client) => {
    const searchLower = clientSearch.toLowerCase();
    return (
      client.firstName.toLowerCase().includes(searchLower) ||
      client.lastName.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower)
    );
  });

  // Filter vehicles by search
  const filteredVehicles = vehicles?.vehicles?.filter((vehicle: Doc<"vehicles">) => {
    const searchLower = vehicleSearch.toLowerCase();
    return (
      vehicle.make.toLowerCase().includes(searchLower) ||
      vehicle.model.toLowerCase().includes(searchLower) ||
      vehicle.vin.toLowerCase().includes(searchLower) ||
      vehicle.stock.toLowerCase().includes(searchLower)
    );
  });

  // Calculate total
  const calculateTotal = () => {
    const sale = parseFloat(saleAmount) || 0;
    const tax = parseFloat(salesTax) || 0;
    const fee = parseFloat(docFee) || 0;
    const trade = parseFloat(tradeInValue) || 0;
    return sale + tax + fee - trade;
  };

  // Handle create deal
  const handleCreateDeal = async () => {
    if (!selectedClientId || !selectedVehicleId || !dealershipId) {
      toast.error("Please select a client and vehicle");
      return;
    }

    try {
      const result = await createDeal({
        clientId: selectedClientId,
        vehicleId: selectedVehicleId,
        dealershipId,
        type: dealType,
        saleAmount: parseFloat(saleAmount) || 0,
        salesTax: parseFloat(salesTax) || 0,
        docFee: parseFloat(docFee) || 0,
        tradeInValue: parseFloat(tradeInValue) || 0,
        downPayment: parseFloat(downPayment) || 0,
        financedAmount: parseFloat(saleAmount) - parseFloat(downPayment || "0"),
        totalAmount: calculateTotal(),
        saleDate: Date.now(),
      });

      toast.success("Deal created successfully!");
      router.push(`/deals/${result.dealId}`);
    } catch (error) {
      console.error("Error creating deal:", error);
      toast.error("Failed to create deal");
    }
  };

  // Step navigation
  const steps: { id: Step; label: string; icon: React.ReactNode }[] = [
    { id: "client", label: "Select Client", icon: <User className="w-4 h-4" /> },
    { id: "vehicle", label: "Select Vehicle", icon: <Car className="w-4 h-4" /> },
    { id: "details", label: "Deal Details", icon: <DollarSign className="w-4 h-4" /> },
    { id: "review", label: "Review", icon: <CheckCircle2 className="w-4 h-4" /> },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const canProceed = () => {
    switch (currentStep) {
      case "client":
        return selectedClientId !== null;
      case "vehicle":
        return selectedVehicleId !== null;
      case "details":
        return saleAmount !== "" && parseFloat(saleAmount) > 0;
      case "review":
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canProceed()) return;
    
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  return (
    <div className="mx-auto space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex gap-4 items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/deals")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create New Deal</h1>
            <p className="text-muted-foreground">
              Follow the steps to create a new vehicle sale
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex gap-2 items-center">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = index < currentStepIndex;
          
          return (
            <div key={step.id} className="flex flex-1 gap-2 items-center">
              <button
                type="button"
                onClick={() => {
                  if (index <= currentStepIndex) {
                    setCurrentStep(step.id);
                  }
                }}
                className={`flex flex-1 gap-3 items-center px-4 py-3 rounded-lg border transition-all ${
                  isActive
                    ? "border-primary bg-primary/5"
                    : isCompleted
                    ? "bg-green-50 border-green-500 dark:bg-green-950"
                    : "border-border bg-background hover:bg-muted/50"
                }`}
              >
                <div
                  className={`flex justify-center items-center w-8 h-8 rounded-full ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isCompleted
                      ? "text-white bg-green-500"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    step.icon
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                    {step.label}
                  </p>
                </div>
              </button>
              {index < steps.length - 1 && (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="space-y-6">
        {/* STEP 1: Select Client */}
        {currentStep === "client" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex gap-2 items-center">
                <User className="w-5 h-5" />
                Select Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search clients by name or email..."
                  className="pl-9"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto">
                {filteredClients?.map((client) => (
                  <button
                    type="button"
                    key={client._id}
                    onClick={() => setSelectedClientId(client._id)}
                    className={`p-4 text-left rounded-lg border transition-all ${
                      selectedClientId === client._id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold">
                          {client.firstName} {client.lastName}
                        </p>
                        {client.email && (
                          <p className="text-sm text-muted-foreground">{client.email}</p>
                        )}
                        {client.phone && (
                          <p className="text-sm text-muted-foreground">{client.phone}</p>
                        )}
                        {client.city && client.state && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {client.city}, {client.state}
                          </p>
                        )}
                      </div>
                      {selectedClientId === client._id && (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {filteredClients?.length === 0 && (
                <div className="flex flex-col justify-center items-center py-8 text-center">
                  <User className="mb-3 w-12 h-12 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No clients found. Create a client first.
                  </p>
                  <Button asChild variant="link" className="mt-2">
                    <Link href="/clients">Go to Clients</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 2: Select Vehicle */}
        {currentStep === "vehicle" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex gap-2 items-center">
                <Car className="w-5 h-5" />
                Select Vehicle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search vehicles by make, model, VIN, or stock..."
                  className="pl-9"
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto">
                {filteredVehicles?.map((vehicle: Doc<"vehicles">) => (
                  <button
                    type="button"
                    key={vehicle._id}
                    onClick={() => {
                      setSelectedVehicleId(vehicle._id);
                      setSaleAmount(vehicle.price.toString());
                    }}
                    className={`p-4 text-left rounded-lg border transition-all ${
                      selectedVehicleId === vehicle._id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </p>
                        <p className="font-mono text-sm text-muted-foreground">
                          VIN: {vehicle.vin}
                        </p>
                        <div className="flex gap-3 items-center mt-2">
                          <span className="px-2 py-1 text-xs rounded bg-muted">
                            Stock: {vehicle.stock}
                          </span>
                          <span className="px-2 py-1 text-xs rounded bg-muted">
                            {vehicle.mileage.toLocaleString()} mi
                          </span>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(vehicle.price)}
                          </span>
                        </div>
                      </div>
                      {selectedVehicleId === vehicle._id && (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {filteredVehicles?.length === 0 && (
                <div className="flex flex-col justify-center items-center py-8 text-center">
                  <Car className="mb-3 w-12 h-12 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No available vehicles found.
                  </p>
                  <Button asChild variant="link" className="mt-2">
                    <Link href="/inventory">Go to Inventory</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 3: Deal Details */}
        {currentStep === "details" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex gap-2 items-center">
                <DollarSign className="w-5 h-5" />
                Deal Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Deal Type */}
              <div className="space-y-2">
                <Label>Deal Type</Label>
                <Select value={dealType} onValueChange={(v: "cash" | "finance" | "lease") => setDealType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="lease">Lease</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Sale Amount */}
                <div className="space-y-2">
                  <Label>Sale Amount *</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={saleAmount}
                    onChange={(e) => setSaleAmount(e.target.value)}
                  />
                </div>

                {/* Down Payment */}
                <div className="space-y-2">
                  <Label>Down Payment</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={downPayment}
                    onChange={(e) => setDownPayment(e.target.value)}
                  />
                </div>

                {/* Sales Tax */}
                <div className="space-y-2">
                  <Label>Sales Tax</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={salesTax}
                    onChange={(e) => setSalesTax(e.target.value)}
                  />
                </div>

                {/* Doc Fee */}
                <div className="space-y-2">
                  <Label>Doc Fee</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={docFee}
                    onChange={(e) => setDocFee(e.target.value)}
                  />
                </div>

                {/* Trade-In */}
                <div className="space-y-2">
                  <Label>Trade-In Value</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={tradeInValue}
                    onChange={(e) => setTradeInValue(e.target.value)}
                  />
                </div>
              </div>

              {/* Total Calculation */}
              <div className="p-4 rounded-lg bg-muted">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">Sale Amount:</span>
                  <span className="font-medium">{formatCurrency(parseFloat(saleAmount) || 0)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">Sales Tax:</span>
                  <span className="font-medium">{formatCurrency(parseFloat(salesTax) || 0)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">Doc Fee:</span>
                  <span className="font-medium">{formatCurrency(parseFloat(docFee) || 0)}</span>
                </div>
                {parseFloat(tradeInValue) > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground">Trade-In:</span>
                    <span className="font-medium text-green-600">
                      -{formatCurrency(parseFloat(tradeInValue))}
                    </span>
                  </div>
                )}
                <div className="pt-2 mt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total:</span>
                    <span className="text-2xl font-bold">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 4: Review */}
        {currentStep === "review" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex gap-2 items-center">
                <CheckCircle2 className="w-5 h-5" />
                Review & Create
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Client Summary */}
              <div>
                <h3 className="mb-2 font-semibold">Client</h3>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="font-medium">
                    {selectedClient?.firstName} {selectedClient?.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedClient?.email}</p>
                  <p className="text-sm text-muted-foreground">{selectedClient?.phone}</p>
                </div>
              </div>

              {/* Vehicle Summary */}
              <div>
                <h3 className="mb-2 font-semibold">Vehicle</h3>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="font-medium">
                    {selectedVehicle?.year} {selectedVehicle?.make} {selectedVehicle?.model}
                  </p>
                  <p className="font-mono text-sm text-muted-foreground">VIN: {selectedVehicle?.vin}</p>
                  <p className="text-sm text-muted-foreground">
                    Stock: {selectedVehicle?.stock} • {selectedVehicle?.mileage.toLocaleString()} mi
                  </p>
                </div>
              </div>

              {/* Deal Summary */}
              <div>
                <h3 className="mb-2 font-semibold">Deal Details</h3>
                <div className="p-4 space-y-2 rounded-lg bg-muted">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium capitalize">{dealType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sale Amount:</span>
                    <span className="font-medium">{formatCurrency(parseFloat(saleAmount))}</span>
                  </div>
                  <div className="pt-2 mt-2 border-t">
                    <div className="flex justify-between">
                      <span className="font-semibold">Total:</span>
                      <span className="text-lg font-bold">{formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="flex gap-3 p-4 bg-blue-50 rounded-lg dark:bg-blue-950">
                <Info className="w-5 h-5 text-blue-600" />
                <div className="flex-1 text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Ready to create this deal?
                  </p>
                  <p className="text-blue-700 dark:text-blue-300">
                    After creation, you&apos;ll be able to generate documents and collect signatures.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Navigation Buttons */}
      <Card>
        <CardContent className="flex justify-between items-center py-4">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStepIndex === 0}
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/deals")}>
              Cancel
            </Button>
            {currentStep === "review" ? (
              <Button onClick={handleCreateDeal} size="lg">
                Create Deal
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
                <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}