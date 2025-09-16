import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Img,
  Hr,
} from "@react-email/components";
import * as React from "react";

interface InvitationEmailProps {
  inviteLink: string;
  inviterName: string;
  dealershipName: string;
  role: string;
  companyLogo?: string;
}

export const InvitationEmail = ({
  inviteLink,
  inviterName,
  dealershipName,
  role,
  companyLogo,
}: InvitationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>🚗 Join {dealershipName} on DealerHub Pro</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with gradient */}
          <Section style={headerSection}>
            {companyLogo && (
              <Img
                src={companyLogo}
                width="120"
                height="40"
                alt="Company Logo"
                style={logoStyle}
              />
            )}
            <div style={gradientBar}></div>
          </Section>

          {/* Main content */}
          <Section style={contentSection}>
            <div style={iconWrapper}>
              <div style={inviteIcon}>✉️</div>
            </div>
            
            <Heading style={h1}>You&apos;re Invited to Join!</Heading>
            
            <Text style={text}>
              <strong>{inviterName}</strong> has invited you to join{" "}
              <span style={brandHighlight}>{dealershipName}</span> as a{" "}
              <span style={roleHighlight}>{role}</span>.
            </Text>
            
            <Text style={text}>
              Get started with our comprehensive dealer management platform and 
              streamline your operations from day one.
            </Text>

            {/* CTA Button */}
            <Section style={buttonContainer}>
              <Link style={button} href={inviteLink}>
                <span style={buttonText}>Accept Invitation →</span>
              </Link>
            </Section>

            {/* Features preview */}
            <Section style={featuresSection}>
              <Text style={featuresTitle}>What you&apos;ll get access to:</Text>
              <div style={featuresList}>
                <div style={featureItem}>📊 Sales Analytics Dashboard</div>
                <div style={featureItem}>🚗 Inventory Management</div>
                <div style={featureItem}>👥 Customer Relationship Tools</div>
                <div style={featureItem}>💰 Financial Reporting</div>
              </div>
            </Section>

            <Hr style={divider} />
            
            <Text style={disclaimerText}>
              This invitation expires in <strong>7 days</strong>. 
              Didn&apos;t expect this? You can safely ignore this email.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footer}>
              © {new Date().getFullYear()} DealerHub Pro. All rights reserved.
            </Text>
            <Text style={footerLinks}>
              <Link href="#" style={footerLink}>Privacy Policy</Link> • 
              <Link href="#" style={footerLink}>Support</Link> • 
              <Link href="#" style={footerLink}>Unsubscribe</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: "#f8fafc",
  fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  padding: "40px 0",
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  borderRadius: "16px",
  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  overflow: "hidden",
  maxWidth: "600px",
};

const headerSection = {
  backgroundColor: "#1e293b",
  padding: "24px 32px 16px",
  position: "relative" as const,
};

const logoStyle = {
  margin: "0 auto",
  display: "block",
};

const gradientBar = {
  height: "4px",
  background: "linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%)",
  position: "absolute" as const,
  bottom: "0",
  left: "0",
  right: "0",
};

const contentSection = {
  padding: "40px 32px",
};

const iconWrapper = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const inviteIcon = {
  fontSize: "48px",
  backgroundColor: "#eff6ff",
  borderRadius: "50%",
  width: "80px",
  height: "80px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto",
};

const h1 = {
  color: "#0f172a",
  fontSize: "28px",
  fontWeight: "700",
  lineHeight: "1.2",
  textAlign: "center" as const,
  margin: "0 0 24px 0",
};

const text = {
  color: "#475569",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "16px 0",
};

const brandHighlight = {
  color: "#3b82f6",
  fontWeight: "600",
};

const roleHighlight = {
  backgroundColor: "#fef3c7",
  color: "#92400e",
  padding: "2px 8px",
  borderRadius: "6px",
  fontWeight: "500",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#3b82f6",
  borderRadius: "12px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  display: "inline-block",
  padding: "16px 32px",
  boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.3)",
};

const buttonText = {
  color: "#ffffff",
};

const featuresSection = {
  backgroundColor: "#f8fafc",
  borderRadius: "12px",
  padding: "24px",
  margin: "32px 0",
};

const featuresTitle = {
  color: "#1e293b",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 16px 0",
};

const featuresList = {
  display: "grid",
  gap: "8px",
};

const featureItem = {
  color: "#475569",
  fontSize: "14px",
  padding: "8px 0",
};

const divider = {
  border: "none",
  borderTop: "1px solid #e2e8f0",
  margin: "32px 0",
};

const disclaimerText = {
  color: "#64748b",
  fontSize: "14px",
  textAlign: "center" as const,
  lineHeight: "1.5",
};

const footerSection = {
  backgroundColor: "#f8fafc",
  padding: "24px 32px",
  textAlign: "center" as const,
};

const footer = {
  color: "#64748b",
  fontSize: "14px",
  margin: "0 0 8px 0",
};

const footerLinks = {
  margin: "0",
};

const footerLink = {
  color: "#64748b",
  fontSize: "12px",
  textDecoration: "none",
  margin: "0 4px",
};

export default InvitationEmail;