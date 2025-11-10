import { createFileRoute, redirect } from "@tanstack/react-router";

// Redirect to the first step of the wizard
export const Route = createFileRoute("/standalone/deals/new/")({
  beforeLoad: () => {
    console.log("🔀 [WIZARD-REDIRECT] Redirecting to first step");
    throw redirect({
      to: "/standalone/deals/new/client-vehicle",
      replace: true,
    });
  },
});