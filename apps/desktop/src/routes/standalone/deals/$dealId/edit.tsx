import { createFileRoute, useNavigate, Outlet, redirect } from "@tanstack/react-router";
import { Layout } from "@/components/layout/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft } from "lucide-react";
import { WizardProvider, useWizard } from "@/lib/providers/WizardProvider";
import { useQuery } from "@tanstack/react-query";
import { getDeal } from "@/lib/sqlite/local-deals-service";
import { useUnifiedAuth } from "@/components/auth/useUnifiedAuth";
import { getClient } from "@/lib/sqlite/local-clients-service";
import { getVehicle } from "@/lib/sqlite/local-vehicles-service";

const steps = [
  { id: 1, name: "Client & Vehicle", path: "client-vehicle" },
  { id: 2, name: "Details", path: "details" },
];

export const Route = createFileRoute("/standalone/deals/$dealId/edit")({
  beforeLoad: ({ params, location }) => {
    // Only redirect if we're at the base edit route (not already on a step)
    if (location.pathname === `/standalone/deals/${params.dealId}/edit`) {
      throw redirect({
        to: "/standalone/deals/$dealId/edit/client-vehicle",
        params: { dealId: params.dealId },
        replace: true,
      });
    }
  },
  component: EditDealWizardLayout,
  errorComponent: ({ error }) => {
    console.error("❌ [EDIT-WIZARD-LAYOUT] Error in route:", error);
    return (
      <Layout>
        <div className="p-6">
          <h1 className="text-2xl font-bold text-destructive">Error loading edit wizard</h1>
          <p className="text-muted-foreground mt-2">{error.message}</p>
          <pre className="mt-4 p-4 bg-muted rounded text-sm overflow-auto">{error.stack}</pre>
        </div>
      </Layout>
    );
  },
});

function WizardContent() {
  const { dealId } = Route.useParams();
  const navigate = useNavigate();
  const auth = useUnifiedAuth();
  const { currentStep } = useWizard();

  const { data: dealData, isLoading } = useQuery({
    queryKey: ["standalone-deal", dealId, auth.user?.id],
    queryFn: async () => {
      if (!auth.user?.id) throw new Error("User not authenticated");
      const deal = await getDeal(dealId, auth.user.id);
      if (!deal) {
        throw new Error("Deal not found");
      }

      const client = await getClient(deal.client_id, auth.user.id);
      const vehicle = await getVehicle(deal.vehicle_id);

      return {
        deal,
        client,
        vehicle,
      };
    },
  });

  const progressPercentage = (currentStep / steps.length) * 100;
  const currentStepData = steps.find((s) => s.id === currentStep) || steps[0];

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center py-8">Loading deal data...</div>
        </div>
      </Layout>
    );
  }

  if (!dealData) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center py-8 text-destructive">Deal not found</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: `/standalone/deals/${dealId}` })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Edit Deal</h1>
            <p className="text-muted-foreground mt-1">
              Step {currentStep} of {steps.length}
            </p>
          </div>
        </div>

        <Card className="p-6">
          {/* Progress Bar Section */}
          <div className="mb-8 space-y-4">
            <div className="space-y-2">
              <Progress value={progressPercentage} className="h-3" />
              <div className="flex justify-center">
                <p className="text-sm font-medium text-foreground">
                  {currentStepData.name}
                </p>
              </div>
            </div>
            <div className="flex justify-center gap-6 text-xs text-muted-foreground">
              {steps.map((step) => (
                <span
                  key={step.id}
                  className={
                    currentStep >= step.id
                      ? "font-medium text-foreground"
                      : ""
                  }
                >
                  {step.name}
                </span>
              ))}
            </div>
          </div>

          <div className="min-h-[400px]">
            <Outlet />
          </div>
        </Card>
      </div>
    </Layout>
  );
}

function EditDealWizardLayout() {
  const { dealId } = Route.useParams();
  const auth = useUnifiedAuth();
  
  // Load deal data to initialize wizard
  const { data: dealData, isLoading } = useQuery({
    queryKey: ["standalone-deal", dealId, auth.user?.id],
    queryFn: async () => {
      if (!auth.user?.id) throw new Error("User not authenticated");
      const deal = await getDeal(dealId, auth.user.id);
      if (!deal) {
        throw new Error("Deal not found");
      }

      const client = await getClient(deal.client_id, auth.user.id);
      const vehicle = await getVehicle(deal.vehicle_id);

      return {
        deal,
        client,
        vehicle,
      };
    },
  });

  if (isLoading || !dealData) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center py-8">Loading deal data...</div>
        </div>
      </Layout>
    );
  }

  // Initialize wizard with existing deal data
  const initialFormData = {
    type: dealData.deal.type,
    clientId: dealData.deal.client_id,
    vehicleId: dealData.deal.vehicle_id,
    status: dealData.deal.status,
    totalAmount: dealData.deal.total_amount,
    saleAmount: dealData.deal.sale_amount,
    salesTax: dealData.deal.sales_tax,
    docFee: dealData.deal.doc_fee,
    tradeInValue: dealData.deal.trade_in_value,
    downPayment: dealData.deal.down_payment,
    financedAmount: dealData.deal.financed_amount,
    documentIds: dealData.deal.document_ids || [],
    selectedClient: dealData.client || undefined,
    selectedVehicle: dealData.vehicle || undefined,
    clientData: dealData.client ? {
      firstName: dealData.client.first_name,
      lastName: dealData.client.last_name,
      email: dealData.client.email || "",
      phone: dealData.client.phone || "",
      address: dealData.client.address || "",
      addressLine2: undefined,
      city: dealData.client.city || "",
      state: dealData.client.state || "",
      zipCode: dealData.client.zip_code || "",
      driversLicense: dealData.client.drivers_license || "",
    } : undefined,
    vehicleData: dealData.vehicle ? {
      vin: dealData.vehicle.vin,
      stockNumber: dealData.vehicle.stock_number || "",
      year: dealData.vehicle.year,
      make: dealData.vehicle.make,
      model: dealData.vehicle.model,
      trim: dealData.vehicle.trim || "",
      body: dealData.vehicle.body,
      doors: dealData.vehicle.doors,
      transmission: dealData.vehicle.transmission,
      engine: dealData.vehicle.engine,
      cylinders: dealData.vehicle.cylinders,
      titleNumber: dealData.vehicle.title_number,
      mileage: dealData.vehicle.mileage,
      color: dealData.vehicle.color || "",
      price: dealData.vehicle.price,
      cost: dealData.vehicle.cost || 0,
      status: dealData.vehicle.status,
      description: dealData.vehicle.description || "",
    } : undefined,
    cobuyerData: dealData.deal.cobuyer_data ? {
      firstName: dealData.deal.cobuyer_data.firstName || "",
      lastName: dealData.deal.cobuyer_data.lastName || "",
      email: dealData.deal.cobuyer_data.email || "",
      phone: dealData.deal.cobuyer_data.phone || "",
      address: dealData.deal.cobuyer_data.address || "",
      addressLine2: dealData.deal.cobuyer_data.addressLine2,
      city: dealData.deal.cobuyer_data.city || "",
      state: dealData.deal.cobuyer_data.state || "",
      zipCode: dealData.deal.cobuyer_data.zipCode || "",
      driversLicense: dealData.deal.cobuyer_data.driversLicense || "",
    } : undefined,
  };

  return (
    <WizardProvider initialData={initialFormData}>
      <WizardContent />
    </WizardProvider>
  );
}
