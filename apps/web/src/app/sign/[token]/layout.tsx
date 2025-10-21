import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Electronic Signature",
  description: "Provide your electronic signature for this document",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sign Document",
  },
};

export default function SignatureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="signature-layout">
      {children}
    </div>
  );
}