// src/app/(dashboard)/clients/[id]/page.tsx

import ClientDetailView from "@/components/dashboard/client/ClientDetailPage";
import { use } from "react";


// This is a server component that unwraps the params
export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap params using React.use()
  const unwrappedParams = use(params);
  const clientId = unwrappedParams.id;
  
  return <ClientDetailView clientId={clientId} />;
}
